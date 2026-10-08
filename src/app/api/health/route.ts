import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
// Check a public catalogue table; never return credentials, counts or provider errors.
export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('subscription_plans').select('id').limit(1).abortSignal(AbortSignal.timeout(4000));
    if (error) throw new Error('Database unavailable');
    return NextResponse.json({ status: 'ok', database: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'degraded', database: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
