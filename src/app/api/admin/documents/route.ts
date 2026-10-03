import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';

export async function GET() {
  const access = await authLib.getServerAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!access.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await supabaseAdmin.from('verification_requests').select('*,account:users(email,profile:profiles(first_name,last_name,profile_id))').eq('status','pending').order('created_at').limit(200);
  if (error) return NextResponse.json({ error: 'Could not load document queue' }, { status: 500 });
  const requests = (data || []).map(row => ({ ...row, email: row.account?.email, ...row.account?.profile }));
  return NextResponse.json({ requests }, { headers: { 'Cache-Control': 'no-store' } });
}
const decision = z.object({ requestId: z.uuid(), status: z.enum(['approved','rejected','resubmit_requested']), reason: z.string().max(2000).optional() }).strict();
export async function PATCH(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const access = await authLib.getServerAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!access.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = decision.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid review' }, { status: 400 });
  const { requestId, status, reason } = parsed.data;
  if (status !== 'approved' && !reason?.trim()) return NextResponse.json({ error: 'Enter a reason for the member.' }, { status: 400 });
  const { error } = await supabaseAdmin.rpc('review_member_document', { actor: access.user.id, request_id: requestId, decision: status, reason: reason || null });
  if (error) return NextResponse.json({ error: 'This request is unavailable or has already been reviewed. Refresh the queue.' }, { status: 409 });
  return NextResponse.json({ success: true });
}
