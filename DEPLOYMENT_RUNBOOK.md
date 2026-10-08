# Operations and recovery

## Status

Release repository: gokulsastrologicalinsights-oss/gokulvivaham, main branch. Vercel project: gokul-astro-s-projects/gokulvivaham, https://gokulvivaham.vercel.app. Production Supabase: rzhkwoeesgyekyutgyqr (PostgreSQL 17).

This change adds readiness monitoring, an alert drill, encrypted daily backup automation and archive-integrity tests. A real production backup and isolated restore have NOT yet been verified: the database connection credential and an isolated restore target are still required. Encryption tests are not a database restore test.

## Monitoring

GET /api/health is uncached. It returns HTTP 200 only when a small database catalogue query succeeds; otherwise HTTP 503 with a generic status. It exposes no customer records or provider error messages. This checks application/database readiness, not payment capture or email/SMS delivery.

Website monitoring runs every 15 minutes at minutes 7, 22, 37 and 52 UTC. It retries three times, then opens one [Operations] Website unavailable issue. Recovery comments and closes that issue without repeated failure messages. Enable Issues and Actions in repository Watch settings and email delivery in personal GitHub notification settings. Issue creation alone does not prove inbox delivery.

Run manually with alert_drill=true to test issue creation and closure without interrupting production. Confirm the closed drill issue and owner inbox receipt. Normal manual runs check the live website. When repository variable BACKUPS_ENABLED=true, monitoring also opens an overdue-backup issue if no successful backup with an available encrypted artifact exists within 30 hours.

GitHub schedules can be delayed and can be disabled in public repositories after 60 days without activity. Review Actions regularly. This is a basic external monitor, not an availability SLA or a replacement for Vercel runtime-error alerts. Account-level log retention and inbox delivery still need owner verification.

## Daily backups: owner setup

Create a GitHub Actions environment named operations restricted to main. Enter these environment secrets directly in GitHub, never in chat, source, YAML or logs:

- SUPABASE_DB_URL: production Supabase session-pooler PostgreSQL URI on port 5432, including the database password. This differs from the Supabase login password and API key. Percent-encode password special characters. The exporter verifies source project and TLS certificate.
- SUPABASE_SERVICE_ROLE_KEY: existing server-side production key, used to read Storage contents.
- BACKUP_ENCRYPTION_KEY: 32 random bytes encoded as 64 hexadecimal characters. Generate in a trusted password manager/local tool; keep a separate owner-controlled recovery copy. Losing it makes backups unrecoverable. Preserve old keys when rotating.

First run Encrypted daily backup manually. Only after a successful run with an encrypted artifact, set repository Actions variable BACKUPS_ENABLED=true. The schedule is daily at 03:17 IST (21:47 UTC), only from main. PostgreSQL 17 clients are installed from the official PostgreSQL repository.

The workflow exports a transaction-consistent database dump, roles without passwords, bucket configuration and Storage bodies. It encrypts files and manifest with AES-256-GCM, then decrypts and validates all sizes/SHA-256 checksums before publishing ciphertext-only GitHub artifacts retained seven days. Storage copying is sequential, not atomic with the database; quiesce uploads/deletions for a coordinated recovery point. Any failed export prevents publication. No weekly/monthly retention is configured. Review retention against deletion/privacy requirements.

The repository may be public. Artifacts contain encrypted customer data: protect the key separately and restrict repository administration. Never publish decrypted files. Provider dashboard settings, external payment records, SMTP/SMS credentials and Auth signing secrets are not covered; retain these securely in owner recovery documentation.

## Restore rehearsal: NOT RUN

1. Download a successful encrypted artifact to a private directory. Set BACKUP_ENCRYPTION_KEY in a private process environment. Run `node scripts/operations/unpack-backup.cjs <encrypted-directory> <new-private-directory>`. This validates encryption and checksums only.
2. Provision an isolated Supabase-compatible target with no production traffic, mail/SMS or payment webhooks. Review managed Auth/Storage compatibility and current provider guidance. Empty PostgreSQL alone is not a full Supabase replacement.
3. Review roles.sql and restore database roles, extensions, grants and RLS. Never restore into production. The older scripts/restore-database.ps1 accepts the manual script's checksum manifest, blocks the production host/pooler user and omits ACLs; it is not a full managed-Supabase clone tool.
4. Restore bucket settings and Storage bodies using manifest bucket/path mappings. Verify object checksums and reconcile changes during sequential copying.
5. Compare users, profiles, memberships and payments against backup inventory; verify foreign keys, functions, triggers, profile-ID sequences, RLS/grants and private files. Test login, editing, member/admin authorization and plan access with isolated fixtures. Disable copied sessions/outbound integrations before starting the app.
6. Record backup ID/time, isolated target identity, start/end, counts/integrity, application checks, omissions, recovery duration and data-loss window. Mark PASS only after these checks. Remove disposable recovery data according to retention policy.

## CI, staging and rollback

Application checks run type checks, payment-signature tests, operations tests and production compilation with non-working build-only configuration. CI receives no production secrets; never deploy its build. Vercel builds separately with real configuration. Green CI does not prove external integrations work.

Separate hosted staging is not provisioned by this change. Use an isolated Supabase project, synthetic members, Razorpay test keys and separate redirect/webhook settings. Historical SQL files are not an ordered migration baseline; review before provisioning. Require compatible migrations and verified backups before schema changes.

Record commit/deployment IDs. Roll back to a previously verified Vercel deployment for application regressions; this does not undo database changes. Never perform a production restore as routine rollback.

## Evidence ledger

- Local archive tests: nonempty/empty round trips, wrong-key/tamper rejection, no overwrite.
- Local monitor tests: retry/failure/recovery, alert deduplication, separate drill, missing/expired/stale backup detection.
- Deployment and workflow run evidence: recorded in delivery report after execution.
- First production encrypted backup: PENDING CREDENTIALS.
- Owner inbox alert receipt: PENDING OWNER CONFIRMATION.
- Isolated database + Storage restore and app acceptance: NOT RUN.

References: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [restore guidance](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [GitHub schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [PostgreSQL packages](https://www.postgresql.org/download/linux/ubuntu/).
