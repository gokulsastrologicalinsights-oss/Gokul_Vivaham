# Subscription fulfillment

New checkout orders persist selected_plan_id and plan_duration_days before payment verification. Checkout verification and order payment-capture webhooks use the service-role-only fulfill_subscription_payment RPC after provider verification.

The RPC locks the payment and account; creates the exact selected subscription, invoice and notification; updates coupon usage and premium flags; and marks completion in a single transaction. Repeated callbacks with the same gateway payment return the original records. A different reference is rejected. Existing completed payments without the fulfillment marker require reconciliation rather than being silently reactivated. Older pending payments without a stored plan are rejected.

Rollback-only tests passed discounted-price Gold selection, saved 45-day duration, repeated callback without duplicate subscription/invoice, mismatched reference denial, missing-plan failure without changing payment status, and authenticated-role execution denial. All fixtures were rolled back.

Provider checkout/webhook delivery and concurrent request testing remain pending. Recurring subscription events and other payment products still use older fulfillment paths and need separate review. No real charge was made and production deployment was not changed.
