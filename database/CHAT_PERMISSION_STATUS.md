# Chat permissions

Applied `chat-permissions.sql` to the connected Supabase project.

Database RLS requires a live active member session, participation in the chat, an accepted interest, an active Silver/Gold/Diamond subscription for the accessing member, active accounts and profiles on both ends, and no block in either direction. Expiry and blocks also hide existing chat history. Subscription start dates are respected. Message updates are restricted to the existing read-receipt column.

Rollback-only database fixtures verified paid accepted access and denial for free, unmatched, incoming block, expired subscription, and revoked session. Authenticated-role RLS tests verified message read/send success followed by read/send denial after expiry. All fixtures were rolled back. Browser end-to-end messaging was not tested in this stage.

The chat service rejects empty/oversized messages and provides a clearer unavailable-chat error. Matching filter review remains the next stage. Production deployment has not been changed.
