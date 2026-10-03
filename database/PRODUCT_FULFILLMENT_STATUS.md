# Other paid services — 2026-10-03

Checkout verification and captured-order webhooks now use the same service-role-only atomic RPC for contact unlocks, featured profiles and consultations. Fulfillment, transaction, notification, coupon usage and completion commit together. Same-payment retries return the original transaction; mismatched references fail. Removed the older duplicated non-atomic handlers.

Featured orders save a validated 15/30-day duration; fulfillment uses that duration and does not grant premium membership. Contact fulfillment uses the actual contact_unlocks schema without the nonexistent amount column. Consultation fulfillment requires an existing booking, and checkout validates date and checks booking persistence errors.

Tests found and repaired a shared billing-snapshot trigger bug: payments do not have a payment_id field, so table-specific logic must be nested. Rollback-only tests subsequently passed all three products, repeated fulfillment, 15-day duration, no feature-to-premium escalation, missing-booking rollback and denial of direct member execution. All fixtures rolled back. TypeScript passed before the final consultation input checks; final check recorded separately by the run.

Actual provider checkout and webhook delivery remain pending Razorpay credentials. This stage does not implement refunds, automatic recurring renewal, abandoned coupon cleanup, meeting scheduling, or complete browser acceptance.
