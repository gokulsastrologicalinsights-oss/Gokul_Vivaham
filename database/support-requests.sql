create table public.support_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.users(id) on delete cascade,name text not null,email text not null,mobile text,subject text not null,message text not null,status text not null default 'open' check(status in ('open','resolved')),reply text,reviewed_by uuid references public.admin_users(id),updated_at timestamptz not null default now(),created_at timestamptz not null default now());
alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon,authenticated;
grant all on public.support_requests to service_role;
create function public.reply_support_request(actor uuid,request_key uuid,response_text text) returns void language plpgsql security invoker set search_path='' as $$
declare aid uuid; target uuid;
begin
 select id into aid from public.admin_users where auth_user_id=actor and role in ('admin','super_admin','moderator');
 if aid is null or length(trim(response_text))<3 then raise exception 'Administrator and reply required'; end if;
 select user_id into target from public.support_requests where id=request_key and status='open' for update;
 if target is null then raise exception 'Open request required'; end if;
 update public.support_requests set status='resolved',reply=response_text,reviewed_by=aid,updated_at=now() where id=request_key;
 insert into public.notifications(user_id,title,message,type,is_read) values(target,'Support replied',response_text,'support_reply',false);
 insert into public.activity_logs(action,metadata) values('ADMIN_SUPPORT_REPLY',jsonb_build_object('actor',actor,'request_id',request_key));
end $$;
revoke all on function public.reply_support_request(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reply_support_request(uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
