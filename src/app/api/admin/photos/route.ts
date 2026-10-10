import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { deleteR2Objects } from '@/lib/r2';
const input=z.object({photoId:z.uuid(),action:z.enum(['approve','reject','flag']),reason:z.string().trim().max(500).optional()}).strict();
const statuses = z.enum(['pending', 'approved', 'rejected', 'flagged']);

async function requireAdmin(request: Request) {
  const access = await authLib.getServerAccess();
  if (!access || access.mfaRequired) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!access.isAdmin) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { access };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;
  const statusResult = statuses.safeParse(new URL(request.url).searchParams.get('status') || 'pending');
  if (!statusResult.success) return NextResponse.json({ error: 'Invalid photo status.' }, { status: 400 });
  const status = statusResult.data;
  const [{ data: photos, error: photoError }, { data: versions, error: versionError }] = await Promise.all([
    supabaseAdmin.from('gallery_images').select('*').eq('moderation_status', status).order('uploaded_at', { ascending: false }),
    supabaseAdmin.from('gallery_photo_versions').select('*').eq('moderation_status', status).order('submitted_at', { ascending: false }),
  ]);
  if (photoError || versionError) return NextResponse.json({ error: 'Photo queue could not be loaded.' }, { status: 503 });
  const rows = [...(photos || []).map((photo: any) => ({
    ...photo,
    review_id: photo.id,
    is_replacement: false,
    submitted_at: photo.uploaded_at,
    preview_path: photo.display_key,
  })), ...(versions || []).map((version: any) => ({
    ...version,
    id: version.gallery_image_id,
    review_id: version.id,
    is_replacement: true,
    uploaded_at: version.submitted_at,
    preview_path: version.display_key,
    image_url: version.image_url,
    thumbnail_url: version.thumbnail_url,
  }))];
  const userIds = [...new Set(rows.map((row: any) => row.user_id))];
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from('profiles').select('user_id,first_name,last_name,profile_id').in('user_id', userIds)
    : { data: [] as any[] };
  const profileMap = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
  return NextResponse.json({
    photos: rows.map((row: any) => {
      const profile = profileMap.get(row.user_id);
      return {
        ...row,
        first_name: profile?.first_name || 'Unknown',
        last_name: profile?.last_name || 'User',
        profile_id: profile?.profile_id || 'GV-UNKNOWN',
        preview_url: row.preview_path ? `/api/photos?path=${encodeURIComponent(row.preview_path)}` : null,
      };
    }),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:'Invalid review'},{status:400});
  if (parsed.data.action !== 'approve' && !parsed.data.reason) return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
  const [pendingVersion, currentPhoto] = await Promise.all([
    supabaseAdmin.from('gallery_photo_versions')
    .select('previous_display_key,previous_thumbnail_key,display_key,thumbnail_key')
    .eq('gallery_image_id', parsed.data.photoId)
    .eq('moderation_status', 'pending')
    .maybeSingle(),
    supabaseAdmin.from('gallery_images').select('display_key,thumbnail_key,moderation_status').eq('id', parsed.data.photoId).maybeSingle(),
  ]);
  const {error}=await supabaseAdmin.rpc('review_member_photo',{actor:auth.access.user.id,photo_id:parsed.data.photoId,decision:{approve:'approved',reject:'rejected',flag:'flagged'}[parsed.data.action],reason:parsed.data.reason || null});
  if(error) return NextResponse.json({error:'Photo review could not be saved. Please refresh.'},{status:409});
  if (parsed.data.action === 'approve' && pendingVersion.data?.previous_display_key) {
    await deleteR2Objects('photos', [pendingVersion.data.previous_display_key, pendingVersion.data.previous_thumbnail_key].filter((path): path is string => Boolean(path))).catch(() => undefined);
  }
  if (parsed.data.action === 'reject') {
    const rejectedPaths = pendingVersion.data
      ? [pendingVersion.data.display_key, pendingVersion.data.thumbnail_key]
      : currentPhoto.data?.moderation_status === 'pending'
        ? [currentPhoto.data.display_key, currentPhoto.data.thumbnail_key]
        : [];
    await deleteR2Objects('photos', rejectedPaths.filter((path): path is string => Boolean(path))).catch(() => undefined);
  }
  return NextResponse.json({success:true});
}
