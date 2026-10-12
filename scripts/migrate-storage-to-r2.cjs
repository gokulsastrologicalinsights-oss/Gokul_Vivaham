/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');

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

const migrations = [
  { sourceBucket: 'photos', destinationBucket: process.env.R2_PROFILE_PHOTOS_BUCKET },
  { sourceBucket: 'galleries', destinationBucket: process.env.R2_PROFILE_PHOTOS_BUCKET },
  { sourceBucket: 'horoscopes', destinationBucket: process.env.R2_HOROSCOPES_BUCKET },
  { sourceBucket: 'id-proofs', destinationBucket: process.env.R2_ID_PROOFS_BUCKET },
];
const execute = process.argv.includes('--execute');
const overwrite = process.argv.includes('--overwrite');
const reportArgument = process.argv.find(argument => argument.startsWith('--report='));
const reportPath = path.resolve(reportArgument ? reportArgument.slice('--report='.length) : 'scratch/r2-storage-migration-report.json');

for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLOUDFLARE_R2_URL',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
]) {
  if (!process.env[key]) throw new Error(`${key} is missing from .env.local`);
}
for (const migration of migrations) {
  if (!migration.destinationBucket) throw new Error(`R2 bucket mapping is missing for ${migration.sourceBucket}`);
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

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
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
    if (error) {
      if (!prefix && /not found|does not exist/i.test(error.message)) return files;
      throw new Error(`Could not list Supabase ${bucket}/${prefix}: ${error.message}`);
    }
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

async function downloadSupabaseObject(bucket, key) {
  const { data, error } = await supabase.storage.from(bucket).download(key);
  if (error || !data) throw new Error(`Could not download ${bucket}/${key}: ${error?.message || 'empty file'}`);
  return Buffer.from(await data.arrayBuffer());
}

async function downloadR2Object(bucket, key) {
  try {
    const result = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) throw new Error('R2 returned an empty response body');
    return Buffer.from(await result.Body.transformToByteArray());
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') return null;
    throw error;
  }
}

function saveReport(report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
}

async function verifyObject(destinationBucket, key, sourceBody) {
  const destinationBody = await downloadR2Object(destinationBucket, key);
  if (!destinationBody) return { exists: false, verified: false };
  const sourceHash = sha256(sourceBody);
  const destinationHash = sha256(destinationBody);
  return {
    exists: true,
    verified: sourceBody.byteLength === destinationBody.byteLength && sourceHash === destinationHash,
    sourceBytes: sourceBody.byteLength,
    destinationBytes: destinationBody.byteLength,
    sha256: sourceHash,
  };
}

async function migrateFile(sourceBucket, destinationBucket, file) {
  const body = await downloadSupabaseObject(sourceBucket, file.name);
  const before = await verifyObject(destinationBucket, file.name, body);
  if (before.verified) return { outcome: 'verified-existing', bytes: body.byteLength, sha256: before.sha256 };
  if (before.exists && !overwrite) {
    throw new Error(`R2 object exists but does not match the Supabase source; rerun with --overwrite only after reviewing ${file.name}`);
  }
  if (!execute) return { outcome: before.exists ? 'would-overwrite' : 'would-copy', bytes: body.byteLength, sha256: sha256(body) };

  await r2.send(new PutObjectCommand({
    Bucket: destinationBucket,
    Key: file.name,
    Body: body,
    ContentType: contentType(file),
    CacheControl: 'private, no-store',
  }));
  const after = await verifyObject(destinationBucket, file.name, body);
  if (!after.verified) throw new Error(`R2 verification failed after uploading ${sourceBucket}/${file.name}`);
  return { outcome: before.exists ? 'overwritten-verified' : 'copied-verified', bytes: body.byteLength, sha256: after.sha256 };
}

async function main() {
  const report = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    mode: execute ? (overwrite ? 'execute-overwrite' : 'execute') : 'dry-run',
    sourceRetained: true,
    buckets: {},
    failures: [],
  };
  saveReport(report);

  for (const migration of migrations) {
    const { sourceBucket, destinationBucket } = migration;
    let files;
    try {
      files = await listFiles(sourceBucket);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.failures.push({ sourceBucket, key: null, message });
      report.buckets[sourceBucket] = { destinationBucket, total: 0, failed: 1 };
      saveReport(report);
      console.error(`${sourceBucket}: ${message}`);
      continue;
    }

    const summary = {
      destinationBucket,
      total: files.length,
      verifiedExisting: 0,
      copiedVerified: 0,
      overwrittenVerified: 0,
      wouldCopy: 0,
      wouldOverwrite: 0,
      failed: 0,
      bytesVerified: 0,
    };
    report.buckets[sourceBucket] = summary;
    console.log(`${sourceBucket} -> ${destinationBucket}: found ${files.length} object(s)${execute ? '' : ' (dry run)'}`);

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      try {
        const result = await migrateFile(sourceBucket, destinationBucket, file);
        const field = {
          'verified-existing': 'verifiedExisting',
          'copied-verified': 'copiedVerified',
          'overwritten-verified': 'overwrittenVerified',
          'would-copy': 'wouldCopy',
          'would-overwrite': 'wouldOverwrite',
        }[result.outcome];
        summary[field] += 1;
        if (result.outcome.includes('verified')) summary.bytesVerified += result.bytes;
        console.log(`  [${index + 1}/${files.length}] ${result.outcome}: ${file.name}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        summary.failed += 1;
        report.failures.push({ sourceBucket, destinationBucket, key: file.name, message });
        console.error(`  [${index + 1}/${files.length}] failed: ${file.name} (${message})`);
      }
      saveReport(report);
    }
  }

  report.completedAt = new Date().toISOString();
  saveReport(report);
  console.log(JSON.stringify({ mode: report.mode, buckets: report.buckets, failureCount: report.failures.length, reportPath }, null, 2));
  if (report.failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
