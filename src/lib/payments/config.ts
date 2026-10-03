import Razorpay from 'razorpay';
import { z } from 'zod';

const razorpayEnvSchema = z.object({
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
});

// Environment check to make sure secrets are server-side only
if (typeof window !== 'undefined') {
  throw new Error('Razorpay configuration should only be loaded on the server-side.');
}

const parsedEnv = razorpayEnvSchema.safeParse({
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
});

if (!parsedEnv.success) {
  const errorMsg = 'Razorpay Config Validation Error:\n' + 
    parsedEnv.error.issues.map(issue => ` - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  console.warn(errorMsg);
  
  // Payment entry points fail closed; unrelated pages can still build and run.
}

export const razorpayConfig = {
  keyId: parsedEnv.data?.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholderid',
  keySecret: parsedEnv.data?.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || 'placeholdersecret',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};

export const razorpayClient = new Razorpay({
  key_id: razorpayConfig.keyId,
  key_secret: razorpayConfig.keySecret,
});

export const paymentsConfigured = parsedEnv.success &&
  Object.values(parsedEnv.data).every(value => !/placeholder/i.test(value));

export const webhooksConfigured = paymentsConfigured && !!razorpayConfig.webhookSecret &&
  !/placeholder/i.test(razorpayConfig.webhookSecret);
