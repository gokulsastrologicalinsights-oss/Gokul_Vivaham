create table public.admin_announcements(id uuid primary key,actor uuid not null references public.admin_users(id),title text not null,message text not null,recipient_count integer not null default 0,created_at timestamptz not null default now());
alter table public.admin_announcements enable row level security;
revoke all on public.admin_announcements from anon,authenticated;
grant all on public.admin_announcements to service_role;
create function public.publish_admin_announcement(actor_auth uuid,request_key uuid,heading text,body text) returns integer language plpgsql security invoker set search_path='' as $$
declare aid uuid; saved public.admin_announcements; total integer;
begin
 select id into aid from public.admin_users where auth_user_id=actor_auth and role in ('admin','super_admin');
 if aid is null then raise exception 'Administrator required'; end if;
 if length(trim(heading)) not between 3 and 120 or length(trim(body)) not between 3 and 2000 then raise exception 'Invalid announcement'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request_key::text,0));
 select * into saved from public.admin_announcements where id=request_key;
 if saved.id is not null then
  if saved.actor<>aid or saved.title<>heading or saved.message<>body then raise exception 'Request conflict'; end if;
  return saved.recipient_count;
 end if;
 insert into public.admin_announcements(id,actor,title,message) values(request_key,aid,heading,body);
 insert into public.notifications(user_id,title,message,type,is_read)
 select u.id,heading,body,'admin_announcement',false from public.users u
 where u.status='active' and u.deleted_at is null
 and not exists(select 1 from public.admin_users a where a.auth_user_id=u.auth_user_id)
 and not exists(select 1 from public.profiles p where p.user_id=u.id and (p.is_suspended or p.is_banned or p.deleted_at is not null));
 get diagnostics total=row_count;
 update public.admin_announcements set recipient_count=total where id=request_key;
 insert into public.activity_logs(action,metadata) values('ADMIN_ANNOUNCEMENT',jsonb_build_object('actor',actor_auth,'announcement_id',request_key,'recipients',total));
 return total;
end $$;
revoke all on function public.publish_admin_announcement(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.publish_admin_announcement(uuid,uuid,text,text) to service_role;
revoke update on public.notifications from authenticated;
grant update(is_read) on public.notifications to authenticated;
notify pgrst,'reload schema';
