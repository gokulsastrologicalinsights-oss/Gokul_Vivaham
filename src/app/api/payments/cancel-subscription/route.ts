import { NextResponse } from 'next/server';
import { authLib } from '@/lib/auth';
import { createRequestClient, supabaseAdmin } from '@/lib/supabase/server';
import { razorpayClient, razorpayConfig } from '@/lib/payments/config';

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const user = await authLib.getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const requestClient = await createRequestClient();

    // 2. Resolve user DB ID
    const { data: userRow } = await requestClient
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }
    const dbUserId = userRow.id;

    // 3. Find active subscription
    const { data: activeSub, error: subErr } = await requestClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('payment_status', 'Completed')
      .maybeSingle();

    if (subErr || !activeSub) {
      return NextResponse.json({ error: 'No active subscription found to cancel' }, { status: 404 });
    }

    // 4. Cancel recurring subscription in Razorpay if applicable
    if (
      activeSub.razorpay_subscription_id &&
      !activeSub.razorpay_subscription_id.startsWith('sub_mock_') &&
      razorpayConfig.keyId !== 'rzp_test_placeholderid'
    ) {
      try {
        // Cancel the subscription at the end of the current cycle (pass true as the second argument)
        await razorpayClient.subscriptions.cancel(activeSub.razorpay_subscription_id, true);
      } catch (err: any) {
        console.error('Failed to cancel subscription on Razorpay API:', err);
        // We will proceed to cancel locally even if Razorpay API call fails or plan is already in cancelling state
      }
    }

    // 5. Update subscription record status to Expired
    await supabaseAdmin
      .from('subscriptions')
      .update({
        payment_status: 'Expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', activeSub.id);

    // 6. Check if user has other active benefits
    const { count: activeSubsCount } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', dbUserId)
      .eq('payment_status', 'Completed')
      .gt('end_date', new Date().toISOString());

    const { count: activeFeaturedCount } = await supabaseAdmin
      .from('featured_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', dbUserId)
      .eq('is_active', true)
      .gt('end_date', new Date().toISOString());

    const hasBenefits = (activeSubsCount || 0) > 0 || (activeFeaturedCount || 0) > 0;

    if (!hasBenefits) {
      // Downgrade profile & user roles
      await supabaseAdmin
        .from('profiles')
        .update({ is_premium: false })
        .eq('user_id', dbUserId);

      await supabaseAdmin
        .from('users')
        .update({ role: 'user' })
        .eq('id', dbUserId);

      // Update auth metadata
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { role: 'user' }
      });
    }

    // 7. Log User Notification
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: dbUserId,
        title: 'Subscription Cancelled',
        message: 'Your membership subscription was cancelled successfully. Premium features have been deactivated.',
        type: 'billing',
        is_read: false
      });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });

  } catch (err: any) {
    console.error('Cancel Subscription API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
