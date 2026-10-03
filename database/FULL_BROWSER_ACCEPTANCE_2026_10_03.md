# Browser acceptance — 2026-10-03

Testing used two disposable confirmed members and isolated Silver-access/mutual-interest fixtures. These fixtures bypass provider purchase/signup delivery only for QA and do not constitute payment or email-delivery acceptance.

## Verified in browser

- Password login reaches dashboard and authenticated navigation appears.
- Permitted desktop chat loads; sending one message produces Sent state and a single persisted record.
- Mobile 390x844 list opens a conversation and Back returns to list; no horizontal overflow observed.
- Incoming message from the second member SDK session appears as one unread while the mobile pane is closed; opening the pane persists is_seen=true.
- Support submission saves and displays its reference; matching database request exists.
- Partner preferences save with All Communities; changed location and empty caste persist in the database.
- Own profile loads full age/gender/location/creation-date data after the sidebar race fix.
- Match page loads its empty-results state for the fixture's chosen filters.
- Verification screen loads with document submit buttons disabled until upload; gallery shows three upload slots.
- Subscription screen recognizes the fixture Silver plan and disables Current Plan; no checkout/cancellation was performed.
- Ordinary member navigation to admin/settings redirects to member dashboard.

## Bugs fixed during testing

1. Preference validation now allows no community restriction and validates selected values against the dropdown's dynamic catalog.
2. Sidebar shortened profile state overwrote full profile data. Sidebar and own profile now use separate state; invalid date display has a safe fallback.
3. Own-profile export uses the complete protected export service; its deletion shortcut goes to the existing privacy settings workflow instead of a direct browser suspension attempt.
4. Missing communities database table prevented live catalog/admin management. Added seeded 63-option catalog with active public reads and trusted-admin writes; anonymous read/write-denial checks passed.
5. Removed dashboard's hardcoded claim of three new matches.

## Still pending

- Admin signed-in browser testing: owner was asked to sign in separately; no active admin browser session was supplied during this pass.
- Browser account-export file download could not be confirmed by the browser download event; protected API tests passed separately.
- Real signup confirmation/reset delivery, staged files, browser file upload/moderation, interests/blocked flows, provider checkout/refund, settings mutations, scheduling forms and two independent browser-session reconnect/read-receipt acceptance.
- Only the named checks above are verified. This is not a claim of full launch acceptance.

TypeScript passed after fixes. Temporary fixture cleanup is recorded separately after execution. Production deployment was not changed.

Final follow-up: browser gallery upload reached Pending Approval. Both disposable members, their private uploaded file and related records were removed by the fixture cleanup command. TypeScript passed. Export download event remained unconfirmed. Admin signed-in testing still needs the owner's active browser session.
