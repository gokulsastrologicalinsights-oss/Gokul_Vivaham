# Staging, monitoring and recovery

## Current status

Local staging branch initialized; CI, a liveness endpoint and manual database archive/restore scripts added. No remote push, hosted staging, scheduled monitoring, off-site backup or actual restore rehearsal has been completed. PostgreSQL tools and connection credentials are not currently available. Existing production is unchanged.

## Staging

Connect this source folder to the intended GitHub repository after reviewing the baseline; preserve the existing repository history when importing it. Do not force-push this independent baseline onto the existing main branch. Set branch protection to require Application checks. Connect a separate Vercel staging project to the staging branch, with build command `npm run build -- --webpack`. Use an isolated Supabase project and synthetic accounts, separate server keys, Razorpay test keys, a separate webhook secret, and staging-specific Auth site/redirect URLs. Copy `.env.example` values into hosting environment settings; never upload `.env.local` or owner credentials.

Database SQL files are historical changes, not a verified ordered provisioning system. Export the current schema and review a baseline migration before provisioning staging; do not execute every SQL file blindly. Configure private Storage buckets, RLS, grants, trusted functions and Realtime publication, then run backend and browser acceptance against staging. Remove test data afterward.

## Monitoring

`GET /api/health` returns uncached application liveness only, not database/payment readiness. Set an external uptime check every five minutes for staging and production, with alerts to the owner. Verify one induced staging failure generates and clears an alert. Enable hosting runtime log retention/error alerts and review failed checkout/webhook, erasure jobs, support errors, and background tasks. Avoid sending raw member details or provider secrets to logs. Add database/provider readiness checks through protected tooling rather than this public endpoint. No external alerting service has been configured yet.

## Backups

Free Supabase projects need regular exports; database backups do not include Storage object bodies. Source: https://supabase.com/docs/guides/platform/backups

Install compatible PostgreSQL client tools. Set PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE and TLS settings in a private process environment, then run `scripts/backup-database.ps1`. The script writes an ignored custom archive and SHA256 manifest; it does not encrypt or upload them. Full managed Supabase exports need privileges and provider-specific restoration review. Preserve roles/grants and application schema configuration separately because the generic restore uses no-owner/no-acl. Export all private Storage file bodies and object paths separately, preserving bucket settings and access policies; the database archive alone is insufficient.

Encrypt backups and copy off-site to an owner-controlled location with restricted access. Proposed schedule: daily backups plus a pre-release backup, seven daily and four weekly copies. This is a proposed policy, not an enabled schedule. Align retention with deletion/privacy obligations before enabling. Keep credential recovery outside Git.

## Restore rehearsal

Use a fresh disposable PostgreSQL/Supabase target with no traffic, mail, SMS or payment webhooks. Never restore over the application project for testing. Record backup time, checksum, restore start/end, row counts for users/profiles/payments, foreign-key checks, functions, RLS and grants. Set RESTORE_ISOLATED_TARGET=YES, target connection variables, and run `scripts/restore-database.ps1 -Archive <archive> -ExpectedTargetHost <isolated-host>`.

For managed Supabase, review Auth/Storage managed schema compatibility before a full restore; generic pg_restore is not a proven managed-project clone procedure. Restore Storage bodies and verify private-file access, login, profile editing, membership and admin permissions. Disable restored sessions and reset fixture credentials as needed. Compare recovered data with the backup inventory and document omissions, recovery duration and data-loss window. Only mark rehearsal passed after actual application acceptance. Current rehearsal status: NOT RUN.

## Release and rollback

Require successful CI, staged member/admin acceptance, provider tests, policy approval, verified backup and restore rehearsal before launch. Record commit and deployment IDs. Promote only the verified production-configured build; environment values can be baked into the frontend, so staging builds are not automatically safe production builds. Roll back to a previously verified deployment if needed. Application rollback does not undo database migrations; use reviewed compatible migrations and a separate recovery decision.
