import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { membershipError, requireMember } from '@/lib/membership/server';
import { canDiscoverProfile } from '@/lib/profile-eligibility';
import { authorizePhotoPath } from '@/lib/photo-access';
import { authLib } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const PUBLIC_PROFILE_DETAIL_COLUMNS = 'id,user_id,profile_id,first_name,last_name,gender,age,height_cm,weight_kg,religion,caste,sub_caste,rasi,nakshatra,padam,gothram,city,native_place,education,company_name,annual_income,about_me,family_type,father_name,father_occupation,mother_name,mother_occupation,siblings,marital_status,is_verified,id_verification_status,horoscope_verification_status,is_suspended,deleted_at,users!inner(email_verified,mobile_verified)' as const;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  if (!id || id.length > 64) return NextResponse.json({ error: 'Invalid profile.' }, { status: 400 });

  let { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select(PUBLIC_PROFILE_DETAIL_COLUMNS)
    .eq('profile_id', id)
    .eq('is_suspended', false)
    .eq('is_banned', false)
    .is('deleted_at', null)
    .eq('users.status', 'active')
    .is('users.deleted_at', null)
    .maybeSingle();

  if (!profile && !error) {
    const { data: alias } = await supabaseAdmin
      .from('profile_id_aliases')
      .select('profile_uuid')
      .eq('old_id', id)
      .maybeSingle();
    if (alias?.profile_uuid) {
      const result = await supabaseAdmin
        .from('profiles')
        .select(PUBLIC_PROFILE_DETAIL_COLUMNS)
        .eq('id', alias.profile_uuid)
        .eq('is_suspended', false)
        .eq('is_banned', false)
        .is('deleted_at', null)
        .eq('users.status', 'active')
        .is('users.deleted_at', null)
        .maybeSingle();
      profile = result.data;
      error = result.error;
    }
  }

  if (error || !profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  if (!(await canDiscoverProfile(profile.user_id))) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

  const { data: block } = await supabaseAdmin
    .from('blocked_users')
    .select('id')
    .or(`and(blocker_user_id.eq.${member.memberId},blocked_user_id.eq.${profile.user_id}),and(blocker_user_id.eq.${profile.user_id},blocked_user_id.eq.${member.memberId})`)
    .maybeSingle();
  if (block) return NextResponse.json({ error: 'Profile unavailable.' }, { status: 404 });

  let viewUsage: Record<string, unknown> | null = null;
  if (!member.isAdmin && profile.user_id !== member.memberId) {
    const result = await supabaseAdmin.rpc('consume_profile_view', {
      actor: member.memberId,
      target_profile: profile.id,
    });
    if (result.error) {
      const mapped = membershipError(result.error);
      return NextResponse.json(
        { error: mapped.message, upgrade_required: mapped.status === 429 },
        { status: mapped.status },
      );
    }
    viewUsage = result.data as Record<string, unknown>;
  }

  const { data: gallery, error: galleryError } = await supabaseAdmin
    .from('gallery_images')
    .select('id,user_id,image_url,thumbnail_url,display_key,thumbnail_key,is_profile_picture,sort_order,uploaded_at')
    .eq('user_id', profile.user_id)
    .eq('moderation_status', 'approved')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('uploaded_at', { ascending: true });
  if (galleryError) return NextResponse.json({ error: 'Unable to load profile photos.' }, { status: 500 });
  const access = await authLib.getServerAccess();
  const allowedGallery = await Promise.all((gallery || []).map(async photo => {
    if (!access || !photo.display_key || !(await authorizePhotoPath(photo.display_key, access))) return null;
    return { id: photo.id, user_id: photo.user_id, is_profile_picture: photo.is_profile_picture,
      sort_order: photo.sort_order, uploaded_at: photo.uploaded_at,
      image_url: `/api/photos?path=${encodeURIComponent(photo.display_key)}`,
      thumbnail_url: `/api/photos?path=${encodeURIComponent(photo.thumbnail_key || photo.display_key)}` };
  }));

  const { data: paidSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('id,plan:subscription_plans!inner(price)')
    .eq('user_id', profile.user_id)
    .eq('payment_status', 'Completed')
    .lte('start_date', new Date().toISOString())
    .gt('end_date', new Date().toISOString())
    .gt('plan.price', 0)
    .limit(1)
    .maybeSingle();

  return NextResponse.json(
    { profile: { ...profile, is_premium: Boolean(paidSubscription) }, galleryImages: allowedGallery.filter(Boolean), viewUsage },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
