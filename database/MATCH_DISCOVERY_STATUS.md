# Match discovery

Applied match-discovery.sql: restrictive profile SELECT policy checks active public accounts and profiles and excludes blocks in either direction. Owners retain their own profile access; verified administrators retain moderation access.

The match service now supplies the star and location aliases the filters and cards expect, plus the stored photo reference. Missing filter values no longer crash rendering; unknown ages and missing selected padam no longer pass the selected criteria. Load failures are shown separately from empty results.

Rollback-only database fixtures verified public access and denial for incoming blocks, private visibility, suspended profiles, and inactive accounts. Authenticated-role queries verified public/private RLS behavior. No test records remain. Browser filter interactions were not verified in this stage. Production deployment unchanged.
