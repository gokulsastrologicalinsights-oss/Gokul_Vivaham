const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, '')];
    }),
);

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const baseUrl = (process.env.INTEREST_TEST_BASE_URL || env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace('://localhost', '://127.0.0.1');
const accounts = [];

function assertNoError(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function createAccount(label, gender) {
  const email = `interest-check-${label.toLowerCase()}-${randomUUID()}@example.invalid`;
  const password = `${randomUUID()}Aa9!`;
  const created = assertNoError(
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Interest Check ${label}`, gender, dob: '1995-01-01' },
    }),
    `create ${label}`,
  );
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
  const session = assertNoError(await client.auth.signInWithPassword({ email, password }), `login ${label}`);
  const member = assertNoError(
    await admin.from('users').select('id').eq('auth_user_id', created.user.id).single(),
    `resolve ${label} member`,
  );
  const account = { label, authId: created.user.id, memberId: member.id, token: session.session.access_token };
  accounts.push(account);
  return account;
}

async function api(account, method, body) {
  const response = await fetch(`${baseUrl}/api/interests`, {
    method,
    headers: { 'content-type': 'application/json', cookie: `sb-access-token=${account.token}` },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function status(requestId) {
  return assertNoError(
    await admin.from('match_requests').select('sender_user_id,receiver_user_id,status,responded_at,cancelled_at').eq('id', requestId).single(),
    `read request ${requestId}`,
  );
}

async function main() {
  const a = await createAccount('A', 'Male');
  const b = await createAccount('B', 'Female');
  const c = await createAccount('C', 'Female');
  const d = await createAccount('D', 'Female');

  try {
    const sent = await api(a, 'POST', { receiverUserId: b.memberId });
    assert.equal(sent.status, 201);
    const requestAB = sent.body.request;
    assert.equal(requestAB.status, 'pending');

    const duplicateAB = await api(a, 'POST', { receiverUserId: b.memberId });
    assert.equal(duplicateAB.status, 409);

    const recipientCancel = await api(b, 'PATCH', { requestId: requestAB.id, status: 'cancelled' });
    assert.equal(recipientCancel.status, 403);

    const senderCancel = await api(a, 'PATCH', { requestId: requestAB.id, status: 'cancelled' });
    assert.equal(senderCancel.status, 200);
    assert.equal(senderCancel.body.request.status, 'cancelled');
    assert.equal((await status(requestAB.id)).status, 'cancelled');
    assert.ok((await status(requestAB.id)).cancelled_at);

    const cancelAgain = await api(a, 'PATCH', { requestId: requestAB.id, status: 'cancelled' });
    assert.equal(cancelAgain.status, 409);
    const resendAfterCancel = await api(a, 'POST', { receiverUserId: b.memberId });
    assert.equal(resendAfterCancel.status, 409);
    console.log('PASS: sender cancellation is authorized, recorded, idempotently rejected, and cannot be resent');

    const pendingAC = await api(a, 'POST', { receiverUserId: c.memberId });
    assert.equal(pendingAC.status, 201);
    const ownResponse = await api(a, 'PATCH', { requestId: pendingAC.body.request.id, status: 'accepted' });
    assert.equal(ownResponse.status, 403);
    const unrelatedCancel = await api(b, 'PATCH', { requestId: pendingAC.body.request.id, status: 'cancelled' });
    assert.equal(unrelatedCancel.status, 403);
    assert.equal((await api(a, 'PATCH', { requestId: pendingAC.body.request.id, status: 'cancelled' })).status, 200);
    console.log('PASS: recipient, sender-as-recipient, and unrelated-user authorization checks');

    const reverseBA = await api(b, 'POST', { receiverUserId: a.memberId });
    assert.equal(reverseBA.status, 201);
    const acceptedBA = await api(a, 'PATCH', { requestId: reverseBA.body.request.id, status: 'accepted' });
    assert.equal(acceptedBA.status, 200);
    assert.equal(acceptedBA.body.request.status, 'accepted');
    assert.ok((await status(reverseBA.body.request.id)).responded_at);
    assert.equal((await api(b, 'POST', { receiverUserId: a.memberId })).status, 409);
    assert.equal((await api(a, 'PATCH', { requestId: reverseBA.body.request.id, status: 'declined' })).status, 409);
    console.log('PASS: acceptance, response timestamp, terminal-state protection, and reverse direction');

    const declinedCB = await api(c, 'POST', { receiverUserId: b.memberId });
    assert.equal(declinedCB.status, 201);
    const declined = await api(b, 'PATCH', { requestId: declinedCB.body.request.id, status: 'declined' });
    assert.equal(declined.status, 200);
    assert.equal(declined.body.request.status, 'declined');
    assert.ok((await status(declinedCB.body.request.id)).responded_at);
    assert.equal((await api(c, 'POST', { receiverUserId: b.memberId })).status, 409);
    assert.equal((await api(b, 'POST', { receiverUserId: c.memberId })).status, 201);
    console.log('PASS: decline is permanent in one direction while reverse initiation remains available');

    const concurrent = await Promise.all([
      api(a, 'POST', { receiverUserId: d.memberId }),
      api(a, 'POST', { receiverUserId: d.memberId }),
    ]);
    assert.deepEqual(concurrent.map((result) => result.status).sort((x, y) => x - y), [201, 409]);
    console.log('PASS: concurrent duplicate creation is blocked by the ordered-pair uniqueness constraint');
  } finally {
    const memberIds = accounts.map((account) => account.memberId);
    if (memberIds.length > 0) {
      const chats = await admin.from('chats').delete().or(`user_one.in.(${memberIds.join(',')}),user_two.in.(${memberIds.join(',')})`);
      if (chats.error) console.error(`Chat cleanup failed: ${chats.error.message}`);
    }
    await admin.from('notifications').delete().in('user_id', memberIds);
    for (const account of accounts) {
      const result = await admin.auth.admin.deleteUser(account.authId);
      if (result.error) console.error(`Cleanup failed for ${account.label}: ${result.error.message}`);
    }
    console.log('Removed isolated interest lifecycle test accounts');
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
