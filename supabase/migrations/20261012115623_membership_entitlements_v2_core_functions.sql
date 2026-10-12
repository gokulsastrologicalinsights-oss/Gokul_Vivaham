create or replace function private.membership_expiry(plan_row public.subscription_plans, starts_at timestamptz)
returns timestamptz
language sql immutable set search_path = '' as $$
  select case
    when plan_row.is_lifetime then null
    when plan_row.duration_unit = 'day' then starts_at + make_interval(days => plan_row.duration_value)
    when plan_row.duration_unit = 'month' then starts_at + make_interval(months => plan_row.duration_value)
    else null
  end;
$$;
revoke all on function private.membership_expiry(public.subscription_plans, timestamptz) from public, anon, authenticated;
grant execute on function private.membership_expiry(public.subscription_plans, timestamptz) to service_role;

create or replace function private.ensure_startup_subscription_for_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare startup_id uuid;
begin
  select id into startup_id from public.subscription_plans where plan_key = 'startup' and is_active limit 1;
  if startup_id is not null then
    insert into public.subscriptions(user_id, plan_id, payment_status, start_date, end_date, grant_type, created_at, updated_at)
    values(new.id, startup_id, 'Completed', coalesce(new.created_at, now()), null, 'system_free', now(), now())
    on conflict (user_id) where grant_type = 'system_free' do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.ensure_startup_subscription_for_user() from public, anon, authenticated;
drop trigger if exists ensure_startup_subscription_after_user_insert on public.users;
create trigger ensure_startup_subscription_after_user_insert
after insert on public.users for each row execute function private.ensure_startup_subscription_for_user();

create or replace function private.current_membership(member_id uuid, paid_only boolean default false)
returns table(subscription_id uuid, plan_id uuid)
language plpgsql volatile security invoker set search_path = '' as $$
declare expired_sub public.subscriptions;
begin
  for expired_sub in
    select s.* from public.subscriptions s
    join public.subscription_plans p on p.id = s.plan_id
    where s.user_id = member_id and p.price > 0 and s.payment_status = 'Completed'
      and s.end_date is not null and s.end_date <= now()
    for update of s
  loop
    update public.subscriptions
    set payment_status = 'Expired', updated_at = now()
    where id = expired_sub.id;
    insert into public.membership_audit_logs(
      action, target_user_id, subscription_id, plan_id, previous_values, new_values, reason
    ) values (
      'membership_expired', member_id, expired_sub.id, expired_sub.plan_id,
      to_jsonb(expired_sub), to_jsonb(expired_sub) || jsonb_build_object('payment_status','Expired','updated_at',now()),
      'Paid membership reached its server-calculated expiry'
    );
  end loop;
  if not exists (
    select 1 from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id
    where s.user_id=member_id and p.price>0 and s.payment_status='Completed'
      and coalesce(s.start_date,'-infinity'::timestamptz)<=now() and s.end_date>now()
  ) then
    update public.profiles set is_premium=false where user_id=member_id and is_premium;
  end if;
  return query select s.id, p.id
  from public.subscriptions s
  join public.subscription_plans p on p.id = s.plan_id
  where s.user_id = member_id
    and s.payment_status = 'Completed'
    and coalesce(s.start_date, '-infinity'::timestamptz) <= now()
    and (p.is_lifetime or s.end_date > now())
    and (not paid_only or p.price > 0)
  order by (p.price > 0) desc, s.created_at desc
  limit 1;
end;
$$;
revoke all on function private.current_membership(uuid, boolean) from public, anon, authenticated;
grant execute on function private.current_membership(uuid, boolean) to service_role;

create or replace function public.get_member_entitlements(actor uuid)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare sub public.subscriptions; plan public.subscription_plans; contacts_used integer; reports_used integer; reports_reserved integer; consultations_used integer; consultations_reserved integer; profile_views_used integer;
begin
  select s.* into sub from public.subscriptions s
  join private.current_membership(actor, false) c on c.subscription_id = s.id;
  if sub.id is null then raise exception 'Membership not found'; end if;
  select * into plan from public.subscription_plans where id = sub.plan_id;
  select count(*) into contacts_used from public.membership_contact_reveals where subscription_id = sub.id;
  select count(*) into reports_used from public.horoscope_reports where subscription_id = sub.id and status = 'generated';
  select count(*) into reports_reserved from public.horoscope_reports where subscription_id = sub.id and status = 'pending';
  select count(*) into consultations_used from public.membership_consultation_redemptions where subscription_id = sub.id and status = 'consumed';
  select count(*) into consultations_reserved from public.membership_consultation_redemptions where subscription_id = sub.id and status = 'reserved';
  select count(*) into profile_views_used from public.membership_profile_views where viewer_user_id = actor and view_date_ist = (now() at time zone 'Asia/Kolkata')::date;
  return jsonb_build_object(
    'subscription_id', sub.id,
    'plan_id', plan.id,
    'plan_key', upper(plan.plan_key),
    'plan_name', plan.name,
    'status', case when plan.is_lifetime then 'active' when sub.end_date <= now() then 'expired' else 'active' end,
    'start_date', sub.start_date,
    'end_date', sub.end_date,
    'is_lifetime', plan.is_lifetime,
    'manual_renewal', true,
    'contacts_limit', plan.contact_view_limit,
    'contacts_used', contacts_used,
    'contacts_remaining', greatest(plan.contact_view_limit - contacts_used, 0),
    'horoscope_limit', plan.detailed_report_limit,
    'horoscope_used', reports_used,
    'horoscope_reserved', reports_reserved,
    'horoscope_remaining', greatest(plan.detailed_report_limit - reports_used - reports_reserved, 0),
    'consultations_limit', plan.consultation_limit,
    'consultations_used', consultations_used,
    'consultations_reserved', consultations_reserved,
    'consultations_remaining', greatest(plan.consultation_limit - consultations_used - consultations_reserved, 0),
    'profile_views_daily_limit', plan.daily_profile_view_limit,
    'profile_views_today', profile_views_used,
    'profile_views_remaining', greatest(plan.daily_profile_view_limit - profile_views_used, 0),
    'horoscope_percentage_level', plan.horoscope_percentage_level,
    'messaging_enabled', plan.messaging_enabled,
    'interest_send_enabled', plan.interest_send_enabled,
    'advanced_filters_enabled', plan.advanced_filters_enabled,
    'photo_viewing_enabled', plan.photo_viewing_enabled,
    'verified_badge_eligible', plan.premium_badge_eligible
  );
end;
$$;
revoke all on function public.get_member_entitlements(uuid) from public, anon, authenticated;
grant execute on function public.get_member_entitlements(uuid) to service_role;
