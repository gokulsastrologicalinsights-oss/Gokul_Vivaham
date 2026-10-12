create table if not exists public.membership_contact_reveals (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  viewer_user_id uuid not null references public.users(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete restrict,
  revealed_at timestamptz not null default now(),
  unique(subscription_id, target_profile_id)
);

create table if not exists public.membership_profile_views (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  viewer_user_id uuid not null references public.users(id) on delete cascade,
  viewed_profile_id uuid not null references public.profiles(id) on delete restrict,
  view_date_ist date not null default ((now() at time zone 'Asia/Kolkata')::date),
  viewed_at timestamptz not null default now(),
  unique(viewer_user_id, viewed_profile_id, view_date_ist)
);

create table if not exists public.horoscope_reports (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  requester_user_id uuid not null references public.users(id) on delete cascade,
  target_user_id uuid not null references public.users(id) on delete restrict,
  idempotency_key text not null,
  status text not null default 'pending' check (status in ('pending', 'generated', 'failed', 'cancelled')),
  report_data jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(requester_user_id, idempotency_key)
);

alter table public.consultation_bookings
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete restrict,
  add column if not exists benefit_source text not null default 'paid_checkout';
alter table public.consultation_bookings drop constraint if exists consultation_bookings_benefit_source_check;
alter table public.consultation_bookings add constraint consultation_bookings_benefit_source_check
  check (benefit_source in ('paid_checkout', 'membership_included'));

drop policy if exists consultation_server_insert_only on public.consultation_bookings;
create policy consultation_server_insert_only on public.consultation_bookings as restrictive
  for insert to authenticated with check (false);

create or replace function private.guard_member_consultation_update()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_user = 'authenticated'
    and not exists (
      select 1 from public.admin_users a
      where a.auth_user_id = auth.uid() and a.role in ('admin','super_admin','moderator')
    ) then
    if not exists (
      select 1 from public.users u where u.id = old.user_id and u.auth_user_id = auth.uid()
    ) then raise exception 'Booking owner required'; end if;
    if old.payment_status <> 'pending' or new.payment_status <> 'cancelled' then
      raise exception 'Members may only cancel a pending consultation request';
    end if;
    if (to_jsonb(new) - array['payment_status','updated_at']) is distinct from (to_jsonb(old) - array['payment_status','updated_at']) then
      raise exception 'Members cannot modify protected booking fields';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_member_consultation_update() from public, anon, authenticated;
drop trigger if exists guard_member_consultation_update on public.consultation_bookings;
create trigger guard_member_consultation_update
before update on public.consultation_bookings for each row execute function private.guard_member_consultation_update();

create table if not exists public.membership_consultation_redemptions (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete cascade,
  booking_id uuid not null unique references public.consultation_bookings(id) on delete restrict,
  idempotency_key text not null,
  status text not null default 'reserved' check (status in ('reserved', 'consumed', 'restored')),
  reserved_at timestamptz not null default now(),
  consumed_at timestamptz,
  restored_at timestamptz,
  unique(user_id, idempotency_key)
);

create index if not exists membership_contact_reveals_usage on public.membership_contact_reveals(subscription_id, viewer_user_id);
create index if not exists membership_profile_views_daily on public.membership_profile_views(viewer_user_id, view_date_ist);
create index if not exists horoscope_reports_usage on public.horoscope_reports(subscription_id, requester_user_id, status);
create index if not exists membership_consultation_usage on public.membership_consultation_redemptions(subscription_id, user_id, status);

alter table public.membership_contact_reveals enable row level security;
alter table public.membership_profile_views enable row level security;
alter table public.horoscope_reports enable row level security;
alter table public.membership_consultation_redemptions enable row level security;
revoke all on public.membership_contact_reveals, public.membership_profile_views, public.horoscope_reports, public.membership_consultation_redemptions from public, anon, authenticated;
grant select, insert, update, delete on public.membership_contact_reveals, public.membership_profile_views, public.horoscope_reports, public.membership_consultation_redemptions to service_role;
grant select on public.subscription_plans to anon, authenticated, service_role;

-- Detailed profile rows are available to members only after the server has
-- recorded today's view. Relationship screens use a separate server-authorized
-- summary projection, and approved success-story names remain readable. Match-card
-- previews are served by /api/matches; service-role routes are unaffected.
