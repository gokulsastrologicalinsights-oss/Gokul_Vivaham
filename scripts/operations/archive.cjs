const fs = require('node:fs');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');
const { createCipheriv, createDecipheriv, randomBytes, createHash } = require('node:crypto');
const MAGIC = Buffer.from('GVBACKUP1');
function keyFromEnv() {
  const value = process.env.BACKUP_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('BACKUP_ENCRYPTION_KEY must contain 64 hexadecimal characters (32 random bytes).');
  return Buffer.from(value, 'hex');
}
async function encryptFile(source, destination, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(MAGIC);
  await fs.promises.writeFile(destination, Buffer.concat([MAGIC, iv]), { mode: 0o600, flag: 'wx' });
  try {
    await pipeline(fs.createReadStream(source), cipher, fs.createWriteStream(destination, { flags: 'a' }));
    await fs.promises.appendFile(destination, cipher.getAuthTag());
  } catch (error) { await fs.promises.unlink(destination).catch(() => {}); throw error; }
}
async function decryptFile(source, destination, key) {
  const size = (await fs.promises.stat(source)).size;
  if (size < MAGIC.length + 12 + 16) throw new Error('Invalid encrypted archive');
  const handle = await fs.promises.open(source, 'r');
  const header = Buffer.alloc(MAGIC.length + 12), tag = Buffer.alloc(16);
  try { await handle.read(header, 0, header.length, 0); await handle.read(tag, 0, 16, size - 16); } finally { await handle.close(); }
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Invalid archive format');
  const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(MAGIC.length));
  decipher.setAAD(MAGIC); decipher.setAuthTag(tag);
  const partial = destination + '.' + randomBytes(8).toString('hex') + '.partial';
  try {
    const input = size === header.length + 16 ? Readable.from([]) : fs.createReadStream(source, { start: header.length, end: size - 17 });
    await pipeline(input, decipher, fs.createWriteStream(partial, { flags: 'wx', mode: 0o600 }));
    // Do not overwrite an existing restore file.
    await fs.promises.copyFile(partial, destination, fs.constants.COPYFILE_EXCL);
  } finally { await fs.promises.unlink(partial).catch(() => {}); }
}
async function sha256(file) {
  const hash = createHash('sha256'); for await (const chunk of fs.createReadStream(file)) hash.update(chunk); return hash.digest('hex');
}
module.exports = { keyFromEnv, encryptFile, decryptFile, sha256 };
