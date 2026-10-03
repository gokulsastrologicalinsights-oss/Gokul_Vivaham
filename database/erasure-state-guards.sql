create or replace function private.guard_erasure_state() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_TABLE_NAME='users' then
  if new.status='active' and exists(select 1 from public.erasure_jobs where target_user_id=old.id and state<>'completed') then raise exception 'Account erasure cannot be restored'; end if;
 else
  if new.status is distinct from old.status and exists(select 1 from public.erasure_jobs where request_id=old.id and state<>'completed') then raise exception 'Erasure already started'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_erasure_state() from public,anon,authenticated;
create trigger guard_erasure_restore before update on public.users for each row execute function private.guard_erasure_state();
create trigger guard_erasure_cancel before update on public.deletion_requests for each row execute function private.guard_erasure_state();
