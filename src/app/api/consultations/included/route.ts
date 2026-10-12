import { NextResponse } from 'next/server';
import { z } from 'zod';
import { membershipError, requireMember } from '@/lib/membership/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { ASTROLOGERS } from '@/constants/astrologers';

const input = z.object({
  astrologerId: z.uuid(),
  consultationDate: z.iso.date(),
  consultationReason: z.string().trim().min(3).max(500),
  notes: z.string().trim().max(2000).default(''),
  idempotencyKey: z.string().trim().min(8).max(200),
}).strict();

export async function POST(request: Request) {
  const member = await requireMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Valid consultation details are required.' }, { status: 400 });
  if (!ASTROLOGERS.some((astrologer) => astrologer.id === parsed.data.astrologerId)) {
    return NextResponse.json({ error: 'The selected astrologer is unavailable.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('book_included_consultation', {
      actor: member.memberId,
      astrologer: parsed.data.astrologerId,
      consultation_day: parsed.data.consultationDate,
      reason_text: parsed.data.consultationReason,
      note_text: parsed.data.notes,
      request_key: parsed.data.idempotencyKey,
    });
    if (error) throw error;
    const result = data as Record<string, unknown>;
    return NextResponse.json(result, {
      status: result.idempotent === true ? 200 : 201,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Included consultation booking failed:', error);
    const mapped = membershipError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
