alter table public.subscriptions drop constraint if exists subscriptions_grant_type_check;
alter table public.subscriptions add constraint subscriptions_grant_type_check
  check (grant_type in ('system_free', 'online_payment', 'cash_payment', 'bank_transfer', 'upi_direct_payment', 'complimentary_access', 'administrative_correction', 'other'));
-- The legacy index treated the lifetime Startup fallback as a conflicting active
-- subscription. Keep one active paid/granted term while allowing the immutable
-- system_free fallback to coexist for expiry handling.
drop index if exists public.unique_active_subscription_per_user;
create unique index if not exists subscriptions_one_active_paid_per_member
  on public.subscriptions(user_id)
  where payment_status = 'Completed' and grant_type <> 'system_free';
create unique index if not exists subscriptions_one_startup_per_member
  on public.subscriptions(user_id) where grant_type = 'system_free';
create unique index if not exists subscriptions_gateway_payment_unique
  on public.subscriptions(razorpay_payment_id) where razorpay_payment_id is not null;

insert into public.subscriptions(user_id, plan_id, payment_status, start_date, end_date, grant_type, created_at, updated_at)
select u.id, p.id, 'Completed', u.created_at, null, 'system_free', u.created_at, now()
from public.users u
join public.subscription_plans p on p.plan_key = 'startup'
where not exists (
  select 1 from public.subscriptions s
  where s.user_id = u.id and s.grant_type = 'system_free'
);
