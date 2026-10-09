import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

const uuidSchema = z.string().uuid();
const requestBodySchema = z.object({
  receiverUserId: uuidSchema,
});
const updateBodySchema = z.object({
  requestId: uuidSchema,
  status: z.enum(['accepted', 'declined', 'cancelled']),
});

type MatchRequest = {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  status: 'pending' | 'cancelled' | 'accepted' | 'declined';
  message: string | null;
  created_at: string;
  updated_at: string;
  responded_at?: string | null;
  cancelled_at?: string | null;
};

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

async function getCurrentMember() {
  const access = await authLib.getServerAccess();
  if (!access || access.mfaRequired) return null;

  const { data: member, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth_user_id', access.user.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !member) return null;
  return { access, id: member.id as string };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member) return unauthorized();

  const params = new URL(request.url).searchParams;
  const rawIds = params.get('recipientUserIds') || params.get('recipientUserId') || '';
  const recipientIds = [...new Set(rawIds.split(',').map((value) => value.trim()).filter(Boolean))];
  if (recipientIds.length === 0 || recipientIds.length > 500 || recipientIds.some((value) => !uuidSchema.safeParse(value).success)) {
    return NextResponse.json({ error: 'One or more recipient IDs are invalid.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('match_requests')
    .select('id,sender_user_id,receiver_user_id,status,message,created_at,updated_at,responded_at,cancelled_at')
    .eq('sender_user_id', member.id)
    .in('receiver_user_id', recipientIds);

  if (error) {
    console.error('Interest status lookup failed', error);
    return NextResponse.json({ error: 'Could not load interest status.' }, { status: 500 });
  }

  const requests = (data || []) as MatchRequest[];
  const statuses = Object.fromEntries(requests.map((row) => [row.receiver_user_id, row]));
  return NextResponse.json({ requests, statuses }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return unauthorized();

  const parsed = requestBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A valid recipient is required.' }, { status: 400 });

  const { receiverUserId } = parsed.data;
  if (receiverUserId === member.id) {
    return NextResponse.json({ error: 'You cannot send an interest request to yourself.' }, { status: 400 });
  }

  const [{ data: receiver }, { data: block }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id,profiles!inner(user_id,deleted_at,is_suspended)')
      .eq('id', receiverUserId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .is('profiles.deleted_at', null)
      .eq('profiles.is_suspended', false)
      .maybeSingle(),
    supabaseAdmin
      .from('blocked_users')
      .select('id')
      .or(`and(blocker_user_id.eq.${member.id},blocked_user_id.eq.${receiverUserId}),and(blocker_user_id.eq.${receiverUserId},blocked_user_id.eq.${member.id})`)
      .maybeSingle(),
  ]);

  if (!receiver) return NextResponse.json({ error: 'Member unavailable.' }, { status: 404 });
  if (block) return NextResponse.json({ error: 'Cannot send an interest request to a blocked member.' }, { status: 409 });

  const { data: existing } = await supabaseAdmin
    .from('match_requests')
    .select('id,status,created_at,updated_at,responded_at,cancelled_at')
    .eq('sender_user_id', member.id)
    .eq('receiver_user_id', receiverUserId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'An interest request has already been recorded for this member.', request: existing }, { status: 409 });
  }

  const { data: created, error } = await supabaseAdmin
    .from('match_requests')
    .insert({ sender_user_id: member.id, receiver_user_id: receiverUserId, status: 'pending' })
    .select('id,sender_user_id,receiver_user_id,status,message,created_at,updated_at,responded_at,cancelled_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: concurrent } = await supabaseAdmin
        .from('match_requests')
        .select('id,status,created_at,updated_at,responded_at,cancelled_at')
        .eq('sender_user_id', member.id)
        .eq('receiver_user_id', receiverUserId)
        .maybeSingle();
      return NextResponse.json({ error: 'An interest request has already been recorded for this member.', request: concurrent }, { status: 409 });
    }
    console.error('Interest creation failed', error);
    return NextResponse.json({ error: errorMessage(error, 'Could not send interest request.') }, { status: 500 });
  }

  return NextResponse.json({ request: created }, { status: 201 });
}

export async function PATCH(request: Request) {
  const member = await getCurrentMember();
  if (!member) return unauthorized();

  const parsed = updateBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A valid request ID and status are required.' }, { status: 400 });
  const { requestId, status } = parsed.data;

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('match_requests')
    .select('id,sender_user_id,receiver_user_id,status')
    .eq('id', requestId)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: 'Could not load the interest request.' }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Interest request not found.' }, { status: 404 });
  if (existing.status !== 'pending') return NextResponse.json({ error: 'Only a pending request can be changed.', request: existing }, { status: 409 });

  const isSender = existing.sender_user_id === member.id;
  const isReceiver = existing.receiver_user_id === member.id;
  if ((status === 'cancelled' && !isSender) || (status !== 'cancelled' && !isReceiver)) {
    return NextResponse.json({ error: 'You are not allowed to change this interest request.' }, { status: 403 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('match_requests')
    .update({ status })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id,sender_user_id,receiver_user_id,status,message,created_at,updated_at,responded_at,cancelled_at')
    .maybeSingle();
  if (error) {
    console.error('Interest update failed', error);
    return NextResponse.json({ error: errorMessage(error, 'Could not update interest request.') }, { status: 500 });
  }
  if (!updated) return NextResponse.json({ error: 'The interest request was already updated.', request: existing }, { status: 409 });
  return NextResponse.json({ request: updated });
}
