// Requires PostgreSQL clients matching or newer than the source server.
// Only ciphertext is written to BACKUP_OUTPUT; never upload the temporary directory.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const { keyFromEnv, encryptFile, sha256 } = require('./archive.cjs');
const PROJECT = 'rzhkwoeesgyekyutgyqr';
const SOURCE = `https://${PROJECT}.supabase.co`;
function command(name, args, env) {
  return new Promise((resolve, reject) => {
    // Suppress tool stderr: it may include sensitive object names or connection details.
    const child = spawn(name, args, { env, stdio: 'ignore' });
    child.on('error', () => reject(new Error(`${name} could not start`)));
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${name} failed; backup was not published`)));
  });
}
async function main() {
  const key = keyFromEnv();
  const connection = new URL(process.env.SUPABASE_DB_URL || '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !['postgres:', 'postgresql:'].includes(connection.protocol) ||
      !(connection.hostname === `db.${PROJECT}.supabase.co` || (connection.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(connection.username) === `postgres.${PROJECT}`)))
    throw new Error('Provide the intended production database URL and server-side Storage key');
  const env = { ...process.env, PGHOST: connection.hostname, PGPORT: connection.port || '5432', PGUSER: decodeURIComponent(connection.username), PGPASSWORD: decodeURIComponent(connection.password), PGDATABASE: connection.pathname.slice(1) || 'postgres', PGSSLMODE: 'verify-full', PGSSLROOTCERT: 'system', PGCONNECT_TIMEOUT: '20' };
  const output = path.resolve(process.env.BACKUP_OUTPUT || 'backups/encrypted-' + Date.now());
  await fs.mkdir(output, { recursive: false, mode: 0o700 });
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'gokul-backup-'));
  const manifest = { version: 1, project: PROJECT, startedAt: new Date().toISOString(), databaseSnapshot: 'pg_dump transaction-consistent snapshot', storageSnapshot: 'Sequential file copy; not atomic with database', files: [], buckets: [] };
  async function seal(source, name, details = {}) {
    const stat = await fs.stat(source);
    await encryptFile(source, path.join(output, name), key);
    manifest.files.push({ file: name, bytes: stat.size, sha256: await sha256(source), ...details });
  }
  async function api(route, init = {}) {
    const response = await fetch(SOURCE + '/storage/v1/' + route, { ...init, headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error('Storage export failed; backup was not published');
    return response;
  }
  try {
    await command('pg_dump', ['--format=custom', '--no-owner', '--file', path.join(temp, 'database.dump')], env);
    await command('pg_restore', ['--list', path.join(temp, 'database.dump')], env);
    await command('pg_dumpall', ['--roles-only', '--no-role-passwords', '--file', path.join(temp, 'roles.sql')], env);
    await seal(path.join(temp, 'database.dump'), 'database.dump.enc', { kind: 'database' });
    await seal(path.join(temp, 'roles.sql'), 'roles.sql.enc', { kind: 'roles', note: 'Role passwords excluded' });
    const buckets = await (await api('bucket')).json();
    if (!Array.isArray(buckets)) throw new Error('Unexpected Storage bucket response');
    manifest.buckets = buckets;
    for (const bucket of buckets) {
      const queue = ['']; const visited = new Set();
      while (queue.length) {
        const prefix = queue.shift(); if (visited.has(prefix)) continue; visited.add(prefix);
        for (let offset = 0; ; offset += 1000) {
          const objects = await (await api('object/list/' + encodeURIComponent(bucket.id), { method: 'POST', body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) })).json();
          if (!Array.isArray(objects)) throw new Error('Unexpected Storage listing response');
          for (const object of objects) {
            const objectPath = prefix ? prefix + '/' + object.name : object.name;
            if (!object.id) { queue.push(objectPath); continue; }
            const response = await api('object/' + encodeURIComponent(bucket.id) + '/' + objectPath.split('/').map(encodeURIComponent).join('/'));
            const file = path.join(temp, 'object');
            const { pipeline } = require('node:stream/promises');
            await pipeline(response.body, require('node:fs').createWriteStream(file, { mode: 0o600 }));
            const name = 'object-' + createHash('sha256').update(bucket.id + '/' + objectPath).digest('hex') + '.enc';
            await seal(file, name, { kind: 'storage', bucket: bucket.id, path: objectPath, contentType: response.headers.get('content-type') });
            await fs.unlink(file);
          }
          if (objects.length < 1000) break;
        }
      }
    }
    manifest.completedAt = new Date().toISOString();
    await fs.writeFile(path.join(temp, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600 });
    await encryptFile(path.join(temp, 'manifest.json'), path.join(output, 'manifest.json.enc'), key);
    console.log('Encrypted database, roles and Storage archive completed.');
  } finally {
    // temp is always a fresh directory created above, never a caller-supplied path.
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(() => { console.error('Backup failed. Check required secrets, source connectivity and PostgreSQL client compatibility. Do not use or upload partial output.'); process.exitCode = 1; });
