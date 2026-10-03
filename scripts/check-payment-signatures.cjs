const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const crypto = require('crypto');
const assert = require('assert/strict');
const config = { paymentsConfigured: true, webhooksConfigured: true, razorpayConfig: { keySecret: 'isolated-test-secret', webhookSecret: 'isolated-webhook-secret' }, razorpayClient: {} };
const exportsObject = {};
const source = ts.transpileModule(fs.readFileSync('src/services/payment.service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
vm.runInNewContext(source, { exports: exportsObject, require: name => name === '@/lib/payments/config' ? config : require(name), Buffer, console });
const service = exportsObject.paymentService;
const signature = crypto.createHmac('sha256', config.razorpayConfig.keySecret).update('order_test|pay_test').digest('hex');
assert.equal(service.verifySignature('order_test', 'pay_test', signature), true);
assert.equal(service.verifySignature('order_other', 'pay_test', signature), false);
assert.equal(service.verifySignature('order_test', 'pay_test', 'short'), false);
assert.equal(service.verifySignature('order_mock_test', 'pay_test', 'mock_sig_order_mock_test_pay_test'), false);
const body = '{"event":"payment.captured"}';
const webhookSignature = crypto.createHmac('sha256', config.razorpayConfig.webhookSecret).update(body).digest('hex');
assert.equal(service.verifyWebhookSignature(body, webhookSignature), true);
assert.equal(service.verifyWebhookSignature(body + ' ', webhookSignature), false);
config.webhooksConfigured = false;
assert.equal(service.verifyWebhookSignature(body, webhookSignature), false);
assert.equal(service.verifySignature('order_test', 'pay_test', signature), true);
config.webhooksConfigured = true;
config.razorpayClient.orders = { create: async data => ({ id: 'order_unit', ...data }) };
async function checkAmounts() {
  for (const amount of [0, 0.99, -1, NaN, Infinity]) {
    const result = await service.createOrder(amount, 'minimum-test');
    assert.equal(result.order, null);
    assert.ok(result.error);
  }
  config.paymentsConfigured = true;
  const minimum = await service.createOrder(1, 'minimum-test');
  assert.equal(minimum.order.amount, 100);
  assert.equal(minimum.order.currency, 'INR');
  console.log('PASS: ₹1 minimum, paise conversion, and independent checkout/webhook configuration.');
}
config.paymentsConfigured = false; config.webhooksConfigured = false;
assert.equal(service.verifySignature('order_test', 'pay_test', signature), false);
assert.equal(service.verifyWebhookSignature(body, webhookSignature), false);
service.createOrder(100, 'test').then(result => {
  assert.equal(result.order, null);
  assert.ok(result.error);
  console.log('PASS: valid signatures, tampering, malformed signatures, mock bypass and missing configuration. No payments created.');
  return checkAmounts();
});
