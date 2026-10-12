import { NextResponse } from 'next/server';
import { getMemberEntitlements, requireMember } from '@/lib/membership/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const member = await requireMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshot = await getMemberEntitlements(member.memberId);
    const endDate = typeof snapshot.end_date === 'string' ? new Date(snapshot.end_date) : null;
    const daysRemaining = endDate
      ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86_400_000))
      : null;

    return NextResponse.json(
      { ...snapshot, days_remaining: daysRemaining },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Entitlements usage API error:', error);
    return NextResponse.json({ error: 'Unable to load membership status.' }, { status: 500 });
  }
}
