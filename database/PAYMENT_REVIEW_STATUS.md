# Payment review — in progress

Removed simulated order/signature acceptance. Missing or placeholder configuration now denies order creation and verification. HMAC signatures use timing-safe comparison and require a valid SHA-256 hexadecimal value. Checkout and payment-capture webhook verification require provider-fetched captured status, matching order, INR currency, and matching stored amount.

Validation: scripts/check-payment-signatures.cjs passed valid signature, tampered payload/order, malformed signature, mock bypass, and unconfigured denial checks. TypeScript passed. No real payment was made.

Remaining before payment readiness: persist the selected subscription plan on the payment record rather than guessing by price; unify checkout and webhook fulfillment in an atomic, idempotent database transaction; review recurring-subscription event fulfillment; verify coupon limits and invoice behavior; configure genuine Razorpay test credentials and webhook delivery; run provider test checkout and retries. Existing completion flags must not be treated as proof that fulfillment succeeded. Production deployment unchanged.

Reference: https://razorpay.com/docs/server-integration/python/test-app/ explains signature verification and captured status.
