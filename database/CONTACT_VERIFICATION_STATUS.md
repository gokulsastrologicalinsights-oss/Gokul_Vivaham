# Contact verification

Implemented locally on 2026-10-02.

Removed the fixed demo code and blank-code acceptance from the member verification page. Sending uses Supabase Auth: current-account email OTP/magic link and authenticated phone-change OTP. Actual provider errors are shown; an OTP form opens only after successful sending. Supabase controls code expiry and request/verification rate limits.

`POST /api/verification/contact` accepts only a field name, verifies the current active server session, and copies only contact values confirmed by Supabase Auth. It rejects caller-supplied flags, unconfirmed contacts, anonymous callers and foreign origins. Existing confirmed contacts are synchronized when the page loads. Existing database guards continue to deny direct member verification-flag edits.

`scripts/check-contact-verification.cjs` passed against the real project: provider-generated email code accepted; invalid/demo code and replay rejected; email synchronized; unconfirmed phone denied; direct member flag edits denied; anonymous and cross-origin requests denied. The test generated a code without sending email or SMS, and removed its temporary account. TypeScript checks passed.

Remaining delivery setup:
- Supabase reports phone authentication disabled. Configure an SMS provider before real mobile OTP delivery; no paid provider was enabled.
- Email sending must be tested with a real authorized recipient. Supabase's default mail service has recipient/rate restrictions; configure SMTP for member-wide delivery.
- Include `{{ .Token }}` in the Magic Link email template for code entry. The page also accepts the provider's default link flow, returning to the verification page with the confirmed session. Ensure localhost and the production verification URL are allowed auth redirects.

Registration, private document storage/moderation, and production rollout remain separate work.
