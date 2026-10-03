# Authentication and administrator access

Completed and verified locally on 2026-10-02.

- Server authentication verifies Supabase tokens and checks active account/profile status. Mock JWT decoding and the always-true verifySession stub were removed.
- Administrator authority comes from the protected admin_users table. Members' user_metadata.role cannot authorize admin routes or APIs. Premium route roles derive from an active, unexpired subscription.
- Administrators must verify a real TOTP authenticator (Supabase MFA, aal2). The admin login supports enrolment and subsequent challenge/verification; fixed credentials and code 8888 were removed. Existing authenticator factors also work through member login.
- Both /api/admin and privileged subscription cleanup require trusted membership plus MFA.
- Database admin policies require the same verified administrator context. Restrictive policies check active auth.sessions and account/profile status, so logged-out tokens and suspended accounts cannot use the direct Data API.
- Server session cookies are set through /api/auth/session as HttpOnly, SameSite=Lax, Secure on HTTPS, and expire with the validated access token. POST/DELETE reject mismatched origins. The browser Supabase SDK still retains its own client session for direct database access; HttpOnly applies to the server cookie.
- AuthProvider refreshes the server cookie after token refresh and receives its display role from the server. User changes clear member stores and the query cache. Session synchronization is serialized to avoid refresh/logout races.
- Missing Supabase configuration now stops the client instead of silently enabling mock authentication. Optional demo mode requires explicit development configuration and does not authorize server routes.

Applied migrations: enforce_live_sessions_and_admin_mfa and allow_server_access_guard_evaluation. The combined reviewed SQL is auth-access-hardening.sql and follows setup-recovered-source.sql when provisioning a fresh copy of this setup.

## Verification

scripts/check-auth-security.cjs passed with an isolated test account and authenticator:

1. Anonymous admin requests returned 401; ordinary members and forged role metadata returned 403.
2. Tampered JWTs were denied. Ordinary members were redirected away from admin pages.
3. Session synchronization rejected a foreign Origin and set an HttpOnly cookie for a valid session.
4. Trusted admin membership without MFA was denied, including direct attempts to grant profile verification.
5. Real TOTP verification granted the test administrator API and database permissions.
6. Suspension blocked application and direct database access. Revoking membership removed admin access. Logout immediately denied the still-unexpired test JWT.
7. The temporary account, membership and authenticator were removed.

scripts/check-backend.cjs also passed after these changes. TypeScript passed. The final admin login screen was checked in the local browser. Supabase security advisors returned only an informational notice for the inaccessible archived rate_limits table.

No real administrator account was created or promoted. A real administrator must be assigned through a trusted server/database process and enrol their own authenticator. Full member registration, confirmation/reset email flows, genuine email/mobile verification, storage and payments remain separate completion steps. This work has not been deployed to Vercel.
