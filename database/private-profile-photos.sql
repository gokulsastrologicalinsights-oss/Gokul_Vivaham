insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('photos','photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
alter table public.gallery_images add column if not exists thumbnail_key text, add column if not exists display_key text, add column if not exists thumbnail_url text;
create unique index if not exists gallery_images_display_key_uidx on public.gallery_images(display_key) where display_key is not null;
create unique index if not exists gallery_images_thumbnail_key_uidx on public.gallery_images(thumbnail_key) where thumbnail_key is not null;
create policy owned_photo_upload on storage.objects for insert to authenticated with check(bucket_id='photos' and private.member_session_active() and (storage.foldername(name))[1]=auth.uid()::text);
create policy owned_photo_read on storage.objects for select to authenticated using(bucket_id='photos' and private.member_session_active() and ((storage.foldername(name))[1]=auth.uid()::text or private.admin_verified()));
create policy owned_photo_delete on storage.objects for delete to authenticated using(bucket_id='photos' and private.member_session_active() and (storage.foldername(name))[1]=auth.uid()::text);
create or replace function public.attach_member_photo(actor uuid,display_path text,thumbnail_path text,primary_photo boolean) returns public.gallery_images
language plpgsql security invoker set search_path='' as $$
declare target uuid; result public.gallery_images; n integer;
begin
 select id into target from public.users where auth_user_id=actor and status='active' and deleted_at is null;
 if target is null then raise exception 'Inactive member'; end if;
 perform 1 from public.profiles where user_id=target and not is_suspended and deleted_at is null for update;
 if not found then raise exception 'Inactive profile'; end if;
 if split_part(display_path,'/',1)<>actor::text or split_part(thumbnail_path,'/',1)<>actor::text or split_part(display_path,'/',2)<>split_part(thumbnail_path,'/',2) or display_path !~ ('^'||actor::text||'/[0-9a-f-]{36}/display\.webp$') or thumbnail_path !~ ('^'||actor::text||'/[0-9a-f-]{36}/thumbnail\.webp$') then raise exception 'Invalid photo variant keys'; end if;
 select * into result from public.gallery_images where user_id=target and display_key=display_path;
 if result.id is not null then return result; end if;
 select count(*) into n from public.gallery_images where user_id=target;
 if n>=2 then raise exception 'Maximum two photos'; end if;
 if primary_photo or n=0 then update public.gallery_images set is_profile_picture=false where user_id=target; end if;
 insert into public.gallery_images(user_id,image_url,thumbnail_url,thumbnail_key,display_key,is_profile_picture,is_private,privacy_level,sort_order,moderation_status)
 values(target,'/api/photos?path='||display_path,'/api/photos?path='||thumbnail_path,thumbnail_path,display_path,primary_photo or n=0,false,'public',n,'pending') returning * into result;
 if result.is_profile_picture then update public.profiles set image_url='/api/photos?path='||thumbnail_path where user_id=target; end if;
 return result;
end $$;
revoke execute on function public.attach_member_photo(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.attach_member_photo(uuid,text,text,boolean) to service_role;
drop function if exists public.attach_member_photo(uuid,text,boolean);
create or replace function public.guard_gallery_review() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('anon','authenticated') and not private.admin_verified() then
  if TG_OP='INSERT' then
   if new.moderation_status is distinct from 'pending' or new.moderated_by is not null or new.moderated_at is not null then raise exception 'Protected photo review'; end if;
  elsif new.user_id is distinct from old.user_id or new.image_url is distinct from old.image_url or new.thumbnail_url is distinct from old.thumbnail_url or new.thumbnail_key is distinct from old.thumbnail_key or new.display_key is distinct from old.display_key or new.moderation_status is distinct from old.moderation_status or new.moderated_by is distinct from old.moderated_by or new.moderated_at is distinct from old.moderated_at then raise exception 'Protected photo review'; end if;
 end if;
 return new;
end $$;
create trigger guard_gallery_review before insert or update on public.gallery_images for each row execute function public.guard_gallery_review();
revoke execute on function public.guard_gallery_review() from public,anon,authenticated;
notify pgrst,'reload schema';
