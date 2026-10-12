# Private Cloudflare R2 storage

## Architecture

Supabase remains the system of record for authentication, member/profile data, RLS, Realtime, functions, triggers, moderation, subscriptions, payments, and file metadata. Cloudflare R2 stores file bytes only.

The application uses three private R2 buckets:

- Profile/gallery images (`R2_PROFILE_PHOTOS_BUCKET`)
- Horoscope PDFs (`R2_HOROSCOPES_BUCKET`)
- ID-proof images and PDFs (`R2_ID_PROOFS_BUCKET`)

Browser uploads go to authenticated Next.js route handlers. R2 credentials are server-only. Images are decoded with Sharp and written as a thumbnail WebP plus a display WebP. Supabase stores the R2 object keys and stable protected application routes. Downloads are authorized against the current Supabase session before the server issues a short-lived R2 URL.

## Cloudflare setup

1. Create three R2 buckets and leave public access disabled. Do not attach an `r2.dev` public URL or public custom domain.
2. Create an R2 Object Read & Write API token scoped only to these buckets.
3. Configure the server/deployment secrets documented in `docs/ENVIRONMENT_VARIABLES.md`. The endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` unless the buckets use a jurisdiction-specific endpoint.
4. Keep the credentials out of every `NEXT_PUBLIC_` variable and browser configuration.

## Controlled copy

The migration command never deletes Supabase objects. It inventories `photos`, the legacy `galleries` bucket, `horoscopes`, and `id-proofs`; preserves each object key; compares SHA-256 hashes for objects already in R2; verifies every upload by reading it back; continues past individual failures; and writes an ignored local report with retry details.

```powershell
# Read-only inventory and verification
npm.cmd run storage:migrate

# Copy missing objects, verify each copy, and retain the Supabase source
npm.cmd run storage:migrate -- --execute

# Only after reviewing a reported hash mismatch
npm.cmd run storage:migrate -- --execute --overwrite
```

The report is written to `scratch/r2-storage-migration-report.json` by default. Rerunning the command is the retry mechanism: byte-identical objects are verified and skipped. Use `--report=<private-path>` to choose a different report location. The report includes private object keys and must not be published.

No metadata rewrite is needed when the database already stores the same object keys. Legacy permanent/public URLs require a separately reviewed database reconciliation; do not bulk-rewrite them until their R2 object and owning profile have been verified.

## Cutover verification

- Confirm production contains all required R2 secrets and no R2 secret uses a `NEXT_PUBLIC_` prefix.
- Confirm all R2 buckets remain private.
- Run the migration in dry-run mode after the execute pass; every source object should be `verified-existing` with zero failures.
- Test member photo upload, moderation, replacement, deletion, privacy levels, and signed URL expiry.
- Test member ID-proof and horoscope upload, owner/admin access, replacement, and deletion rules.
- Re-run authentication, RLS, Realtime, registration, search/profile-card, subscription, and payment checks because those remain Supabase-backed.

## Backup and restore

Before cutover, run the encrypted Supabase backup workflow described in `DEPLOYMENT_RUNBOOK.md` and retain the migration report. Add an R2 backup/export (or object-lock/replication policy appropriate to the retention policy) and verify it by restoring into separate private staging buckets. A successful export is not a restore test.

For a non-destructive file-only rehearsal, set `R2_ONLY=YES`, a temporary `BACKUP_ENCRYPTION_KEY`, `BACKUP_OUTPUT`, and the six R2 connection/bucket variables before running `node scripts/operations/backup.cjs`. Then run `scripts/operations/unpack-backup.cjs` into a new private directory and compare the manifest counts, sizes, and hashes. The manifest explicitly records `databaseSnapshot: null`; never describe this mode as a complete application backup.

A restore rehearsal must compare database record counts, object counts, byte sizes, and SHA-256 hashes; then test login, RLS, profile access, image privacy, and document access against an isolated Supabase project and isolated R2 buckets. Production backup and restore remain unverified until that rehearsal is recorded.

## Rollback

1. Do not delete the original Supabase Storage objects during migration or initial cutover.
2. Roll the application back to the last verified deployment that used Supabase Storage.
3. Restore the matching database backup only if the database schema/data also changed and only through the documented recovery process; an application rollback does not require a database restore by itself.
4. Reconcile uploads created after cutover from the R2 migration report before switching traffic. Never overwrite production metadata or delete R2 objects until reconciliation is complete.
