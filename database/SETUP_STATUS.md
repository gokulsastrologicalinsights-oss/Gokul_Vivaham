# Backend connection status

Completed on 2026-10-02 for the recovered deployed source.

- Existing free Supabase project: rzhkwoeesgyekyutgyqr, region ap-south-1.
- Local .env.local contains project URL, publishable key and an existing server secret. It is ignored by Git. No production/Vercel configuration was changed.
- Applied install_recovered_matrimony_schema via the Supabase migration tool. Reviewed SQL is in setup-recovered-source.sql; scripts/prepare-backend.cjs reproduces that one-time installer. Do not run it again against a populated project.
- Preserved the earlier 17 tables and eight functions in zip_version_archive. The archive has no access grants for browser clients and is outside the public API schema.
- Installed 29 public tables with RLS enabled, signup/profile/preference/consent triggers, payment/contact-unlock fields and four plans with IDs matching src/constants/payments.ts.
- Added safeguards against direct member edits to account role, verification flags, and premium profile status. Removed member inserts into subscriptions.
- Protected subscription cleanup with authenticated admin membership and removed its automatic invocation by ordinary subscribers.
- Server administrator client has no persistent session or token refresh.

## Verified

scripts/check-backend.cjs passed against the real backend and localhost server:

1. Anonymous Data API reads all four expected plans and cannot read member accounts.
2. Two isolated temporary Auth accounts signed in with real passwords; signup created profiles and member rows.
3. Members saved their own profile; cross-user account reads and profile updates were denied.
4. Member changes to admin role, email verification and premium status were denied.
5. Local contact-unlock and entitlement endpoints returned real empty/Startup data with valid sessions.
6. Cleanup returned 401 anonymously and 403 to an ordinary member.
7. Both test accounts were removed; final database counts confirmed zero Auth users, member rows and profiles.

Security advisors returned informational notices only for intentionally inaccessible tables without read policies (compatibility_scores, profile_views, success_stories and archived rate_limits). No public table lacks RLS, and no public SECURITY DEFINER function lacks a fixed search path.

## Following steps still needed

This completes the database connection foundation. Full registration, confirmation/reset email redirects, genuine OTP, role authorization in the application, private storage and signup uploads, payment gateway setup, scheduled expiry, moderation and every member journey still require their planned completion steps. In particular, registration currently attempts photo upload before Auth signup; do not enable anonymous document upload to work around it. Storage should be completed with ownership paths and private signed access during the uploads step.

The email/mobile verification UI still uses demo checks. The new database protections intentionally reject its direct attempts to mark a user verified until provider-backed verification is implemented.
