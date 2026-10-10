import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { deleteR2Objects, getR2Object, getR2SignedUrl, PHOTO_SIGNED_URL_TTL_SECONDS } from '@/lib/r2';
import { authorizePhotoPath, PHOTO_VARIANT_PATH } from '@/lib/photo-access';
import { readPhotoVariantMetadata } from '@/lib/photo-processing';
import { z } from 'zod';

const variantPath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(?:thumbnail|display)\.webp$/;
const cropSchema = z.object({
  mode: z.enum(['fit', 'fill']),
  zoom: z.number().min(1).max(3),
  offsetX: z.number().min(-2000).max(2000),
  offsetY: z.number().min(-2000).max(2000),
  rotation: z.number().int().min(-360).max(360),
}).strict();
const input = z.object({
  displayPath: z.string().regex(variantPath),
  thumbnailPath: z.string().regex(variantPath),
  primary: z.boolean().default(false),
  replacePhotoId: z.uuid().optional(),
  crop: cropSchema.optional().default({ mode: 'fill', zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 }),
}).superRefine((value, context) => {
  if (value.displayPath.split('/')[0] !== value.thumbnailPath.split('/')[0] || value.displayPath.split('/')[1] !== value.thumbnailPath.split('/')[1]) {
    context.addIssue({ code: 'custom', path: ['thumbnailPath'], message: 'Photo variants must belong to the same upload.' });
  }
}).strict();
export async function POST(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return NextResponse.json({error:'Forbidden'},{status:403});
  const user=await authLib.getServerUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:'Invalid photo'},{status:400});
  const { displayPath, thumbnailPath, primary, replacePhotoId, crop } = parsed.data;
  let displayBytes: Uint8Array;
  let thumbnailBytes: Uint8Array;
  try {
    const [displayObject, thumbnailObject] = await Promise.all([
      getR2Object('photos', displayPath),
      getR2Object('photos', thumbnailPath),
    ]);
    displayBytes = displayObject.bytes;
    thumbnailBytes = thumbnailObject.bytes;
  } catch {
    return NextResponse.json({ error: 'Photo variants are unavailable. Please retry the upload.' }, { status: 409 });
  }
  let displayMetadata;
  let thumbnailMetadata;
  try {
    [displayMetadata, thumbnailMetadata] = await Promise.all([
      readPhotoVariantMetadata(displayBytes),
      readPhotoVariantMetadata(thumbnailBytes),
    ]);
  } catch {
    await deleteR2Objects('photos', [displayPath, thumbnailPath]).catch(() => undefined);
    return NextResponse.json({ error: 'Photo variants are invalid. Please retry the upload.' }, { status: 409 });
  }
  const { data, error } = replacePhotoId
    ? await supabaseAdmin.rpc('replace_member_photo', {
        actor: user.id,
        photo_id: replacePhotoId,
        display_path: displayPath,
        thumbnail_path: thumbnailPath,
        crop,
      })
    : await supabaseAdmin.rpc('attach_member_photo', {
        actor: user.id,
        display_path: displayPath,
        thumbnail_path: thumbnailPath,
        primary_photo: primary,
      });
  if(error) {
    await deleteR2Objects('photos', [displayPath, thumbnailPath]).catch(() => undefined);
    const message = error.message.startsWith('Maximum two photos')
      ? 'Both photo slots are already occupied. Refresh your photos to manage the existing uploads.'
      : error.message.includes('photo changes')
        ? 'You have reached the maximum of 3 photo changes.'
        : 'Your photo could not be saved. Please contact support if this continues.';
    console.error('Photo attachment failed', { code: error.code, operation: replacePhotoId ? 'replace' : 'attach' });
    return NextResponse.json({ error: message }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  }
  const table = replacePhotoId ? 'gallery_photo_versions' : 'gallery_images';
  const { data: savedPhoto, error: metadataError } = await supabaseAdmin
    .from(table)
    .update({
      image_format: 'webp',
      thumbnail_width: thumbnailMetadata.width,
      thumbnail_height: thumbnailMetadata.height,
      thumbnail_bytes: thumbnailMetadata.bytes,
      display_width: displayMetadata.width,
      display_height: displayMetadata.height,
      display_bytes: displayMetadata.bytes,
      ...(!replacePhotoId ? { crop_metadata: crop } : {}),
    })
    .eq('id', (data as { id: string }).id)
    .select('*')
    .maybeSingle();
  if (metadataError || !savedPhoto) {
    await deleteR2Objects('photos', [displayPath, thumbnailPath]).catch(() => undefined);
    if ((data as { id?: string })?.id) await supabaseAdmin.from(table).delete().eq('id', (data as { id: string }).id);
    return NextResponse.json({ error: 'Photo metadata could not be saved. Please retry.' }, { status: 503 });
  }
  return NextResponse.json({ photo: savedPhoto, replacement: Boolean(replacePhotoId) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const user = await authLib.getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: unknown; photoId?: unknown } | null;
  if (body?.action !== 'set_primary' || typeof body.photoId !== 'string' || !z.uuid().safeParse(body.photoId).success) {
    return NextResponse.json({ error: 'Invalid photo action.' }, { status: 400 });
  }
  const { error } = await supabaseAdmin.rpc('set_member_primary_photo', { actor: user.id, photo_id: body.photoId });
  if (error) return NextResponse.json({ error: error.message || 'Only an approved photo can be selected as primary.' }, { status: 409 });
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const user = await authLib.getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { photoId?: unknown } | null;
  if (typeof body?.photoId !== 'string' || !z.uuid().safeParse(body.photoId).success) return NextResponse.json({ error: 'Invalid photo.' }, { status: 400 });
  const account = await supabaseAdmin.from('users').select('id').eq('auth_user_id', user.id).maybeSingle();
  if (account.error || !account.data) return NextResponse.json({ error: 'Photo could not be deleted. Please refresh and retry.' }, { status: 409 });
  const [photoResult, versionResult] = await Promise.all([
    supabaseAdmin.from('gallery_images').select('id,display_key,thumbnail_key').eq('id', body.photoId).eq('user_id', account.data.id).is('deleted_at', null).maybeSingle(),
    supabaseAdmin.from('gallery_photo_versions').select('display_key,thumbnail_key').eq('gallery_image_id', body.photoId).eq('user_id', account.data.id).eq('moderation_status', 'pending').maybeSingle(),
  ]);
  if (photoResult.error || versionResult.error || !photoResult.data) return NextResponse.json({ error: 'Photo could not be deleted. Please refresh and retry.' }, { status: 409 });
  const paths = [photoResult.data.display_key, photoResult.data.thumbnail_key, versionResult.data?.display_key, versionResult.data?.thumbnail_key].filter((path): path is string => Boolean(path));
  const { error } = await supabaseAdmin.rpc('delete_member_photo', { actor: user.id, photo_id: body.photoId });
  if (error) return NextResponse.json({ error: 'Photo could not be deleted. Please refresh and retry.' }, { status: 409 });
  await deleteR2Objects('photos', paths).catch(() => undefined);
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request:Request) {
  const denied=()=>new Response('Photo unavailable',{status:404,headers:{'Cache-Control':'no-store'}});
  const access=await authLib.getServerAccess();
  if(!access || access.mfaRequired) return denied();
  const path=new URL(request.url).searchParams.get('path')||'';
  if (!path) {
    const { data: account, error: accountError } = await supabaseAdmin
      .from('users').select('id').eq('auth_user_id', access.user.id).maybeSingle();
    if (accountError || !account) return denied();
    const [{ data: photos, error: photosError }, { data: versions, error: versionsError }, { data: profile, error: profileError }, { data: deletedPhotos, error: deletedError }] = await Promise.all([
      supabaseAdmin.from('gallery_images').select('*').eq('user_id', account.id).is('deleted_at', null).order('sort_order', { ascending: true }).order('uploaded_at', { ascending: true }),
      supabaseAdmin.from('gallery_photo_versions').select('*').eq('user_id', account.id).eq('moderation_status', 'pending').order('submitted_at', { ascending: true }),
      supabaseAdmin.from('profiles').select('photo_replacement_count').eq('user_id', account.id).maybeSingle(),
      supabaseAdmin.from('gallery_images').select('id').eq('user_id', account.id).not('deleted_at', 'is', null).limit(1),
    ]);
    const errors = [photosError, versionsError, profileError, deletedError].filter(Boolean);
    if (errors.length) {
      console.error('Photo gallery query failed', { codes: errors.map(error => error?.code) });
      return NextResponse.json({
        error: 'Photo management is temporarily unavailable. Your existing photos have been preserved. Please contact support.',
      }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    const pendingByPhoto = new Map((versions || []).map((version: any) => [version.gallery_image_id, version]));
    const replacementCount = profile?.photo_replacement_count || 0;
    return NextResponse.json({
      photos: (photos || []).map((photo: any) => ({ ...photo, pending_replacement: pendingByPhoto.get(photo.id) || null })),
      replacementCount,
      replacementsRemaining: Math.max(0, 3 - replacementCount),
      hasDeletedPhoto: Boolean(deletedPhotos?.length),
    }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if(!PHOTO_VARIANT_PATH.test(path)) return denied();
  if (!(await authorizePhotoPath(path, access))) return denied();
  try {
    const signedUrl = await getR2SignedUrl('photos', path, PHOTO_SIGNED_URL_TTL_SECONDS);
    return NextResponse.redirect(signedUrl, {
      status: 307,
      headers: {
        'Cache-Control': `private, max-age=${Math.min(90, PHOTO_SIGNED_URL_TTL_SECONDS)}, must-revalidate`,
        Vary: 'Cookie',
      },
    });
  } catch {
    return denied();
  }
}
