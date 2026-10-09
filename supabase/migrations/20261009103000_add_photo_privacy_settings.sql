alter table public.profiles
  add column if not exists profile_photo_visibility text not null default 'all_members',
  add column if not exists album_photo_visibility text not null default 'all_members';

alter table public.profiles
  drop constraint if exists profiles_profile_photo_visibility_check,
  add constraint profiles_profile_photo_visibility_check
    check (profile_photo_visibility in ('all_members', 'liked_and_premium')),
  drop constraint if exists profiles_album_photo_visibility_check,
  add constraint profiles_album_photo_visibility_check
    check (album_photo_visibility in ('all_members', 'liked_and_premium'));

comment on column public.profiles.profile_photo_visibility is
  'Controls protected delivery of the primary profile photo.';
comment on column public.profiles.album_photo_visibility is
  'Controls protected delivery of non-primary album photos.';

notify pgrst, 'reload schema';
