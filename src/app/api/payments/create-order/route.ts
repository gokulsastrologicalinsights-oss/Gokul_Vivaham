import {getOperationalSettings} from '@/lib/operational-settings';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { contactConfig } from '@/config/contact.config';
import { authLib } from '@/lib/auth';
import { createRequestClient, supabaseAdmin } from '@/lib/supabase/server';
import { paymentService } from '@/services/payment.service';
import { FEATURED_PROFILE_PRICES, CONSULTATION_PRICE } from '@/constants/payments';
import { razorpayConfig, paymentsConfigured } from '@/lib/payments/config';
import { ASTROLOGERS } from '@/constants/astrologers';
import { canDiscoverProfile } from '@/lib/profile-eligibility';

const consultationDetailsSchema = z.object({
  consultationDate: z.iso.date(),
  consultationReason: z.string().trim().min(3).max(500),
  notes: z.string().trim().max(2000).default(''),
  astrologerId: z.uuid(),
}).strict();

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Internal Server Error';
}

export async function POST(req: Request) {
  try {
    if (!(await getOperationalSettings()).paid_orders_enabled) return NextResponse.json({error:'New paid orders are temporarily paused.'},{status:503});
    if (!paymentsConfigured) return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 });
    const user = await authLib.getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestClient = await createRequestClient();

    // Resolve user's actual database UUID (users.id) from auth_user_id
    const { data: userRow } = await requestClient
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }
    const dbUserId = userRow.id;

    const body = await req.json();
    const { paymentType, planId, couponCode, featuredDays, targetProfileId, checkoutKey } = body;
    let bookingDetails = body.bookingDetails;
    if (!z.uuid().safeParse(checkoutKey).success) {
      return NextResponse.json({ error: 'A valid checkout request key is required.' }, { status: 400 });
    }
    const billingResult = z.object({
      name: z.string().trim().max(150).default(''), address: z.string().trim().max(500).default(''),
      city: z.string().trim().max(100).default(''), state: z.string().trim().max(100).default(''),
      pin: z.string().trim().max(12).default(''), gstin: z.string().trim().max(20).default(''),
    }).strict().safeParse(body.billingProfile || {});
    if (!billingResult.success) return NextResponse.json({ error: 'Invalid billing details.' }, { status: 400 });
    const billingSnapshot = { buyer: { ...billingResult.data, email: user.email || '' },
      seller: { name: contactConfig.brand.legalName, tamilName: contactConfig.brand.tamilName,
        businessType: contactConfig.brand.businessType, address: contactConfig.address.display,
        email: contactConfig.email.support, phone: contactConfig.phone.display,
        gstRegistered: contactConfig.brand.gstRegistered, gstin: contactConfig.brand.gstin },
      capturedAt: new Date().toISOString(), version: 1 };

    let originalPrice = 0;
    let description = '';
    let planDurationDays: number | null = null;

    if (paymentType === 'subscription') {
      if (!z.uuid().safeParse(planId).success) {
        return NextResponse.json({ error: 'A valid plan is required for subscriptions.' }, { status: 400 });
      }
      const { data: plan, error: planErr } = await requestClient
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .maybeSingle();

      if (planErr || !plan) {
        return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
      }
      if (Number(plan.price) <= 0 || plan.plan_key === 'startup') {
        return NextResponse.json({ error: 'The Startup plan is activated automatically and does not require checkout.' }, { status: 400 });
      }
      originalPrice = Number(plan.price);
      planDurationDays = plan.duration_days;
      description = `Gokul Vivaham - ${plan.name}`;
    } else if (paymentType === 'featured_profile') {
      const days = Number(featuredDays) || 30;
      if (![15, 30].includes(days)) return NextResponse.json({ error: 'Choose a 15 or 30 day feature.' }, { status: 400 });
      originalPrice = days === 30 ? FEATURED_PROFILE_PRICES.DAYS_30 : FEATURED_PROFILE_PRICES.DAYS_15;
      description = `Gokul Vivaham - Featured Profile for ${days} Days`;
    } else if (paymentType === 'consultation') {
      const parsedBooking = consultationDetailsSchema.safeParse(bookingDetails);
      if (!parsedBooking.success) return NextResponse.json({ error: 'Choose valid consultation details.' }, { status: 400 });
      const todayInIndia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      if (parsedBooking.data.consultationDate <= todayInIndia) return NextResponse.json({ error: 'Consultation date must be in the future.' }, { status: 400 });
      if (!ASTROLOGERS.some((astrologer) => astrologer.id === parsedBooking.data.astrologerId)) {
        return NextResponse.json({ error: 'The selected astrologer is unavailable.' }, { status: 400 });
      }
      bookingDetails = parsedBooking.data;
      originalPrice = CONSULTATION_PRICE; // Flat rate for consultation bookings
      description = `Gokul Vivaham - Astrologer Consultation`;
    } else if (paymentType === 'contact_unlock') {
      if (!z.uuid().safeParse(targetProfileId).success) {
        return NextResponse.json({ error: 'A valid target profile is required for contact unlocks.' }, { status: 400 });
      }
      const { data: contactTarget } = await supabaseAdmin.from('profiles').select('id,user_id,users!inner(id)').eq('id', targetProfileId)
        .eq('is_suspended', false).eq('is_banned', false).is('deleted_at', null)
        .eq('users.status', 'active').is('users.deleted_at', null).maybeSingle();
      if (!contactTarget || contactTarget.user_id === dbUserId) return NextResponse.json({ error: 'Target profile is unavailable.' }, { status: 404 });
      if (!(await canDiscoverProfile(contactTarget.user_id))) return NextResponse.json({ error: 'Target profile is unavailable.' }, { status: 404 });
      originalPrice = 199;
      description = `Gokul Vivaham - Single Contact Unlock`;
    } else {
      return NextResponse.json({ error: 'Invalid paymentType' }, { status: 400 });
    }

    // Calculate coupon discount
    let discount = 0;
    let appliedCouponId = null;

    if (couponCode) {
      const { data: coupon } = await requestClient
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .gt('expiry_date', new Date().toISOString())
        .maybeSingle();

      if (!coupon || coupon.uses_count >= coupon.max_uses) {
        return NextResponse.json({ error: 'Coupon is invalid, expired, or fully used.' }, { status: 400 });
      }
      if (!Number.isFinite(Number(coupon.discount_value)) || Number(coupon.discount_value) < 0 ||
          (coupon.discount_type === 'percentage' && Number(coupon.discount_value) > 100)) {
        return NextResponse.json({ error: 'Coupon configuration is invalid.' }, { status: 400 });
      }
      if (coupon && coupon.uses_count < coupon.max_uses) {
        appliedCouponId = coupon.id;
        if (coupon.discount_type === 'percentage') {
          discount = (originalPrice * Number(coupon.discount_value)) / 100;
        } else if (coupon.discount_type === 'flat') {
          discount = Number(coupon.discount_value);
        }
      }
    }

    const finalPrice = Math.max(0, originalPrice - discount);

    const gatewayChargePrice = finalPrice; // Business is unregistered: no GST collected.

    // A checkout key is generated once per user action. Replaying the same
    // request returns the original pending order instead of creating another.
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('razorpay_order_id,amount,currency,status')
      .eq('user_id', dbUserId)
      .eq('checkout_key', checkoutKey)
      .maybeSingle();
    if (existingPayment) {
      if (existingPayment.status !== 'pending') {
        return NextResponse.json({ error: `This checkout is already ${existingPayment.status}. Start a new checkout if needed.` }, { status: 409 });
      }
      return NextResponse.json({
        orderId: existingPayment.razorpay_order_id,
        order_id: existingPayment.razorpay_order_id,
        amount: Math.round(Number(existingPayment.amount) * 100),
        currency: existingPayment.currency || 'INR',
        keyId: razorpayConfig.keyId,
        description,
        user: { name: user.user_metadata?.full_name || 'Valued Member', email: user.email, phone: user.phone || '' },
        idempotent: true,
      });
    }

    // Call reusable payment service to create order
    if (!Number.isFinite(gatewayChargePrice) || !Number.isSafeInteger(Math.round(gatewayChargePrice * 100)) || Math.round(gatewayChargePrice * 100) < 100) {
      return NextResponse.json({ error: 'Minimum payment amount is 100 paise (₹1).' }, { status: 400 });
    }
    const receipt = `rcpt_${Math.random().toString(36).substring(2, 11)}`;
    const { order: orderData, error: orderErr } = await paymentService.createOrder(gatewayChargePrice, receipt);

    if (orderErr || !orderData) {
      if (orderErr?.statusCode === 401) {
        return NextResponse.json({
          error: 'Payment gateway authentication failed. Please contact support.',
          code: 'PAYMENT_GATEWAY_AUTH_FAILED',
        }, { status: 401 });
      }
      return NextResponse.json({ error: 'Failed to create order on payment gateway' }, { status: 500 });
    }

    const rzpAmountPaise = Number(orderData.amount);

    // Create a pending payment row using admin connection to bypass regular user insert policies
    const { data: paymentRecord, error: payErr } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: dbUserId,
        amount: gatewayChargePrice,
        currency: 'INR',
        status: 'pending',
        payment_type: paymentType,
        billing_snapshot: billingSnapshot,
        selected_plan_id: paymentType === 'subscription' ? planId : null,
        plan_duration_days: planDurationDays,
        featured_duration_days: paymentType === 'featured_profile' ? (Number(featuredDays) || 30) : null,
        razorpay_order_id: orderData.id,
        coupon_id: appliedCouponId,
        target_profile_id: paymentType === 'contact_unlock' ? targetProfileId : null,
        checkout_key: checkoutKey,
      })
      .select()
      .single();

    if (payErr) {
      console.error('Payment creation error:', payErr);
      if (appliedCouponId && payErr.message?.includes('Coupon')) {
        return NextResponse.json({ error: 'Coupon is unavailable or reserved by another checkout. No charge was made.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to initialize payment record' }, { status: 500 });
    }

    // Save temporary details for consultations if needed
    if (paymentType === 'consultation' && bookingDetails) {
      // Create pending booking record associated with this payment
      const { error: bookingError } = await supabaseAdmin.from('consultation_bookings').insert({
        user_id: dbUserId,
        payment_id: paymentRecord.id,
        consultation_reason: bookingDetails.consultationReason || 'General Matrimonial Guidance',
        consultation_date: bookingDetails.consultationDate,
        notes: bookingDetails.notes || '',
        payment_status: 'pending',
        astrologer_id: bookingDetails.astrologerId
      });
      if (bookingError) return NextResponse.json({ error: 'Unable to save consultation booking. Checkout was not opened.' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: orderData.id,
      order_id: orderData.id,
      amount: rzpAmountPaise,
      currency: 'INR',
      keyId: razorpayConfig.keyId,
      description,
      user: {
        name: user.user_metadata?.full_name || 'Valued Member',
        email: user.email,
        phone: user.phone || ''
      }
    });

  } catch (err: unknown) {
    console.error('Create Order Handler error:', err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
