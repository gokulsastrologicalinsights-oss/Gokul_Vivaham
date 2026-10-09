const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

function loadLocalEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const bucketMap = {
  photos: process.env.R2_PROFILE_PHOTOS_BUCKET,
  horoscopes: process.env.R2_HOROSCOPES_BUCKET,
  'id-proofs': process.env.R2_ID_PROOFS_BUCKET,
};
const sourceBuckets = Object.keys(bucketMap);
const execute = process.argv.includes('--execute');
const overwrite = process.argv.includes('--overwrite');

for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLOUDFLARE_R2_URL',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
]) {
  if (!process.env[key]) throw new Error(`${key} is missing from .env.local`);
}
for (const bucket of sourceBuckets) {
  if (!bucketMap[bucket]) throw new Error(`R2 bucket mapping is missing for ${bucket}`);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_URL,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

function contentType(file) {
  const metadataType = file.metadata?.mimetype || file.metadata?.contentType;
  if (metadataType) return metadataType;
  if (/\.pdf$/i.test(file.name)) return 'application/pdf';
  if (/\.png$/i.test(file.name)) return 'image/png';
  if (/\.webp$/i.test(file.name)) return 'image/webp';
  return 'image/jpeg';
}

async function listFiles(bucket, prefix = '') {
  const files = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Could not list Supabase ${bucket}/${prefix}: ${error.message}`);
    if (!data?.length) break;
    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = !item.id && !item.metadata;
      if (isFolder) files.push(...await listFiles(bucket, itemPath));
      else files.push({ ...item, name: itemPath });
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  return files;
}

async function existsInR2(bucket, key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') return false;
    throw error;
  }
}

async function copyFile(sourceBucket, destinationBucket, file) {
  if (!overwrite && await existsInR2(destinationBucket, file.name)) return 'skipped';
  const { data, error } = await supabase.storage.from(sourceBucket).download(file.name);
  if (error || !data) throw new Error(`Could not download ${sourceBucket}/${file.name}: ${error?.message || 'empty file'}`);
  const body = Buffer.from(await data.arrayBuffer());
  await r2.send(new PutObjectCommand({
    Bucket: destinationBucket,
    Key: file.name,
    Body: body,
    ContentType: contentType(file),
    CacheControl: 'private, no-store',
  }));
  return 'copied';
}

async function main() {
  const summary = {};
  for (const sourceBucket of sourceBuckets) {
    const destinationBucket = bucketMap[sourceBucket];
    const files = await listFiles(sourceBucket);
    summary[sourceBucket] = { total: files.length, copied: 0, skipped: 0 };
    console.log(`${sourceBucket}: found ${files.length} object(s)${execute ? '' : ' (dry run)'}`);
    if (!execute) continue;
    for (const file of files) {
      const result = await copyFile(sourceBucket, destinationBucket, file);
      summary[sourceBucket][result] += 1;
      console.log(`  ${result}: ${file.name}`);
    }
  }
  console.log(JSON.stringify({ mode: execute ? (overwrite ? 'execute-overwrite' : 'execute') : 'dry-run', summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
