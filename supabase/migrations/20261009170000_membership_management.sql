-- Membership plan administration and manual entitlement management.
-- Manual grants are deliberately kept out of public.payments so an offline
-- assignment can never look like a captured Razorpay transaction.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.member_session_active() returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from auth.sessions s join public.users u on u.auth_user_id = s.user_id
    where s.id::text = auth.jwt()->>'session_id' and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now())
      and u.status = 'active' and u.deleted_at is null
      and not exists(select 1 from public.profiles p where p.user_id = u.id and (p.is_suspended or p.deleted_at is not null))
  );
$$;
revoke execute on function private.member_session_active() from public, anon;
grant execute on function private.member_session_active() to authenticated, service_role;

alter table public.subscription_plans
  add column if not exists description text not null default '',
  add column if not exists is_active boolean not null default true,
  add column if not exists contact_view_limit integer not null default 0,
  add column if not exists messaging_enabled boolean not null default false,
  add column if not exists profile_visibility_benefit text not null default '',
  add column if not exists photo_viewing_enabled boolean not null default false,
  add column if not exists premium_badge_eligible boolean not null default false,
  add column if not exists search_enabled boolean not null default false;

update public.subscription_plans
set
  contact_view_limit = case
    when lower(coalesce(name, '')) like '%diamond%' then 60
    when lower(coalesce(name, '')) like '%gold%' then 30
    when lower(coalesce(name, '')) like '%silver%' then 15
    else contact_view_limit
  end,
  messaging_enabled = case when lower(coalesce(name, '')) ~ '(silver|gold|diamond)' then true else messaging_enabled end,
  photo_viewing_enabled = case when lower(coalesce(name, '')) ~ '(silver|gold|diamond)' then true else photo_viewing_enabled end,
  premium_badge_eligible = case when lower(coalesce(name, '')) ~ '(silver|gold|diamond)' then true else premium_badge_eligible end,
  search_enabled = case when lower(coalesce(name, '')) ~ '(silver|gold|diamond)' then true else search_enabled end,
  description = case when description = '' then coalesce(name, '') || ' membership' else description end;

update public.subscription_plans
set features = coalesce(features, '{}'::jsonb) || jsonb_build_object(
  'horoscope_reports_limit', case when lower(coalesce(name, '')) like '%diamond%' then 10 when lower(coalesce(name, '')) like '%gold%' then 5 when lower(coalesce(name, '')) like '%silver%' then 1 else 0 end,
  'consultations_limit', case when lower(coalesce(name, '')) like '%diamond%' then 5 when lower(coalesce(name, '')) like '%gold%' then 1 else 0 end
);

alter table public.subscriptions
  add column if not exists grant_type text not null default 'online_payment';

alter table public.subscriptions drop constraint if exists subscriptions_payment_status_check;
alter table public.subscriptions
  add constraint subscriptions_payment_status_check
  check (payment_status in ('Completed', 'Expired', 'Pending', 'Failed', 'Cancelled'));
alter table public.subscriptions
  add constraint subscriptions_grant_type_check
  check (grant_type in ('online_payment', 'cash_payment', 'bank_transfer', 'upi_direct_payment', 'complimentary_access', 'administrative_correction', 'other'));

create table if not exists public.membership_offline_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete cascade,
  payment_method text not null check (payment_method in ('cash_payment', 'bank_transfer', 'upi_direct_payment', 'complimentary_access', 'administrative_correction', 'other')),
  amount_received numeric(12,2) not null default 0 check (amount_received >= 0),
  payment_reference text,
  date_received timestamptz,
  internal_note text,
  assigned_by uuid not null references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.membership_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_auth_user_id uuid not null,
  actor_admin_id uuid references public.admin_users(id) on delete set null,
  target_user_id uuid references public.users(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  previous_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.membership_offline_payments enable row level security;
alter table public.membership_audit_logs enable row level security;
revoke all on public.membership_offline_payments from anon, authenticated;
revoke all on public.membership_audit_logs from anon, authenticated;
grant all on public.membership_offline_payments to service_role;
grant all on public.membership_audit_logs to service_role;

create index if not exists idx_membership_offline_payments_user on public.membership_offline_payments(user_id, created_at desc);
create index if not exists idx_membership_offline_payments_subscription on public.membership_offline_payments(subscription_id);
create index if not exists idx_membership_audit_logs_target on public.membership_audit_logs(target_user_id, created_at desc);
create index if not exists idx_membership_audit_logs_action on public.membership_audit_logs(action, created_at desc);
create index if not exists idx_subscriptions_status_dates on public.subscriptions(payment_status, start_date, end_date);

drop policy if exists "Anyone can select subscription plans" on public.subscription_plans;
create policy "Anyone can select active subscription plans" on public.subscription_plans
  for select using (is_active = true);
drop policy if exists "Admins can manage subscription plans" on public.subscription_plans;
create policy "Admins can manage subscription plans" on public.subscription_plans
  for all using (exists (select 1 from public.admin_users a where a.auth_user_id = auth.uid() and a.role in ('admin', 'super_admin')))
  with check (exists (select 1 from public.admin_users a where a.auth_user_id = auth.uid() and a.role in ('admin', 'super_admin')));

create or replace function public.admin_upsert_membership_plan(actor_auth uuid, target_plan uuid, plan_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  admin_row public.admin_users;
  old_plan public.subscription_plans;
  saved_plan public.subscription_plans;
begin
  select * into admin_row from public.admin_users where auth_user_id = actor_auth and role in ('admin', 'super_admin');
  if admin_row.id is null then raise exception 'Administrator required'; end if;
  if length(trim(coalesce(plan_payload->>'name', ''))) not between 1 and 100 then raise exception 'Plan name is required'; end if;
  if coalesce((plan_payload->>'price')::numeric, -1) < 0 then raise exception 'Plan price cannot be negative'; end if;
  if coalesce((plan_payload->>'duration_days')::integer, 0) <= 0 then raise exception 'Plan duration must be positive'; end if;
  if coalesce((plan_payload->>'contact_view_limit')::integer, 0) < 0 then raise exception 'Contact limit cannot be negative'; end if;

  if target_plan is null then
    insert into public.subscription_plans(name, description, price, duration_days, features, is_active, contact_view_limit, messaging_enabled, profile_visibility_benefit, photo_viewing_enabled, premium_badge_eligible, search_enabled)
    values (
      trim(plan_payload->>'name'), coalesce(plan_payload->>'description', ''), (plan_payload->>'price')::numeric, (plan_payload->>'duration_days')::integer,
      coalesce(plan_payload->'features', '{}'::jsonb), coalesce((plan_payload->>'is_active')::boolean, true), coalesce((plan_payload->>'contact_view_limit')::integer, 0),
      coalesce((plan_payload->>'messaging_enabled')::boolean, false), coalesce(plan_payload->>'profile_visibility_benefit', ''),
      coalesce((plan_payload->>'photo_viewing_enabled')::boolean, false), coalesce((plan_payload->>'premium_badge_eligible')::boolean, false), coalesce((plan_payload->>'search_enabled')::boolean, false)
    ) returning * into saved_plan;
    insert into public.membership_audit_logs(action, actor_auth_user_id, actor_admin_id, plan_id, new_values, reason)
    values ('plan_created', actor_auth, admin_row.id, saved_plan.id, to_jsonb(saved_plan), plan_payload->>'reason');
  else
    select * into old_plan from public.subscription_plans where id = target_plan for update;
    if old_plan.id is null then raise exception 'Plan not found'; end if;
    update public.subscription_plans set
      name = trim(plan_payload->>'name'), description = coalesce(plan_payload->>'description', ''), price = (plan_payload->>'price')::numeric,
      duration_days = (plan_payload->>'duration_days')::integer, features = coalesce(plan_payload->'features', '{}'::jsonb),
      is_active = coalesce((plan_payload->>'is_active')::boolean, true), contact_view_limit = coalesce((plan_payload->>'contact_view_limit')::integer, 0),
      messaging_enabled = coalesce((plan_payload->>'messaging_enabled')::boolean, false), profile_visibility_benefit = coalesce(plan_payload->>'profile_visibility_benefit', ''),
      photo_viewing_enabled = coalesce((plan_payload->>'photo_viewing_enabled')::boolean, false), premium_badge_eligible = coalesce((plan_payload->>'premium_badge_eligible')::boolean, false),
      search_enabled = coalesce((plan_payload->>'search_enabled')::boolean, false)
    where id = target_plan returning * into saved_plan;
    insert into public.membership_audit_logs(action, actor_auth_user_id, actor_admin_id, plan_id, previous_values, new_values, reason)
    values ('plan_updated', actor_auth, admin_row.id, saved_plan.id, to_jsonb(old_plan), to_jsonb(saved_plan), plan_payload->>'reason');
  end if;
  return to_jsonb(saved_plan);
end $$;

create or replace function public.admin_delete_membership_plan(actor_auth uuid, target_plan uuid, reason_text text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  admin_row public.admin_users;
  old_plan public.subscription_plans;
  references_count integer;
begin
  select * into admin_row from public.admin_users where auth_user_id = actor_auth and role in ('admin', 'super_admin');
  if admin_row.id is null then raise exception 'Administrator required'; end if;
  select * into old_plan from public.subscription_plans where id = target_plan for update;
  if old_plan.id is null then raise exception 'Plan not found'; end if;
  if exists(select 1 from public.subscriptions where plan_id = target_plan and payment_status in ('Completed', 'Pending') and (end_date is null or end_date > now())) then
    raise exception 'Plan has an active or pending subscription; deactivate it instead of deleting it';
  end if;
  select count(*) into references_count from public.subscriptions where plan_id = target_plan;
  if references_count > 0 then
    update public.subscription_plans set is_active = false where id = target_plan;
  else
    delete from public.subscription_plans where id = target_plan;
  end if;
  insert into public.membership_audit_logs(action, actor_auth_user_id, actor_admin_id, plan_id, previous_values, reason)
  values ('plan_deleted', actor_auth, admin_row.id, target_plan, to_jsonb(old_plan), reason_text);
  return jsonb_build_object('success', true, 'deactivated_only', references_count > 0);
end $$;

create or replace function public.admin_membership_action(actor_auth uuid, action_name text, target_user uuid, target_subscription uuid, target_plan uuid, action_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  admin_row public.admin_users;
  member_row public.users;
  current_sub public.subscriptions;
  old_sub public.subscriptions;
  saved_sub public.subscriptions;
  plan_row public.subscription_plans;
  start_at timestamptz;
  end_at timestamptz;
  grant_kind text;
  note_text text;
  reason_text text;
  has_active boolean;
  admin_status text;
begin
  select * into admin_row from public.admin_users where auth_user_id = actor_auth and role in ('admin', 'super_admin');
  if admin_row.id is null then raise exception 'Administrator required'; end if;
  if target_user is null then raise exception 'Member is required'; end if;
  select * into member_row from public.users where id = target_user for update;
  if member_row.id is null or member_row.status <> 'active' or member_row.deleted_at is not null then raise exception 'Active registered member is required'; end if;

  grant_kind := coalesce(action_payload->>'grant_type', 'administrative_correction');
  if grant_kind = 'online_payment' then raise exception 'Manual membership actions cannot create online payment records'; end if;
  note_text := nullif(trim(coalesce(action_payload->>'internal_note', '')), '');
  reason_text := nullif(trim(coalesce(action_payload->>'reason', '')), '');
  if action_name in ('revoke', 'change', 'restore', 'shorten') and reason_text is null and note_text is null then raise exception 'A reason is required for this membership change'; end if;

  select * into current_sub from public.subscriptions where user_id = target_user and payment_status = 'Completed' and (start_date is null or start_date <= now()) and (end_date is null or end_date > now()) order by created_at desc limit 1 for update;
  if target_subscription is not null then
    select * into old_sub from public.subscriptions where id = target_subscription and user_id = target_user for update;
    if old_sub.id is null then raise exception 'Subscription not found'; end if;
  else
    old_sub := current_sub;
  end if;

  if action_name in ('assign', 'change', 'restore') then
    select * into plan_row from public.subscription_plans where id = target_plan for update;
    if plan_row.id is null then raise exception 'Plan not found'; end if;
    if not plan_row.is_active and action_name <> 'restore' then raise exception 'Plan is inactive for new assignments'; end if;
    start_at := coalesce(nullif(action_payload->>'start_date', '')::timestamptz, now());
    end_at := nullif(action_payload->>'end_date', '')::timestamptz;
    if end_at is null then end_at := start_at + make_interval(days => plan_row.duration_days); end if;
    if end_at <= start_at then raise exception 'Expiry must be after the start date'; end if;

    if current_sub.id is not null and action_name in ('assign', 'change', 'restore') then
      update public.subscriptions set payment_status = 'Cancelled', end_date = least(coalesce(end_date, now()), now()), updated_at = now() where id = current_sub.id;
    end if;
    insert into public.subscriptions(user_id, plan_id, payment_status, start_date, end_date, grant_type, created_at, updated_at)
    values (target_user, plan_row.id, case when start_at <= now() and end_at > now() then 'Completed' else 'Pending' end, start_at, end_at, grant_kind, now(), now()) returning * into saved_sub;
    insert into public.membership_offline_payments(subscription_id, user_id, payment_method, amount_received, payment_reference, date_received, internal_note, assigned_by)
    values (saved_sub.id, target_user, grant_kind, greatest(coalesce((action_payload->>'amount_received')::numeric, 0), 0), nullif(trim(coalesce(action_payload->>'payment_reference', '')), ''), nullif(action_payload->>'date_received', '')::timestamptz, note_text, admin_row.id);
    insert into public.membership_audit_logs(action, actor_auth_user_id, actor_admin_id, target_user_id, subscription_id, plan_id, previous_values, new_values, reason)
    values (case when action_name = 'assign' then 'membership_assigned' else 'membership_changed' end, actor_auth, admin_row.id, target_user, saved_sub.id, plan_row.id, case when current_sub.id is null then null else to_jsonb(current_sub) end, to_jsonb(saved_sub), coalesce(reason_text, note_text));
  elsif action_name = 'renew' then
    if old_sub.id is null then raise exception 'Subscription not found'; end if;
    select * into plan_row from public.subscription_plans where id = old_sub.plan_id;
    end_at := coalesce(old_sub.end_date, now()) + make_interval(days => coalesce((action_payload->>'extend_days')::integer, plan_row.duration_days));
    update public.subscriptions set payment_status = case when end_at > now() then 'Completed' else 'Expired' end, end_date = end_at, updated_at = now() where id = old_sub.id returning * into saved_sub;
    insert into public.membership_offline_payments(subscription_id, user_id, payment_method, amount_received, payment_reference, date_received, internal_note, assigned_by)
    values (saved_sub.id, target_user, grant_kind, greatest(coalesce((action_payload->>'amount_received')::numeric, 0), 0), nullif(trim(coalesce(action_payload->>'payment_reference', '')), ''), nullif(action_payload->>'date_received', '')::timestamptz, note_text, admin_row.id);
    insert into public.membership_audit_logs(action, actor_auth_user_id, actor_admin_id, target_user_id, subscription_id, plan_id, previous_values, new_values, reason)
    values ('membership_renewed', actor_auth, admin_row.id, target_user, saved_sub.id, saved_sub.plan_id, to_jsonb(old_sub), to_jsonb(saved_sub), coalesce(reason_text, note_text));
  elsif action_name in ('extend', 'shorten') then
    if old_sub.id is null then raise exception 'Subscription not found'; end if;
    end_at := nullif(action_payload->>'end_date', '')::timestamptz;
    if end_at is null then end_at := coalesce(old_sub.end_date, now()) + make_interval(days => coalesce((action_payload->>'extend_days')::integer, 0)); end if;
    if end_at <= coalesce(old_sub.start_date, now()) then raise exception 'Expiry must be after the start date'; end if;
    update public.subscriptions set payment_status = case when end_at > now() then 'Completed' else 'Expired' end, end_date = end_at, updated_at = now() where id = old_sub.id returning * into saved_sub;
    insert into public.membership_audit_logs(action, actor_auth_user_id, actor_admin_id, target_user_id, subscription_id, plan_id, previous_values, new_values, reason)
    values ('membership_expiry_changed', actor_auth, admin_row.id, target_user, saved_sub.id, saved_sub.plan_id, to_jsonb(old_sub), to_jsonb(saved_sub), coalesce(reason_text, note_text));
  elsif action_name = 'revoke' then
    if old_sub.id is null then raise exception 'Subscription not found'; end if;
    update public.subscriptions set payment_status = 'Cancelled', end_date = least(coalesce(end_date, now()), now()), updated_at = now() where id = old_sub.id returning * into saved_sub;
    insert into public.membership_audit_logs(action, actor_auth_user_id, actor_admin_id, target_user_id, subscription_id, plan_id, previous_values, new_values, reason)
    values ('membership_revoked', actor_auth, admin_row.id, target_user, saved_sub.id, saved_sub.plan_id, to_jsonb(old_sub), to_jsonb(saved_sub), coalesce(reason_text, note_text));
  else
    raise exception 'Unsupported membership action';
  end if;

  select exists(select 1 from public.subscriptions s where s.user_id = target_user and s.payment_status = 'Completed' and (s.start_date is null or s.start_date <= now()) and (s.end_date is null or s.end_date > now())) into has_active;
  update public.profiles set is_premium = has_active where user_id = target_user;
  update public.users set role = case when has_active then 'premium_user' else 'user' end, updated_at = now() where id = target_user;
  if has_active then
    insert into public.notifications(user_id, title, message, type, is_read) values (target_user, 'Membership Updated', 'Your membership access has been updated by the Gokul Vivaham team.', 'billing', false);
  else
    insert into public.notifications(user_id, title, message, type, is_read) values (target_user, 'Membership Access Updated', 'Your premium membership access is no longer active.', 'billing', false);
  end if;
  return jsonb_build_object('success', true, 'subscription', to_jsonb(saved_sub), 'has_active_access', has_active);
end $$;

revoke all on function public.admin_upsert_membership_plan(uuid,uuid,jsonb), public.admin_delete_membership_plan(uuid,uuid,text), public.admin_membership_action(uuid,text,uuid,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.admin_upsert_membership_plan(uuid,uuid,jsonb), public.admin_delete_membership_plan(uuid,uuid,text), public.admin_membership_action(uuid,text,uuid,uuid,uuid,jsonb) to service_role;

-- The database is the final enforcement point for chat access. Plan names are
-- labels only; the admin-managed entitlement column controls the permission.
create or replace function private.chat_allowed(one uuid, two uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select private.member_session_active() and one <> two
  and exists(
    select 1 from public.users u
    join public.subscriptions s on s.user_id = u.id
    join public.subscription_plans p on p.id = s.plan_id
    where u.auth_user_id = auth.uid() and u.id in (one, two)
      and s.payment_status = 'Completed' and s.end_date > now() and (s.start_date is null or s.start_date <= now())
      and p.messaging_enabled = true
  )
  and (select count(*) = 2 from public.users u join public.profiles p on p.user_id = u.id where u.id in (one, two) and u.status = 'active' and u.deleted_at is null and p.deleted_at is null and not p.is_suspended)
  and exists(select 1 from public.match_requests r where r.status = 'accepted' and ((r.sender_user_id = one and r.receiver_user_id = two) or (r.sender_user_id = two and r.receiver_user_id = one)))
  and not exists(select 1 from public.blocked_users b where (b.blocker_user_id = one and b.blocked_user_id = two) or (b.blocker_user_id = two and b.blocked_user_id = one));
$$;
notify pgrst, 'reload schema';
