import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { authLib } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const access = await authLib.getServerAccess();
    if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!access.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const now = new Date().toISOString();

    // 1. Fetch all expired subscriptions that are still marked as Completed
    const { data: expiredSubs, error: fetchErr } = await supabaseAdmin
      .from('subscriptions')
      .select('*, users(auth_user_id)')
      .eq('payment_status', 'Completed')
      .lte('end_date', now);

    if (fetchErr) {
      throw new Error(`Failed to query expired subscriptions: ${fetchErr.message}`);
    }

    if (!expiredSubs || expiredSubs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired subscriptions found',
        deactivatedCount: 0
      });
    }

    console.log(`[Subscription Cleanup] Found ${expiredSubs.length} expired subscriptions to deactivate`);

    let deactivatedCount = 0;

    for (const sub of expiredSubs) {
      try {
        // A. Update subscription record status to Expired
        const { error: updateSubErr } = await supabaseAdmin
          .from('subscriptions')
          .update({
            payment_status: 'Expired',
            updated_at: now
          })
          .eq('id', sub.id);

        if (updateSubErr) {
          console.error(`Failed to update subscription status for sub ${sub.id}:`, updateSubErr);
          continue;
        }

        // B. Check if user has other active benefits
        const { count: activeSubsCount } = await supabaseAdmin
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', sub.user_id)
          .eq('payment_status', 'Completed')
          .gt('end_date', now);

        const { count: activeFeaturedCount } = await supabaseAdmin
          .from('featured_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', sub.user_id)
          .eq('is_active', true)
          .gt('end_date', now);

        const hasBenefits = (activeSubsCount || 0) > 0 || (activeFeaturedCount || 0) > 0;

        if (!hasBenefits) {
          // Downgrade profile & user roles
          await supabaseAdmin
            .from('profiles')
            .update({ is_premium: false })
            .eq('user_id', sub.user_id);

          await supabaseAdmin
            .from('users')
            .update({ role: 'user' })
            .eq('id', sub.user_id);

          // Update auth metadata
          const authUserId = sub.users?.auth_user_id;
          if (authUserId) {
            await supabaseAdmin.auth.admin.updateUserById(authUserId, {
              user_metadata: { role: 'user' }
            });
          }
        }

        // C. Log User Notification
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: sub.user_id,
            title: 'Membership Expired',
            message: 'Your premium membership subscription has expired. Please renew to continue enjoying premium benefits.',
            type: 'billing',
            is_read: false
          });

        deactivatedCount++;

      } catch (subErr) {
        console.error(`Error processing cleanup deactivation for subscription ${sub.id}:`, subErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deactivated ${deactivatedCount} expired subscriptions`,
      deactivatedCount
    });

  } catch (err: any) {
    console.error('Subscription Cleanup API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
