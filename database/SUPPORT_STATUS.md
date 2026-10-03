Support requests — 2026-10-03

Replaced contact form simulated success with authenticated, server-saved requests. Members read their requests and replies on /contact; admins reply and resolve through /admin/support. Replies, notification and audit are atomic, with replay denial. Strict payload validation and same-origin mutation checks apply. Tables and function are inaccessible directly to anonymous/member roles. Requests are included in account export and cascade with member erasure.

Verified: TypeScript; database rollback tests for unauthorized actor denial, atomic reply/notification, repeated-reply denial and revoked member permissions. Browser submission/reply acceptance remains pending. Latest 100 member / 200 admin records are displayed. Guests should use the published phone/WhatsApp contact or sign in. No email, SMS or WhatsApp message is sent by this workflow.
