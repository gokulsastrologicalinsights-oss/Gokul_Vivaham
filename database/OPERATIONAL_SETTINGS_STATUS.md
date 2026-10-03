Operational settings — 2026-10-03

Admin settings provides saved controls for accepting new paid orders and new support requests. Trusted admin/super-admin only; moderators and members cannot edit. The database update locks the singleton, checks the expected version and writes its audit in the same transaction. Server-side create-order and support POST check settings on each request, without a stale cache. Existing payment verification/webhooks, existing support history and admin replies remain available. Both switches default enabled; payment credentials remain independently required.

Verified: TypeScript, anonymous settings GET/PATCH denial, database rollback tests for unauthorized actor, saved switches, audit and stale-version denial. Original enabled values were preserved by rollback. Browser toggle acceptance and paused endpoint testing with authenticated members remain pending. This is not a registration, maintenance or payment-provider configuration panel.
