alter table public.profiles add column if not exists warning_count integer not null default 0, add column if not exists warning_notes text, add column if not exists is_banned boolean not null default false, add column if not exists banned_at timestamptz;
alter table public.reports add column if not exists action_taken text, add column if not exists moderator_notes text, add column if not exists reviewed_by uuid references public.admin_users(id), add column if not exists reviewed_at timestamptz;
create or replace function public.guard_member_safety_fields() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('anon','authenticated') then
  if TG_OP='INSERT' then
   if new.warning_count<>0 or new.warning_notes is not null or new.is_banned or new.banned_at is not null then raise exception 'Protected safety fields'; end if;
  elsif new.warning_count is distinct from old.warning_count or new.warning_notes is distinct from old.warning_notes or new.is_banned is distinct from old.is_banned or new.banned_at is distinct from old.banned_at then raise exception 'Protected safety fields'; end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_member_safety_fields() from public,anon,authenticated;
create trigger guard_member_safety_fields before insert or update on public.profiles for each row execute function public.guard_member_safety_fields();
notify pgrst,'reload schema';
