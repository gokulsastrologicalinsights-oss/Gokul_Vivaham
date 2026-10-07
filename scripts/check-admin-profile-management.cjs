// Run against a local server (or explicit BASE_URL). Uses temporary accounts and cleans up.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID, createHmac } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const base = process.env.BASE_URL || 'http://localhost:3001';
const ids = [], uploads = [];
function ok(result) { if (result.error) throw new Error(result.error.message); return result.data; }
function totp(secret) {
  let bits = ''; for (const c of secret.replace(/=+$/, '')) bits += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5, '0');
  const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  return ((h.readUInt32BE(h[19] & 15) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}
async function request(path, token, body, method = 'POST', origin = base) {
  return fetch(base + path, { method, headers: { origin, ...(token ? { cookie: 'sb-access-token=' + token } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) });
}
async function expect(response, status) { const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data)); return data; }
async function main() {
  try {
    await expect(await request('/api/admin/users', null, {}), 401);
    const email = 'admin-flow-' + randomUUID() + '@example.invalid', password = randomUUID() + 'Aa9!';
    const actor = ok(await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Temporary Admin Test' } })).user.id; ids.push(actor);
    // Test profiles stay private, including the temporary administrator.
    ok(await db.from('profiles').update({ visibility: 'private' }).eq('user_id', actor));
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    const login = ok(await client.auth.signInWithPassword({ email, password }));
    const basicToken = login.session.access_token;
    await expect(await request('/api/admin/users', basicToken, {}), 403);
    ok(await db.from('admin_users').insert({ auth_user_id: actor, email, role: 'admin' }));
    await expect(await request('/api/admin/users', basicToken, {}), 403);
    const factor = ok(await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Temporary profile test' }));
    const token = ok(await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totp(factor.totp.secret) })).access_token;
    await expect(await request('/api/admin/users', token, {}, 'POST', 'https://untrusted.example'), 403);
    await expect(await request('/api/admin/users', token, {}), 400);
    const memberPassword = randomUUID() + 'Aa9!';
    const payload = {
      fullName: 'Temporary Profile Check', gender: 'Male', dob: '1995-04-12', email: 'member-flow-' + randomUUID() + '@example.invalid',
      password: memberPassword, confirmPassword: memberPassword, mobileNumber: '9000000000', maritalStatus: 'Never Married', motherTongue: 'Tamil', religion: 'Hindu', caste: 'Iyer',
      subCaste: '', rasi: 'Mesham', star: 'Aswini', padam: '1', gothram: '', height: '175', weight: '70', physicalStatus: 'Normal', education: 'BE', occupation: 'Engineer', companyName: 'Test', annualIncome: '600000', workLocation: 'Chennai', country: 'India', state: 'Tamil Nadu',
      fatherName: 'Test Father', fatherOccupation: '', motherName: 'Test Mother', motherOccupation: '', siblings: 'One', nativePlace: 'Chennai', familyType: 'Nuclear', aboutMe: 'Temporary automated test', partnerExpectations: 'Test', visibility: 'private', adminAttestation: true,
    };
    await expect(await request('/api/admin/users', token, { ...payload, dob: '2020-01-01' }), 400);
    await expect(await request('/api/admin/users', token, { ...payload, adminAttestation: false }), 400);
    await expect(await request('/api/admin/users', token, { ...payload, role: 'admin' }), 400);
    const created = await expect(await request('/api/admin/users', token, payload), 201); ids.push(created.id);
    assert.match(created.profileId, /^GV0741\d{4}$/);
    await expect(await request('/api/admin/users', token, payload), 409);
    const detail = await expect(await request('/api/admin/users/' + created.id, token, undefined, 'GET'), 200);
    assert.equal(detail.profile.is_verified, true); assert.equal(detail.profile.moderation_status, 'approved'); assert.equal(detail.profile.city, 'Chennai');
    assert.equal(detail.account.email_verified, true); assert.equal(detail.account.mobile_verified, false); assert.equal(detail.account.mobile_number, payload.mobileNumber); assert.equal(detail.is_admin, false);
    assert.equal(detail.consents.some(c => c.accepted), false);
    const auth = ok(await db.auth.admin.getUserById(created.id)).user;
    assert.ok(auth.email_confirmed_at); assert.equal(auth.app_metadata.created_by_admin, actor); assert.equal(auth.user_metadata.password, undefined);
    const member = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    const memberToken = ok(await member.auth.signInWithPassword({ email: payload.email, password: memberPassword })).session.access_token;
    await expect(await request('/api/admin/users', memberToken, {}), 403);
    console.log('PASS: MFA/admin/origin restrictions, required fields, adult eligibility, duplicate email, verified creation, sequential ID and immediate member login.');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    for (const kind of ['photo', 'horoscope']) {
      const uploadId = randomUUID(), ext = kind === 'photo' ? 'png' : 'pdf';
      uploads.push([kind === 'photo' ? 'photos' : 'horoscopes', `${created.id}/${uploadId}.${ext}`]);
      const form = new FormData(); form.set('kind', kind); form.set('uploadId', uploadId); form.set('file', new Blob([kind === 'photo' ? png : '%PDF-1.4\n%%EOF'], { type: kind === 'photo' ? 'image/png' : 'application/pdf' }), 'test.' + ext);
      await expect(await request(`/api/admin/users/${created.id}/files`, memberToken, form), 403);
      await expect(await request(`/api/admin/users/${created.id}/files`, token, form), 200);
      await expect(await request(`/api/admin/users/${created.id}/files`, token, form), 200);
    }
    const withFiles = await expect(await request('/api/admin/users/' + created.id, token, undefined, 'GET'), 200);
    assert.equal(withFiles.gallery.length, 1); assert.equal(withFiles.gallery[0].moderation_status, 'approved'); assert.equal(withFiles.profile.horoscope_verification_status, 'approved');
    const invalidFile = new FormData(); invalidFile.set('kind', 'photo'); invalidFile.set('uploadId', randomUUID()); invalidFile.set('file', new Blob(['not a photo'], { type: 'image/png' }), 'fake.png');
    await expect(await request(`/api/admin/users/${created.id}/files`, token, invalidFile), 400);
    await expect(await request('/api/admin/users/' + created.id, token, { profile: { occupation: 'Updated Engineer' } }, 'PATCH'), 200);
    const edited = await expect(await request('/api/admin/users/' + created.id, token, undefined, 'GET'), 200); assert.equal(edited.profile.occupation, 'Updated Engineer');
    await expect(await request('/api/admin/users/' + created.id, token, undefined, 'DELETE'), 200);
    const deleted = await expect(await request('/api/admin/users/' + created.id, token, undefined, 'GET'), 200); assert.ok(deleted.account.deleted_at);
    await expect(await request('/api/auth/session', memberToken, undefined, 'GET'), 401);
    await expect(await request('/api/admin/users/' + created.id, token, { action: 'restore' }), 200);
    const restored = await expect(await request('/api/admin/users/' + created.id, token, undefined, 'GET'), 200); assert.equal(restored.account.deleted_at, null);
    assert.equal(ok(await db.from('activity_logs').select('id').eq('action', 'ADMIN_CREATE_MEMBER').contains('metadata', { target_user_id: created.id })).length, 1);
    console.log('PASS: private file storage, approved photo/horoscope, safe upload retries, invalid-file rejection, view/edit/delete/restore and creation audit.');
  } finally {
    for (const [bucket, path] of uploads) ok(await db.storage.from(bucket).remove([path]));
    for (const id of ids) {
      ok(await db.from('verification_requests').delete().eq('user_id', id));
      ok(await db.from('activity_logs').delete().eq('user_id', id));
      ok(await db.from('activity_logs').delete().contains('metadata', { target_user_id: id }));
    }
    for (const id of ids.reverse()) { ok(await db.from('admin_users').delete().eq('auth_user_id', id)); ok(await db.auth.admin.deleteUser(id)); }
    console.log('Removed all temporary accounts, authenticator and uploaded files.');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
