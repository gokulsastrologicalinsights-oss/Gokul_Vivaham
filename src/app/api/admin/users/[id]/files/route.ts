import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const access = await authLib.getServerAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!access.isAdmin || access.mfaRequired || !['admin', 'super_admin'].includes(access.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid member' }, { status: 400 });
  const [account, administrator] = await Promise.all([
    supabaseAdmin.from('users').select('id,auth_user_id,status,deleted_at').eq('id', id).maybeSingle(),
    supabaseAdmin.from('admin_users').select('id').eq('auth_user_id', id).maybeSingle(),
  ]);
  if (account.error || administrator.error) return NextResponse.json({ error: 'Could not check member' }, { status: 500 });
  if (!account.data || account.data.deleted_at || account.data.status !== 'active' || administrator.data) return NextResponse.json({ error: 'Active member account required' }, { status: 409 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = form?.get('kind');
  const uploadId = form?.get('uploadId');
  if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024 || !['photo', 'horoscope'].includes(String(kind)) || !z.uuid().safeParse(uploadId).success)
    return NextResponse.json({ error: 'Choose a photo or PDF no larger than 3MB.' }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? 'jpg'
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png'
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'webp'
    : bytes.toString('ascii', 0, 5) === '%PDF-' ? 'pdf' : null;
  if (!ext || (kind === 'horoscope' ? ext !== 'pdf' : ext === 'pdf')) return NextResponse.json({ error: 'Choose a valid JPEG, PNG, WebP photo or PDF horoscope.' }, { status: 400 });
  const bucket = kind === 'photo' ? 'photos' : 'horoscopes';
  const path = `${account.data.auth_user_id}/${uploadId}.${ext}`;
  const contentType = ext === 'pdf' ? 'application/pdf' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const stored = await supabaseAdmin.storage.from(bucket).upload(path, bytes, { contentType, upsert: false });
  if (stored.error && !['Duplicate', '409'].includes(String(stored.error.name)) && !/already exists|duplicate/i.test(stored.error.message))
    return NextResponse.json({ error: 'File upload failed. Retry the upload.' }, { status: 500 });
  // Stable upload IDs make retries reuse the same private file and review record.
  if (kind === 'photo') {
    const attached = await supabaseAdmin.rpc('attach_member_photo', { actor: account.data.auth_user_id, path, primary_photo: true });
    if (attached.error) {
      if (!stored.error) await supabaseAdmin.storage.from(bucket).remove([path]);
      return NextResponse.json({ error: 'Could not attach photo. Check the three-photo limit and retry.' }, { status: 409 });
    }
    if (attached.data.moderation_status !== 'approved') {
      const reviewed = await supabaseAdmin.rpc('review_member_photo', { actor: access.user.id, photo_id: attached.data.id, decision: 'approved' });
      if (reviewed.error) return NextResponse.json({ error: 'Photo saved but approval failed. Retry or review it in Photo Moderation.' }, { status: 500 });
    }
  } else {
    const previous = await supabaseAdmin.from('verification_requests').select('id,status').eq('user_id', id).eq('document_url', path).eq('verification_type', 'horoscope').maybeSingle();
    if (previous.error) return NextResponse.json({ error: 'Could not check document. Retry.' }, { status: 500 });
    if (previous.data?.status !== 'approved') {
      const submitted = previous.data ? { data: previous.data.id, error: null } : await supabaseAdmin.rpc('submit_member_document', { actor: account.data.auth_user_id, kind: 'horoscope', path, label: 'Horoscope supplied by administrator' });
      if (submitted.error) {
        if (!stored.error) await supabaseAdmin.storage.from(bucket).remove([path]);
        return NextResponse.json({ error: 'Could not attach horoscope. Check whether a document is already approved.' }, { status: 409 });
      }
      const reviewed = await supabaseAdmin.rpc('review_member_document', { actor: access.user.id, request_id: submitted.data, decision: 'approved', reason: null });
      if (reviewed.error) return NextResponse.json({ error: 'Document saved but approval failed. Retry or review it in Documents.' }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
