create or replace function private.chat_allowed(one uuid,two uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.member_session_active() and one<>two
 and exists(select 1 from public.users u join public.subscriptions s on s.user_id=u.id join public.subscription_plans p on p.id=s.plan_id
 where u.auth_user_id=auth.uid() and u.id in(one,two) and s.payment_status='Completed' and s.end_date>now() and (s.start_date is null or s.start_date<=now()) and p.messaging_enabled=true)
 and (select count(*)=2 from public.users u join public.profiles p on p.user_id=u.id where u.id in(one,two) and u.status='active' and u.deleted_at is null and p.deleted_at is null and not p.is_suspended)
 and exists(select 1 from public.match_requests r where r.status='accepted' and ((r.sender_user_id=one and r.receiver_user_id=two) or (r.sender_user_id=two and r.receiver_user_id=one)))
 and not exists(select 1 from public.blocked_users b where (b.blocker_user_id=one and b.blocked_user_id=two) or (b.blocker_user_id=two and b.blocked_user_id=one));
$$;
revoke all on function private.chat_allowed(uuid,uuid) from public,anon;
grant execute on function private.chat_allowed(uuid,uuid) to authenticated;
create policy chat_membership_gate on public.chats as restrictive for all to authenticated using(private.chat_allowed(user_one,user_two)) with check(private.chat_allowed(user_one,user_two));
create policy message_membership_gate on public.chat_messages as restrictive for all to authenticated
 using(exists(select 1 from public.chats c where c.id=chat_id and private.chat_allowed(c.user_one,c.user_two)))
 with check(exists(select 1 from public.chats c where c.id=chat_id and private.chat_allowed(c.user_one,c.user_two)));
revoke update on public.chat_messages from authenticated;
grant update(is_seen) on public.chat_messages to authenticated;
notify pgrst,'reload schema';
