import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { membershipError, requireMember } from '@/lib/membership/server';

const input = z.object({
  profileId: z.string().trim().min(1).max(64).optional(),
  profileUuid: z.uuid().optional(),
}).strict().refine((value) => Boolean(value.profileId || value.profileUuid), {
  message: 'A profile identifier is required.',
});

export async function POST(request: Request) {
  const member = await requireMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A valid profile is required.' }, { status: 400 });

  let targetProfileQuery = supabaseAdmin
    .from('profiles')
    .select('id,user_id')
    .eq('is_suspended', false)
    .eq('is_banned', false)
    .is('deleted_at', null)
    .limit(1);

  targetProfileQuery = parsed.data.profileUuid
    ? targetProfileQuery.eq('id', parsed.data.profileUuid)
    : targetProfileQuery.eq('profile_id', parsed.data.profileId!);

  const { data: targetProfiles, error: profileError } = await targetProfileQuery;
  if (profileError) {
    console.error('Contact target lookup failed:', profileError);
    return NextResponse.json({ error: 'Could not validate the target profile.' }, { status: 500 });
  }
  const targetProfile = targetProfiles?.[0];

  if (!targetProfile || !targetProfile.user_id || targetProfile.user_id === member.memberId) {
    return NextResponse.json({ error: 'Target profile not found.' }, { status: 404 });
  }

  // Validate the account before consuming a contact credit. Account status belongs
  // to public.users, not public.profiles.
  const { data: targetAccount, error: accountError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', targetProfile.user_id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  if (accountError) {
    console.error('Contact account lookup failed:', accountError);
    return NextResponse.json({ error: 'Could not validate the target account.' }, { status: 500 });
  }
  if (!targetAccount) return NextResponse.json({ error: 'Target profile not found.' }, { status: 404 });

  try {
    const { data: purchasedUnlock } = await supabaseAdmin
      .from('contact_unlocks')
      .select('id')
      .eq('user_id', member.memberId)
      .eq('target_profile_id', targetProfile.id)
      .maybeSingle();

    let usage: Record<string, unknown> = {
      already_revealed: Boolean(purchasedUnlock),
      purchased_unlock: Boolean(purchasedUnlock),
    };

    if (!purchasedUnlock && !member.isAdmin) {
      const { data, error } = await supabaseAdmin.rpc('consume_contact_reveal', {
        actor: member.memberId,
        target_profile: targetProfile.id,
      });
      if (error) throw error;
      usage = data as Record<string, unknown>;
    }

    const { data: targetUser, error: contactError } = await supabaseAdmin
      .from('users')
      .select('email,mobile_number')
      .eq('id', targetProfile.user_id)
      .maybeSingle();
    if (contactError || !targetUser) throw new Error('Contact details unavailable');

    return NextResponse.json(
      {
        success: true,
        email: targetUser.email || 'N/A',
        phone: targetUser.mobile_number || 'N/A',
        ...usage,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Contact reveal failed:', error);
    const mapped = membershipError(error);
    return NextResponse.json(
      { error: mapped.message, upgrade_required: mapped.status === 403 || mapped.status === 429 },
      { status: mapped.status },
    );
  }
}
