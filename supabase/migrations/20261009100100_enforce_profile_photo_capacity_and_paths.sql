-- Serialise all gallery inserts using the same profile lock as the upload RPC.
create or replace function public.enforce_gallery_photo_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare photo_count integer;
begin
  if TG_OP = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'Photo ownership cannot be changed' using errcode = '23514';
    end if;
    return new;
  end if;
  perform 1 from public.profiles where user_id = new.user_id for update;
  if not found then raise exception 'Profile unavailable'; end if;
  select count(*) into photo_count from public.gallery_images where user_id = new.user_id;
  if photo_count >= 2 then
    raise exception 'Maximum two photos. Delete an existing photo before uploading another.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_gallery_photo_limit on public.gallery_images;
create trigger enforce_gallery_photo_limit before insert or update of user_id on public.gallery_images
for each row execute function public.enforce_gallery_photo_limit();
revoke execute on function public.enforce_gallery_photo_limit() from public, anon, authenticated;

-- Restore the correct single-backslash regex for valid WebP upload paths.
create or replace function public.attach_member_photo(
  actor uuid,
  display_path text,
  thumbnail_path text,
  primary_photo boolean
) returns public.gallery_images
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target uuid;
  result public.gallery_images;
  photo_count integer;
begin
  select id into target
  from public.users
  where auth_user_id = actor
    and status = 'active'
    and deleted_at is null;

  if target is null then raise exception 'Inactive member'; end if;

  -- Serialise the count check per profile so concurrent uploads cannot exceed two.
  perform 1
  from public.profiles
  where user_id = target
    and not is_suspended
    and deleted_at is null
  for update;

  if not found then raise exception 'Inactive profile'; end if;

  if split_part(display_path, '/', 1) <> actor::text
     or split_part(thumbnail_path, '/', 1) <> actor::text
     or split_part(display_path, '/', 2) <> split_part(thumbnail_path, '/', 2)
     or display_path !~ ('^' || actor::text || '/[0-9a-f-]{36}/display\.webp$')
     or thumbnail_path !~ ('^' || actor::text || '/[0-9a-f-]{36}/thumbnail\.webp$') then
    raise exception 'Invalid photo variant keys';
  end if;

  select * into result
  from public.gallery_images
  where user_id = target and display_key = display_path;

  if result.id is not null then return result; end if;

  select count(*) into photo_count
  from public.gallery_images
  where user_id = target;

  if photo_count >= 2 then raise exception 'Maximum two photos'; end if;

  if primary_photo or photo_count = 0 then
    update public.gallery_images
    set is_profile_picture = false
    where user_id = target;
  end if;

  insert into public.gallery_images(
    user_id,
    image_url,
    thumbnail_url,
    thumbnail_key,
    display_key,
    is_profile_picture,
    is_private,
    privacy_level,
    sort_order,
    moderation_status
  ) values (
    target,
    '/api/photos?path=' || display_path,
    '/api/photos?path=' || thumbnail_path,
    thumbnail_path,
    display_path,
    primary_photo or photo_count = 0,
    false,
    'public',
    photo_count,
    'pending'
  ) returning * into result;

  if result.is_profile_picture then
    update public.profiles
    set image_url = '/api/photos?path=' || thumbnail_path
    where user_id = target;
  end if;

  return result;
end;
$$;

revoke execute on function public.attach_member_photo(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.attach_member_photo(uuid, text, text, boolean) to service_role;
drop function if exists public.attach_member_photo(uuid, text, boolean);


notify pgrst, 'reload schema';
