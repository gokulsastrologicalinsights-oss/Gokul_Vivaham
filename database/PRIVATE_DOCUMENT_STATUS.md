# Private member documents

Implemented and tested locally on 2026-10-02.

- Created private `id-proofs` and `horoscopes` buckets in the connected free Supabase project. Maximum file size is 5MB. ID proofs accept JPEG, PNG, WebP and PDF; horoscopes accept PDF. Storage enforces these restrictions in addition to browser checks.
- Uploads require an active authenticated member and use an Auth-user-ID folder with a random filename. Owners and authenticated administrators can read their permitted documents; other members and public URLs are denied. Documents use signed URLs valid for at most five minutes in the application.
- Added server-protected submission and review APIs. Atomic service-only RPCs validate ownership and file existence, maintain request/profile status, and record review notifications and audit logs. Members cannot directly insert or approve verification requests.
- Pending submission can be replaced. Rejected documents can be resubmitted. Approved documents cannot be silently replaced through this workflow. Submitted files remain available for review; document retention/erasure remains a separate privacy workflow.
- Added Document Verification to the admin navigation at `/admin/approvals`, with approval, rejection/reupload instructions, and private document viewing. Fixed the member page's `unverified` status so initial upload controls appear.
- `scripts/check-private-documents.cjs` passed using real storage and two temporary members: upload, size/type limits, foreign/public access denial, owner/admin signed access, submission, resubmission, approval, badge updates, repeated-review denial, and logged-out signing denial. Test files, requests, audit rows, and accounts were removed. TypeScript checks passed.
- Existing signed links remain usable until their short expiry. The tests confirm that logged-out sessions cannot issue new links.
- Development now uses Webpack after Turbopack returned incorrect 404s for existing routes. Its old generated cache was preserved at `.next/dev-before-documents-20261002`. Local server is on port 3001. Production was not deployed.

Next: registration/profile-photo persistence and upload ordering. Registration previously uploads before authentication; no anonymous document-upload policy was added. Email/SMS delivery setup remains pending as documented in CONTACT_VERIFICATION_STATUS.md.

Supabase security advisors found no new document-storage/schema warnings. The existing warning about leaked-password protection remains: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. The inaccessible archived rate-limit table has an informational no-policy notice.
