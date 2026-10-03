insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('id-proofs','id-proofs',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']),
('horoscopes','horoscopes',false,5242880,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy member_documents_insert on storage.objects for insert to authenticated with check(
 bucket_id in ('id-proofs','horoscopes') and private.member_session_active() and (storage.foldername(name))[1]=auth.uid()::text);
create policy member_documents_read on storage.objects for select to authenticated using(
 bucket_id in ('id-proofs','horoscopes') and private.member_session_active() and ((storage.foldername(name))[1]=auth.uid()::text or private.admin_verified()));
-- Submitted documents remain available for review; members may remove only unsubmitted uploads.
create policy member_documents_delete on storage.objects for delete to authenticated using(
 bucket_id in ('id-proofs','horoscopes') and private.member_session_active() and (storage.foldername(name))[1]=auth.uid()::text
 and not exists(select 1 from public.verification_requests v where v.document_url=name));
alter table public.verification_requests add column if not exists rejection_reason text;
revoke insert,update,delete on public.verification_requests from authenticated;
create or replace function public.submit_member_document(actor uuid,kind text,path text,label text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare target uuid; rid uuid; bucket text;
begin
 if kind not in ('id_proof','horoscope') or length(label)>100 then raise exception 'Invalid document'; end if;
 select id into target from public.users where auth_user_id=actor and status='active' and deleted_at is null;
 if target is null then raise exception 'Inactive member'; end if;
 perform 1 from public.profiles where user_id=target and not is_suspended and deleted_at is null for update;
 if not found then raise exception 'Inactive profile'; end if;
 bucket:=case when kind='id_proof' then 'id-proofs' else 'horoscopes' end;
 if split_part(path,'/',1)<>actor::text or not exists(select 1 from storage.objects where bucket_id=bucket and name=path) then raise exception 'Document not owned or missing'; end if;
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
create or replace function public.review_member_document(actor uuid,request_id uuid,decision text,reason text) returns void
language plpgsql security invoker set search_path='' as $$
declare aid uuid; req public.verification_requests;
begin
 select id into aid from public.admin_users where auth_user_id=actor and role in ('admin','super_admin','moderator');
 if aid is null then raise exception 'Administrator required'; end if;
 if decision not in ('approved','rejected','resubmit_requested') or length(coalesce(reason,''))>2000 or (decision<>'approved' and length(trim(coalesce(reason,'')))=0) then raise exception 'Invalid decision or missing reason'; end if;
 select * into req from public.verification_requests where id=request_id for update;
 if req.id is null or req.status<>'pending' then raise exception 'Request no longer pending'; end if;
 update public.verification_requests set status=decision,rejection_reason=reason,reviewed_by=aid,reviewed_at=now(),updated_at=now() where id=request_id;
 if req.verification_type='id_proof' then
  update public.profiles set id_verification_status=decision,id_verification_rejection_reason=reason,is_verified=(decision='approved') where user_id=req.user_id;
 else update public.profiles set horoscope_verification_status=decision,horoscope_verification_rejection_reason=reason where user_id=req.user_id; end if;
 insert into public.notifications(user_id,title,message,type,is_read) values(req.user_id,'Document review completed',case when decision='approved' then 'Your document has been approved.' else coalesce(reason,'Please upload a new document.') end,'verification_'||req.verification_type||'_'||decision,false);
 insert into public.activity_logs(action,metadata) values('ADMIN_REVIEW_DOCUMENT',jsonb_build_object('request_id',request_id,'target_user_id',req.user_id,'actor',actor,'decision',decision));
end $$;
revoke execute on function public.submit_member_document(uuid,text,text,text),public.review_member_document(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.submit_member_document(uuid,text,text,text),public.review_member_document(uuid,uuid,text,text) to service_role;
notify pgrst,'reload schema';
