-- Member UUIDs and all relationships remain unchanged.
lock table public.profiles, public.sample_profiles in access exclusive mode;
create sequence private.profile_number_seq start 1 increment 1 maxvalue 9999 no cycle;
revoke all on sequence private.profile_number_seq from public, anon, authenticated;
create table public.profile_id_aliases (
 old_id text primary key,
 profile_uuid uuid not null references public.profiles(id) on delete cascade
);
alter table public.profile_id_aliases enable row level security;
create policy readable_profile_aliases on public.profile_id_aliases for select to authenticated
using (private.member_session_active() and exists(select 1 from public.profiles p where p.id=profile_uuid));
grant select on public.profile_id_aliases to authenticated;
grant all on public.profile_id_aliases to service_role;
insert into public.profile_id_aliases(old_id,profile_uuid) select profile_id,id from public.profiles;
do $$ declare row record; begin
 for row in select id from public.profiles order by created_at,id loop
  update public.profiles set profile_id='GV0741'||lpad(nextval('private.profile_number_seq')::text,4,'0') where id=row.id;
 end loop;
end $$;
alter table public.sample_profiles add column profile_id text unique;
do $$ declare row record; begin
 for row in select id from public.sample_profiles order by id loop
  update public.sample_profiles set profile_id='GV0741'||lpad(nextval('private.profile_number_seq')::text,4,'0') where id=row.id;
 end loop;
end $$;
alter table public.sample_profiles alter column profile_id set not null;
alter table public.profiles add constraint profile_id_number_format check (profile_id ~ '^GV0741[0-9]{4}$');
alter table public.sample_profiles add constraint sample_profile_number_format check (profile_id ~ '^GV0741[0-9]{4}$');
create function private.assign_profile_number() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 new.profile_id:='GV0741'||lpad(nextval('private.profile_number_seq')::text,4,'0');
 return new;
end $$;
revoke all on function private.assign_profile_number() from public,anon,authenticated;
create trigger assign_profile_number before insert on public.profiles for each row execute function private.assign_profile_number();
create trigger assign_sample_profile_number before insert on public.sample_profiles for each row execute function private.assign_profile_number();
create function private.keep_profile_number() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.profile_id is distinct from old.profile_id then raise exception 'Profile number cannot be changed'; end if;
 return new;
end $$;
revoke all on function private.keep_profile_number() from public,anon,authenticated;
create trigger keep_profile_number before update of profile_id on public.profiles for each row execute function private.keep_profile_number();
create trigger keep_sample_profile_number before update of profile_id on public.sample_profiles for each row execute function private.keep_profile_number();
notify pgrst,'reload schema';
