/* eslint-disable @typescript-eslint/no-require-imports */
// Requires PostgreSQL clients matching or newer than the source server.
// Only ciphertext is written to BACKUP_OUTPUT; never upload the temporary directory.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { createWriteStream } = require('node:fs');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { keyFromEnv, encryptFile, sha256 } = require('./archive.cjs');
const PROJECT = 'rzhkwoeesgyekyutgyqr';
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
  const r2Only = process.env.R2_ONLY === 'YES';
  const connection = r2Only ? null : new URL(process.env.SUPABASE_DB_URL || '');
  const bucketNames = [process.env.R2_PROFILE_PHOTOS_BUCKET, process.env.R2_HOROSCOPES_BUCKET, process.env.R2_ID_PROOFS_BUCKET];
  if (!process.env.CLOUDFLARE_R2_URL || !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || bucketNames.some(name => !name) ||
      (!r2Only && (!['postgres:', 'postgresql:'].includes(connection.protocol) ||
      !(connection.hostname === `db.${PROJECT}.supabase.co` || (connection.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(connection.username) === `postgres.${PROJECT}`)))))
    throw new Error('Provide the intended production database URL and private R2 backup credentials');
  const env = r2Only ? null : { ...process.env, PGHOST: connection.hostname, PGPORT: connection.port || '5432', PGUSER: decodeURIComponent(connection.username), PGPASSWORD: decodeURIComponent(connection.password), PGDATABASE: connection.pathname.slice(1) || 'postgres', PGSSLMODE: 'verify-full', PGSSLROOTCERT: 'system', PGCONNECT_TIMEOUT: '20' };
  const r2 = new S3Client({
    region: 'auto', endpoint: process.env.CLOUDFLARE_R2_URL,
    credentials: { accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY },
  });
  const output = path.resolve(process.env.BACKUP_OUTPUT || 'backups/encrypted-' + Date.now());
  await fs.mkdir(output, { recursive: false, mode: 0o700 });
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'gokul-backup-'));
  const manifest = { version: 1, project: PROJECT, startedAt: new Date().toISOString(), databaseSnapshot: r2Only ? null : 'pg_dump transaction-consistent snapshot', storageSnapshot: r2Only ? 'R2-only recovery rehearsal' : 'Sequential file copy; not atomic with database', files: [], buckets: [] };
  async function seal(source, name, details = {}) {
    const stat = await fs.stat(source);
    await encryptFile(source, path.join(output, name), key);
    manifest.files.push({ file: name, bytes: stat.size, sha256: await sha256(source), ...details });
  }
  try {
    if (!r2Only) {
      await command('pg_dump', ['--format=custom', '--no-owner', '--file', path.join(temp, 'database.dump')], env);
      await command('pg_restore', ['--list', path.join(temp, 'database.dump')], env);
      await command('pg_dumpall', ['--roles-only', '--no-role-passwords', '--file', path.join(temp, 'roles.sql')], env);
      await seal(path.join(temp, 'database.dump'), 'database.dump.enc', { kind: 'database' });
      await seal(path.join(temp, 'roles.sql'), 'roles.sql.enc', { kind: 'roles', note: 'Role passwords excluded' });
    }
    manifest.buckets = bucketNames.map(name => ({ id: name, public: false, provider: 'cloudflare-r2' }));
    for (const bucket of bucketNames) {
      let continuationToken;
      do {
        const listed = await r2.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }));
        for (const object of listed.Contents || []) {
          if (!object.Key) continue;
          const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: object.Key }));
          if (!response.Body) throw new Error('R2 returned an empty object body');
          const file = path.join(temp, 'object');
          await pipeline(response.Body, createWriteStream(file, { mode: 0o600 }));
          const name = 'object-' + createHash('sha256').update(bucket + '/' + object.Key).digest('hex') + '.enc';
          await seal(file, name, { kind: 'storage', provider: 'cloudflare-r2', bucket, path: object.Key, contentType: response.ContentType || null, etag: response.ETag || null });
          await fs.unlink(file);
        }
        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
      } while (continuationToken);
    }
    manifest.completedAt = new Date().toISOString();
    await fs.writeFile(path.join(temp, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600 });
    await encryptFile(path.join(temp, 'manifest.json'), path.join(output, 'manifest.json.enc'), key);
    console.log(r2Only ? 'Encrypted private R2 rehearsal archive completed; no database backup was produced.' : 'Encrypted database, roles and private R2 archive completed.');
  } finally {
    // temp is always a fresh directory created above, never a caller-supplied path.
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(() => { console.error('Backup failed. Check required secrets, source connectivity and PostgreSQL client compatibility. Do not use or upload partial output.'); process.exitCode = 1; });
