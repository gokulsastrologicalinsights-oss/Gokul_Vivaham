// Integrity/decryption check only. This does NOT restore a database or contact production.
const fs = require('node:fs/promises');
const path = require('node:path');
const { keyFromEnv, decryptFile, sha256 } = require('./archive.cjs');
async function main() {
  const [sourceArg, destinationArg] = process.argv.slice(2);
  if (!sourceArg || !destinationArg) throw new Error('Usage: node scripts/operations/unpack-backup.cjs <encrypted-directory> <new-private-directory>');
  const source = path.resolve(sourceArg), destination = path.resolve(destinationArg), key = keyFromEnv();
  await fs.mkdir(destination, { recursive: false, mode: 0o700 });
  await decryptFile(path.join(source, 'manifest.json.enc'), path.join(destination, 'manifest.json'), key);
  const manifest = JSON.parse(await fs.readFile(path.join(destination, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error('Unsupported backup manifest');
  for (const entry of manifest.files) {
    if (!/^(database\.dump|roles\.sql|object-[a-f0-9]{64})\.enc$/.test(entry.file)) throw new Error('Unsafe archive entry');
    const target = path.join(destination, entry.file.slice(0, -4));
    await decryptFile(path.join(source, entry.file), target, key);
    if ((await fs.stat(target)).size !== entry.bytes || await sha256(target) !== entry.sha256) throw new Error('Backup integrity verification failed');
  }
  console.log('All archived files decrypted and checksums verified. This is not a database restore test.');
}
main().catch(() => { console.error('Archive verification failed. Keep recovered files private and do not use them for restoration.'); process.exitCode = 1; });
