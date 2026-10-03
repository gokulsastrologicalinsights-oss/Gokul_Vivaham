# Razorpay Standard Checkout

The application uses Next.js App Router with the existing Razorpay SDK.

- POST `/api/payments/create-order`: authenticated order creation with server-resolved product pricing, INR paise conversion, and a 100 paise minimum.
- `src/hooks/useCheckout.ts`: official Standard Checkout modal, verification handler, dismiss callback, and payment failure messages. Simulated checkout has been removed.
- POST `/api/payments/verify`: checks ownership and constant-time HMAC-SHA256 signature, then confirms captured status, currency, amount and order with Razorpay before atomic fulfillment.

Test credentials are stored only in ignored `.env.local`. The key ID is returned by the order endpoint; a public environment variable is unnecessary. The secret is never sent to the browser.

## Test locally

1. Run `npm run dev -- --hostname 127.0.0.1 --port 3001` if the server is not already running.
2. Sign in as a member and open `/dashboard/subscription`.
3. Choose a membership plan and open checkout. Use Razorpay's documented test payment methods to test success and failure; close the modal to test cancellation.
4. Confirm membership is activated only after backend verification. No real money is charged with test-mode keys.

## Remaining manual setup

Configure automatic capture in the Razorpay dashboard. For delayed confirmations and recovery after the user closes the browser, configure a publicly reachable HTTPS webhook at `/api/payments/webhook`, select payment.captured and payment.failed events, and set the same separate webhook signing secret as `RAZORPAY_WEBHOOK_SECRET` on the server. The API key secret is not the webhook secret.

For deployment, add server environment variables in the hosting dashboard. Local environment files are not deployed. Replace test keys with live keys only when ready for real payments.

## Verification

TypeScript passed. Signature regression checks cover valid, altered, malformed and mock signatures. Amount checks cover the minimum and rupee-to-paise conversion. Razorpay accepted the credentials and created one unpaid ₹1 test order. Local unauthenticated order creation returned 401; missing verification fields returned 400. A completed payment through the browser modal has not yet been tested.
