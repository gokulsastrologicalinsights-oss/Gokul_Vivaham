import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { assertStoragePath, deleteR2Objects, type StorageBucket } from '@/lib/r2';

function validBucket(value: unknown): value is StorageBucket {
  return value === 'photos' || value === 'horoscopes' || value === 'id-proofs';
}

export async function DELETE(request: Request) {
  const access = await authLib.getServerAccess();
  if (!access || access.mfaRequired) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { bucket?: unknown; path?: unknown } | null;
  if (!validBucket(body?.bucket) || typeof body?.path !== 'string') return NextResponse.json({ error: 'Invalid storage object.' }, { status: 400 });
  try { assertStoragePath(body.path); } catch { return NextResponse.json({ error: 'Invalid storage path.' }, { status: 400 }); }
  if (!access.isAdmin && !body.path.startsWith(`${access.user.id}/`)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    await deleteR2Objects(body.bucket, [body.path]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Storage object could not be deleted.' }, { status: 503 });
  }
}
