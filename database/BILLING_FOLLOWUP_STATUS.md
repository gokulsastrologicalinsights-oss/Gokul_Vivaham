# Billing follow-up

Invalid, expired, exhausted and malformed coupons now fail checkout explicitly. No silent full-price fallback. Concurrent coupon reservation/limit enforcement remains unimplemented and must be completed before advertising limited-use coupons.

Removed unsafe recurring activation/charge fulfillment. Mandate activation grants no paid access. Charged events fail with a reconciliation error rather than guessing a plan or granting access from gateway notes. Automatic renewals are unavailable until trusted provider-subscription mapping, atomic renewal fulfillment, and provider test coverage are implemented. One-time subscription fulfillment is unchanged.

Signature tests and TypeScript passed before dead legacy-handler removal. No provider transaction was attempted. Invoice base/tax calculations are application estimates; tax configuration and invoice business details need owner review. Real Razorpay credentials and webhook testing remain pending.
