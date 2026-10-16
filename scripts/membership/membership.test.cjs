const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const migrationDirectory = path.join(root, 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationDirectory)
  .filter((name) => /^20261012\d+_membership_entitlements_v2_[a-z_]+\.sql$/.test(name))
  .sort();
const migration = migrationFiles
  .map((name) => fs.readFileSync(path.join(migrationDirectory, name), 'utf8'))
  .join('\n');

test('the repository mirrors the production membership migration history', () => {
  assert.equal(migrationFiles.length, 15);
  assert.equal(migrationFiles[0], '20261012115052_membership_entitlements_v2_audit_prerequisite.sql');
  assert.equal(migrationFiles.at(-1), '20261012120024_membership_entitlements_v2_payment_constraints.sql');
});

function loadPaymentsConstants() {
  const exportsObject = {};
  const source = ts.transpileModule(read('src/constants/payments.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(source, { exports: exportsObject, require }, { filename: 'payments.ts' });
  return exportsObject;
}

test('the four canonical plans have exact IDs, prices, labels, and benefit limits', () => {
  const { SUBSCRIPTION_PLANS } = loadPaymentsConstants();
  assert.deepEqual(Object.keys(SUBSCRIPTION_PLANS), ['FREE', 'SILVER', 'GOLD', 'DIAMOND']);
  assert.deepEqual(
    JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => [key, {
      id: plan.id, price: plan.price, duration: plan.durationLabel,
      contacts: plan.entitlements.contacts_limit,
      reports: plan.entitlements.horoscope_reports_limit,
      consultations: plan.entitlements.consultations_limit,
    }])))),
    {
      FREE: { id: '0ffd3070-7aba-4554-8790-93c76b318df6', price: 0, duration: 'Lifetime', contacts: 0, reports: 0, consultations: 0 },
      SILVER: { id: '5d75dd4e-9e27-45aa-b9f5-0a71ff6327cf', price: 1499, duration: '30 days', contacts: 15, reports: 1, consultations: 0 },
      GOLD: { id: 'd50e37d5-21df-454b-8ed8-0e7ddb33827c', price: 2999, duration: '3 calendar months', contacts: 30, reports: 5, consultations: 1 },
      DIAMOND: { id: 'b987dc02-0102-4279-b787-50987762532b', price: 5999, duration: '6 calendar months', contacts: 60, reports: 10, consultations: 5 },
    },
  );
});

test('signup backfill and trigger grant one non-expiring Startup subscription', () => {
  assert.match(migration, /drop index if exists public\.unique_active_subscription_per_user/);
  assert.match(migration, /subscriptions_one_active_paid_per_member[\s\S]*grant_type <> 'system_free'/);
  assert.match(migration, /subscriptions_one_startup_per_member[\s\S]*grant_type = 'system_free'/);
  assert.match(migration, /insert into public\.subscriptions[\s\S]*'Completed'[\s\S]*null[\s\S]*'system_free'/);
  assert.match(migration, /ensure_startup_subscription_after_user_insert/);
  assert.match(migration, /on conflict \(user_id\) where grant_type = 'system_free' do nothing/);
});

test('Silver uses days while Gold and Diamond use calendar-month expiry', () => {
  assert.match(migration, /when plan_row\.duration_unit = 'day' then starts_at \+ make_interval\(days => plan_row\.duration_value\)/);
  assert.match(migration, /when plan_row\.duration_unit = 'month' then starts_at \+ make_interval\(months => plan_row\.duration_value\)/);
  assert.match(migration, /plan_key = 'gold'[\s\S]*duration_unit = 'month'[\s\S]*duration_value = 3/);
  assert.match(migration, /plan_key = 'diamond'[\s\S]*duration_unit = 'month'[\s\S]*duration_value = 6/);
  assert.match(migration, /renewal_base := greatest\(now\(\), coalesce\(old_sub\.end_date, now\(\)\)\)/);
});

test('contact reveal boundaries are serialized and unique per profile and subscription', () => {
  assert.match(migration, /unique\(subscription_id, target_profile_id\)/);
  assert.match(migration, /where id = actor and status = 'active' and deleted_at is null for update/);
  assert.doesNotMatch(migration, /\bp\.status\b/);
  assert.match(migration, /join public\.users u on u\.id = p\.user_id[\s\S]*u\.status = 'active'/);
  assert.match(migration, /if used_count >= plan\.contact_view_limit then raise exception 'Contact reveal limit reached'/);
  assert.match(migration, /if created_id is not null then[\s\S]*already_revealed := true/);
  const route = read('src/app/api/profile/contact-details/route.ts');
  assert.match(route, /profileUuid: z\.uuid\(\)\.optional\(\)/);
  assert.doesNotMatch(route, /\.from\('profiles'\)[\s\S]{0,300}\.eq\('status'/);
  assert.match(route, /rpc\('consume_contact_reveal'/);
  assert.ok(route.indexOf("rpc('consume_contact_reveal'") < route.indexOf("select('email,mobile_number')"));
});

test('daily profile views use an India reset date, a uniqueness boundary, and server-only detail route', () => {
  assert.match(migration, /unique\(viewer_user_id, viewed_profile_id, view_date_ist\)/);
  assert.match(migration, /now\(\) at time zone 'Asia\/Kolkata'/);
  assert.match(migration, /if used_count >= plan\.daily_profile_view_limit then raise exception 'Daily profile view limit reached'/);
  assert.match(migration, /membership_profile_detail_gate[\s\S]*as restrictive/);
  assert.match(read('src/app/api/profiles/[id]/route.ts'), /rpc\('consume_profile_view'/);
});

test('detailed reports reserve atomically, charge only generated results, and release failures', () => {
  assert.match(migration, /unique\(requester_user_id, idempotency_key\)/);
  assert.match(migration, /status in \('pending','generated'\)/);
  assert.match(migration, /if reserved_count >= plan\.detailed_report_limit then raise exception 'Detailed report limit reached'/);
  assert.match(migration, /update public\.horoscope_reports set status='failed'/);
  assert.match(migration, /reports_used[\s\S]*status = 'generated'/);
  const route = read('src/app/api/horoscope/reports/route.ts');
  assert.match(route, /Report generation is already in progress/);
  assert.match(route, /finish_horoscope_report/);
});

test('included consultations reserve persistently and cancellation restores the credit', () => {
  assert.match(migration, /unique\(user_id, idempotency_key\)/);
  assert.match(migration, /status in \('reserved','consumed'\)/);
  assert.match(migration, /plan\.consultation_limit/);
  assert.match(migration, /new\.payment_status = 'approved'[\s\S]*status='consumed'/);
  assert.match(migration, /new\.payment_status = 'cancelled'[\s\S]*status='restored'/);
  assert.match(migration, /consultation_server_insert_only[\s\S]*with check \(false\)/);
  assert.match(migration, /Members may only cancel a pending consultation request/);
  assert.match(read('src/app/api/consultations/included/route.ts'), /book_included_consultation/);
  assert.match(migration, /Consultation Request Received/);
  assert.match(migration, /set payment_status = 'pending', benefit_source = 'paid_checkout'/);
});

test('payment success requires signature plus provider-side capture verification', () => {
  const verify = read('src/app/api/payments/verify/route.ts');
  const webhook = read('src/app/api/payments/webhook/route.ts');
  assert.match(verify, /verifySignature/);
  assert.match(verify, /payments\.fetch/);
  assert.match(verify, /status !== 'captured'/);
  assert.match(webhook, /verifyWebhookSignature/);
  assert.match(webhook, /razorpayClient\.payments\.fetch/);
  assert.match(webhook, /status: 'failed'/);
  assert.match(webhook, /processed_webhook_events/);
  assert.match(webhook, /x-razorpay-event-id/);
  assert.match(webhook, /createHash\('sha256'\)\.update\(rawBody\)/);
  assert.match(migration, /payments_gateway_payment_unique/);
  assert.match(migration, /if pay\.fulfilled_at is not null/);
});

test('pending, cancelled, failed, active, and expired lifecycle states cannot grant duplicate paid access', () => {
  assert.match(migration, /check\(status in \('pending','completed','failed','cancelled'\)\)/);
  assert.match(migration, /update public\.subscriptions[\s\S]*set payment_status = 'Expired'/);
  assert.match(migration, /'membership_expired'/);
  assert.match(migration, /actor_auth_user_id drop not null/);
  assert.match(migration, /grant_type<>'system_free'/);
  assert.match(read('src/app/api/payments/mark-cancelled/route.ts'), /status: 'cancelled'/);
  assert.match(read('src/app/api/payments/cancel-subscription/route.ts'), /neq\('grant_type', 'system_free'\)/);
});

test('server authorization and RLS protect usage, phone data, and plan mutation', () => {
  assert.match(migration, /revoke all on public\.membership_contact_reveals[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.consume_contact_reveal[\s\S]*to service_role/);
  assert.match(migration, /revoke insert, update, delete on public\.subscription_plans from anon, authenticated/);
  assert.match(migration, /Canonical membership plans are migration-managed/);
  const contactRoute = read('src/app/api/profile/contact-details/route.ts');
  const profileRoute = read('src/app/api/profiles/[id]/route.ts');
  assert.doesNotMatch(profileRoute, /mobile_number|id_verification_document_url/);
  assert.doesNotMatch(profileRoute, /select\('\*[,)]/);
  assert.match(contactRoute, /requireMember/);
  assert.match(read('src/lib/membership/server.ts'), /PGRST202[\s\S]*status: 503/);
  assert.match(read('src/providers/AuthProvider.tsx'), /getSession\(\)[\s\S]*catch[\s\S]*signOut\(\{ scope: 'local' \}\)[\s\S]*synchronize\(null\)/);
});

test('plan-specific interests, filters, horoscope access, and responsive plan actions are wired', () => {
  assert.match(read('src/app/api/interests/route.ts'), /interest_send_enabled/);
  assert.match(read('src/app/api/matches/route.ts'), /rpc\('discover_profile_cards'/);
  assert.match(read('supabase/migrations/20261015122404_secure_gender_profile_discovery.sql'), /plan\.advanced_filters_enabled/);
  assert.match(read('src/app/api/horoscope/compatibility/route.ts'), /horoscope_percentage_level/);
  const pricing = read('src/app/(public)/pricing/page.tsx');
  for (const label of ['Sign Up Free', 'Get Silver', 'Go Gold Plan', 'Go Diamond Plan', 'Most Popular']) {
    assert.match(pricing, new RegExp(label));
  }
  assert.match(pricing, /grid-cols-1 md:grid-cols-2 lg:grid-cols-4/);
  assert.match(pricing, /subject to profile verification/);
  assert.match(migration, /Preserve the documented free-member reply policy/);
  assert.match(migration, /m\.sender_id = s\.user_id/);
});
