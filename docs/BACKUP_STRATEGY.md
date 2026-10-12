# Backup & Disaster Recovery Strategy

To ensure data integrity and high availability, follow this backup strategy for the Gokul Vivaham platform.

## 1. Automated Backups (Supabase PITR)
For production projects, upgrade your Supabase plan to enable **Point-in-Time Recovery (PITR)**.
- PITR allows restoring the database to any specific minute within the retention period (usually 7-30 days).
- It runs automatically in the background without performance impact.

## 2. Manual Daily Dumps (Recommended)
As a secondary safeguard, schedule daily complete database dumps:
```bash
pg_dump --clean --if-exists --quote-all-identifiers \
 -h aws-0-[REGION].pooler.supabase.com -U postgres.[PROJECT-REF] \
 > daily_backup_$(date +%Y%m%d).sql
```
Store these dumps securely in AWS S3 or Google Cloud Storage.

## 3. Storage Backups (User Photos & Docs)
Profile/gallery photos and verification documents are stored in private Cloudflare R2 buckets; Supabase stores their metadata and remains the source for Auth, RLS, Realtime, and business data.
- Back up the private R2 photo, horoscope, and ID-proof buckets to separate private storage with retention matching the deletion/privacy policy. Keep the pre-cutover Supabase Storage copy until the restore rehearsal passes.
- The scheduled encrypted exporter in `scripts/operations/backup.cjs` reads the three R2 buckets directly through bucket-scoped S3 credentials; it no longer treats Supabase Storage as the active file source.

## 4. Disaster Recovery Procedure
If complete data loss occurs:
1. Spin up a new Supabase project.
2. Run the latest `.sql` database dump.
3. Restore R2 objects from the secondary copy, verify byte sizes and SHA-256 hashes, and confirm the Supabase object-key mappings before enabling application traffic.
4. Update Vercel environment variables with the new Supabase credentials.
