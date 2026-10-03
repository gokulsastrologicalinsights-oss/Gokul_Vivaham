create or replace function private.member_session_active() returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from auth.sessions s join public.users u on u.auth_user_id=s.user_id where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid() and (s.not_after is null or s.not_after>now()) and u.status='active' and u.deleted_at is null and not exists(select 1 from public.profiles p where p.user_id=u.id and (p.is_suspended or p.is_banned or p.deleted_at is not null)));
$$;
