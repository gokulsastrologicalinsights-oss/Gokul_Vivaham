# Cloudflare R2 storage migration status

## Completed on 10 October 2026

- Supabase remains active for Database, Auth, RLS, Realtime, functions, triggers, subscriptions, payments, moderation, and file metadata.
- Production Supabase storage inventory: 5 `photos` objects, 0 legacy `galleries` objects, 1 `horoscopes` object, and 1 `id-proofs` object. All source buckets are private.
- Production metadata inventory: 3 `gallery_images` rows; every row has `display_key`, `thumbnail_key`, and a protected `/api/photos?path=...` application URL. There are no permanent public photo URLs in those rows.
- The controlled migration copied 2 missing photo objects. Five objects were already present and byte-identical in R2.
- The final read-only verification found all 7 Supabase source objects byte-identical in R2 by byte length and SHA-256, with zero failures. Supabase source objects were retained.
- The ignored local evidence report is `scratch/r2-storage-migration-report.json`.
- The migration command now inventories the legacy `galleries` bucket, verifies existing/copy results by SHA-256, continues after individual failures, saves a retry report, and is safe to rerun.
- Generic R2 deletion now rejects cross-origin requests and refuses to remove documents still referenced by verification/profile metadata.
- Targeted lint, TypeScript, and the production Next.js build pass for this change.
- All nine R2 settings are configured as hidden, Production-only secrets in the linked Vercel project `gokul-astro-s-projects/gokulvivaham`. The signed-photo URL TTL uses the documented 180-second default because that optional key was absent from `.env.local`.
- Vercel deployment `dpl_BomzoBD8qNAbGnWY6UgZf85VkbMA` completed with `READY` status and is aliased to `https://gokulvivaham.vercel.app`. The protected production health endpoint reports both application and database status as `ok`.
- A synthetic-member acceptance run passed against the protected production deployment: image/PDF upload, magic-byte validation, owner access, anonymous and cross-user denial, approved-member photo access, pending-replacement denial, deletion, and R2 object cleanup. The run discovered and fixed an ID-proof PDF validation contradiction before the final deployment.
- An encrypted R2 recovery rehearsal exported 12 objects (12,005,627 bytes), decrypted them into an isolated temporary directory, verified every SHA-256 checksum, and removed the temporary plaintext and ciphertext afterward.
- Anonymous range probes confirmed that all 12 current R2 objects deny public reads through the S3 endpoint.

## Not yet complete

- Cloudflare dashboard confirmation that every R2 bucket has public development URLs/custom domains disabled remains manual.
- A complete database-plus-R2 backup and isolated database restore rehearsal still require `SUPABASE_DB_URL`, an owner-retained `BACKUP_ENCRYPTION_KEY`, and a separate restore target. The R2 half has passed, but this does not substitute for a PostgreSQL restore. Do not delete Supabase Storage source objects.
- The scheduled GitHub backup workflow and exporter now target R2, but the workflow change is not active until these workspace changes are committed/pushed. The GitHub `operations` environment currently has no secrets; it needs `SUPABASE_DB_URL`, an owner-retained `BACKUP_ENCRYPTION_KEY`, and the six R2 connection/bucket secrets before the first full backup can run.
- Repository-wide lint still has substantial pre-existing failures outside this migration; targeted lint for the changed runtime/script files passes.

See `docs/R2_STORAGE_MIGRATION.md` for setup, migration, verification, backup/restore, and rollback instructions.
