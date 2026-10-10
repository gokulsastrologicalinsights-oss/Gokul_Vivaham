import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

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
    const { data: membership } = await supabaseAdmin.from('subscriptions').select('plan:subscription_plans(search_enabled)')
      .eq('user_id', viewer.id).eq('payment_status', 'Completed').lte('start_date', new Date().toISOString()).gt('end_date', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const searchEnabled = access.isAdmin || Boolean((membership?.plan as any)?.search_enabled);
    if (advancedRequested && !searchEnabled) return NextResponse.json({ error: 'Advanced search requires an active plan.', upgrade_required: true }, { status: 403 });

    const { data: blocks } = await supabaseAdmin.from('blocked_users').select('blocker_user_id,blocked_user_id').or(`blocker_user_id.eq.${viewer.id},blocked_user_id.eq.${viewer.id}`);
    const blocked = new Set((blocks || []).map((row: any) => row.blocker_user_id === viewer.id ? row.blocked_user_id : row.blocker_user_id));
    let query = supabaseAdmin.from('profiles').select(searchEnabled ? '*, users(email_verified,mobile_verified)' : 'user_id,profile_id,first_name,last_name,gender,age,religion,city,image_url,is_verified,users(email_verified,mobile_verified)').neq('user_id', viewer.id).eq('status', 'active').eq('is_suspended', false);
    if (filters.gender) query = query.eq('gender', filters.gender);
    if (filters.ageMin) query = query.gte('age', filters.ageMin);
    if (filters.ageMax) query = query.lte('age', filters.ageMax);
    if (filters.religion) query = query.eq('religion', filters.religion);
    if (searchEnabled && filters.caste) query = query.ilike('caste', `%${filters.caste}%`);
    if (searchEnabled && filters.rasi) query = query.eq('rasi', filters.rasi);
    if (searchEnabled && filters.star) query = query.ilike('nakshatra', `%${filters.star}%`);
    if (searchEnabled && filters.location) query = query.ilike('city', `%${filters.location}%`);
    if (searchEnabled && filters.profession) query = query.ilike('education', `%${filters.profession}%`);
    const { data, error } = await query.limit(500);
    if (error) throw error;
    const visibleUserIds = (data || []).map((row: any) => row.user_id);
    const { data: approvedPhotos, error: photoError } = visibleUserIds.length
      ? await supabaseAdmin.from('gallery_images').select('user_id,image_url,thumbnail_url').in('user_id', visibleUserIds).eq('is_profile_picture', true).eq('moderation_status', 'approved').is('deleted_at', null)
      : { data: [], error: null };
    if (photoError) throw photoError;
    const photoMap = new Map((approvedPhotos || []).map((photo: any) => [photo.user_id, photo.thumbnail_url || photo.image_url]));
    return NextResponse.json({ profiles: (data || []).filter((row: any) => !blocked.has(row.user_id)).map((row: any) => ({ ...row, image_url: photoMap.get(row.user_id) || null, is_premium: false })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Matches API failed', error);
    return NextResponse.json({ error: 'Could not load matches.' }, { status: 500 });
  }
}
