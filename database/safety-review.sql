create or replace function public.review_safety_report(actor uuid,report_key uuid,decision text,note text) returns void language plpgsql security invoker set search_path='' as $$
declare aid uuid; report public.reports;
begin
 select id into aid from public.admin_users where auth_user_id=actor and role in ('admin','super_admin','moderator');
 if aid is null then raise exception 'Administrator required'; end if;
 if decision not in ('warn','suspend','ban','dismiss') or length(coalesce(note,''))<3 then raise exception 'Decision and notes required'; end if;
 select * into report from public.reports where id=report_key for update;
 if report.id is null or report.status<>'pending' then raise exception 'Pending report required'; end if;
 if exists(select 1 from public.users u join public.admin_users a on a.auth_user_id=u.auth_user_id where u.id=report.reported_user_id) and decision<>'dismiss' then raise exception 'Administrator account protected'; end if;
 if decision='warn' then
  update public.profiles set warning_count=coalesce(warning_count,0)+1,warning_notes=note where user_id=report.reported_user_id;
 elsif decision in ('suspend','ban') then
  update public.users set status='suspended' where id=report.reported_user_id;
  update public.profiles set is_suspended=true,suspended_at=now(),is_banned=(decision='ban'),banned_at=case when decision='ban' then now() else banned_at end where user_id=report.reported_user_id;
 end if;
 update public.reports set status='reviewed',action_taken=case decision when 'warn' then 'warned' when 'suspend' then 'suspended' when 'ban' then 'banned' else 'none' end,moderator_notes=note,reviewed_by=aid,reviewed_at=now() where id=report_key;
 insert into public.activity_logs(action,metadata) values('ADMIN_SAFETY_REVIEW',jsonb_build_object('actor',actor,'report_id',report_key,'target_user_id',report.reported_user_id,'decision',decision,'notes',note));
 if decision<>'dismiss' then insert into public.notifications(user_id,title,message,type,is_read) values(report.reported_user_id,'Safety review: '||decision,note,'safety_'||decision,false); end if;
end $$;
revoke all on function public.review_safety_report(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_safety_report(uuid,uuid,text,text) to service_role;
notify pgrst,'reload schema';
