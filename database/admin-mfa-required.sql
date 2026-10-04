-- Apply after owner-admin-panel.sql. Password login starts enrollment but
-- never grants access to member data or admin operations without verified MFA.
create or replace function private.admin_verified() returns boolean
language sql stable security definer set search_path='' as $$
  select private.member_session_active() and auth.jwt()->>'aal'='aal2'
    and exists(select 1 from public.admin_users a
      where a.auth_user_id=auth.uid() and a.role in ('admin','super_admin','moderator'));
$$;
revoke execute on function private.admin_verified() from public,anon;
grant execute on function private.admin_verified() to authenticated,service_role;
-- Disable the legacy exception for older deployments as well.
update public.admin_users set password_login_allowed=false where password_login_allowed;
notify pgrst,'reload schema';
