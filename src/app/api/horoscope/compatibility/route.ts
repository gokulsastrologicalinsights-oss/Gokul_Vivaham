import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMemberEntitlements, requireMember } from '@/lib/membership/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateCompatibility } from '@/utils/generateCompatibility';
import { canDiscoverProfile } from '@/lib/profile-eligibility';

const input = z.object({ targetUserId: z.uuid() }).strict();

export async function POST(request: Request) {
  const member = await requireMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.targetUserId === member.memberId) {
    return NextResponse.json({ error: 'A valid match profile is required.' }, { status: 400 });
  }

  if (!(await canDiscoverProfile(parsed.data.targetUserId))) return NextResponse.json({ error: 'Match profile is unavailable.' }, { status: 404 });
  const [{ data: profiles, error }, entitlements] = await Promise.all([
    supabaseAdmin
    .from('profiles')
    .select('user_id,rasi,nakshatra,padam,is_suspended,deleted_at,users!inner(id)')
    .in('user_id', [member.memberId, parsed.data.targetUserId])
    .eq('users.status', 'active')
    .is('users.deleted_at', null),
    getMemberEntitlements(member.memberId),
  ]);
  if (error || profiles?.length !== 2) return NextResponse.json({ error: 'Horoscope details are unavailable.' }, { status: 404 });
  const mine = profiles.find((profile) => profile.user_id === member.memberId);
  const target = profiles.find((profile) => profile.user_id === parsed.data.targetUserId);
  if (!mine || !target || target.is_suspended || target.deleted_at) {
    return NextResponse.json({ error: 'Match profile is unavailable.' }, { status: 404 });
  }
  const { data: block } = await supabaseAdmin
    .from('blocked_users')
    .select('id')
    .or(`and(blocker_user_id.eq.${member.memberId},blocked_user_id.eq.${parsed.data.targetUserId}),and(blocker_user_id.eq.${parsed.data.targetUserId},blocked_user_id.eq.${member.memberId})`)
    .maybeSingle();
  if (block) return NextResponse.json({ error: 'Match profile is unavailable.' }, { status: 404 });

  const percentage = generateCompatibility(
    { rasi: mine.rasi || '', nakshatra: mine.nakshatra || '', padam: mine.padam },
    { rasi: target.rasi || '', nakshatra: target.nakshatra || '', padam: target.padam },
  );
  return NextResponse.json(
    {
      percentage,
      access: entitlements.horoscope_percentage_level === 'unlimited' ? 'unlimited_percentage' : 'basic_percentage',
      detailed_report_included: Number(entitlements.horoscope_remaining || 0) > 0,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
