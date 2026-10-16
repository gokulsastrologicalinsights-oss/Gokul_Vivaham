import 'server-only';
import type { Access } from '@/lib/auth/access';
import { authorizePhotoPath } from '@/lib/photo-access';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function withAuthorizedCardPhotos<T extends { user_id: string }>(profiles: T[], access: Access) {
  if (!profiles.length) return [];
  const { data: photos, error } = await supabaseAdmin.from('gallery_images')
    .select('user_id,thumbnail_key,display_key').in('user_id', profiles.map(p => p.user_id))
    .eq('is_profile_picture', true).eq('moderation_status', 'approved').is('deleted_at', null);
  if (error) throw error;
  const urls = new Map<string, string>();
  await Promise.all((photos || []).map(async photo => {
    const path = photo.thumbnail_key || photo.display_key;
    if (path && await authorizePhotoPath(path, access)) urls.set(photo.user_id, `/api/photos?path=${encodeURIComponent(path)}`);
  }));
  return profiles.map(profile => ({ ...profile, image_url: urls.get(profile.user_id) || null }));
}
