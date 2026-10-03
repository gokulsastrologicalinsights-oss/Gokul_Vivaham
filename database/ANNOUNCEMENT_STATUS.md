Admin announcements — 2026-10-03

/admin/notifications now provides a title/message composer, explicit preview and publish action, saved delivery counts and the latest 100 announcements. Admin navigation and bell link reach the page; fake unread indicators were removed.

Protected server API checks trusted administrator access and exact-origin mutations. Moderators cannot broadcast. A service-only database function publishes notifications, announcement history and audit atomically, excludes administrators and inactive/deleted/suspended/banned members, and uses a request UUID to prevent duplicate retries. Conflicting reuse is rejected. Members can update only notification is_read, not notification content.

Verified: TypeScript; anonymous API history/publish denial; rollback database checks for unauthorized actor, audience count, atomic notification/audit, duplicate retry and changed-payload rejection; member publish/content-update permissions denied and read flag retained. All test notification writes were rolled back. Browser preview/publish and member inbox acceptance remain pending. No email, SMS, push or WhatsApp delivery is included. Synchronous broadcast requires a queued approach before scaling to very large membership.
