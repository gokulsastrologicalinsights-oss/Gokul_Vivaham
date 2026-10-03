# Account export — 2026-10-03

Authenticated server export binds the target to the verified session. Client-supplied query targets are rejected. Includes account/profile/preferences, consent, documents/photo metadata, subscriptions/payments/invoices, notifications, verification/deletion requests, consultations/features/contact unlocks, favorites/activity, interests, member-created blocks/reports/views, participating chats/messages, compatibility records and success stories. Does not include other members' account/profile records, payment signatures, Auth secrets or embedded file contents.

Sections use stable-ID pagination in 500-row pages. More than 50,000 rows in a section/chunk fails explicitly, rather than truncating silently. The export is not a transactionally consistent snapshot during concurrent writes. Backups, provider records and downloaded copies are outside its scope. Response uses private no-store headers.

scripts/check-account-export.cjs passed anonymous denial, attempted target override, authenticated account binding, 601-record pagination, cross-member isolation, expanded section availability and no-store. Two temporary accounts and their records were cleaned up. TypeScript passed. UI download and oversized export acceptance remain pending.
