update public.subscription_plans
set
  name = 'Startup Plan', price = 0, duration_days = 0,
  plan_key = 'startup', duration_unit = 'lifetime', duration_value = null,
  is_lifetime = true, contact_view_limit = 0,
  contact_viewing_enabled = false, daily_profile_view_limit = 5,
  horoscope_percentage_level = 'basic', detailed_report_limit = 0,
  consultation_limit = 0, advanced_filters_enabled = false,
  interest_send_enabled = false, messaging_enabled = false,
  search_enabled = false, photo_viewing_enabled = false,
  premium_badge_eligible = false, is_most_popular = false,
  description = 'Free lifetime membership',
  features = jsonb_build_object(
    'create_profile', true,
    'browse_profiles', true,
    'receive_interests', true,
    'receive_messages', true,
    'send_interests', false,
    'send_messages', false,
    'advanced_filters', false,
    'contact_viewing', false,
    'contacts_limit', 0,
    'profile_views_daily', 5,
    'horoscope_percentage', 'basic',
    'horoscope_reports_limit', 0,
    'consultations_limit', 0
  )
where id = '0ffd3070-7aba-4554-8790-93c76b318df6'::uuid
   or lower(name) in ('startup plan', 'free plan', 'free basic plan');

update public.subscription_plans
set
  name = 'Silver Plan', price = 1499, duration_days = 30,
  plan_key = 'silver', duration_unit = 'day', duration_value = 30,
  is_lifetime = false, contact_view_limit = 15,
  contact_viewing_enabled = true, daily_profile_view_limit = 50,
  horoscope_percentage_level = 'unlimited', detailed_report_limit = 1,
  consultation_limit = 0, advanced_filters_enabled = true,
  interest_send_enabled = true, messaging_enabled = true,
  search_enabled = true, photo_viewing_enabled = true,
  premium_badge_eligible = true, is_most_popular = false,
  description = '30-day membership',
  features = jsonb_build_object(
    'browse_profiles', true,
    'receive_interests', true,
    'receive_messages', true,
    'send_interests', true,
    'send_messages', true,
    'advanced_filters', true,
    'contact_viewing', true,
    'contacts_limit', 15,
    'profile_views_daily', 50,
    'horoscope_percentage', 'unlimited',
    'horoscope_reports_limit', 1,
    'consultations_limit', 0,
    'verified_badge_requires_verification', true
  )
where id = '5d75dd4e-9e27-45aa-b9f5-0a71ff6327cf'::uuid
   or lower(name) = 'silver plan';

update public.subscription_plans
set
  name = 'Gold Plan', price = 2999, duration_days = 90,
  plan_key = 'gold', duration_unit = 'month', duration_value = 3,
  is_lifetime = false, contact_view_limit = 30,
  contact_viewing_enabled = true, daily_profile_view_limit = 150,
  horoscope_percentage_level = 'unlimited', detailed_report_limit = 5,
  consultation_limit = 1, advanced_filters_enabled = true,
  interest_send_enabled = true, messaging_enabled = true,
  search_enabled = true, photo_viewing_enabled = true,
  premium_badge_eligible = true, is_most_popular = true,
  description = 'Three-calendar-month membership and best value',
  features = jsonb_build_object(
    'browse_profiles', true,
    'receive_interests', true,
    'receive_messages', true,
    'send_interests', true,
    'send_messages', true,
    'advanced_filters', true,
    'contact_viewing', true,
    'contacts_limit', 30,
    'profile_views_daily', 150,
    'horoscope_percentage', 'unlimited',
    'horoscope_reports_limit', 5,
    'consultations_limit', 1,
    'verified_badge_requires_verification', true
  )
where id = 'd50e37d5-21df-454b-8ed8-0e7ddb33827c'::uuid
   or lower(name) = 'gold plan';

update public.subscription_plans
set
  name = 'Diamond Plan', price = 5999, duration_days = 180,
  plan_key = 'diamond', duration_unit = 'month', duration_value = 6,
  is_lifetime = false, contact_view_limit = 60,
  contact_viewing_enabled = true, daily_profile_view_limit = 1000,
  horoscope_percentage_level = 'unlimited', detailed_report_limit = 10,
  consultation_limit = 5, advanced_filters_enabled = true,
  interest_send_enabled = true, messaging_enabled = true,
  search_enabled = true, photo_viewing_enabled = true,
  premium_badge_eligible = true, is_most_popular = false,
  description = 'Six-calendar-month membership',
  features = jsonb_build_object(
    'browse_profiles', true,
    'receive_interests', true,
    'receive_messages', true,
    'send_interests', true,
    'send_messages', true,
    'advanced_filters', true,
    'contact_viewing', true,
    'contacts_limit', 60,
    'profile_views_daily', 1000,
    'horoscope_percentage', 'unlimited',
    'horoscope_reports_limit', 10,
    'consultations_limit', 5,
    'verified_badge_requires_verification', true
  )
where id = 'b987dc02-0102-4279-b787-50987762532b'::uuid
   or lower(name) = 'diamond plan';

alter table public.subscription_plans
  alter column plan_key set not null,
  alter column duration_unit set not null;

alter table public.subscription_plans drop constraint if exists subscription_plans_plan_key_check;
alter table public.subscription_plans add constraint subscription_plans_plan_key_check
  check (plan_key in ('startup', 'silver', 'gold', 'diamond'));
alter table public.subscription_plans drop constraint if exists subscription_plans_duration_check;
alter table public.subscription_plans add constraint subscription_plans_duration_check
  check (
    (is_lifetime and duration_unit = 'lifetime' and duration_value is null)
    or
    (not is_lifetime and duration_unit in ('day', 'month') and duration_value > 0)
  );
alter table public.subscription_plans drop constraint if exists subscription_plans_entitlement_limits_check;
alter table public.subscription_plans add constraint subscription_plans_entitlement_limits_check
  check (contact_view_limit >= 0 and daily_profile_view_limit >= 0 and detailed_report_limit >= 0 and consultation_limit >= 0);
alter table public.subscription_plans drop constraint if exists subscription_plans_horoscope_level_check;
alter table public.subscription_plans add constraint subscription_plans_horoscope_level_check
  check (horoscope_percentage_level in ('basic', 'unlimited'));
alter table public.subscription_plans drop constraint if exists subscription_plans_canonical_entitlements_check;
alter table public.subscription_plans add constraint subscription_plans_canonical_entitlements_check check (
  (plan_key = 'startup' and price = 0 and duration_days = 0 and is_lifetime and duration_unit = 'lifetime' and duration_value is null
    and contact_view_limit = 0 and daily_profile_view_limit = 5 and horoscope_percentage_level = 'basic'
    and detailed_report_limit = 0 and consultation_limit = 0 and not advanced_filters_enabled and not interest_send_enabled and not is_most_popular)
  or
  (plan_key = 'silver' and price = 1499 and duration_days = 30 and not is_lifetime and duration_unit = 'day' and duration_value = 30
    and contact_view_limit = 15 and daily_profile_view_limit = 50 and horoscope_percentage_level = 'unlimited'
    and detailed_report_limit = 1 and consultation_limit = 0 and advanced_filters_enabled and interest_send_enabled and not is_most_popular)
  or
  (plan_key = 'gold' and price = 2999 and duration_days = 90 and not is_lifetime and duration_unit = 'month' and duration_value = 3
    and contact_view_limit = 30 and daily_profile_view_limit = 150 and horoscope_percentage_level = 'unlimited'
    and detailed_report_limit = 5 and consultation_limit = 1 and advanced_filters_enabled and interest_send_enabled and is_most_popular)
  or
  (plan_key = 'diamond' and price = 5999 and duration_days = 180 and not is_lifetime and duration_unit = 'month' and duration_value = 6
    and contact_view_limit = 60 and daily_profile_view_limit = 1000 and horoscope_percentage_level = 'unlimited'
    and detailed_report_limit = 10 and consultation_limit = 5 and advanced_filters_enabled and interest_send_enabled and not is_most_popular)
);
create unique index if not exists subscription_plans_plan_key_unique on public.subscription_plans(plan_key);
drop policy if exists "Admins can manage subscription plans" on public.subscription_plans;
revoke insert, update, delete on public.subscription_plans from anon, authenticated;
