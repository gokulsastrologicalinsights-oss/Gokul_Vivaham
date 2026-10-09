import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

type RequestRecord = { id: string; user_id: string; [key: string]: unknown };
type AccountRecord = { id: string; email: string | null; mobile_number: string | null; email_verified: boolean; mobile_verified: boolean };
type ProfileRecord = { id: string; user_id: string; profile_id: string | null; first_name: string | null; last_name: string | null };

function allowed(access: Awaited<ReturnType<typeof authLib.getServerAccess>>) {
  return Boolean(access?.isAdmin && !access.mfaRequired && ['admin', 'super_admin'].includes(access.role));
}

export async function GET() {
  const access = await authLib.getServerAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!allowed(access)) return NextResponse.json({ error: 'Administrator verification is required.' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('profile_verification_requests')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: 'Could not load profile verification requests.' }, { status: 500 });

  const rows = (data || []) as RequestRecord[];
  const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
  const [{ data: accounts }, { data: profiles }] = await Promise.all([
    userIds.length ? supabaseAdmin.from('users').select('id,email,mobile_number,email_verified,mobile_verified').in('id', userIds) : Promise.resolve({ data: [] as AccountRecord[] }),
    userIds.length ? supabaseAdmin.from('profiles').select('id,user_id,profile_id,first_name,last_name').in('user_id', userIds) : Promise.resolve({ data: [] as ProfileRecord[] }),
  ]);
  const accountRows = (accounts || []) as AccountRecord[];
  const profileRows = (profiles || []) as ProfileRecord[];
  const accountMap = new Map(accountRows.map(row => [row.id, row]));
  const profileMap = new Map(profileRows.map(row => [row.user_id, row]));

  return NextResponse.json({ requests: rows.map(row => {
    const account = accountMap.get(row.user_id);
    const profile = profileMap.get(row.user_id);
    return {
      ...row,
      member_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unnamed member',
      profile_id_label: profile?.profile_id || 'Not assigned',
      registered_mobile: row.requested_mobile_number || account?.mobile_number || 'Not provided',
      registered_email: account?.email || 'Not provided',
      email_verified: Boolean(account?.email_verified),
      mobile_verified: Boolean(account?.mobile_verified),
    };
  }) }, { headers: { 'Cache-Control': 'no-store' } });
}

const actionSchema = z.object({
  requestId: z.uuid(),
  action: z.enum(['approve_mobile', 'mark_email_verified', 'reject', 'add_note']),
  reason: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(4000).optional(),
}).strict();

export async function PATCH(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const access = await authLib.getServerAccess();
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!allowed(access)) return NextResponse.json({ error: 'Administrator verification is required.' }, { status: 403 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid verification action.' }, { status: 400 });
  const { requestId, action, reason, notes } = parsed.data;
  if (action === 'reject' && !reason) return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
  if (action === 'mark_email_verified' && !reason) return NextResponse.json({ error: 'Record how the email was independently confirmed.' }, { status: 400 });
  if (action === 'add_note' && !notes) return NextResponse.json({ error: 'An internal note is required.' }, { status: 400 });

  const { error } = await supabaseAdmin.rpc('review_profile_verification_request', {
    actor: access.user.id,
    request_id: requestId,
    verification_action: action,
    reason: reason || null,
    internal_notes: notes || null,
    verification_method: action === 'mark_email_verified' ? 'independent_email_confirmation' : action === 'approve_mobile' ? 'admin_manual_whatsapp_confirmation' : 'admin_review',
  });
  if (error) {
    console.error('Profile verification review failed', error);
    return NextResponse.json({ error: error.message || 'Verification action could not be completed.' }, { status: 409 });
  }
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
