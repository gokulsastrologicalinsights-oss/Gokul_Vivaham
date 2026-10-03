import crypto from 'crypto';
import { razorpayClient, razorpayConfig, paymentsConfigured, webhooksConfigured } from '@/lib/payments/config';

function signaturesEqual(expected: string, received: string): boolean {
  return typeof received === 'string' && /^[a-f0-9]{64}$/i.test(received) &&
    crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

export const paymentService = {
  /**
   * Creates a new Razorpay order.
   * @param amountInInr Amount in Indian Rupees (will be converted to paise).
   * @param receiptId Receipt tracking ID.
   */
  async createOrder(amountInInr: number, receiptId: string) {
    const amountInPaise = Math.round(amountInInr * 100);
    if (!Number.isFinite(amountInInr) || !Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
      return { order: null, error: new Error('Minimum payment amount is 100 paise (₹1).') };
    }
    if (!paymentsConfigured) return { order: null, error: new Error('Payments are not configured yet.') };
    try {
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
      });
      return { order, error: null };
    } catch (err: any) {
      console.error('Failed to create Razorpay order:', err);
      return { order: null, error: err };
    }
  },

  /**
   * Verifies the client payment signature returned by the Razorpay Checkout form.
   */
  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!paymentsConfigured || typeof orderId !== 'string' || typeof paymentId !== 'string' || orderId.startsWith('order_mock_')) return false;
    try {
      const generatedSignature = crypto
        .createHmac('sha256', razorpayConfig.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      return signaturesEqual(generatedSignature, signature);
    } catch (err) {
      console.error('Signature verification failed:', err);
      return false;
    }
  },

  /**
   * Verifies the signature header for incoming Razorpay webhooks.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!webhooksConfigured) return false;
    try {
      const expectedSignature = crypto
        .createHmac('sha256', razorpayConfig.webhookSecret)
        .update(rawBody)
        .digest('hex');
      return signaturesEqual(expectedSignature, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return false;
    }
  }
};
export type PaymentService = typeof paymentService;
