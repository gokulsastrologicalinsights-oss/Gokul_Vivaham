/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1)];
  }),
);
const buckets = [env.R2_PROFILE_PHOTOS_BUCKET, env.R2_HOROSCOPES_BUCKET, env.R2_ID_PROOFS_BUCKET];
for (const name of ['CLOUDFLARE_R2_URL', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY']) {
  if (!env[name]) throw new Error(`Missing ${name}`);
}
if (buckets.some(bucket => !bucket)) throw new Error('Missing an R2 bucket name');

const r2 = new S3Client({
  region: 'auto', endpoint: env.CLOUDFLARE_R2_URL,
  credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY },
});

async function main() {
  let checked = 0;
  for (const bucket of buckets) {
    let continuationToken;
    do {
      const listed = await r2.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }));
      for (const object of listed.Contents || []) {
        if (!object.Key) continue;
        const path = object.Key.split('/').map(encodeURIComponent).join('/');
        const response = await fetch(`${env.CLOUDFLARE_R2_URL}/${encodeURIComponent(bucket)}/${path}`, {
          headers: { Range: 'bytes=0-0' }, redirect: 'manual', signal: AbortSignal.timeout(15000),
        });
        assert.ok(![200, 206].includes(response.status), 'An R2 object was anonymously readable through the S3 endpoint');
        checked += 1;
      }
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
  }
  console.log(`PASS: ${checked} R2 objects deny anonymous reads through the S3 endpoint.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
