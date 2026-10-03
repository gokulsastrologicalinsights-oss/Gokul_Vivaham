create policy recipient_read_receipt on public.chat_messages for update to authenticated
using(sender_id<>auth.uid() and exists(select 1 from public.chats c where c.id=chat_id and private.chat_allowed(c.user_one,c.user_two)))
with check(sender_id<>auth.uid() and is_seen=true and exists(select 1 from public.chats c where c.id=chat_id and private.chat_allowed(c.user_one,c.user_two)));
create or replace function private.guard_initial_read_receipt() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user='authenticated' and coalesce(new.is_seen,false) then raise exception 'New messages must be unread'; end if;
 return new;
end $$;
revoke all on function private.guard_initial_read_receipt() from public,anon,authenticated;
create trigger guard_initial_read_receipt before insert on public.chat_messages for each row execute function private.guard_initial_read_receipt();
create index unread_chat_messages on public.chat_messages(chat_id,sender_id) where is_seen=false;
