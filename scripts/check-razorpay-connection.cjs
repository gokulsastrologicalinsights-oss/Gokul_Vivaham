// Creates one unpaid test-mode order; never captures or charges a payment.
const { loadEnvConfig } = require('@next/env');
const Razorpay = require('razorpay');
loadEnvConfig(process.cwd());
if (!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) throw new Error('Test-mode credentials required.');
const client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
client.orders.create({ amount: 100, currency: 'INR', receipt: `qa_${Date.now()}` })
  .then(order => {
    if (Number(order.amount) !== 100 || order.currency !== 'INR' || order.status !== 'created') throw new Error('Unexpected order response.');
    console.log('PASS: Razorpay accepted credentials and created an unpaid ₹1 test order. No charge made.');
  }).catch(error => { console.error('Razorpay connection failed:', error.statusCode || 'network error', error.error?.description || error.message); process.exitCode = 1; });
