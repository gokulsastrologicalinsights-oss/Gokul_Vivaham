create or replace function public.begin_horoscope_report(actor uuid, target uuid, request_key text)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare sub public.subscriptions; plan public.subscription_plans; report public.horoscope_reports; reserved_count integer;
begin
  if request_key is null or length(request_key) < 8 or length(request_key) > 200 then raise exception 'Valid idempotency key required'; end if;
  perform 1 from public.users where id = actor and status = 'active' and deleted_at is null for update;
  if not found then raise exception 'Active member required'; end if;
  if actor = target or not exists(
    select 1 from public.users u join public.profiles p on p.user_id = u.id
    where u.id = target and u.status = 'active' and u.deleted_at is null
      and not p.is_suspended and not p.is_banned and p.deleted_at is null
  ) then raise exception 'Target member unavailable'; end if;
  if exists(
    select 1 from public.blocked_users b
    where (b.blocker_user_id = actor and b.blocked_user_id = target)
       or (b.blocked_user_id = actor and b.blocker_user_id = target)
  ) then raise exception 'Target member unavailable'; end if;
  select * into report from public.horoscope_reports where requester_user_id = actor and idempotency_key = request_key;
  if report.id is not null then return jsonb_build_object('success', true, 'report_id', report.id, 'status', report.status, 'idempotent', true); end if;
  select s.* into sub from public.subscriptions s join private.current_membership(actor, true) c on c.subscription_id = s.id for update of s;
  if sub.id is null then raise exception 'Paid membership required'; end if;
  select * into plan from public.subscription_plans where id = sub.plan_id;
  if plan.detailed_report_limit <= 0 then raise exception 'Detailed reports not included'; end if;
  select count(*) into reserved_count from public.horoscope_reports where subscription_id = sub.id and status in ('pending','generated');
  if reserved_count >= plan.detailed_report_limit then raise exception 'Detailed report limit reached'; end if;
  insert into public.horoscope_reports(subscription_id, requester_user_id, target_user_id, idempotency_key)
  values(sub.id, actor, target, request_key) returning * into report;
  return jsonb_build_object('success', true, 'report_id', report.id, 'status', report.status, 'idempotent', false);
end;
$$;
revoke all on function public.begin_horoscope_report(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.begin_horoscope_report(uuid, uuid, text) to service_role;

create or replace function public.finish_horoscope_report(report_key uuid, result jsonb, failure text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare saved public.horoscope_reports;
begin
  select * into saved from public.horoscope_reports where id = report_key for update;
  if saved.id is null then raise exception 'Report request not found'; end if;
  if saved.status = 'generated' then return to_jsonb(saved); end if;
  if saved.status <> 'pending' then raise exception 'Report request is not pending'; end if;
  if failure is not null then
    update public.horoscope_reports set status='failed', error_message=left(failure,500), completed_at=now() where id=report_key returning * into saved;
  elsif result is null or result = '{}'::jsonb then
    raise exception 'A saved report result is required';
  else
    update public.horoscope_reports set status='generated', report_data=result, error_message=null, completed_at=now() where id=report_key returning * into saved;
  end if;
  return to_jsonb(saved);
end;
$$;
revoke all on function public.finish_horoscope_report(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.finish_horoscope_report(uuid, jsonb, text) to service_role;
