insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('photos','photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy owned_photo_upload on storage.objects for insert to authenticated with check(bucket_id='photos' and private.member_session_active() and (storage.foldername(name))[1]=auth.uid()::text);
create policy owned_photo_read on storage.objects for select to authenticated using(bucket_id='photos' and private.member_session_active() and ((storage.foldername(name))[1]=auth.uid()::text or private.admin_verified()));
create policy owned_photo_delete on storage.objects for delete to authenticated using(bucket_id='photos' and private.member_session_active() and (storage.foldername(name))[1]=auth.uid()::text);
create or replace function public.attach_member_photo(actor uuid,path text,primary_photo boolean) returns public.gallery_images
language plpgsql security invoker set search_path='' as $$
declare target uuid; result public.gallery_images; n integer; url text;
begin
 select id into target from public.users where auth_user_id=actor and status='active' and deleted_at is null;
 if target is null then raise exception 'Inactive member'; end if;
 perform 1 from public.profiles where user_id=target and not is_suspended and deleted_at is null for update;
 if not found then raise exception 'Inactive profile'; end if;
 if split_part(path,'/',1)<>actor::text or not exists(select 1 from storage.objects where bucket_id='photos' and name=path) then raise exception 'Photo not owned'; end if;
 url:='/api/photos?path='||path;
 select * into result from public.gallery_images where user_id=target and image_url=url;
 if result.id is not null then return result; end if;
 select count(*) into n from public.gallery_images where user_id=target;
 if n>=3 then raise exception 'Maximum three photos'; end if;
 if primary_photo or n=0 then update public.gallery_images set is_profile_picture=false where user_id=target; end if;
 insert into public.gallery_images(user_id,image_url,is_profile_picture,is_private,privacy_level,sort_order,moderation_status)
 values(target,url,primary_photo or n=0,false,'public',n,'pending') returning * into result;
 if result.is_profile_picture then update public.profiles set image_url=url where user_id=target; end if;
 return result;
end $$;
revoke execute on function public.attach_member_photo(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.attach_member_photo(uuid,text,boolean) to service_role;
create or replace function public.guard_gallery_review() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('anon','authenticated') and not private.admin_verified() then
  if TG_OP='INSERT' then
   if new.moderation_status is distinct from 'pending' or new.moderated_by is not null or new.moderated_at is not null then raise exception 'Protected photo review'; end if;
  elsif new.user_id is distinct from old.user_id or new.image_url is distinct from old.image_url or new.moderation_status is distinct from old.moderation_status or new.moderated_by is distinct from old.moderated_by or new.moderated_at is distinct from old.moderated_at then raise exception 'Protected photo review'; end if;
 end if;
 return new;
end $$;
create trigger guard_gallery_review before insert or update on public.gallery_images for each row execute function public.guard_gallery_review();
revoke execute on function public.guard_gallery_review() from public,anon,authenticated;
notify pgrst,'reload schema';
