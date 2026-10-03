# Chat read status — 2026-10-03

Added recipient-only UPDATE policy for is_seen with the existing accepted-match, paid-access, block and active-session gates. Column privileges prevent message/body/sender updates. New authenticated messages cannot set their own read flag; receipts cannot revert to unread.

Conversation loading counts unread incoming messages. Message history includes is_seen, own bubbles show Sending/Sent/Read, and active-chat realtime UPDATE events refresh receipts. The visible conversation marks only already-loaded incoming message IDs read, avoiding marking future arrivals that were never loaded. Hidden tabs do not mark read until visible.

Rollback authenticated-role database tests verified paid recipient marking read and denial of resetting receipt or editing message body. Fixtures rolled back. Two-browser realtime delivery/read acceptance remains untested. Unread counts refresh on conversation loading and reading the active conversation; background conversation list updates remain future improvement.
