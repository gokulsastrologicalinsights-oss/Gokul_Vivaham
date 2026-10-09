import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

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
      .select('id,start_date,end_date,plan:subscription_plans(id,name,features,contact_view_limit,messaging_enabled,photo_viewing_enabled,premium_badge_eligible,search_enabled)')
      .eq('user_id', currentUserId)
      .eq('payment_status', 'Completed')
      .lte('start_date', new Date().toISOString())
      .gt('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Entitlements come from the active database plan. A plan name is only a
    // label and is never used as an authorization signal.
    const plan = activeSub?.plan as any;
    const features = (plan?.features || {}) as Record<string, any>;
    const limits = {
      contacts_limit: Number(plan?.contact_view_limit ?? features.contacts_limit ?? 0),
      horoscope_reports_limit: Number(features.horoscope_reports_limit ?? 0),
      consultations_limit: Number(features.consultations_limit ?? 0),
    };

    // If no active subscription exists, return the zero-entitlement baseline.
    if (!activeSub || !plan) {
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
        plan_name: plan.name,
        plan_key: plan.id,
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
      messaging_enabled: Boolean(plan.messaging_enabled),
      photo_viewing_enabled: Boolean(plan.photo_viewing_enabled),
      premium_badge_eligible: Boolean(plan.premium_badge_eligible),
      search_enabled: Boolean(plan.search_enabled),
    });
  } catch (err: any) {
    console.error('Entitlements usage API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
