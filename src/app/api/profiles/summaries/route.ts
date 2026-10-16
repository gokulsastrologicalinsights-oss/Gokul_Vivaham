import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMember } from '@/lib/membership/server';
import { createRequestClient, supabaseAdmin } from '@/lib/supabase/server';
import { authLib } from '@/lib/auth';
import { withAuthorizedCardPhotos } from '@/lib/profile-card-photos';

const input = z.object({ userIds: z.array(z.uuid()).min(1).max(100) }).strict();

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

  const client = await createRequestClient();
  const { data, error } = await client.rpc('discover_profile_cards', { filters: { userIds: authorizedIds } });
  const access = await authLib.getServerAccess();
  if (error || !access) return NextResponse.json({ error: 'Could not load member summaries.' }, { status: 503 });
  const cards = (data?.profiles || []) as Array<Record<string, unknown> & { user_id: string }>;
  // Relationship summaries expose only the fields the existing UI needs.
  const profiles = cards.map(p => ({ id: p.id, user_id: p.user_id, profile_id: p.profile_id,
    first_name: p.first_name, last_name: p.last_name, age: p.age, city: p.city,
    nakshatra: p.nakshatra, rasi: p.rasi, education: p.education, gender: p.gender,
    is_verified: p.is_verified, id_verification_status: p.id_verification_status,
    horoscope_verification_status: p.horoscope_verification_status, users: p.users, is_premium: p.is_premium }));
  try {
    return NextResponse.json({ profiles: await withAuthorizedCardPhotos(profiles, access) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not load member summaries.' }, { status: 503 });
  }
}
