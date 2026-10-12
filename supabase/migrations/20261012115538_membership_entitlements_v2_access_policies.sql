create or replace function private.profile_detail_allowed(target_user uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select
    exists(select 1 from public.admin_users a where a.auth_user_id = auth.uid() and a.role in ('admin','super_admin','moderator'))
    or exists(select 1 from public.users viewer where viewer.auth_user_id = auth.uid() and viewer.id = target_user)
    or exists(
      select 1 from public.membership_profile_views v
      join public.users viewer on viewer.id = v.viewer_user_id
      join public.profiles target on target.id = v.viewed_profile_id
      where viewer.auth_user_id = auth.uid() and target.user_id = target_user
        and v.view_date_ist = (now() at time zone 'Asia/Kolkata')::date
    )
    or exists(
      select 1 from public.success_stories story
      where target_user in (story.husband_user_id, story.wife_user_id)
    );
$$;
revoke all on function private.profile_detail_allowed(uuid) from public, anon;
grant execute on function private.profile_detail_allowed(uuid) to authenticated, service_role;
drop policy if exists membership_profile_detail_gate on public.profiles;
create policy membership_profile_detail_gate on public.profiles as restrictive
  for select to authenticated using ((select private.profile_detail_allowed(user_id)));

-- Preserve the documented free-member reply policy: paid members may initiate
-- an accepted-match conversation; a Startup member may read/reply only after
-- that paid member has actually sent the first message during an active term.
create or replace function private.chat_allowed(one uuid, two uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select private.member_session_active() and one <> two
  and exists(
    select 1 from public.users me
    where me.auth_user_id = auth.uid() and me.id in (one, two)
      and (
        exists(
          select 1 from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
          where s.user_id = me.id and s.payment_status = 'Completed' and s.end_date > now()
            and coalesce(s.start_date, '-infinity'::timestamptz) <= now() and p.messaging_enabled
        )
        or exists(
          select 1 from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
          where s.user_id = case when me.id = one then two else one end
            and s.payment_status = 'Completed' and s.end_date > now()
            and coalesce(s.start_date, '-infinity'::timestamptz) <= now() and p.messaging_enabled
            and exists(
              select 1 from public.chats c join public.chat_messages m on m.chat_id = c.id
              where ((c.user_one = one and c.user_two = two) or (c.user_one = two and c.user_two = one))
                and m.sender_id = s.user_id and m.created_at >= s.start_date and m.created_at < s.end_date
            )
        )
      )
  )
  and (
    select count(*) = 2 from public.users u join public.profiles p on p.user_id = u.id
    where u.id in (one, two) and u.status = 'active' and u.deleted_at is null
      and p.deleted_at is null and not p.is_suspended
  )
  and exists(
    select 1 from public.match_requests r where r.status = 'accepted'
      and ((r.sender_user_id = one and r.receiver_user_id = two) or (r.sender_user_id = two and r.receiver_user_id = one))
  )
  and not exists(
    select 1 from public.blocked_users b
    where (b.blocker_user_id = one and b.blocked_user_id = two)
       or (b.blocked_user_id = one and b.blocker_user_id = two)
  );
$$;
revoke all on function private.chat_allowed(uuid,uuid) from public, anon;
grant execute on function private.chat_allowed(uuid,uuid) to authenticated, service_role;
