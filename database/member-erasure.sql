create table public.erasure_jobs(id uuid primary key default gen_random_uuid(),request_id uuid unique not null,target_user_id uuid not null,auth_user_id uuid not null,actor uuid not null,state text not null default 'running',lease_until timestamptz,error text,completed_at timestamptz,created_at timestamptz default now());
alter table public.erasure_jobs enable row level security;
revoke all on public.erasure_jobs from public,anon,authenticated;
grant all on public.erasure_jobs to service_role;
create or replace function public.begin_member_erasure(actor_id uuid,request_key uuid) returns public.erasure_jobs language plpgsql security invoker set search_path='' as $$
declare job public.erasure_jobs; target public.deletion_requests; uid uuid;
begin
 if not exists(select 1 from public.admin_users where auth_user_id=actor_id and role in ('admin','super_admin')) then raise exception 'Administrator required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request_key::text,0));
 select * into job from public.erasure_jobs where request_id=request_key for update;
 if job.id is not null then
  if job.state='completed' then return job; end if;
  if job.lease_until>now() then raise exception 'Erasure already running'; end if;
  update public.erasure_jobs set lease_until=now()+interval '5 minutes',error=null,state='running' where id=job.id returning * into job;
  return job;
 end if;
 select * into target from public.deletion_requests where id=request_key and status='pending' and is_permanent for update;
 if target.id is null then raise exception 'Pending permanent request required'; end if;
 select auth_user_id into uid from public.users where id=target.user_id for update;
 if uid is null or exists(select 1 from public.admin_users where auth_user_id=uid) then raise exception 'Administrator accounts cannot be erased'; end if;
 update public.users set status='deleted',deleted_at=now() where id=target.user_id;
 update public.profiles set is_suspended=true,deleted_at=now() where user_id=target.user_id;
 insert into public.erasure_jobs(request_id,target_user_id,auth_user_id,actor,lease_until) values(request_key,target.user_id,uid,actor_id,now()+interval '5 minutes') returning * into job;
 return job;
end $$;
create or replace function public.erasure_storage_files(job_key uuid) returns table(bucket text,path text) language sql security invoker set search_path='' as $$
 select o.bucket_id,o.name from storage.objects o join public.erasure_jobs j on j.id=job_key where j.state='running' and (split_part(o.name,'/',1)=j.auth_user_id::text or o.owner_id=j.auth_user_id::text);
$$;
create or replace function public.erase_member_records(job_key uuid) returns void language plpgsql security invoker set search_path='' as $$
declare job public.erasure_jobs; target uuid;
begin
 select * into job from public.erasure_jobs where id=job_key and state='running' for update;
 if job.id is null then raise exception 'Running job required'; end if;
 target:=job.target_user_id;
 if exists(select 1 from storage.objects where split_part(name,'/',1)=job.auth_user_id::text or owner_id=job.auth_user_id::text) then raise exception 'Storage cleanup incomplete'; end if;
 delete from public.contact_unlocks where user_id=target or target_profile_id in(select id from public.profiles where user_id=target) or payment_id in(select id from public.payments where user_id=target);
 update public.payments set target_profile_id=null where target_profile_id in(select id from public.profiles where user_id=target);
 delete from public.chats where user_one=target or user_two=target;
 delete from public.chat_messages where sender_id=target;
 delete from public.favorites where user_id=target or favorite_user_id=target;
 delete from public.blocked_users where blocker_user_id=target or blocked_user_id=target;
 delete from public.reports where reporter_user_id=target or reported_user_id=target;
 delete from public.success_stories where husband_user_id=target or wife_user_id=target;
 delete from public.profile_views where viewer_user_id=target or viewed_user_id=target;
 delete from public.verification_requests where user_id=target;
 delete from public.compatibility_scores where user_one=target or user_two=target;
 delete from public.activity_logs where user_id=target or metadata->>'target_user_id'=target::text;
 delete from public.users where id=target;
end $$;
revoke all on function public.begin_member_erasure(uuid,uuid),public.erasure_storage_files(uuid),public.erase_member_records(uuid) from public,anon,authenticated;
grant execute on function public.begin_member_erasure(uuid,uuid),public.erasure_storage_files(uuid),public.erase_member_records(uuid) to service_role;
notify pgrst,'reload schema';
