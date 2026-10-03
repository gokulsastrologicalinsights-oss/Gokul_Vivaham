Chat list refresh — 2026-10-03

Conversation previews and unread counts now refresh for permitted chats on chat-message Realtime events, window focus, visibility restoration and a 30-second visible-tab fallback. Events trigger a fresh RLS-protected query rather than trusting event payloads. Requests are debounced and serialized; subscriptions, timers and listeners are removed on unmount. The current chat is preserved if still accessible and cleared if absent from the permitted list. Message loading and read updates ignore results after switching chats. Refresh errors are visible and clear after a successful refresh.

Verified: TypeScript passed. Targeted ESLint did not finish during the check and was interrupted; no lint pass is claimed. Live two-member event delivery, inactive-conversation unread counts, reconnect and browser acceptance remain pending. Existing paid/mutual-interest/block/session permissions continue to govern reads.
