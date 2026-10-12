import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMember } from '@/lib/membership/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const input = z.object({ orderId: z.string().trim().min(8).max(100) }).strict();

export async function POST(request: Request) {
  const member = await requireMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A valid order is required.' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('user_id', member.memberId)
    .eq('razorpay_order_id', parsed.data.orderId)
    .eq('status', 'pending')
    .select('id,status')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Unable to update checkout state.' }, { status: 500 });
  return NextResponse.json({ success: true, status: data?.status || 'unchanged' });
}
