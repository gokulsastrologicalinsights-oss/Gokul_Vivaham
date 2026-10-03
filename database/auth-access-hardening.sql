create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated,service_role;

-- RLS must stop a logged-out token even while its JWT expiry is in the future.
create or replace function private.member_session_active() returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from auth.sessions s join public.users u on u.auth_user_id=s.user_id
    where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid()
      and (s.not_after is null or s.not_after>now())
      and u.status='active' and u.deleted_at is null
      and not exists(select 1 from public.profiles p where p.user_id=u.id and (p.is_suspended or p.deleted_at is not null))
  );
$$;
create or replace function private.admin_verified() returns boolean
language sql stable security definer set search_path='' as $$
  select private.member_session_active() and auth.jwt()->>'aal'='aal2'
    and exists(select 1 from public.admin_users a where a.auth_user_id=auth.uid() and a.role in ('admin','super_admin','moderator'));
$$;
revoke execute on function private.member_session_active(),private.admin_verified() from public,anon;
grant execute on function private.member_session_active(),private.admin_verified() to authenticated,service_role;

do $$ declare p record; t record; begin
  for p in select tablename,policyname from pg_policies where schemaname='public' and policyname like 'Admins %' loop
    execute format('alter policy %I on public.%I using (private.admin_verified()) with check (private.admin_verified())',p.policyname,p.tablename);
  end loop;
  for t in select tablename from pg_tables where schemaname='public' and tablename<>'subscription_plans' loop
    execute format('create policy active_member_session on public.%I as restrictive for all to authenticated using (private.member_session_active()) with check (private.member_session_active())',t.tablename);
  end loop;
end $$;

create or replace function public.guard_member_profile_fields() returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in ('anon','authenticated') and not private.admin_verified() then
    if TG_OP='INSERT' then
      if new.is_verified or new.is_premium or new.is_suspended or new.moderation_status<>'pending' then
        raise exception 'Protected profile fields' using errcode='42501';
      end if;
    elsif new.is_verified is distinct from old.is_verified or new.is_premium is distinct from old.is_premium
      or new.is_suspended is distinct from old.is_suspended or new.moderation_status is distinct from old.moderation_status
      or new.moderated_by is distinct from old.moderated_by or new.user_id is distinct from old.user_id
      or (new.id_verification_status is distinct from old.id_verification_status and new.id_verification_status not in ('unverified','pending'))
      or (new.horoscope_verification_status is distinct from old.horoscope_verification_status and new.horoscope_verification_status not in ('unverified','pending')) then
      raise exception 'Protected profile fields' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_member_profile_fields() from public,anon,authenticated;
notify pgrst,'reload schema';
