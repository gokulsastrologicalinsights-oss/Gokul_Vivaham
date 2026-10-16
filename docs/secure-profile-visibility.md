# Secure profile visibility delivery — 16 October 2026

Implemented in an isolated checkout of the existing Gokul Vivaham repository,
based on commit `cf78a0a` from `E:\GAI\gokulvivaham-main`. This is the existing
application, not a new project. Write access to the E: repository was not granted,
so the original checkout was not modified by this task. Apply the supplied patch there after
review. No production schema changes, deployments, account creation, record
deletion or database resets were performed.

## Audit findings

The application uses Next.js 16.2.6 / React 19 and `@supabase/supabase-js`.
`src/lib/supabase/client.ts` creates the browser client with the public key;
`src/lib/supabase/server.ts` separates a request-JWT client from the server-only
privileged client. `resolveAccess` verifies the Auth token and reads trusted
account/admin records. HTTP endpoints use the existing `sb-access-token` cookie.

Read-only catalog inspection of the live `gokul-vivaham` Supabase project
(`rzhkwoeesgyekyutgyqr`, PostgreSQL 17.11) established the actual schema below.

| Resource | Actual columns / relationship |
| --- | --- |
| `auth.users` → `public.users` | `users.auth_user_id` uniquely references `auth.users.id`; member identity is `users.id` |
| `public.profiles` | `user_id` uniquely references `users.id`; `id` is a profile UUID; `profile_id` is the public GV identifier |
| Gender | `profiles.gender`, nullable varchar; registration submits `Male` / `Female`; no database enum/check enforces those values |
| Profile/account visibility | `profiles.visibility`, `is_suspended`, `is_banned`, `deleted_at`; `users.status`, `deleted_at`; mutual blocks |
| Admin authority | `admin_users.auth_user_id`, `role`, `is_super_admin`; existing verified admin helper requires an active session and JWT MFA level `aal2` |
| Interests | `match_requests.sender_user_id`, `receiver_user_id` reference `users.id`; pending/accepted/declined/cancelled lifecycle |
| Shortlist | `favorites.user_id`, `favorite_user_id` reference `users.id` |
| Chat | `chats.user_one`, `user_two` reference `users.id`; `chat_messages.chat_id`, `sender_id`; existing accepted-interest and paid/free-reply rules |
| Contact access | `contact_unlocks`, `membership_contact_reveals`; subscription and accepted-interest checks remain in existing service-only functions |
| Profile photos | `gallery_images.user_id`, moderation/privacy flags, display/thumbnail keys; replacement history in `gallery_photo_versions` |
| Private files | Supabase buckets `photos`, `galleries`, `id-proofs`, `horoscopes`, `chat-images` were all private; current app photos/documents also use private Cloudflare R2 through server endpoints |

At audit time there were four profile rows: one Male, two Female, and one with
missing gender. No values were changed. All inspected public tables had RLS
enabled. No public views/materialized views or deployed Edge Functions were
found. The application primarily reads members through server endpoints,
browser services and hooks, not Supabase Edge Functions.

The existing `private.profile_discoverable(uuid)` checked visibility, account
state and blocks, but did not check gender. The current `/api/matches` and
profile/contact/horoscope endpoints use privileged reads, so table RLS by itself
would not protect those paths. The browse endpoint also filtered blocks after
its limit. The shortlist page displayed hard-coded example candidates. The
legacy Storage chat-image SELECT policy allowed every authenticated member.

Existing profile policies include permissive owner/admin/public-profile access
and restrictive `active_member_session`, `discovery_visibility_gate`, and
`membership_profile_detail_gate`. These were inspected together, not replaced
wholesale. The physical profile row includes DOB and document references, so
foreign full-row access is now restricted to verified admins. Members read
other profiles through explicit, safe card/detail projections; owners retain
their full self-read and profile editing flow.

The database migration history differs from the repository's historical schema
files. Live history includes recovered-schema installation, contact verification
and `20261015113134_atomic_contact_authorization`. Those functions/history are
not overwritten by this change. Do not reset the database or replay the older
June schema as a deployment method.

## Migration and policies

Migration: `supabase/migrations/20261015122404_secure_gender_profile_discovery.sql`,
created with `supabase migration new secure_gender_profile_discovery`.

The migration runs in one transaction and changes no member records.

| Function | Purpose / permissions |
| --- | --- |
| Updated `private.profile_discoverable(uuid)` | Resolves the viewer through `auth.uid()` → `users.auth_user_id`; checks stored genders, active session/account, public visibility, suspension/ban/deletion and both block directions; preserves self and verified-admin exceptions |
| New `public.can_discover_profile(uuid)` | Invoker-only boolean wrapper for request-JWT authorization before privileged endpoint reads; accepts only a target, never a viewer/role/gender |
| New `public.discover_profile_cards(jsonb, integer, integer)` | Limited card projection; mandatory trusted eligibility and membership filter entitlement before count, stable ordering, limit and offset; rejects unsupported filters |
| New `private.guard_discovery_identity()` | Invoker trigger blocks browser changes to profile identity/ownership and an established canonical gender; missing/invalid legacy gender can be corrected once; existing admin APIs retain correction access |
| New `private.chat_image_readable(text)` | Minimal boolean lookup for uploader or authorized conversation participants, plus verified admins; validates that the message sender owns the upload path |

The definer helpers explicitly use `search_path = ''`, fully qualified database
objects and postgres ownership. New/replaced callable helpers revoke PUBLIC/anon
execution and grant only the required authenticated role. The card function
bypasses the full-row membership gate only to produce its fixed allowlist;
it does not return DOB, email, phone, document paths or moderation notes. The
existing session/admin helpers remain unchanged.

New restrictive policies, combined with the existing permissive policies:

- `profiles`: `profile_private_fields_gate`, `opposite_gender_profile_gate`,
  `profile_no_anonymous_read`.
- `featured_profiles`: `featured_discovery_gate`, `featured_no_anonymous_read`.
- `favorites`: `favorite_eligible_insert`.
- `match_requests`: `interest_eligible_insert`.
- `gallery_images`: `gallery_discovery_gate`.
- `storage.objects`: `private_photo_storage_gate`,
  `private_photo_storage_anon_gate`, `chat_image_participant_gate`.

`discovery_visibility_gate` automatically uses the strengthened existing helper.
No existing policy was dropped, no RLS was disabled and no broad table grants
were added by the migration. Interest transitions, chat/message membership
policies, accepted matches, historical records and subscriptions remain intact.

## Application coverage

- `/api/matches`: authenticated database card function for browse/search,
  recommendations, recent/featured members and shortlist; counts and pages use
  the same eligible population. Unsupported viewer/admin query parameters are
  rejected. The browse page now submits its filters before pagination.
- `/api/profiles/[id]`: canonical and alias lookups pass the same trusted check
  before view-credit consumption or response. Ineligible targets return 404.
  DOB is removed; the profile page displays age. Private photos are omitted.
- `/api/profiles/summaries`: retains relationship authorization and obtains
  eligible, limited summaries through the database projection. Existing messages
  and interest records remain accessible according to their participant rules.
- Contact reveal/history, contact-unlock checkout, new interests and both
  horoscope endpoints check eligibility before private information or credits.
- `/api/photos` and `/api/storage/signed-url` inherit the strengthened shared
  photo authorizer. Existing approval, per-photo privacy, relationship and premium
  conditions still apply. Photo cards use protected internal URLs only.
- Raw Supabase profile photos remain owner/admin-only; chat images now require
  upload ownership or authorized conversation participation. Documents remain
  under their existing owner/admin rules. Public sample profiles are AI examples
  and remain separate from real member discovery.
- Existing admin endpoints/permissions, authentication and subscription logic are
  preserved. No frontend service key or new browser-trusted admin flag was added.

## Files changed

Modified:

```text
.github/workflows/ci.yml
package.json
package-lock.json
scripts/membership/membership.test.cjs
src/app/(public)/profile/[id]/page.tsx
src/app/api/horoscope/compatibility/route.ts
src/app/api/horoscope/reports/route.ts
src/app/api/interests/route.ts
src/app/api/matches/route.ts
src/app/api/payments/create-order/route.ts
src/app/api/profile/contact-details/route.ts
src/app/api/profile/contact-unlocks/route.ts
src/app/api/profiles/[id]/route.ts
src/app/api/profiles/summaries/route.ts
src/app/dashboard/matches/page.tsx
src/app/dashboard/shortlist/page.tsx
src/components/home/RecentMembers.tsx
src/components/matchmaking/MatchFilters.tsx
src/hooks/useFeaturedProfiles.ts
src/lib/photo-access.ts
src/services/match.service.ts
```

Added:

```text
docs/secure-profile-visibility.md
scripts/gender/database.test.cjs
scripts/gender/routes.test.cjs
scripts/gender/staging-api.cjs
scripts/gender/fixtures/audited-schema.sql
src/lib/profile-card-photos.ts
src/lib/profile-eligibility.ts
supabase/migrations/20261015122404_secure_gender_profile_discovery.sql
```

The only new dependency is pinned development test dependency
`@electric-sql/pglite@0.3.14`. CI now runs the security and membership suites.

## Verification actually executed

| Check | Actual result |
| --- | --- |
| `npm run test:gender` | **23 passed**, 0 failed: 16 PostgreSQL/RLS tests and 7 route/helper tests |
| `npm run test:membership` | **12 passed**, 0 failed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed on final application source; 108 pages generated, using dummy build-only Supabase/payment configuration |
| Targeted ESLint on new helpers, card route/hook and gender test scripts | Passed |
| `git diff --check` | Passed after whitespace repair |
| Patch compatibility | `git apply --check` passed against a clean archive of audited commit `cf78a0a`; direct verification against the E: checkout was blocked by directory access permissions |
| Client bundle credential scan | No server-key configuration name or build-only secret value found in `.next/static` |
| `npm run test:gender:staging` | **5 skipped**, 0 executed: separate staging connection and authenticated fixtures were not configured |

The database tests execute the migration in a real PostgreSQL 17.5 engine
(PGlite), switching between authenticated/anonymous database roles and distinct
Auth/member identities. They use a versioned, read-only snapshot of the audited
table shapes, policies and relevant functions, plus synthetic users. Unrelated
constraints, defaults and triggers are intentionally omitted from that fixture.
The route tests execute the actual route handlers with isolated dependencies;
they complement the database tests and are not live provider tests.

Tests cover both gender directions; invalid/missing gender; same-gender direct
reads; full-row private fields even after a view credit; filter tampering;
counts/pages; free advanced-filter denial; spoofed metadata; gender/ownership/
Auth-ID/admin escalation; anonymous/revoked sessions; verified MFA admin access;
private photograph access; interest/favorite inserts; existing paid chat/free
replies; chat-image participants; and denial before private endpoint reads/credits.

No complete historical migration replay, live Supabase Auth/API/Storage test,
R2 download, payment-provider transaction, or hosted browser acceptance run was
performed. Local Docker was unavailable. Existing migrations were left intact;
their replay compatibility cannot be claimed from the local security fixture.
The 23 security and 12 membership tests were rerun successfully on 16 October
after resuming the interrupted task. The final application build had already
passed before the interruption; no application source changed during resumption.

## Apply the patch and run local checks

Run these PowerShell commands from the original repository after reviewing the
patch. This document describes deployment; no deployment commands below were
executed against production.

```powershell
Set-Location 'E:\GAI\gokulvivaham-main'
$taskPatch = 'C:\Users\Gokul Murugan\Documents\Codex\2026-10-15\codex-task-implement-secure-gender-based\outputs\secure-gender-visibility.patch'
git apply --check $taskPatch
git apply $taskPatch
npm.cmd ci
npm.cmd run test:gender
npm.cmd run test:membership
npm.cmd run typecheck
npm.cmd run build
```

## Staging migration and actual API checks

Use a separate Supabase environment matching the recovered live schema. Obtain
its PostgreSQL session-pooler URL from Dashboard **Connect**. Set it privately as
`GENDER_STAGING_DATABASE_URL`; PostgreSQL 17 `psql` and Supabase CLI are required
for these commands. Do not reuse the production project as staging.

```powershell
$taskMigration = 'supabase/migrations/20261015122404_secure_gender_profile_discovery.sql'
Get-Content $taskMigration
psql --no-psqlrc --dbname "$env:GENDER_STAGING_DATABASE_URL" --set ON_ERROR_STOP=1 --file $taskMigration
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; do not deploy' }
supabase migration repair 20261015122404 --status applied --db-url "$env:GENDER_STAGING_DATABASE_URL"
if ($LASTEXITCODE -ne 0) { throw 'Migration history repair failed' }
```

Do not run an unreviewed bulk `supabase db push`: repository and live history do
not share a complete matching baseline. The command above applies only this
reviewed transaction, then records its version. The CLI command syntax was
checked using Supabase CLI 2.76.15 help. `psql` was not installed on this host,
so the deployment commands themselves were not executed.

Deploy the updated application to a preview against staging. Prepare six
separate synthetic accounts: male, female, secondMale, missing, invalid and
admin. Give the admin the existing protected role and a real MFA/AAL2 session;
give the others ordinary sessions. Include eligible visible profiles and known
private photo paths. Keep access tokens in a private local fixture file outside
source control, shaped as follows for each of the six named entries:

```json
{
  "male": {"accessToken":"staging JWT", "memberId":"users.id UUID", "profileId":"GV identifier"},
  "female": {"accessToken":"staging JWT", "memberId":"users.id UUID", "profileId":"GV identifier", "privatePhotoPath":"auth UUID/photo UUID/display.webp"},
  "secondMale": {"accessToken":"staging JWT", "memberId":"users.id UUID", "profileId":"GV identifier", "privatePhotoPath":"auth UUID/photo UUID/display.webp"},
  "missing": {"accessToken":"staging JWT", "memberId":"users.id UUID", "profileId":"GV identifier"},
  "invalid": {"accessToken":"staging JWT", "memberId":"users.id UUID", "profileId":"GV identifier"},
  "admin": {"accessToken":"staging AAL2 JWT", "memberId":"users.id UUID", "profileId":"GV identifier"}
}
```

Set `GENDER_TEST_SUPABASE_URL`, `GENDER_TEST_PUBLISHABLE_KEY`,
`GENDER_TEST_APP_URL`, and `GENDER_TEST_FIXTURES` (the private JSON file path).
Then run `npm.cmd run test:gender:staging`. The runner uses the real Supabase
client and app HTTP endpoints, performs read-only requests, rejects the known
production Supabase hostname and verifies separate fixture identities.

Also exercise registration/self-edit, search controls/pages, shortlist removal,
interests, accepted chat/free replies, contact credits and private photos in the
staging browser. This is required before production promotion.

## Production promotion and Dashboard actions still required

After staging passes and the release is approved, use the same reviewed SQL
file and the production connection stored privately in
`GENDER_PRODUCTION_DATABASE_URL`:

```powershell
psql --no-psqlrc --dbname "$env:GENDER_PRODUCTION_DATABASE_URL" --set ON_ERROR_STOP=1 --file $taskMigration
if ($LASTEXITCODE -ne 0) { throw 'Production migration failed; stop release' }
supabase migration repair 20261015122404 --status applied --db-url "$env:GENDER_PRODUCTION_DATABASE_URL"
if ($LASTEXITCODE -ne 0) { throw 'Migration history repair failed; stop release' }
```

Alternatively, run the exact migration transaction in the selected project's
Dashboard SQL Editor and record its version with the CLI afterward. Do not run
the test schema fixture in any hosted environment.

Use the existing application hosting release process with real environment
configuration. The checked-in CI only verifies builds; it does not deploy them.
The dummy build produced during this task must not be deployed. Apply the
database hardening first; while the old application remains active, some direct
discovery widgets may temporarily show no results until the new app is deployed.
Record migration/commit/deployment IDs and run authenticated acceptance checks.

In Dashboard, confirm `private` is not an exposed Data API schema and inspect
the new helper grants/policies and Security Advisor. Keep all private Storage
buckets private. Confirm that R2 public bucket access/custom public URLs are
disabled; this task did not inspect Cloudflare account settings. Correct the
missing-gender profile through the existing admin workflow only after verifying
the member's information. No new admin accounts, new bucket, service key or
gender backfill is required.

Existing R2 signed URLs can remain usable until their configured expiry
(30–300 seconds; default 180). This task preserves that existing storage behavior.
Rolling back application code does not roll back these policies; retain the
database protections while investigating a release issue. Do not reset or
restore production as a routine rollback.

Reference used for the policy/grant and security-definer review:
[Supabase Row Level Security documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).
