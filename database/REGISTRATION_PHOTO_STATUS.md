# Registration and profile photos

Implemented locally on 2026-10-02.

- Registration validates all steps before signup, sends profile and consent fields to the existing Auth signup trigger, and no longer uploads files before authentication.
- Passwords and confirmation passwords are excluded from saved browser drafts. Previously saved draft passwords are ignored when restored.
- Selected photos and PDF horoscopes are kept in an account-specific IndexedDB record in the same browser. They are available for 24 hours. After confirmation/login, the dashboard offers an explicit upload action, partial-success retry, and an option to select files later. A storage failure does not undo an already created account or invite duplicate signup.
- Confirmation returns to the dashboard; this URL must be allowed in Supabase auth redirects. Immediate-session signup synchronizes the protected server cookie and goes to the dashboard.
- Registration accepts PDF horoscopes and JPEG/PNG/WebP photos up to 5MB, matching server bucket restrictions. No anonymous storage access was added.
- Photos are stored in a private bucket under their owner's ID. A protected image API checks pending/approved state, owner/admin access, profile visibility, blocks, and selected photo privacy. Anonymous users cannot view these photos. Pending photos are available only to owner/admin; approved public photos can be viewed by authenticated members with permitted access.
- Server-only attachment RPC validates actual file ownership, updates gallery/profile together, makes repeated attachment idempotent, and enforces the three-photo limit under a profile-row lock.
- Photo reviews use an authenticated admin API and an atomic RPC for status, notification, and audit record. Rejected/flagged files remain private and available to the owner/admin until deleted through the applicable workflow.
- Removed signup-trigger imports of arbitrary photo/horoscope URLs and its automatic approval of metadata photos. Members cannot change protected photo moderation fields.

Verification: `scripts/check-registration-photos.cjs` passed against real Supabase. It verified every submitted profile field, four consent records, role protection, ignored untrusted signup file URLs, ownership/private photo access, admin approval/rejection, pending/hidden/premium denial, repeated attachment, and the gallery limit. Temporary accounts and photos were removed. TypeScript passed, and the registration page was checked in the browser.

Remaining acceptance: configure and test actual email delivery, then verify the full signup -> email confirmation -> same-browser staged-file restoration -> upload journey with a real authorized mailbox. The backend persistence test creates disposable users through the Admin Auth API, which invokes the same signup trigger, without sending emails. IndexedDB restoration across a real confirmation email is not yet verified. SMS-provider setup also remains pending. Production has not been deployed.

Next independent stage: real matching filters, interests, favourites/blocking, and permitted chat/contact access.

Security advisors reported no new schema warnings; the pre-existing leaked-password-protection setting remains disabled. Guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
