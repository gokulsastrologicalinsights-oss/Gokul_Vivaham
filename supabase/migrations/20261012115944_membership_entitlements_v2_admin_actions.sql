create or replace function public.admin_membership_action(
  actor_auth uuid,
  action_name text,
  target_user uuid,
  target_subscription uuid,
  target_plan uuid,
  action_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  admin_row public.admin_users;
  member_row public.users;
  old_sub public.subscriptions;
  saved_sub public.subscriptions;
  plan_row public.subscription_plans;
  start_at timestamptz;
  end_at timestamptz;
  renewal_base timestamptz;
  grant_kind text;
  note_text text;
  reason_text text;
  active_paid_plan_key text;
begin
  select * into admin_row from public.admin_users
  where auth_user_id = actor_auth and role in ('admin', 'super_admin');
  if admin_row.id is null then raise exception 'Administrator required'; end if;

  select * into member_row from public.users where id = target_user for update;
  if member_row.id is null or member_row.status <> 'active' or member_row.deleted_at is not null then
    raise exception 'Active registered member is required';
  end if;

  grant_kind := coalesce(action_payload->>'grant_type', 'administrative_correction');
  if grant_kind in ('online_payment', 'system_free') then
    raise exception 'This grant type is managed by the payment or signup lifecycle';
  end if;
  note_text := nullif(trim(coalesce(action_payload->>'internal_note', '')), '');
  reason_text := nullif(trim(coalesce(action_payload->>'reason', '')), '');
  if action_name in ('revoke', 'change', 'restore', 'shorten') and reason_text is null and note_text is null then
    raise exception 'A reason is required for this membership change';
  end if;

  if target_subscription is not null then
    select * into old_sub from public.subscriptions
    where id = target_subscription and user_id = target_user for update;
    if old_sub.id is null then raise exception 'Subscription not found'; end if;
  end if;

  if action_name in ('assign', 'change', 'restore') then
    select * into plan_row from public.subscription_plans where id = target_plan for update;
    if plan_row.id is null or not plan_row.is_active then raise exception 'Active plan required'; end if;
    if plan_row.plan_key = 'startup' then raise exception 'Startup membership is granted automatically'; end if;

    start_at := coalesce(nullif(action_payload->>'start_date', '')::timestamptz, now());
    end_at := coalesce(
      nullif(action_payload->>'end_date', '')::timestamptz,
      private.membership_expiry(plan_row, start_at)
    );
    if end_at is null or end_at <= start_at then raise exception 'Expiry must be after the start date'; end if;

    update public.subscriptions
    set payment_status = 'Cancelled',
        end_date = case when payment_status = 'Completed' then least(coalesce(end_date, now()), now()) else end_date end,
        updated_at = now()
    where user_id = target_user and grant_type <> 'system_free' and payment_status in ('Completed','Pending')
      and (payment_status = 'Pending' or (coalesce(start_date, '-infinity'::timestamptz) <= now() and coalesce(end_date, 'infinity'::timestamptz) > now()));

    insert into public.subscriptions(user_id, plan_id, payment_status, start_date, end_date, grant_type, created_at, updated_at)
    values (
      target_user, plan_row.id,
      case when start_at <= now() and end_at > now() then 'Completed' else 'Pending' end,
      start_at, end_at, grant_kind, now(), now()
    ) returning * into saved_sub;

    insert into public.membership_offline_payments(
      subscription_id, user_id, payment_method, amount_received, payment_reference,
      date_received, internal_note, assigned_by
    ) values (
      saved_sub.id, target_user, grant_kind,
      greatest(coalesce((action_payload->>'amount_received')::numeric, 0), 0),
      nullif(trim(coalesce(action_payload->>'payment_reference', '')), ''),
      nullif(action_payload->>'date_received', '')::timestamptz,
      note_text, admin_row.id
    );

    insert into public.membership_audit_logs(
      action, actor_auth_user_id, actor_admin_id, target_user_id, subscription_id,
      plan_id, previous_values, new_values, reason
    ) values (
      case when action_name = 'assign' then 'membership_assigned' else 'membership_changed' end,
      actor_auth, admin_row.id, target_user, saved_sub.id, plan_row.id,
      case when old_sub.id is null then null else to_jsonb(old_sub) end,
      to_jsonb(saved_sub), coalesce(reason_text, note_text)
    );
  elsif action_name = 'renew' then
    if old_sub.id is null or old_sub.grant_type = 'system_free' then raise exception 'Paid subscription required'; end if;
    select * into plan_row from public.subscription_plans where id = old_sub.plan_id;
    if plan_row.id is null or plan_row.plan_key = 'startup' then raise exception 'Paid plan required'; end if;
    renewal_base := greatest(now(), coalesce(old_sub.end_date, now()));
    end_at := private.membership_expiry(plan_row, renewal_base);
    update public.subscriptions
    set payment_status = 'Completed', end_date = end_at, updated_at = now()
    where id = old_sub.id returning * into saved_sub;
    insert into public.membership_offline_payments(
      subscription_id, user_id, payment_method, amount_received, payment_reference,
      date_received, internal_note, assigned_by
    ) values (
      saved_sub.id, target_user, grant_kind,
      greatest(coalesce((action_payload->>'amount_received')::numeric, 0), 0),
      nullif(trim(coalesce(action_payload->>'payment_reference', '')), ''),
      nullif(action_payload->>'date_received', '')::timestamptz,
      note_text, admin_row.id
    );
    insert into public.membership_audit_logs(
      action, actor_auth_user_id, actor_admin_id, target_user_id, subscription_id,
      plan_id, previous_values, new_values, reason
    ) values (
      'membership_renewed', actor_auth, admin_row.id, target_user, saved_sub.id,
      saved_sub.plan_id, to_jsonb(old_sub), to_jsonb(saved_sub), coalesce(reason_text, note_text)
    );
  elsif action_name in ('extend', 'shorten') then
    if old_sub.id is null or old_sub.grant_type = 'system_free' then raise exception 'Paid subscription required'; end if;
    end_at := nullif(action_payload->>'end_date', '')::timestamptz;
    if end_at is null then
      end_at := coalesce(old_sub.end_date, now()) + make_interval(days => coalesce((action_payload->>'extend_days')::integer, 0));
    end if;
    if end_at <= coalesce(old_sub.start_date, now()) then raise exception 'Expiry must be after the start date'; end if;
    update public.subscriptions
    set payment_status = case when end_at > now() then 'Completed' else 'Expired' end,
        end_date = end_at, updated_at = now()
    where id = old_sub.id returning * into saved_sub;
    insert into public.membership_audit_logs(
      action, actor_auth_user_id, actor_admin_id, target_user_id, subscription_id,
      plan_id, previous_values, new_values, reason
    ) values (
      'membership_expiry_changed', actor_auth, admin_row.id, target_user, saved_sub.id,
      saved_sub.plan_id, to_jsonb(old_sub), to_jsonb(saved_sub), coalesce(reason_text, note_text)
    );
  elsif action_name = 'revoke' then
    if old_sub.id is null or old_sub.grant_type = 'system_free' then raise exception 'Paid subscription required'; end if;
    update public.subscriptions
    set payment_status = 'Cancelled', end_date = least(coalesce(end_date, now()), now()), updated_at = now()
    where id = old_sub.id returning * into saved_sub;
    insert into public.membership_audit_logs(
      action, actor_auth_user_id, actor_admin_id, target_user_id, subscription_id,
      plan_id, previous_values, new_values, reason
    ) values (
      'membership_revoked', actor_auth, admin_row.id, target_user, saved_sub.id,
      saved_sub.plan_id, to_jsonb(old_sub), to_jsonb(saved_sub), coalesce(reason_text, note_text)
    );
  else
    raise exception 'Unsupported membership action';
  end if;

  select p.plan_key into active_paid_plan_key
  from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
  where s.user_id = target_user and p.price > 0 and s.payment_status = 'Completed'
    and coalesce(s.start_date, '-infinity'::timestamptz) <= now() and s.end_date > now()
  order by s.created_at desc limit 1;
  update public.profiles set is_premium = active_paid_plan_key is not null where user_id = target_user;
  update public.users set role = coalesce(active_paid_plan_key, 'user'), updated_at = now() where id = target_user;
  insert into public.notifications(user_id, title, message, type, is_read)
  values (
    target_user,
    case when active_paid_plan_key is null then 'Membership Access Updated' else 'Membership Updated' end,
    case when active_paid_plan_key is null
      then 'Your paid membership is no longer active. Your lifetime Startup membership remains available.'
      else 'Your membership access has been updated by the Gokul Vivaham team.' end,
    'billing', false
  );
  return jsonb_build_object('success', true, 'subscription', to_jsonb(saved_sub), 'has_active_paid_access', active_paid_plan_key is not null);
end;
$$;

revoke all on function public.admin_upsert_membership_plan(uuid,uuid,jsonb), public.admin_delete_membership_plan(uuid,uuid,text), public.admin_membership_action(uuid,text,uuid,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.admin_upsert_membership_plan(uuid,uuid,jsonb), public.admin_delete_membership_plan(uuid,uuid,text), public.admin_membership_action(uuid,text,uuid,uuid,uuid,jsonb) to service_role;
