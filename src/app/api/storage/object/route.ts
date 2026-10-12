import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { assertStoragePath, deleteR2Objects, type StorageBucket } from '@/lib/r2';

function validBucket(value: unknown): value is StorageBucket {
  return value === 'photos' || value === 'horoscopes' || value === 'id-proofs';
}

export async function DELETE(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const access = await authLib.getServerAccess();
  if (!access || access.mfaRequired) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { bucket?: unknown; path?: unknown } | null;
  if (!validBucket(body?.bucket) || typeof body?.path !== 'string') return NextResponse.json({ error: 'Invalid storage object.' }, { status: 400 });
  try { assertStoragePath(body.path); } catch { return NextResponse.json({ error: 'Invalid storage path.' }, { status: 400 }); }
  if (!access.isAdmin && !body.path.startsWith(`${access.user.id}/`)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (body.bucket === 'photos') {
    const [current, version] = await Promise.all([
      supabaseAdmin.from('gallery_images').select('id').or(`display_key.eq.${body.path},thumbnail_key.eq.${body.path}`).is('deleted_at', null).limit(1),
      supabaseAdmin.from('gallery_photo_versions').select('id').or(`display_key.eq.${body.path},thumbnail_key.eq.${body.path}`).limit(1),
    ]);
    if (current.error || version.error) return NextResponse.json({ error: 'Storage object could not be checked.' }, { status: 503 });
    if (current.data?.length || version.data?.length) return NextResponse.json({ error: 'Managed photo objects must be deleted through the photo workflow.' }, { status: 409 });
  } else {
    const checks = [
      supabaseAdmin.from('verification_requests').select('id').eq('document_url', body.path).limit(1),
      ...(body.bucket === 'horoscopes'
        ? [supabaseAdmin.from('horoscope_uploads').select('id').eq('file_url', body.path).limit(1)]
        : [supabaseAdmin.from('profiles').select('user_id').eq('id_verification_document_url', body.path).limit(1)]),
    ];
    const references = await Promise.all(checks);
    if (references.some(result => result.error)) {
      return NextResponse.json({ error: 'Storage object could not be checked.' }, { status: 503 });
    }
    if (references.some(result => result.data?.length)) {
      return NextResponse.json({ error: 'Attached documents must be replaced through the verification workflow.' }, { status: 409 });
    }
  }
  try {
    await deleteR2Objects(body.bucket, [body.path]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Storage object could not be deleted.' }, { status: 503 });
  }
}
