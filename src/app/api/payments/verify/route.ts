import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { paymentService } from '@/services/payment.service';
import { authLib } from '@/lib/auth';
import { razorpayClient, paymentsConfigured } from '@/lib/payments/config';

export async function POST(req: Request) {
  try {
    if (!paymentsConfigured) return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment signature parameters' }, { status: 400 });
    }

    // 1. Authenticate user from session
    const user = await authLib.getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    // 2. Fetch the pending payment record
    const { data: payment, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('*, users(auth_user_id)')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (payErr || !payment) {
      return NextResponse.json({ error: 'Associated payment record not found' }, { status: 404 });
    }

    // 3. Prevent unauthorized execution by verifying payment ownership
    if (payment.users?.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Payment ownership verification failed' }, { status: 403 });
    }

    // 4. Verify cryptographic signature using reusable paymentService
    const isValid = paymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature. Verification failed.' }, { status: 400 });
    }

    // 5. Query payment details from Razorpay API to prevent mock manipulation/spoofing on live environments
    {
      try {
        const razorpayPayment = await razorpayClient.payments.fetch(razorpay_payment_id);
        
        // A. Verify payment has actually been captured/completed
        if (razorpayPayment.status !== 'captured') {
          return NextResponse.json({ error: 'Payment is incomplete at gateway level' }, { status: 400 });
        }

        // B. Verify correct order mapping
        if (razorpayPayment.order_id !== razorpay_order_id) {
          return NextResponse.json({ error: 'Payment-to-order mapping mismatch' }, { status: 400 });
        }

        // C. Verify transaction amount matches server-side pricing record (paise vs rupees)
        const dbAmountPaise = Math.round(Number(payment.amount) * 100);
        if (razorpayPayment.amount !== dbAmountPaise || razorpayPayment.currency !== 'INR') {
          return NextResponse.json({ error: 'Payment amount mismatch verification error' }, { status: 400 });
        }
      } catch (err: any) {
        console.error('Failed to verify payment with Razorpay API:', err);
        return NextResponse.json({ error: 'Payment verification failed at gateway provider' }, { status: 400 });
      }
    }

    if (payment.payment_type === 'subscription') {
      const { data, error } = await supabaseAdmin.rpc('fulfill_subscription_payment', {
        payment_row: payment.id, gateway_payment: razorpay_payment_id,
      });
      if (error) throw error;
      return NextResponse.json(data);
    }

    const { data, error } = await supabaseAdmin.rpc('fulfill_product_payment', { payment_row: payment.id, gateway_payment: razorpay_payment_id });
    if (error) throw error;
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('Verify Payment API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
