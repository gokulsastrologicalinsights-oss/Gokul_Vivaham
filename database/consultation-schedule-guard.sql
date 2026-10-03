create or replace function private.guard_consultation_schedule() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('anon','authenticated') and not private.admin_verified() then
  if TG_OP='INSERT' then
   if new.meeting_url is not null or new.scheduled_at is not null then raise exception 'Administrator scheduling required'; end if;
  elsif new.meeting_url is distinct from old.meeting_url or new.scheduled_at is distinct from old.scheduled_at then raise exception 'Administrator scheduling required';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_consultation_schedule() from public,anon,authenticated;
create trigger guard_consultation_schedule before insert or update on public.consultation_bookings for each row execute function private.guard_consultation_schedule();
