Regression review — 2026-10-03

Re-ran backend setup, auth security/MFA/session revocation, owner admin panel, private documents, account export, registration/photos, email verification, payment signatures and member erasure against the local app and connected Supabase. All nine scripts passed. Temporary member/file fixtures were cleaned up; no real payment was created. TypeScript passed after the billing correction.

Found and disabled a misleading refund control: the old implementation marked local payments failed without a provider refund. The service now returns an explicit unavailable error and does not mutate payments or entitlements. Provider-confirmed refunds and reconciliation remain required.

The local app is not launch-ready. Real SMTP/SMS and Razorpay test configuration, browser member/admin acceptance, refund/renewal workflows, legal billing details and staging/release operations remain pending. No production deployment was performed.
