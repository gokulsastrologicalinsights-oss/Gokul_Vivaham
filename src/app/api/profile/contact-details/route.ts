import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { SUBSCRIPTION_PLANS } from '@/constants/payments';

/** Helper: resolve plan key from plan name string */
function resolvePlanKey(planName: string): string {
  const n = planName.toLowerCase();
  if (n.includes('diamond')) return 'DIAMOND';
  if (n.includes('gold')) return 'GOLD';
  if (n.includes('silver')) return 'SILVER';
  return 'FREE';
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const user = await authLib.getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const { profileId } = await req.json();
    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });
    }

    // 2. Resolve current user DB row
    const { data: currentUserRow } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!currentUserRow) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }
    const currentUserId = currentUserRow.id;

    // 3. Resolve target profile details
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, first_name')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Target profile not found' }, { status: 404 });
    }
    const targetUserId = targetProfile.user_id;

    // 4. Check if single contact unlock exists
    const { data: contactUnlock } = await supabaseAdmin
      .from('contact_unlocks')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('target_profile_id', targetProfile.id)
      .maybeSingle();

    if (contactUnlock) {
      // Bypasses all subscription/credits/connection gating
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('email, mobile_number')
        .eq('id', targetUserId)
        .maybeSingle();

      if (!targetUser) {
        return NextResponse.json({ error: 'Contact user details not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        email: targetUser.email || 'N/A',
        phone: targetUser.mobile_number || 'N/A',
        unlocked: true,
        already_viewed: true,
      });
    }

    // 5. Check if connection interest is accepted
    const { data: request } = await supabaseAdmin
      .from('match_requests')
      .select('status')
      .or(
        `and(sender_user_id.eq.${currentUserId},receiver_user_id.eq.${targetUserId}),and(sender_user_id.eq.${targetUserId},receiver_user_id.eq.${currentUserId})`
      )
      .eq('status', 'accepted')
      .maybeSingle();

    if (!request) {
      return NextResponse.json(
        { error: 'You must connect and receive their acceptance before viewing contact details' },
        { status: 403 }
      );
    }

    // 6. Check if current user is premium
    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('is_premium')
      .eq('user_id', currentUserId)
      .maybeSingle();

    const isPremiumProfile = profileRow?.is_premium || false;
    const isPremiumRole = currentUserRow.role !== 'user' && currentUserRow.role !== 'free';
    const isPremium = isPremiumProfile || isPremiumRole;

    if (!isPremium) {
      return NextResponse.json(
        {
          error: 'Premium subscription required to view contact details',
          upgrade_required: true,
        },
        { status: 403 }
      );
    }

    // 6. Enforce plan limits for non-admin roles
    const isAdmin = ['admin', 'super_admin', 'moderator'].includes(currentUserRow.role);

    if (!isAdmin) {
      const { data: activeSub } = await supabaseAdmin
        .from('subscriptions')
        .select('*, plan:subscription_plans(name)')
        .eq('user_id', currentUserId)
        .eq('payment_status', 'Completed')
        .gt('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeSub) {
        return NextResponse.json(
          { error: 'No active subscription plan record found. Please renew your plan.' },
          { status: 403 }
        );
      }

      // Derive contact limit from constants (single source of truth)
      const planKey = resolvePlanKey(activeSub.plan?.name || '');
      const contactsLimit = SUBSCRIPTION_PLANS[planKey]?.entitlements?.contacts_limit ?? 0;

      const { data: logs } = await supabaseAdmin
        .from('activity_logs')
        .select('metadata')
        .eq('user_id', currentUserId)
        .eq('action', 'view_contact_details')
        .gte('created_at', activeSub.start_date);

      const viewedUserIds = new Set(
        logs?.map((l) => (l.metadata as any)?.target_user_id).filter(Boolean) || []
      );

      const hasViewedAlready = viewedUserIds.has(targetUserId);

      if (!hasViewedAlready) {
        // Zero-limit plans (Startup) cannot view contacts
        if (contactsLimit === 0) {
          return NextResponse.json(
            {
              error:
                'Your current plan does not include contact viewing. Please upgrade to Silver or above.',
              upgrade_required: true,
            },
            { status: 403 }
          );
        }

        // Limit exhausted
        if (viewedUserIds.size >= contactsLimit) {
          return NextResponse.json(
            {
              error: `You have reached the maximum limit of ${contactsLimit} contact views for your ${activeSub.plan?.name || 'plan'}.`,
              upgrade_required: true,
              contacts_used: viewedUserIds.size,
              contacts_remaining: 0,
              contacts_limit: contactsLimit,
            },
            { status: 403 }
          );
        }

        // Record the view in activity_logs
        await supabaseAdmin.from('activity_logs').insert({
          user_id: currentUserId,
          action: 'view_contact_details',
          metadata: { target_user_id: targetUserId },
        });

        const newUsed = viewedUserIds.size + 1;
        const newRemaining = Math.max(0, contactsLimit - newUsed);

        // 7. Fetch target contact details
        const { data: targetUser } = await supabaseAdmin
          .from('users')
          .select('email, mobile_number')
          .eq('id', targetUserId)
          .maybeSingle();

        if (!targetUser) {
          return NextResponse.json({ error: 'Contact user details not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          email: targetUser.email || 'N/A',
          phone: targetUser.mobile_number || 'N/A',
          contacts_used: newUsed,
          contacts_remaining: newRemaining,
          contacts_limit: contactsLimit,
        });
      }

      // Already viewed — re-serve without consuming a credit
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('email, mobile_number')
        .eq('id', targetUserId)
        .maybeSingle();

      if (!targetUser) {
        return NextResponse.json({ error: 'Contact user details not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        email: targetUser.email || 'N/A',
        phone: targetUser.mobile_number || 'N/A',
        contacts_used: viewedUserIds.size,
        contacts_remaining: Math.max(0, contactsLimit - viewedUserIds.size),
        contacts_limit: contactsLimit,
        already_viewed: true,
      });
    }

    // Admin path — no credit limits
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('email, mobile_number')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'Contact user details not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      email: targetUser.email || 'N/A',
      phone: targetUser.mobile_number || 'N/A',
    });
  } catch (err: any) {
    console.error('Contact details API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
