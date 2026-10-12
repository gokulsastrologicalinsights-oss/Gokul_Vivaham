import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMember } from '@/lib/membership/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const input = z.object({ userIds: z.array(z.uuid()).min(1).max(100) }).strict();
const SUMMARY_COLUMNS = 'id,user_id,profile_id,first_name,last_name,age,city,nakshatra,rasi,education,gender,is_verified,id_verification_status,horoscope_verification_status,users(email_verified,mobile_verified)' as const;

export async function POST(request: Request) {
  const member = await requireMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Valid member IDs are required.' }, { status: 400 });
  const requested = [...new Set(parsed.data.userIds)].filter((id) => id !== member.memberId);
  if (requested.length === 0) return NextResponse.json({ profiles: [] }, { headers: { 'Cache-Control': 'private, no-store' } });

  const [interests, chats, blocks] = await Promise.all([
    supabaseAdmin.from('match_requests').select('sender_user_id,receiver_user_id')
      .or(`sender_user_id.eq.${member.memberId},receiver_user_id.eq.${member.memberId}`),
    supabaseAdmin.from('chats').select('user_one,user_two')
      .or(`user_one.eq.${member.memberId},user_two.eq.${member.memberId}`),
    supabaseAdmin.from('blocked_users').select('blocker_user_id,blocked_user_id')
      .or(`blocker_user_id.eq.${member.memberId},blocked_user_id.eq.${member.memberId}`),
  ]);
  const relationshipError = interests.error || chats.error || blocks.error;
  if (relationshipError) return NextResponse.json({ error: 'Could not authorize member summaries.' }, { status: 500 });

  const allowed = new Set<string>();
  for (const row of interests.data || []) allowed.add(row.sender_user_id === member.memberId ? row.receiver_user_id : row.sender_user_id);
  for (const row of chats.data || []) allowed.add(row.user_one === member.memberId ? row.user_two : row.user_one);
  for (const row of blocks.data || []) allowed.add(row.blocker_user_id === member.memberId ? row.blocked_user_id : row.blocker_user_id);
  const authorizedIds = requested.filter((id) => allowed.has(id));
  if (authorizedIds.length === 0) return NextResponse.json({ profiles: [] }, { headers: { 'Cache-Control': 'private, no-store' } });

  const [{ data: profiles, error: profileError }, { data: photos, error: photoError }, { data: paid, error: paidError }] = await Promise.all([
    supabaseAdmin.from('profiles').select(SUMMARY_COLUMNS).in('user_id', authorizedIds),
    supabaseAdmin.from('gallery_images').select('user_id,image_url,thumbnail_url').in('user_id', authorizedIds)
      .eq('is_profile_picture', true).eq('moderation_status', 'approved').is('deleted_at', null),
    supabaseAdmin.from('subscriptions').select('user_id,plan:subscription_plans!inner(price)').in('user_id', authorizedIds)
      .eq('payment_status', 'Completed').lte('start_date', new Date().toISOString()).gt('end_date', new Date().toISOString()).gt('plan.price', 0),
  ]);
  if (profileError || photoError || paidError) return NextResponse.json({ error: 'Could not load member summaries.' }, { status: 500 });
  const photoMap = new Map((photos || []).map((photo) => [photo.user_id, photo.thumbnail_url || photo.image_url]));
  const paidIds = new Set((paid || []).map((subscription) => subscription.user_id));
  return NextResponse.json({
    profiles: (profiles || []).map((profile) => ({
      ...profile,
      image_url: photoMap.get(profile.user_id) || null,
      is_premium: paidIds.has(profile.user_id),
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
