import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { putR2Object, type StorageBucket } from '@/lib/r2';
import { createPhotoVariants, PHOTO_MAX_UPLOAD_BYTES, PHOTO_VARIANT_CONTENT_TYPE } from '@/lib/photo-processing';

export const runtime = 'nodejs';

const allowedTypes: Record<StorageBucket, string[]> = {
  photos: ['image/jpeg', 'image/png', 'image/webp'],
  horoscopes: ['application/pdf'],
  'id-proofs': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function validBucket(value: unknown): value is StorageBucket {
  return value === 'photos' || value === 'horoscopes' || value === 'id-proofs';
}

function detectExtension(bytes: Uint8Array) {
  if (bytes.subarray(0, 3).every((value, index) => value === [255, 216, 255][index])) return 'jpg';
  if (bytes.subarray(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])) return 'png';
  if (new TextDecoder().decode(bytes.subarray(0, 12)) === 'RIFF' && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP') return 'webp';
  if (new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-') return 'pdf';
  return null;
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const user = await authLib.getServerUser();
  if (!user) return NextResponse.json({ error: 'Please sign in before uploading.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const bucketValue = form?.get('bucket');
  const file = form?.get('file');
  if (!validBucket(bucketValue) || !(file instanceof File) || !file.size || (bucketValue === 'photos' ? file.size >= PHOTO_MAX_UPLOAD_BYTES : file.size > PHOTO_MAX_UPLOAD_BYTES))
    return NextResponse.json({ error: 'Choose a valid file no larger than 5MB.' }, { status: 400 });
  if (!allowedTypes[bucketValue].includes(file.type))
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = detectExtension(bytes);
  if (!extension || extension !== extensions[file.type] || (bucketValue === 'horoscopes' && extension !== 'pdf') || (bucketValue !== 'horoscopes' && extension === 'pdf'))
    return NextResponse.json({ error: 'The file contents do not match the selected file type.' }, { status: 400 });

  const uploadId = crypto.randomUUID();
  const path = `${user.id}/${uploadId}.${extension}`;
  try {
    if (bucketValue === 'photos') {
      const { thumbnail, display } = await createPhotoVariants(bytes);
      const thumbnailPath = `${user.id}/${uploadId}/thumbnail.webp`;
      const displayPath = `${user.id}/${uploadId}/display.webp`;
      await putR2Object(bucketValue, thumbnailPath, thumbnail, PHOTO_VARIANT_CONTENT_TYPE);
      try {
        await putR2Object(bucketValue, displayPath, display, PHOTO_VARIANT_CONTENT_TYPE);
      } catch (error) {
        const { deleteR2Objects } = await import('@/lib/r2');
        await deleteR2Objects(bucketValue, [thumbnailPath]).catch(() => undefined);
        throw error;
      }
      return NextResponse.json(
        { url: displayPath, displayUrl: displayPath, thumbnailUrl: thumbnailPath },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    await putR2Object(bucketValue, path, bytes, file.type);
    return NextResponse.json({ url: path }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'File upload failed. Please retry.' }, { status: 503 });
  }
}
