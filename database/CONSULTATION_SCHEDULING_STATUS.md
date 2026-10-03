# Consultation scheduling — 2026-10-03

Admin consultations now includes an appointment form on approved bookings. The protected API requires a trusted admin session, same origin, a future ISO appointment, and an HTTPS Google Meet, Zoom or Teams link. The service-role-only RPC saves the appointment, internal member notification and audit record atomically. No external messages are sent and no provider meeting is automatically created: the administrator supplies an existing real meeting URL.

Members see the saved meeting link and local appointment time in My Bookings, or a scheduling-pending message. Removed the member-side fabricated Meet link. Database guards prevent ordinary members from inserting or editing schedule fields.

Rollback database tests verified admin scheduling, own-member reading, ordinary-member RPC denial and direct schedule-edit denial. Fixtures rolled back. TypeScript passed. Browser form submission and joining a real meeting remain unverified. This does not implement calendar availability/conflict checks, automatic meeting creation, or external email reminders.
