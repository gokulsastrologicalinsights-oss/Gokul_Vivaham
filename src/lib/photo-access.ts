import { supabaseAdmin } from '@/lib/supabase/server';
import type { Access } from '@/lib/auth/access';

export const PHOTO_VARIANT_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(?:thumbnail|display)\.webp$/;

const photoFields = 'id,user_id,moderation_status,is_profile_picture,privacy_level,is_private,display_key,thumbnail_key,image_url,thumbnail_url,deleted_at';

type PhotoRow = {
  id: string;
  user_id: string;
  moderation_status: string;
  is_profile_picture: boolean;
  privacy_level: string | null;
  is_private: boolean;
  display_key: string | null;
  thumbnail_key: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  deleted_at: string | null;
};

type PhotoVersion = {
  id: string;
  gallery_image_id: string;
  user_id: string;
  display_key: string;
  thumbnail_key: string;
  moderation_status: string;
};

export type AuthorizedPhoto = {
  photo: PhotoRow;
  version: PhotoVersion | null;
};

async function findPhoto(path: string) {
  let { data: photo, error } = await supabaseAdmin
    .from('gallery_images')
    .select(photoFields)
    .is('deleted_at', null)
    .eq('display_key', path)
    .maybeSingle();

  if (!photo && !error) {
    ({ data: photo, error } = await supabaseAdmin
      .from('gallery_images')
      .select(photoFields)
      .is('deleted_at', null)
      .eq('thumbnail_key', path)
      .maybeSingle());
  }

  if (error) return { photo: null, version: null, error };
  if (photo) return { photo: photo as PhotoRow, version: null, error: null };

  const versionResult = await supabaseAdmin
    .from('gallery_photo_versions')
    .select('id,gallery_image_id,user_id,display_key,thumbnail_key,moderation_status')
    .or(`display_key.eq.${path},thumbnail_key.eq.${path}`)
    .maybeSingle();
  if (versionResult.error || !versionResult.data) {
    return { photo: null, version: null, error: versionResult.error };
  }

  const currentResult = await supabaseAdmin
    .from('gallery_images')
    .select(photoFields)
    .eq('id', versionResult.data.gallery_image_id)
    .is('deleted_at', null)
    .maybeSingle();
  return {
    photo: currentResult.data as PhotoRow | null,
    version: versionResult.data as PhotoVersion,
    error: currentResult.error,
  };
}

async function hasPremiumAccess(access: Access, viewerAccountId: string) {
  if (['silver', 'gold', 'diamond'].includes(access.role)) return true;
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('plan:subscription_plans(photo_viewing_enabled)')
    .eq('user_id', viewerAccountId)
    .eq('payment_status', 'Completed')
    .lte('start_date', new Date().toISOString())
    .gt('end_date', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return !error && Boolean((data?.plan as { photo_viewing_enabled?: boolean } | null)?.photo_viewing_enabled);
}

async function hasLikeOrAcceptedMatch(ownerId: string, viewerId: string) {
  const { data, error } = await supabaseAdmin
    .from('match_requests')
    .select('id')
    .or(`and(sender_user_id.eq.${ownerId},receiver_user_id.eq.${viewerId}),and(sender_user_id.eq.${viewerId},receiver_user_id.eq.${ownerId})`)
    .in('status', ['pending', 'accepted'])
    .limit(1);
  return !error && Boolean(data?.length);
}

export async function authorizePhotoPath(path: string, access: Access): Promise<AuthorizedPhoto | null> {
  if (!PHOTO_VARIANT_PATH.test(path)) return null;

  const located = await findPhoto(path);
  if (located.error || !located.photo) return null;

  const viewerAccountId = access.isAdmin
    ? null
    : (await supabaseAdmin.from('users').select('id').eq('auth_user_id', access.user.id).maybeSingle()).data?.id || null;
  if (!access.isAdmin && !viewerAccountId) return null;

  const isOwner = viewerAccountId === located.photo.user_id;
  if (located.version && !isOwner && !access.isAdmin && located.version.moderation_status !== 'approved') return null;
  if (isOwner || access.isAdmin) return { photo: located.photo, version: located.version };

  if (located.photo.moderation_status !== 'approved' || located.photo.is_private || located.photo.deleted_at) return null;

  const [{ data: profile, error: profileError }, { data: account, error: accountError }, { data: blocked, error: blockedError }] = await Promise.all([
    supabaseAdmin.from('profiles').select('visibility,is_suspended,deleted_at,profile_photo_visibility,album_photo_visibility').eq('user_id', located.photo.user_id).maybeSingle(),
    supabaseAdmin.from('users').select('status,deleted_at').eq('id', located.photo.user_id).maybeSingle(),
    supabaseAdmin.from('blocked_users').select('id').or(`and(blocker_user_id.eq.${viewerAccountId},blocked_user_id.eq.${located.photo.user_id}),and(blocker_user_id.eq.${located.photo.user_id},blocked_user_id.eq.${viewerAccountId})`).limit(1),
  ]);
  if (profileError || accountError || blockedError || !profile || !account || blocked?.length) return null;
  if (profile.visibility !== 'public' || profile.is_suspended || profile.deleted_at || account.status !== 'active' || account.deleted_at) return null;

  if (located.photo.privacy_level === 'hidden') return null;
  if (located.photo.privacy_level === 'matches_only' && !(await hasLikeOrAcceptedMatch(located.photo.user_id, viewerAccountId))) return null;
  if (located.photo.privacy_level === 'premium_only' && !(await hasPremiumAccess(access, viewerAccountId))) return null;

  const visibility = located.photo.is_profile_picture ? profile.profile_photo_visibility : profile.album_photo_visibility;
  if (visibility === 'liked_and_premium') {
    const premium = await hasPremiumAccess(access, viewerAccountId);
    if (!premium && !(await hasLikeOrAcceptedMatch(located.photo.user_id, viewerAccountId))) return null;
  } else if (visibility !== 'all_members') {
    return null;
  }

  return { photo: located.photo, version: located.version };
}
