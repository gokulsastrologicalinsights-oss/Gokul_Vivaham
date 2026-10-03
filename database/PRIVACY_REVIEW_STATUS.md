# Privacy review — 2026-10-03

Admin deletion inspection now uses the selected member ID through the protected admin member-details API instead of exporting the administrator's own account. User exports fail when any section query fails and explicitly state the recent-activity limit and metadata-only file contents. Pending-request cancellation requires an actual returned pending record.

Permanent erasure remains unimplemented. Removed the old browser-side cascade procedure: it ignored cleanup errors, omitted Auth accounts and storage, and could report success incorrectly. Requests remain pending and the admin receives an explicit error; no real member records were erased in this stage. Implement a server-side resumable erasure job covering Auth sessions/accounts, database relationships, stored documents/photos, retention rules and audit evidence before enabling completion.

TypeScript validation run after edits. Full export cross-user and deletion lifecycle acceptance still pending. This is a partial privacy correction, not completed erasure functionality.
