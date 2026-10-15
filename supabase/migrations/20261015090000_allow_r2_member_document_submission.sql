create or replace function public.submit_member_document(actor uuid,kind text,path text,label text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare target uuid; rid uuid;
begin
 if kind not in ('id_proof','horoscope') or length(label)>100 then raise exception 'Invalid document'; end if;
 select id into target from public.users where auth_user_id=actor and status='active' and deleted_at is null;
 if target is null then raise exception 'Inactive member'; end if;
 perform 1 from public.profiles where user_id=target and not is_suspended and deleted_at is null for update;
 if not found then raise exception 'Inactive profile'; end if;
 -- Documents live in private Cloudflare R2 buckets. The application verifies
 -- object existence before invoking this service-role-only function.
 if split_part(path,'/',1)<>actor::text then raise exception 'Document not owned'; end if;
 if exists(select 1 from public.profiles where user_id=target and
  case when kind='id_proof' then id_verification_status else horoscope_verification_status end='approved') then raise exception 'Document already approved'; end if;
 select id into rid from public.verification_requests where user_id=target and verification_type=kind and status='pending' limit 1 for update;
 if rid is null then
  insert into public.verification_requests(user_id,verification_type,document_type,document_url,status) values(target,kind,label,path,'pending') returning id into rid;
 else update public.verification_requests set document_type=label,document_url=path,updated_at=now() where id=rid; end if;
 if kind='id_proof' then
  update public.profiles set id_verification_status='pending',id_verification_document_url=path,id_verification_type=label,id_verification_rejection_reason=null where user_id=target;
 else
  update public.profiles set horoscope_verification_status='pending',horoscope_verification_rejection_reason=null where user_id=target;
  delete from public.horoscope_uploads where user_id=target;
  insert into public.horoscope_uploads(user_id,file_url,file_name,file_type) values(target,path,'horoscope.pdf','application/pdf');
 end if;
 return rid;
end $$;

revoke execute on function public.submit_member_document(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_member_document(uuid,text,text,text) to service_role;
notify pgrst,'reload schema';
