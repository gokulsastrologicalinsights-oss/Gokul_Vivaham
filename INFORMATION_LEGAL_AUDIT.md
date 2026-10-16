# Information and legal pages — release audit

Review date: 16 October 2026. Release base: main commit 62b656786748ac18cb85b5e45fec57119ce72ebb.

This release ports the information-page audit onto current production history. The recovered local folder predates membership entitlements v2, trusted profile discovery and private Cloudflare R2 storage. Those newer implementations are preserved. The earlier local audit's fixed 90/180-day durations, activity-log quota race and optional plan-tier migration findings do not describe this release.

## Existing pages and changes

All five required routes already existed and remain public:
- /about: removed unsupported universal verification/market-trust claims; clarified mission, audience, services and matchmaking limitations.
- /contact: retained the real authenticated support queue and existing explicitly public contact configuration; added matching client/server validation, size limits, honeypot, persistent account throttle, saved-reference confirmation and explicit guest alternatives.
- /privacy-policy: expanded data categories, processing purposes, visibility, signed-file URL limitations, Supabase/Vercel/Razorpay/Cloudflare recipients, privacy requests and actual erasure limits.
- /terms: added verified membership prices/validity/quotas, immediate cancellation, online replacement and office-extension behavior, contact accounting and preserved statutory remedies.
- /refund-policy: retained the existing standard no-refund policy and the 24-hour activation-review target / 5–7 working-day verified duplicate-payment refund rule as instructed by the owner, subject to qualified legal review and mandatory remedies.

Related Data Deletion, Cookie and Verification policies were corrected to remove unsupported automatic deletion, backup-purge, encryption and universal SMS-verification promises. Contact no longer loads a map iframe automatically; its external map uses the configured public office address.

## Current verified membership implementation

Read-only production plan queries confirm:
| Plan | INR price | Validity | Distinct membership contacts |
| --- | ---: | --- | ---: |
| Startup | 0 | Lifetime free membership | 0 |
| Silver | 1,499 | 30 days | 15 |
| Gold | 2,999 | 3 calendar months | 30 |
| Diamond | 5,999 | 6 calendar months | 60 |

The shared policy table uses the current pricing constants and duration labels. The server computes calendar-month expiry. Normal Razorpay checkout uses one-time orders, not automatic renewal mandates.

A new online purchase starts immediately and replaces the existing paid membership, without transferring unused time or allowance. Administrator-recorded renewal extends the existing subscription and keeps its recorded usage. The policies direct members to confirm office extensions with support.

Membership contact reveals remain serialized in the database and unique per target/subscription. Trusted request-scoped profile discovery, accepted-interest rules, current membership and target availability gates remain. Separately purchased unlocks still use the current access checks.

This release retrieves usable contact data before calling the quota-consumption RPC; lookup failures cannot consume a new credit. It returns the private contact response only after the transaction authorizes access. Purchase-access lookup errors fail closed. Repeated contacts use the existing unique database record, and a dropped response can be retried for the same contact.

No production database changes, real payments, cancellations, member erasures or real support submissions were performed by this release.

## Integration and accessibility

All five links share a labelled global footer navigation, preserving current authenticated home navigation and branding. Added mobile bottom-navigation clearance and keyboard focus/touch spacing. Policy pages share section anchors, readable cards, related links and an accessible plan table with contained horizontal scrolling. All five pages have descriptive titles/descriptions and index/follow metadata.

The sitemap includes the five required routes, Pricing and Data Deletion. It uses NEXT_PUBLIC_SITE_URL where configured, falling back to the verified production alias gokulvivaham.vercel.app.

Public pages require no sign-in. Support tickets deliberately use the existing signed-in workflow; guests can use the published email, phone or WhatsApp. The form does not send email/SMS/WhatsApp notifications; replies are read under My support requests.

## Verification and release checks

- TypeScript: passed.
- New support/contact regressions: 32 assertions passed.
- Membership regressions: 12 tests passed, including transaction/uniqueness boundaries and calendar-month terms.
- Trusted profile-discovery regressions: 23 tests passed, including database and route-level privacy checks.
- Payment-signature and operations checks passed without creating payments.
- Changed code/test files are linted separately; repository-wide historical lint debt is outside this release.
- The earlier page implementation passed direct-route and 390px/768px/1440px footer tests. The current release must additionally be checked at its deployed URL.
- Local production-build attempts encounter a Windows EPERM error creating generated .next directories. Vercel's Linux build and GitHub checks are the final release-build evidence; record their final status in the deployment handoff.

Tests now include the support/contact regressions in the existing CI workflow. Existing membership tests were updated to assert contact lookup before quota consumption and quota authorization before response. Profile-discovery tests use the real shared origin helper with valid synthetic origins.

## Remaining owner/legal decisions

1. Confirm legal operator/proprietor identity and designate a named grievance officer with public details. Only previously configured public contact information was reused.
2. Obtain qualified Indian legal review of the retained refund restrictions and handling targets, consumer remedies, applicable e-commerce duties and phased DPDP obligations.
3. Define discretionary refund rules/approval targets for single-contact unlocks and featured-profile purchases; no such rules were invented.
4. Set category-specific retention and preservation rules for verification files, messages, support, billing, security evidence, backups and legacy storage copies. Current erasure does not certify removal of every historical or external copy. Review legally required billing preservation.
5. Verify staffing for the existing 48-hour complaint acknowledgment and one-month resolution targets, and actual email/SMS delivery configuration.
6. The persistent support count-then-insert throttle is not a strict distributed concurrency limiter. Add transactional/infrastructure enforcement if stronger abuse controls are required.
7. Current hosted deployment protection is an existing platform setting. This release does not weaken it. Anonymous page access must be distinguished from Vercel's outer access controls.

This review is not legal certification or a guarantee of operational compliance.

Primary references: [MeitY DPDP Rules 2025](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf), [Department of Consumer Affairs Acts/Rules](https://consumeraffairs.gov.in/pages/consumer-protection-acts), [RBI failed-transaction framework](https://www.rbi.org.in/commonman/Upload/English/Notification/PDFs/CIRCULAR677EC931A7A65E4D99AA957D8E85BC0A2A.PDF).
