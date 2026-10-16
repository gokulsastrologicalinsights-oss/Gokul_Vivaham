import { NextResponse } from 'next/server';
import { z } from 'zod';
import { membershipError, requireMember } from '@/lib/membership/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateCompatibility } from '@/utils/generateCompatibility';
import { canDiscoverProfile } from '@/lib/profile-eligibility';

const input = z.object({
  targetUserId: z.uuid(),
  idempotencyKey: z.string().trim().min(8).max(200),
}).strict();

export async function POST(request: Request) {
  const member = await requireMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.targetUserId === member.memberId) {
    return NextResponse.json({ error: 'A valid match and request key are required.' }, { status: 400 });
  }

  let reportId: string | null = null;
  if (!(await canDiscoverProfile(parsed.data.targetUserId))) return NextResponse.json({ error: 'Match profile is unavailable.' }, { status: 404 });
  try {
    const begin = await supabaseAdmin.rpc('begin_horoscope_report', {
      actor: member.memberId,
      target: parsed.data.targetUserId,
      request_key: parsed.data.idempotencyKey,
    });
    if (begin.error) throw begin.error;
    const reservation = begin.data as Record<string, unknown>;
    reportId = String(reservation.report_id);

    const { data: existing } = await supabaseAdmin
      .from('horoscope_reports')
      .select('id,status,report_data,completed_at')
      .eq('id', reportId)
      .maybeSingle();
    if (existing?.status === 'generated') {
      return NextResponse.json({ success: true, report: existing, idempotent: true });
    }
    if (reservation.idempotent === true && existing?.status === 'pending') {
      return NextResponse.json(
        { success: true, report: existing, idempotent: true, message: 'Report generation is already in progress.' },
        { status: 202, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    if (reservation.idempotent === true && existing?.status === 'failed') {
      return NextResponse.json(
        { error: 'The previous generation attempt failed. Start a new request to try again.' },
        { status: 409, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id,rasi,nakshatra,padam')
      .in('user_id', [member.memberId, parsed.data.targetUserId]);
    if (error || profiles?.length !== 2) throw new Error('Required horoscope details are unavailable');
    const mine = profiles.find((profile) => profile.user_id === member.memberId)!;
    const target = profiles.find((profile) => profile.user_id === parsed.data.targetUserId)!;
    const percentage = generateCompatibility(
      { rasi: mine.rasi || '', nakshatra: mine.nakshatra || '', padam: mine.padam },
      { rasi: target.rasi || '', nakshatra: target.nakshatra || '', padam: target.padam },
    );
    const reportData = {
      version: 1,
      generated_at: new Date().toISOString(),
      compatibility_percentage: percentage,
      source: {
        member: { rasi: mine.rasi, nakshatra: mine.nakshatra, padam: mine.padam },
        match: { rasi: target.rasi, nakshatra: target.nakshatra, padam: target.padam },
      },
      summary: percentage >= 85 ? 'Strong astrological compatibility' : percentage >= 70 ? 'Moderate astrological compatibility' : 'Compatibility needs detailed personal review',
      disclaimer: 'This generated matching report is guidance only and is not a guarantee of marital outcome.',
    };
    const finish = await supabaseAdmin.rpc('finish_horoscope_report', {
      report_key: reportId,
      result: reportData,
      failure: null,
    });
    if (finish.error) throw finish.error;
    return NextResponse.json({ success: true, report: finish.data });
  } catch (error) {
    if (reportId) {
      await supabaseAdmin.rpc('finish_horoscope_report', {
        report_key: reportId,
        result: null,
        failure: 'Report generation failed before a result was saved.',
      });
    }
    console.error('Detailed horoscope report failed:', error);
    const mapped = membershipError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
