create or replace function private.guard_match_interest() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 if auth.uid() is null then
  if current_user in ('anon','authenticated') then raise exception 'Authentication required'; end if;
  return new;
 end if;
 select id into actor from public.users where auth_user_id=auth.uid() and status='active' and deleted_at is null;
 if actor is null then raise exception 'Inactive member'; end if;
 if TG_OP='INSERT' then
  if new.sender_user_id is distinct from actor or new.receiver_user_id=actor or new.status is distinct from 'pending' then raise exception 'Invalid interest'; end if;
 else
  if old.receiver_user_id is distinct from actor or old.status is distinct from 'pending' or new.status not in ('accepted','declined') then raise exception 'Only the recipient can respond to a pending interest'; end if;
  if new.sender_user_id is distinct from old.sender_user_id or new.receiver_user_id is distinct from old.receiver_user_id or new.id is distinct from old.id or new.created_at is distinct from old.created_at or new.message is distinct from old.message then raise exception 'Interest details cannot be changed'; end if;
 end if;
 if not exists(select 1 from public.users u join public.profiles p on p.user_id=u.id where u.id=new.receiver_user_id and u.status='active' and u.deleted_at is null and p.deleted_at is null and not p.is_suspended) then raise exception 'Member unavailable'; end if;
 if exists(select 1 from public.blocked_users where (blocker_user_id=new.sender_user_id and blocked_user_id=new.receiver_user_id) or (blocker_user_id=new.receiver_user_id and blocked_user_id=new.sender_user_id)) then raise exception 'Connection blocked'; end if;
 return new;
end $$;
revoke all on function private.guard_match_interest() from public,anon,authenticated;
create trigger guard_match_interest before insert or update on public.match_requests for each row execute function private.guard_match_interest();
