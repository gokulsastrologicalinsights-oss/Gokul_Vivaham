-- Profile-photo versioning, durable replacement limits, and immutable moderation audit.
-- This migration keeps one gallery_images row per visible slot. Replacements are
-- stored as pending versions so a replacement never creates a third slot and the
-- previously approved image remains active until the review decision is made.

alter table public.profiles
  add column if not exists photo_replacement_count integer not null default 0;

alter table public.gallery_images
  add column if not exists rejection_reason text,
  add column if not exists crop_metadata jsonb not null default '{}'::jsonb,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid;

alter table public.profiles
  drop constraint if exists profiles_photo_replacement_count_check,
  add constraint profiles_photo_replacement_count_check
    check (photo_replacement_count >= 0 and photo_replacement_count <= 3);

create table if not exists public.gallery_photo_versions (
  id uuid primary key default gen_random_uuid(),
  gallery_image_id uuid not null references public.gallery_images(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  display_key text not null,
  thumbnail_key text not null,
  image_url text not null,
  thumbnail_url text not null,
  crop_metadata jsonb not null default '{}'::jsonb,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'flagged')),
  is_replacement boolean not null default true,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.admin_users(id),
  rejection_reason text,
  previous_display_key text,
  previous_thumbnail_key text,
  previous_image_url text,
  previous_thumbnail_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists gallery_photo_versions_pending_slot_uidx
  on public.gallery_photo_versions(gallery_image_id)
  where moderation_status = 'pending';
create index if not exists gallery_photo_versions_user_status_idx
  on public.gallery_photo_versions(user_id, moderation_status, submitted_at desc);

create table if not exists public.gallery_photo_review_audit (
  id uuid primary key default gen_random_uuid(),
  gallery_image_id uuid references public.gallery_images(id) on delete set null,
  version_id uuid references public.gallery_photo_versions(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action in ('submitted', 'approved', 'rejected', 'flagged')),
  moderation_status text not null check (moderation_status in ('pending', 'approved', 'rejected', 'flagged')),
  administrator_id uuid references public.admin_users(id),
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index if not exists gallery_photo_review_audit_user_idx
  on public.gallery_photo_review_audit(user_id, created_at desc);
create index if not exists gallery_photo_review_audit_photo_idx
  on public.gallery_photo_review_audit(gallery_image_id, created_at desc);

alter table public.gallery_photo_versions enable row level security;
alter table public.gallery_photo_review_audit enable row level security;

drop policy if exists gallery_photo_versions_owner_read on public.gallery_photo_versions;
create policy gallery_photo_versions_owner_read
  on public.gallery_photo_versions for select to authenticated
  using (
    user_id = (select u.id from public.users u where u.auth_user_id = (select auth.uid()))
    or (select private.admin_verified())
  );

drop policy if exists gallery_photo_review_audit_admin_read on public.gallery_photo_review_audit;
create policy gallery_photo_review_audit_admin_read
  on public.gallery_photo_review_audit for select to authenticated
  using ((select private.admin_verified()));

revoke all on public.gallery_photo_versions, public.gallery_photo_review_audit from anon, authenticated;
grant select on public.gallery_photo_versions to authenticated;
grant select on public.gallery_photo_review_audit to authenticated;
grant all on public.gallery_photo_versions, public.gallery_photo_review_audit to service_role;

-- Members must never be able to promote a profile image or edit the durable
-- replacement counter directly. Only the server-side review/slot functions can.
create or replace function public.guard_member_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not private.admin_verified() then
    if TG_OP = 'INSERT' then
      if new.is_verified or new.is_premium or new.is_suspended
         or new.moderation_status <> 'pending'
         or coalesce(new.photo_replacement_count, 0) <> 0
         or new.image_url is not null then
        raise exception 'Protected profile fields' using errcode = '42501';
      end if;
    elsif new.is_verified is distinct from old.is_verified
      or new.is_premium is distinct from old.is_premium
      or new.is_suspended is distinct from old.is_suspended
      or new.moderation_status is distinct from old.moderation_status
      or new.moderated_by is distinct from old.moderated_by
      or new.user_id is distinct from old.user_id
      or new.photo_replacement_count is distinct from old.photo_replacement_count
      or new.image_url is distinct from old.image_url
      or (new.id_verification_status is distinct from old.id_verification_status
          and new.id_verification_status not in ('unverified', 'pending'))
      or (new.horoscope_verification_status is distinct from old.horoscope_verification_status
          and new.horoscope_verification_status not in ('unverified', 'pending')) then
      raise exception 'Protected profile fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_member_profile_fields() from public, anon, authenticated;

-- Members can change privacy/order, but cannot alter media or review fields.
create or replace function public.guard_gallery_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not private.admin_verified() then
    if TG_OP = 'INSERT' then
      if new.moderation_status is distinct from 'pending'
         or new.moderated_by is not null
         or new.moderated_at is not null
         or new.rejection_reason is not null then
        raise exception 'Protected photo review' using errcode = '42501';
      end if;
    elsif new.user_id is distinct from old.user_id
      or new.image_url is distinct from old.image_url
      or new.thumbnail_url is distinct from old.thumbnail_url
      or new.thumbnail_key is distinct from old.thumbnail_key
      or new.display_key is distinct from old.display_key
      or new.crop_metadata is distinct from old.crop_metadata
      or new.moderation_status is distinct from old.moderation_status
      or new.moderated_by is distinct from old.moderated_by
      or new.moderated_at is distinct from old.moderated_at
      or new.rejection_reason is distinct from old.rejection_reason
      or new.is_profile_picture is distinct from old.is_profile_picture then
      raise exception 'Protected photo review' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_gallery_review() from public, anon, authenticated;

create or replace function public.enforce_gallery_photo_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
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
  select count(*) into photo_count from public.gallery_images
  where user_id = new.user_id and deleted_at is null;
  if photo_count >= 2 then
    raise exception 'Maximum two photos. Delete an existing photo before uploading another.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_gallery_photo_limit on public.gallery_images;
create trigger enforce_gallery_photo_limit
before insert or update of user_id on public.gallery_images
for each row execute function public.enforce_gallery_photo_limit();
revoke execute on function public.enforce_gallery_photo_limit() from public, anon, authenticated;

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
  replacement_count integer;
  had_deleted_photo boolean;
begin
  select id into target
  from public.users
  where auth_user_id = actor and status = 'active' and deleted_at is null;
  if target is null then raise exception 'Inactive member'; end if;

  perform 1 from public.profiles
  where user_id = target and not is_suspended and deleted_at is null
  for update;
  if not found then raise exception 'Inactive profile'; end if;

  select exists(
    select 1 from public.gallery_images
    where user_id = target and deleted_at is not null
  ) into had_deleted_photo;
  if had_deleted_photo then
    select photo_replacement_count into replacement_count from public.profiles where user_id = target;
    if replacement_count >= 3 then raise exception 'You have reached the maximum of 3 photo changes'; end if;
  end if;

  if split_part(display_path, '/', 1) <> actor::text
     or split_part(thumbnail_path, '/', 1) <> actor::text
     or split_part(display_path, '/', 2) <> split_part(thumbnail_path, '/', 2)
     or display_path !~ ('^' || actor::text || '/[0-9a-f-]{36}/display\.webp$')
     or thumbnail_path !~ ('^' || actor::text || '/[0-9a-f-]{36}/thumbnail\.webp$') then
    raise exception 'Invalid photo variant keys';
  end if;

  select * into result from public.gallery_images
  where user_id = target and display_key = display_path and deleted_at is null;
  if result.id is not null then return result; end if;

  select count(*) into photo_count from public.gallery_images where user_id = target and deleted_at is null;
  if photo_count >= 2 then raise exception 'Maximum two photos'; end if;

  if primary_photo or photo_count = 0 then
    update public.gallery_images set is_profile_picture = false where user_id = target;
  end if;

  insert into public.gallery_images(
    user_id, image_url, thumbnail_url, thumbnail_key, display_key,
    is_profile_picture, is_private, privacy_level, sort_order,
    moderation_status, rejection_reason, crop_metadata
  ) values (
    target, '/api/photos?path=' || display_path, '/api/photos?path=' || thumbnail_path,
    thumbnail_path, display_path, primary_photo or photo_count = 0, false, 'public',
    photo_count, 'pending', null, '{}'::jsonb
  ) returning * into result;

  insert into public.gallery_photo_review_audit(
    gallery_image_id, user_id, action, moderation_status
  ) values (result.id, target, 'submitted', 'pending');

  -- Re-uploading into a slot freed by deletion is a replacement and cannot
  -- be used to bypass the durable three-change allowance.
  if had_deleted_photo then
    update public.profiles
    set photo_replacement_count = photo_replacement_count + 1
    where user_id = target;
  end if;

  -- Do not update profiles.image_url until an administrator approves this row.
  return result;
end;
$$;
revoke execute on function public.attach_member_photo(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.attach_member_photo(uuid, text, text, boolean) to service_role;

create or replace function public.replace_member_photo(
  actor uuid,
  photo_id uuid,
  display_path text,
  thumbnail_path text,
  crop jsonb default '{}'::jsonb
) returns public.gallery_photo_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target uuid;
  photo public.gallery_images;
  result public.gallery_photo_versions;
  replacement_count integer;
begin
  select id into target from public.users
  where auth_user_id = actor and status = 'active' and deleted_at is null;
  if target is null then raise exception 'Inactive member'; end if;

  perform 1 from public.profiles
  where user_id = target and not is_suspended and deleted_at is null
  for update;
  if not found then raise exception 'Inactive profile'; end if;

  select * into photo from public.gallery_images
  where id = photo_id and user_id = target and deleted_at is null
  for update;
  if photo.id is null then raise exception 'Photo not found'; end if;
  if photo.moderation_status = 'pending' then
    raise exception 'Wait for the current photo review before changing this photo';
  end if;

  select * into result from public.gallery_photo_versions
  where gallery_image_id = photo_id and display_key = display_path;
  if result.id is not null then return result; end if;

  select photo_replacement_count into replacement_count
  from public.profiles where user_id = target;
  if replacement_count >= 3 then raise exception 'You have reached the maximum of 3 photo changes'; end if;

  if split_part(display_path, '/', 1) <> actor::text
     or split_part(thumbnail_path, '/', 1) <> actor::text
     or split_part(display_path, '/', 2) <> split_part(thumbnail_path, '/', 2)
     or display_path !~ ('^' || actor::text || '/[0-9a-f-]{36}/display\.webp$')
     or thumbnail_path !~ ('^' || actor::text || '/[0-9a-f-]{36}/thumbnail\.webp$') then
    raise exception 'Invalid photo variant keys';
  end if;

  insert into public.gallery_photo_versions(
    gallery_image_id, user_id, display_key, thumbnail_key, image_url,
    thumbnail_url, crop_metadata, moderation_status, is_replacement,
    previous_display_key, previous_thumbnail_key, previous_image_url, previous_thumbnail_url
  ) values (
    photo_id, target, display_path, thumbnail_path,
    '/api/photos?path=' || display_path, '/api/photos?path=' || thumbnail_path,
    coalesce(crop, '{}'::jsonb), 'pending', true,
    photo.display_key, photo.thumbnail_key, photo.image_url, photo.thumbnail_url
  ) returning * into result;

  update public.profiles
  set photo_replacement_count = photo_replacement_count + 1
  where user_id = target;

  insert into public.gallery_photo_review_audit(
    gallery_image_id, version_id, user_id, action, moderation_status
  ) values (photo_id, result.id, target, 'submitted', 'pending');

  return result;
end;
$$;
revoke execute on function public.replace_member_photo(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_member_photo(uuid, uuid, text, text, jsonb) to service_role;

create or replace function public.set_member_primary_photo(actor uuid, photo_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare target uuid; chosen public.gallery_images;
begin
  select id into target from public.users where auth_user_id = actor and status = 'active' and deleted_at is null;
  select * into chosen from public.gallery_images where id = photo_id and user_id = target and deleted_at is null for update;
  if chosen.id is null or chosen.moderation_status <> 'approved' then
    raise exception 'Only an approved photo can be selected as primary';
  end if;
  update public.gallery_images set is_profile_picture = false where user_id = target;
  update public.gallery_images set is_profile_picture = true where id = photo_id;
  update public.profiles set image_url = chosen.thumbnail_url where user_id = target;
end;
$$;
revoke execute on function public.set_member_primary_photo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_member_primary_photo(uuid, uuid) to service_role;

create or replace function public.delete_member_photo(actor uuid, photo_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target uuid;
  photo public.gallery_images;
  next_photo public.gallery_images;
begin
  select id into target from public.users where auth_user_id = actor and status = 'active' and deleted_at is null;
  if target is null then raise exception 'Inactive member'; end if;
  perform 1 from public.profiles where user_id = target for update;
  select * into photo from public.gallery_images where id = photo_id and user_id = target and deleted_at is null for update;
  if photo.id is null then raise exception 'Photo not found'; end if;

  update public.gallery_photo_versions
  set moderation_status = 'rejected', reviewed_at = now(), rejection_reason = 'Photo deleted by member'
  where gallery_image_id = photo_id and moderation_status = 'pending';

  update public.gallery_images
  set deleted_at = now(), deleted_by = target, is_profile_picture = false,
      moderation_status = case when moderation_status = 'approved' then 'approved' else moderation_status end,
      rejection_reason = 'Photo deleted by member'
  where id = photo_id;

  if photo.is_profile_picture then
    select * into next_photo from public.gallery_images
    where user_id = target and deleted_at is null and moderation_status = 'approved'
    order by sort_order, uploaded_at limit 1;
    if next_photo.id is null then
      update public.profiles set image_url = null where user_id = target;
    else
      update public.gallery_images set is_profile_picture = true where id = next_photo.id;
      update public.profiles set image_url = next_photo.thumbnail_url where user_id = target;
    end if;
  end if;
end;
$$;
revoke execute on function public.delete_member_photo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_member_photo(uuid, uuid) to service_role;

drop function if exists public.review_member_photo(uuid, uuid, text);
create or replace function public.review_member_photo(
  actor uuid,
  photo_id uuid,
  decision text,
  reason text default null
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  aid uuid;
  photo public.gallery_images;
  version public.gallery_photo_versions;
  has_version boolean := false;
  final_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  select id into aid from public.admin_users
  where auth_user_id = actor and role in ('admin', 'super_admin', 'moderator');
  if aid is null then raise exception 'Administrator required'; end if;
  if decision not in ('approved', 'rejected', 'flagged') then raise exception 'Invalid decision'; end if;

  select * into photo from public.gallery_images where id = photo_id and deleted_at is null for update;
  if photo.id is null then raise exception 'Photo not found'; end if;

  select * into version from public.gallery_photo_versions
  where gallery_image_id = photo_id and moderation_status = 'pending'
  for update;
  has_version := version.id is not null;

  if has_version then
    update public.gallery_photo_versions
    set moderation_status = decision,
        reviewed_by = aid,
        reviewed_at = now(),
        rejection_reason = case when decision in ('rejected', 'flagged') then final_reason else null end
    where id = version.id;

    if decision = 'approved' then
      update public.gallery_images
      set image_url = version.image_url,
          thumbnail_url = version.thumbnail_url,
          display_key = version.display_key,
          thumbnail_key = version.thumbnail_key,
          crop_metadata = version.crop_metadata,
          moderation_status = 'approved',
          moderated_by = aid,
          moderated_at = now(),
          rejection_reason = null
      where id = photo_id;
      if photo.is_profile_picture then
        update public.profiles set image_url = version.thumbnail_url where user_id = photo.user_id;
      end if;
    end if;

    insert into public.gallery_photo_review_audit(
      gallery_image_id, version_id, user_id, action, moderation_status,
      administrator_id, rejection_reason
    ) values (
      photo_id, version.id, photo.user_id, decision, decision, aid,
      case when decision in ('rejected', 'flagged') then final_reason else null end
    );
  else
    if photo.moderation_status <> 'pending' then raise exception 'Photo is not awaiting review'; end if;
    update public.gallery_images
    set moderation_status = decision,
        moderated_by = aid,
        moderated_at = now(),
        rejection_reason = case when decision in ('rejected', 'flagged') then final_reason else null end
    where id = photo_id;
    if decision = 'approved' and photo.is_profile_picture then
      update public.profiles set image_url = photo.thumbnail_url where user_id = photo.user_id;
    elsif decision in ('rejected', 'flagged') and photo.is_profile_picture then
      update public.profiles set image_url = null
      where user_id = photo.user_id and image_url in (photo.image_url, photo.thumbnail_url);
    end if;

    insert into public.gallery_photo_review_audit(
      gallery_image_id, user_id, action, moderation_status,
      administrator_id, rejection_reason
    ) values (
      photo_id, photo.user_id, decision, decision, aid,
      case when decision in ('rejected', 'flagged') then final_reason else null end
    );
  end if;

  insert into public.notifications(user_id, title, message, type, is_read)
  values (
    photo.user_id,
    'Photo review completed',
    case when decision = 'approved' then 'Your photo has been approved and is now eligible to be shown according to your privacy settings.'
         else 'Your photo was not approved.' || case when final_reason is not null then ' Reason: ' || final_reason else '' end end,
    'photo_review', false
  );
end;
$$;
revoke execute on function public.review_member_photo(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_member_photo(uuid, uuid, text, text) to service_role;

-- Repair profile pointers left by older code that wrote pending photo URLs.
update public.profiles p
set image_url = (
  select coalesce(g.thumbnail_url, g.image_url)
  from public.gallery_images g
  where g.user_id = p.user_id
    and g.is_profile_picture
    and g.moderation_status = 'approved'
    and g.deleted_at is null
  order by g.uploaded_at desc
  limit 1
)
where exists (
  select 1 from public.gallery_images g
  where g.user_id = p.user_id and g.is_profile_picture and g.moderation_status = 'approved' and g.deleted_at is null
);

drop policy if exists gallery_owner_delete on public.gallery_images;
drop policy if exists gallery_approved_public on public.gallery_images;
create policy gallery_approved_public on public.gallery_images
  for select to authenticated
  using (
    moderation_status = 'approved' and deleted_at is null and privacy_level = 'public' and not is_private
    and exists (
      select 1 from public.profiles p
      where p.user_id = gallery_images.user_id
        and p.visibility = 'public' and not p.is_suspended and p.deleted_at is null
    )
  );

update public.profiles p
set image_url = null
where not exists (
  select 1 from public.gallery_images g
  where g.user_id = p.user_id and g.is_profile_picture and g.moderation_status = 'approved'
);

notify pgrst, 'reload schema';
