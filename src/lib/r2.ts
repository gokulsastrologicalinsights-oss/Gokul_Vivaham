import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type StorageBucket = 'photos' | 'horoscopes' | 'id-proofs';

const bucketEnv: Record<StorageBucket, string | undefined> = {
  photos: process.env.R2_PROFILE_PHOTOS_BUCKET,
  horoscopes: process.env.R2_HOROSCOPES_BUCKET,
  'id-proofs': process.env.R2_ID_PROOFS_BUCKET,
};

const endpoint = process.env.CLOUDFLARE_R2_URL?.trim();
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();

const client = endpoint && accessKeyId && secretAccessKey
  ? new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

const pathPattern = /^[0-9a-f-]{36}\/(?:[0-9a-f-]{36}\/(?:thumbnail|display)\.webp|[^/]{1,120}\.(pdf|jpg|png|webp))$/;

export function assertStoragePath(path: string) {
  if (!pathPattern.test(path)) throw new Error('Invalid private storage path.');
  return path;
}

export function getR2Bucket(bucket: StorageBucket) {
  const name = bucketEnv[bucket]?.trim();
  if (!name) throw new Error(`R2 bucket is not configured for ${bucket}.`);
  return name;
}

function getClient() {
  if (!client) throw new Error('Cloudflare R2 is not configured on the server.');
  return client;
}

export async function putR2Object(
  bucket: StorageBucket,
  path: string,
  body: Uint8Array,
  contentType: string,
) {
  assertStoragePath(path);
  await getClient().send(new PutObjectCommand({
    Bucket: getR2Bucket(bucket),
    Key: path,
    Body: body,
    ContentType: contentType,
    CacheControl: 'private, no-store',
  }));
}

export async function getR2Object(bucket: StorageBucket, path: string) {
  assertStoragePath(path);
  const result = await getClient().send(new GetObjectCommand({
    Bucket: getR2Bucket(bucket),
    Key: path,
  }));
  if (!result.Body) throw new Error('Object body is empty.');
  return {
    bytes: await result.Body.transformToByteArray(),
    contentType: result.ContentType || 'application/octet-stream',
  };
}

export async function getR2SignedUrl(bucket: StorageBucket, path: string, expiresIn = 300) {
  assertStoragePath(path);
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: getR2Bucket(bucket), Key: path }),
    { expiresIn: Math.min(300, Math.max(30, expiresIn)) },
  );
}

export async function deleteR2Objects(bucket: StorageBucket, paths: string[]) {
  const cleanPaths = paths.filter(Boolean).map(assertStoragePath);
  if (!cleanPaths.length) return;
  const r2 = getClient();
  const bucketName = getR2Bucket(bucket);
  for (let index = 0; index < cleanPaths.length; index += 1000) {
    const chunk = cleanPaths.slice(index, index + 1000);
    const result = await r2.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: chunk.map(Key => ({ Key })), Quiet: true },
    }));
    if (result.Errors?.length) throw new Error('One or more R2 objects could not be deleted.');
  }
}
