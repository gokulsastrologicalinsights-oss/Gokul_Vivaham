import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { paymentService } from '@/services/payment.service';
import { razorpayClient, webhooksConfigured } from '@/lib/payments/config';

export async function POST(req: Request) {
  if (!webhooksConfigured) return NextResponse.json({ error: 'Payment webhooks are not configured.' }, { status: 503 });
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature header' }, { status: 400 });
    }

    // Verify webhook signature using reusable paymentService
    const isValid = paymentService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.warn('[Webhook Warning] Invalid webhook signature detected');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const eventId = payload.id;

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event ID in payload' }, { status: 400 });
    }

    console.log(`[Webhook Received Event] ${event} (ID: ${eventId})`);

    // 1. Deduplication: Attempt to insert the event into processed_webhook_events
    const { error: logError } = await supabaseAdmin
      .from('processed_webhook_events')
      .insert({
        event_id: eventId,
        event_type: event,
        status: 'processing',
        payload
      });

    if (logError) {
      if (logError.code === '23505') { // Unique constraint violation (duplicate key)
        const { data: existingLog } = await supabaseAdmin
          .from('processed_webhook_events')
          .select('status')
          .eq('event_id', eventId)
          .maybeSingle();

        if (existingLog?.status === 'completed') {
          console.log(`[Webhook Bypass] Event ${eventId} already processed successfully`);
          return NextResponse.json({ success: true, message: 'Event already processed' });
        }
        if (existingLog?.status === 'processing') {
          console.warn(`[Webhook Conflict] Event ${eventId} is currently being processed by another instance`);
          return NextResponse.json({ error: 'Event is currently being processed' }, { status: 409 });
        }
        // If status was 'failed', we retry processing
        await supabaseAdmin
          .from('processed_webhook_events')
          .update({ status: 'processing', error_message: null, processed_at: new Date().toISOString() })
          .eq('event_id', eventId);
      } else {
        console.error('Failed to log webhook event status:', logError);
        return NextResponse.json({ error: 'Failed to record event log' }, { status: 500 });
      }
    }

    // 2. Process the event
    try {
      if (event === 'payment.captured' || event === 'order.paid') {
        await handlePaymentCaptured(payload);
      } else if (event === 'payment.failed') {
        await handlePaymentFailed(payload);
      } else if (event === 'subscription.activated') {
        await handleSubscriptionActivated(payload);
      } else if (event === 'subscription.charged') {
        await handleSubscriptionCharged(payload);
      } else if (
        event === 'subscription.halted' ||
        event === 'subscription.cancelled' ||
        event === 'subscription.completed'
      ) {
        await handleSubscriptionDeactivated(payload, event);
      } else {
        console.log(`[Webhook Info] Unhandled event type: ${event}`);
      }

      // 3. Mark event as completed on success
      await supabaseAdmin
        .from('processed_webhook_events')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('event_id', eventId);

      return NextResponse.json({ received: true });

    } catch (processErr: any) {
      console.error(`[Webhook Error] Processing failed for event ${eventId}:`, processErr);

      // Mark event as failed in db
      await supabaseAdmin
        .from('processed_webhook_events')
        .update({
          status: 'failed',
          error_message: processErr.message || 'Unknown processing error',
          processed_at: new Date().toISOString()
        })
        .eq('event_id', eventId);

      return NextResponse.json({ error: processErr.message || 'Event processing failed' }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Webhook Endpoint Initial Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

async function handlePaymentCaptured(payload: any) {
  const paymentEntity = payload.payload.payment.entity;
  const razorpay_order_id = paymentEntity.order_id;
  const razorpay_payment_id = paymentEntity.id;

  if (!razorpay_order_id) {
    // If there is no order_id, it could be a subscription renewal charge.
    // Subscription renewal charges are handled by subscription.charged event.
    console.log('[Webhook Info] payment.captured has no order_id, skipping direct processing (handled by subscription.charged)');
    return;
  }

  // Fetch the pending payment record
  const { data: payment, error: payErr } = await supabaseAdmin
    .from('payments')
    .select('*, users(auth_user_id)')
    .eq('razorpay_order_id', razorpay_order_id)
    .maybeSingle();

  if (payErr || !payment) {
    throw new Error(`Associated payment record not found for order ${razorpay_order_id}`);
  }

  if (payment.status === 'completed' && (payment.payment_type !== 'subscription' || payment.fulfilled_at)) {
    console.log(`[Webhook Info] Payment for order ${razorpay_order_id} already marked completed in DB`);
    return;
  }

  // Verify amount matches server-side database record
  const expectedAmountPaise = Math.round(Number(payment.amount) * 100);
  if (paymentEntity.amount !== expectedAmountPaise) {
    throw new Error(`Amount verification failed: expected ${expectedAmountPaise} paise, got ${paymentEntity.amount} paise`);
  }

  // Fetch from Razorpay API to prevent mock manipulation/spoofing on live environments
  {
    const razorpayPayment = await razorpayClient.payments.fetch(razorpay_payment_id);
    if (razorpayPayment.status !== 'captured') {
      throw new Error(`Razorpay verification failed: payment status is ${razorpayPayment.status}`);
    }
    if (razorpayPayment.order_id !== razorpay_order_id || razorpayPayment.currency !== 'INR' || razorpayPayment.amount !== expectedAmountPaise) {
      throw new Error(`Razorpay verification failed: live amount ${razorpayPayment.amount} mismatch`);
    }
  }

  const rpc = payment.payment_type === 'subscription' ? 'fulfill_subscription_payment' : 'fulfill_product_payment';
  const { error } = await supabaseAdmin.rpc(rpc, { payment_row: payment.id, gateway_payment: razorpay_payment_id });
  if (error) throw error;
}

async function handlePaymentFailed(payload: any) {
  const paymentEntity = payload.payload.payment.entity;
  const razorpay_order_id = paymentEntity.order_id;

  if (!razorpay_order_id) return;

  const { data: updatedPay } = await supabaseAdmin
    .from('payments')
    .select()
    .eq('razorpay_order_id', razorpay_order_id)
    .eq('status', 'pending')
    .maybeSingle();

  if (updatedPay) {
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: updatedPay.user_id,
        title: 'Payment Failed',
        message: 'This payment attempt failed. You can retry the same checkout order.',
        type: 'billing',
        is_read: false
      });
  }
}

async function handleSubscriptionActivated(payload: any) {
  // Activation confirms a mandate, not a captured renewal charge.
  // Access is granted only by the charged-payment handler.
  return;
}

async function handleSubscriptionCharged(payload: any) {
  throw new Error('Automatic renewal fulfillment is not configured; reconcile this captured charge before granting access.');
}

async function handleSubscriptionDeactivated(payload: any, eventType: string) {
  const subscriptionEntity = payload.payload.subscription.entity;
  const razorpay_subscription_id = subscriptionEntity.id;

  // Find subscription record in database
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('razorpay_subscription_id', razorpay_subscription_id)
    .maybeSingle();

  if (!subscription) {
    console.warn(`[Webhook Warning] Subscription ${razorpay_subscription_id} not found in database for deactivation`);
    return;
  }

  const dbUserId = subscription.user_id;

  // Determine status (Expired or Failed)
  const statusValue = eventType === 'subscription.halted' ? 'Failed' : 'Expired';

  // Update subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({
      payment_status: statusValue,
      updated_at: new Date().toISOString()
    })
    .eq('id', subscription.id);

  // Role Downgrade Check:
  // Check if there are OTHER active subscriptions or featured boosts
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

  const hasActiveBenefits = (activeSubsCount || 0) > 0 || (activeFeaturedCount || 0) > 0;

  if (!hasActiveBenefits) {
    // Downgrade user role to standard
    await supabaseAdmin
      .from('profiles')
      .update({ is_premium: false })
      .eq('user_id', dbUserId);

    await supabaseAdmin
      .from('users')
      .update({ role: 'user' })
      .eq('id', dbUserId);

    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('auth_user_id')
      .eq('id', dbUserId)
      .maybeSingle();

    if (userRow?.auth_user_id) {
      await supabaseAdmin.auth.admin.updateUserById(userRow.auth_user_id, {
        user_metadata: { role: 'user' }
      });
    }
  }

  // Set user notification
  let notificationTitle = 'Subscription Expired';
  let notificationMsg = 'Your premium membership subscription has expired. Please renew to continue enjoying premium benefits.';

  if (eventType === 'subscription.halted') {
    notificationTitle = 'Subscription Suspended';
    notificationMsg = 'Your subscription is suspended due to payment failures. Please update your payment method.';
  } else if (eventType === 'subscription.cancelled') {
    notificationTitle = 'Subscription Cancelled';
    notificationMsg = 'Your subscription was cancelled successfully. Premium access will cease immediately.';
  }

  await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: dbUserId,
      title: notificationTitle,
      message: notificationMsg,
      type: 'billing',
      is_read: false
    });
}
