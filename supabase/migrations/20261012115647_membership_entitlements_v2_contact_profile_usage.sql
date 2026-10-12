create or replace function public.consume_contact_reveal(actor uuid, target_profile uuid)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare sub public.subscriptions; plan public.subscription_plans; target public.profiles; used_count integer; created_id uuid; already_revealed boolean := false;
begin
  perform 1 from public.users where id = actor and status = 'active' and deleted_at is null for update;
  if not found then raise exception 'Active member required'; end if;
  select p.* into target from public.profiles p
  join public.users u on u.id = p.user_id
  where p.id = target_profile and p.user_id <> actor
    and u.status = 'active' and u.deleted_at is null
    and not p.is_suspended and not p.is_banned and p.deleted_at is null;
  if target.id is null then raise exception 'Profile unavailable'; end if;
  if not exists (
    select 1 from public.match_requests r where r.status = 'accepted'
    and ((r.sender_user_id = actor and r.receiver_user_id = target.user_id) or (r.sender_user_id = target.user_id and r.receiver_user_id = actor))
  ) then raise exception 'Accepted interest required'; end if;
  select s.* into sub from public.subscriptions s join private.current_membership(actor, true) c on c.subscription_id = s.id for update of s;
  if sub.id is null then raise exception 'Paid membership required'; end if;
  select * into plan from public.subscription_plans where id = sub.plan_id;
  if not plan.contact_viewing_enabled or plan.contact_view_limit <= 0 then raise exception 'Contact viewing not included'; end if;
  select id into created_id from public.membership_contact_reveals where subscription_id = sub.id and target_profile_id = target.id;
  if created_id is not null then
    already_revealed := true;
  else
    select count(*) into used_count from public.membership_contact_reveals where subscription_id = sub.id;
    if used_count >= plan.contact_view_limit then raise exception 'Contact reveal limit reached'; end if;
    insert into public.membership_contact_reveals(subscription_id, viewer_user_id, target_profile_id)
    values(sub.id, actor, target.id) returning id into created_id;
  end if;
  select count(*) into used_count from public.membership_contact_reveals where subscription_id = sub.id;
  return jsonb_build_object('success', true, 'subscription_id', sub.id, 'target_user_id', target.user_id, 'already_revealed', already_revealed, 'used', used_count, 'limit', plan.contact_view_limit, 'remaining', greatest(plan.contact_view_limit-used_count,0));
end;
$$;
revoke all on function public.consume_contact_reveal(uuid, uuid) from public, anon, authenticated;
grant execute on function public.consume_contact_reveal(uuid, uuid) to service_role;

create or replace function public.consume_profile_view(actor uuid, target_profile uuid)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare sub public.subscriptions; plan public.subscription_plans; target public.profiles; used_count integer; existing_id uuid; today_ist date := (now() at time zone 'Asia/Kolkata')::date;
begin
  perform 1 from public.users where id = actor and status = 'active' and deleted_at is null for update;
  if not found then raise exception 'Active member required'; end if;
  select p.* into target from public.profiles p
  join public.users u on u.id = p.user_id
  where p.id = target_profile and p.user_id <> actor
    and u.status = 'active' and u.deleted_at is null
    and not p.is_suspended and not p.is_banned and p.deleted_at is null;
  if target.id is null then raise exception 'Profile unavailable'; end if;
  select s.* into sub from public.subscriptions s join private.current_membership(actor, false) c on c.subscription_id = s.id for update of s;
  if sub.id is null then raise exception 'Membership required'; end if;
  select * into plan from public.subscription_plans where id = sub.plan_id;
  select id into existing_id from public.membership_profile_views where viewer_user_id = actor and viewed_profile_id = target.id and view_date_ist = today_ist;
  if existing_id is null then
    select count(*) into used_count from public.membership_profile_views where viewer_user_id = actor and view_date_ist = today_ist;
    if used_count >= plan.daily_profile_view_limit then raise exception 'Daily profile view limit reached'; end if;
    insert into public.membership_profile_views(subscription_id, viewer_user_id, viewed_profile_id, view_date_ist)
    values(sub.id, actor, target.id, today_ist);
  end if;
  select count(*) into used_count from public.membership_profile_views where viewer_user_id = actor and view_date_ist = today_ist;
  return jsonb_build_object('success', true, 'already_viewed_today', existing_id is not null, 'used', used_count, 'limit', plan.daily_profile_view_limit, 'remaining', greatest(plan.daily_profile_view_limit-used_count,0), 'reset_timezone', 'Asia/Kolkata');
end;
$$;
revoke all on function public.consume_profile_view(uuid, uuid) from public, anon, authenticated;
grant execute on function public.consume_profile_view(uuid, uuid) to service_role;
