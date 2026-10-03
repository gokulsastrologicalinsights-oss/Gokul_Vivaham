Safety review — 2026-10-03

Admin reports now load from a protected server API. Pending reports accept a decision and required notes; the server derives the affected member from the report, never a client target ID. A service-only transaction records review, penalties, notification and audit together. Administrator accounts are protected; repeated reviews are rejected. Members cannot change warning or ban fields, and banned accounts fail database session checks.

Verified: rollback database checks for protected administrator, dismissal with reviewer identity, and replay denial. TypeScript check passed. Browser review and warning/suspension acceptance with isolated member accounts remain pending. The queue currently loads the latest 200 reports.
