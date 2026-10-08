const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { encryptFile, decryptFile } = require('./archive.cjs');
const { checkSite, checkBackup, updateAlert } = require('./monitor.cjs');

test('encrypted backups round-trip, including empty Storage objects; reject tampering and wrong keys', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gokul-archive-test-'));
  try {
    for (const [name, content] of [['empty', Buffer.alloc(0)], ['large', randomBytes(200000)]]) {
      const source = path.join(dir, name), encrypted = source + '.enc', restored = source + '.restored';
      const key = randomBytes(32);
      await fs.writeFile(source, content);
      await encryptFile(source, encrypted, key);
      await decryptFile(encrypted, restored, key);
      assert.deepEqual(await fs.readFile(restored), content);
      await assert.rejects(decryptFile(encrypted, restored, key), { code: 'EEXIST' });
      await assert.rejects(decryptFile(encrypted, source + '.badkey', randomBytes(32)));
      const damaged = await fs.readFile(encrypted); damaged[damaged.length - 1] ^= 1;
      await fs.writeFile(encrypted, damaged);
      await assert.rejects(decryptFile(encrypted, source + '.tampered', key));
      assert.equal((await fs.readdir(dir)).some(file => file.endsWith('.partial') || file.endsWith('.badkey') || file.endsWith('.tampered')), false);
    }
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('monitor retries outage, rejects liveness-only responses, handles timeout and recovery', async t => {
  let calls = 0;
  t.mock.method(global, 'fetch', async () => {
    calls++;
    return new Response(JSON.stringify(calls === 3 ? { status: 'ok', database: 'ok' } : { status: 'ok' }));
  });
  assert.deepEqual(await checkSite('https://example.invalid', { retryMs: 0 }), { healthy: true, attempts: 3 });
  t.mock.method(global, 'fetch', async () => { throw new Error('timeout'); });
  assert.deepEqual(await checkSite('https://example.invalid', { retryMs: 0 }), { healthy: false, attempts: 3 });
});

test('backup freshness requires recent success and an unexpired encrypted artifact', async () => {
  const now = Date.now();
  let runs = [], artifacts = [];
  const client = { context: { repo: { owner: 'test', repo: 'test' } }, github: { rest: { actions: {
    listWorkflowRuns: async () => ({ data: { workflow_runs: runs } }),
    listWorkflowRunArtifacts: async () => ({ data: { artifacts } }),
  } } } };
  assert.equal(await checkBackup(client, now), false);
  runs = [{ id: 1, run_started_at: new Date(now).toISOString() }];
  assert.equal(await checkBackup(client, now), false);
  artifacts = [{ name: 'encrypted-backup-1', expired: false, size_in_bytes: 100 }];
  assert.equal(await checkBackup(client, now), true);
  artifacts[0].expired = true;
  assert.equal(await checkBackup(client, now), false);
  artifacts[0].expired = false;
  runs[0].run_started_at = new Date(now - 31 * 3600000).toISOString();
  assert.equal(await checkBackup(client, now), false);
});

test('alerts deduplicate failures, close on recovery, and keep drill separate', async () => {
  const issues = []; let comments = 0;
  const github = {
    paginate: async () => issues.filter(issue => issue.state === 'open'),
    rest: { issues: {
      listForRepo() {},
      create: async data => { const issue = { ...data, number: issues.length + 1, user: { type: 'Bot' }, state: 'open' }; issues.push(issue); return { data: issue }; },
      createComment: async () => { comments++; },
      update: async data => ({ data: Object.assign(issues.find(issue => issue.number === data.issue_number), data) }),
    } },
  };
  const client = { github, context: { repo: { owner: 'test', repo: 'test' }, runId: 1 } };
  await updateAlert(client, false); await updateAlert(client, false);
  assert.equal(issues.length, 1);
  await updateAlert(client, false, true); await updateAlert(client, true, true);
  assert.equal(issues[0].state, 'open'); assert.equal(issues[1].state, 'closed');
  await updateAlert(client, true);
  assert.equal(issues[0].state, 'closed'); assert.equal(comments, 2);
  // GitHub's list endpoint may lag behind newly created issues.
  github.paginate = async () => [];
  const fresh = await updateAlert(client, false, true);
  const closed = await updateAlert(client, true, true, false, fresh);
  assert.equal(closed.state, 'closed');
});
