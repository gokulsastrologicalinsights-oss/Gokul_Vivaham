alter table public.subscription_plans
  add column if not exists plan_key text,
  add column if not exists duration_unit text,
  add column if not exists duration_value integer,
  add column if not exists is_lifetime boolean not null default false,
  add column if not exists contact_viewing_enabled boolean not null default false,
  add column if not exists daily_profile_view_limit integer not null default 5,
  add column if not exists horoscope_percentage_level text not null default 'basic',
  add column if not exists detailed_report_limit integer not null default 0,
  add column if not exists consultation_limit integer not null default 0,
  add column if not exists advanced_filters_enabled boolean not null default false,
  add column if not exists interest_send_enabled boolean not null default false,
  add column if not exists is_most_popular boolean not null default false;
