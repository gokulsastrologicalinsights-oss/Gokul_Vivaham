import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { SUBSCRIPTION_PLANS } from '@/constants/payments';

/**
 * GET /api/entitlements/usage
 *
 * Returns the authenticated user's entitlement usage for the current active
 * subscription period. Tracks:
 *  - contacts_used / contacts_remaining / contacts_limit
 *  - horoscope_used / horoscope_remaining / horoscope_limit
 *  - consultations_used / consultations_remaining / consultations_limit
 *  - plan_name, plan_key, days_remaining
 */
export async function GET() {
  try {
    // 1. Authenticate
    const user = await authLib.getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Resolve DB user row
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }
    const currentUserId = userRow.id;

    // 3. Fetch active subscription
    const { data: activeSub } = await supabaseAdmin
      .from('subscriptions')
      .select('*, plan:subscription_plans(name)')
      .eq('user_id', currentUserId)
      .eq('payment_status', 'Completed')
      .gt('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Derive plan entitlements from constants (single source of truth)
    const planName = activeSub?.plan?.name?.toLowerCase() || '';
    let planKey = 'FREE';
    if (planName.includes('diamond')) planKey = 'DIAMOND';
    else if (planName.includes('gold')) planKey = 'GOLD';
    else if (planName.includes('silver')) planKey = 'SILVER';

    const planDef = SUBSCRIPTION_PLANS[planKey];
    const limits = planDef.entitlements;

    // 5. If no active paid sub, return zero usage with zero limits (Startup)
    if (!activeSub || planKey === 'FREE') {
      return NextResponse.json({
        plan_name: 'Startup Plan',
        plan_key: 'FREE',
        days_remaining: 0,
        contacts_used: 0,
        contacts_remaining: 0,
        contacts_limit: 0,
        horoscope_used: 0,
        horoscope_remaining: 0,
        horoscope_limit: 0,
        consultations_used: 0,
        consultations_remaining: 0,
        consultations_limit: 0,
      });
    }

    const startDate = activeSub.start_date;
    const endDate = new Date(activeSub.end_date);
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    // 6. Query activity_logs for all three credit types since subscription start
    const { data: allLogs } = await supabaseAdmin
      .from('activity_logs')
      .select('action, metadata')
      .eq('user_id', currentUserId)
      .gte('created_at', startDate)
      .in('action', [
        'view_contact_details',
        'use_horoscope_report',
        'use_free_consultation',
      ]);

    const logs = allLogs || [];

    // Contacts: unique target_user_id set
    const viewedUserIds = new Set(
      logs
        .filter((l) => l.action === 'view_contact_details')
        .map((l) => (l.metadata as any)?.target_user_id)
        .filter(Boolean)
    );
    const contactsUsed = viewedUserIds.size;

    // Horoscope reports: simple count
    const horoscopeUsed = logs.filter(
      (l) => l.action === 'use_horoscope_report'
    ).length;

    // Free consultations: simple count
    const consultationsUsed = logs.filter(
      (l) => l.action === 'use_free_consultation'
    ).length;

    return NextResponse.json({
      plan_name: planDef.name,
      plan_key: planKey,
      days_remaining: daysRemaining,
      contacts_used: contactsUsed,
      contacts_remaining: Math.max(0, limits.contacts_limit - contactsUsed),
      contacts_limit: limits.contacts_limit,
      horoscope_used: horoscopeUsed,
      horoscope_remaining: Math.max(0, limits.horoscope_reports_limit - horoscopeUsed),
      horoscope_limit: limits.horoscope_reports_limit,
      consultations_used: consultationsUsed,
      consultations_remaining: Math.max(0, limits.consultations_limit - consultationsUsed),
      consultations_limit: limits.consultations_limit,
    });
  } catch (err: any) {
    console.error('Entitlements usage API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
