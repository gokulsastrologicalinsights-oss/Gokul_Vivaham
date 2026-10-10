import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { assertStoragePath, getR2SignedUrl, PHOTO_SIGNED_URL_TTL_SECONDS, type StorageBucket } from '@/lib/r2';
import { authorizePhotoPath } from '@/lib/photo-access';

function validBucket(value: string | null): value is StorageBucket {
  return value === 'photos' || value === 'horoscopes' || value === 'id-proofs';
}

export async function GET(request: Request) {
  const access = await authLib.getServerAccess();
  if (!access || access.mfaRequired) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const bucket = params.get('bucket');
  const path = params.get('path') || '';
  if (!validBucket(bucket)) return NextResponse.json({ error: 'Invalid storage bucket.' }, { status: 400 });
  try { assertStoragePath(path); } catch { return NextResponse.json({ error: 'Invalid storage path.' }, { status: 400 }); }
  if (bucket === 'photos') {
    if (!(await authorizePhotoPath(path, access))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else if (!access.isAdmin && !path.startsWith(`${access.user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const url = await getR2SignedUrl(bucket, path, bucket === 'photos' ? PHOTO_SIGNED_URL_TTL_SECONDS : Number(params.get('expiresIn') || 300));
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Document access denied.' }, { status: 404 });
  }
}
