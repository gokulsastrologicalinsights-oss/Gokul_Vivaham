-- Apply after chat-permissions.sql. This changes chat access only.
create or replace function private.chat_allowed(one uuid,two uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.member_session_active() and one<>two
 and exists(select 1 from public.users me where me.auth_user_id=auth.uid() and me.id in(one,two)
   and (
     exists(select 1 from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id
       where s.user_id=me.id and s.payment_status='Completed' and s.end_date>now()
       and (s.start_date is null or s.start_date<=now()) and p.messaging_enabled=true)
     or exists(select 1 from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id
       where s.user_id=case when me.id=one then two else one end
       and s.payment_status='Completed' and s.end_date>now()
       and (s.start_date is null or s.start_date<=now()) and p.messaging_enabled=true
       and exists(select 1 from public.chats c join public.chat_messages m on m.chat_id=c.id
         where ((c.user_one=one and c.user_two=two) or (c.user_one=two and c.user_two=one))
         and m.sender_id=s.user_id and m.created_at<s.end_date
         and (s.start_date is null or m.created_at>=s.start_date)))
   ))
 and (select count(*)=2 from public.users u join public.profiles p on p.user_id=u.id
   where u.id in(one,two) and u.status='active' and u.deleted_at is null and p.deleted_at is null and not p.is_suspended)
 and exists(select 1 from public.match_requests r where r.status='accepted'
   and ((r.sender_user_id=one and r.receiver_user_id=two) or (r.sender_user_id=two and r.receiver_user_id=one)))
 and not exists(select 1 from public.blocked_users b
   where (b.blocker_user_id=one and b.blocked_user_id=two) or (b.blocker_user_id=two and b.blocked_user_id=one));
$$;
revoke all on function private.chat_allowed(uuid,uuid) from public,anon;
grant execute on function private.chat_allowed(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
