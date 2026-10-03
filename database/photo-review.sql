create policy gallery_verified_admin on public.gallery_images for all to authenticated using(private.admin_verified()) with check(private.admin_verified());
create policy gallery_approved_public on public.gallery_images for select to authenticated using(
 moderation_status='approved' and privacy_level='public' and not is_private and exists(select 1 from public.profiles p where p.user_id=gallery_images.user_id and p.visibility='public' and not p.is_suspended and p.deleted_at is null));
create or replace function public.review_member_photo(actor uuid,photo_id uuid,decision text) returns void
language plpgsql security invoker set search_path='' as $$
declare aid uuid; photo public.gallery_images;
begin
 select id into aid from public.admin_users where auth_user_id=actor and role in ('admin','super_admin','moderator');
 if aid is null then raise exception 'Administrator required'; end if;
 if decision not in ('approved','rejected','flagged') then raise exception 'Invalid decision'; end if;
 select * into photo from public.gallery_images where id=photo_id for update;
 if photo.id is null then raise exception 'Photo not found'; end if;
 update public.gallery_images set moderation_status=decision,moderated_by=aid,moderated_at=now() where id=photo_id;
 insert into public.activity_logs(action,metadata) values('ADMIN_REVIEW_PHOTO',jsonb_build_object('target_user_id',photo.user_id,'photo_id',photo_id,'actor',actor,'decision',decision));
 insert into public.notifications(user_id,title,message,type,is_read) values(photo.user_id,'Photo review completed','Your photo review status is '||decision||'.','photo_review',false);
end $$;
revoke execute on function public.review_member_photo(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.review_member_photo(uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
