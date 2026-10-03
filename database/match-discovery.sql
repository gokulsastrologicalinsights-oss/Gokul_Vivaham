create or replace function private.profile_discoverable(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.admin_verified() or exists(select 1 from public.users where id=target and auth_user_id=auth.uid())
 or (
 exists(select 1 from public.users u join public.profiles p on p.user_id=u.id where u.id=target and u.status='active' and u.deleted_at is null and p.visibility='public' and p.deleted_at is null and not p.is_suspended)
 and not exists(select 1 from public.blocked_users b join public.users viewer on viewer.auth_user_id=auth.uid() where (b.blocker_user_id=viewer.id and b.blocked_user_id=target) or (b.blocker_user_id=target and b.blocked_user_id=viewer.id))
 );
$$;
revoke all on function private.profile_discoverable(uuid) from public,anon;
grant execute on function private.profile_discoverable(uuid) to authenticated;
create policy discovery_visibility_gate on public.profiles as restrictive for select to authenticated using(private.profile_discoverable(user_id));
notify pgrst,'reload schema';
