import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getMemberEntitlements } from '@/lib/membership/server';

type BlockRow = { blocker_user_id: string; blocked_user_id: string };
type MatchProfile = Record<string, unknown> & { user_id: string; image_url?: string | null };
type ProfilePhoto = { user_id: string; image_url: string | null; thumbnail_url: string | null };
const MATCH_CARD_COLUMNS = 'id,user_id,profile_id,first_name,last_name,gender,age,height_cm,religion,caste,sub_caste,rasi,nakshatra,padam,gothram,city,native_place,education,company_name,annual_income,about_me,family_type,siblings,is_verified,marital_status,id_verification_status,horoscope_verification_status,users!inner(email_verified,mobile_verified)' as const;

export async function GET(request: Request) {
  const access = await authLib.getServerAccess();
  if (!access || access.mfaRequired) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const filters = {
    gender: params.get('gender') || '', ageMin: Number(params.get('ageMin') || 0), ageMax: Number(params.get('ageMax') || 0),
    religion: params.get('religion') || '', caste: params.get('caste') || '', rasi: params.get('rasi') || '',
    star: params.get('star') || '', padam: params.get('padam') || '', location: params.get('location') || '', profession: params.get('profession') || '',
  };
  const advancedRequested = Boolean(filters.caste || filters.rasi || filters.star || filters.padam || filters.location || filters.profession);
  try {
    const { data: viewer } = await supabaseAdmin.from('users').select('id').eq('auth_user_id', access.user.id).maybeSingle();
    if (!viewer) return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    const membership = await getMemberEntitlements(viewer.id);
    const searchEnabled = access.isAdmin || membership.advanced_filters_enabled === true;
    if (advancedRequested && !searchEnabled) return NextResponse.json({ error: 'Advanced search requires an active plan.', upgrade_required: true }, { status: 403 });

    const { data: blocks } = await supabaseAdmin.from('blocked_users').select('blocker_user_id,blocked_user_id').or(`blocker_user_id.eq.${viewer.id},blocked_user_id.eq.${viewer.id}`);
    const blocked = new Set(((blocks || []) as BlockRow[]).map((row) => row.blocker_user_id === viewer.id ? row.blocked_user_id : row.blocker_user_id));
    let query = supabaseAdmin.from('profiles').select(MATCH_CARD_COLUMNS).neq('user_id', viewer.id)
      .eq('is_suspended', false).eq('is_banned', false).is('deleted_at', null)
      .eq('users.status', 'active').is('users.deleted_at', null);
    if (filters.gender) query = query.eq('gender', filters.gender);
    if (filters.ageMin) query = query.gte('age', filters.ageMin);
    if (filters.ageMax) query = query.lte('age', filters.ageMax);
    if (filters.religion) query = query.eq('religion', filters.religion);
    if (searchEnabled && filters.caste) query = query.ilike('caste', `%${filters.caste}%`);
    if (searchEnabled && filters.rasi) query = query.eq('rasi', filters.rasi);
    if (searchEnabled && filters.star) query = query.ilike('nakshatra', `%${filters.star}%`);
    if (searchEnabled && filters.padam) query = query.eq('padam', filters.padam);
    if (searchEnabled && filters.location) query = query.ilike('city', `%${filters.location}%`);
    if (searchEnabled && filters.profession) query = query.ilike('education', `%${filters.profession}%`);
    const { data, error } = await query.limit(500);
    if (error) throw error;
    const profiles = (data || []) as unknown as MatchProfile[];
    const visibleUserIds = profiles.map((row) => row.user_id);
    const { data: approvedPhotos, error: photoError } = visibleUserIds.length
      ? await supabaseAdmin.from('gallery_images').select('user_id,image_url,thumbnail_url').in('user_id', visibleUserIds).eq('is_profile_picture', true).eq('moderation_status', 'approved').is('deleted_at', null)
      : { data: [], error: null };
    if (photoError) throw photoError;
    const photoMap = new Map<string, string | null>(((approvedPhotos || []) as ProfilePhoto[]).map((photo) => [photo.user_id, photo.thumbnail_url || photo.image_url]));
    return NextResponse.json({ profiles: profiles.filter((row) => !blocked.has(row.user_id)).map((row) => ({ ...row, image_url: photoMap.get(row.user_id) || null, is_premium: false })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Matches API failed', error);
    return NextResponse.json({ error: 'Could not load matches.' }, { status: 500 });
  }
}
