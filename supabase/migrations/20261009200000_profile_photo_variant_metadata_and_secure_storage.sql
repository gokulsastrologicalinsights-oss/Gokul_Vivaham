-- Store the exact metadata produced by the server-side photo pipeline.
-- The object keys remain the source of truth for retrieval; URLs are only
-- stable application routes and are never permanent storage URLs.

alter table public.gallery_images
  add column if not exists image_format text,
  add column if not exists thumbnail_width integer,
  add column if not exists thumbnail_height integer,
  add column if not exists thumbnail_bytes integer,
  add column if not exists display_width integer,
  add column if not exists display_height integer,
  add column if not exists display_bytes integer;

alter table public.gallery_photo_versions
  add column if not exists image_format text,
  add column if not exists thumbnail_width integer,
  add column if not exists thumbnail_height integer,
  add column if not exists thumbnail_bytes integer,
  add column if not exists display_width integer,
  add column if not exists display_height integer,
  add column if not exists display_bytes integer;

alter table public.gallery_images
  drop constraint if exists gallery_images_image_format_check,
  add constraint gallery_images_image_format_check
    check (image_format is null or image_format in ('webp', 'jpeg', 'avif')),
  drop constraint if exists gallery_images_variant_dimensions_check,
  add constraint gallery_images_variant_dimensions_check
    check (
      (thumbnail_width is null and thumbnail_height is null and thumbnail_bytes is null
       and display_width is null and display_height is null and display_bytes is null)
      or (thumbnail_width between 1 and 256 and thumbnail_height between 1 and 256
          and thumbnail_bytes between 1 and 512000
          and display_width between 1 and 1200 and display_height between 1 and 1200
          and display_bytes between 1 and 5242880)
    );

alter table public.gallery_photo_versions
  drop constraint if exists gallery_photo_versions_image_format_check,
  add constraint gallery_photo_versions_image_format_check
    check (image_format is null or image_format in ('webp', 'jpeg', 'avif')),
  drop constraint if exists gallery_photo_versions_variant_dimensions_check,
  add constraint gallery_photo_versions_variant_dimensions_check
    check (
      (thumbnail_width is null and thumbnail_height is null and thumbnail_bytes is null
       and display_width is null and display_height is null and display_bytes is null)
      or (thumbnail_width between 1 and 256 and thumbnail_height between 1 and 256
          and thumbnail_bytes between 1 and 512000
          and display_width between 1 and 1200 and display_height between 1 and 1200
          and display_bytes between 1 and 5242880)
    );

create index if not exists gallery_images_user_active_order_idx
  on public.gallery_images(user_id, deleted_at, sort_order, uploaded_at);
create index if not exists gallery_photo_versions_photo_status_idx
  on public.gallery_photo_versions(gallery_image_id, moderation_status, submitted_at desc);

-- Supabase Storage is retained only for legacy compatibility. Profile photo
-- bytes are written to the private Cloudflare R2 bucket configured by the app.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;
update storage.buckets set public = false where id = 'galleries';
drop policy if exists "Public Access" on storage.objects;

comment on column public.gallery_images.display_key is
  'Exact private R2 object key for the approved display-size WebP variant.';
comment on column public.gallery_images.thumbnail_key is
  'Exact private R2 object key for the approved thumbnail WebP variant.';
comment on column public.gallery_images.display_bytes is
  'Byte size of the server-generated display-size variant.';
comment on column public.gallery_images.thumbnail_bytes is
  'Byte size of the server-generated thumbnail variant.';

notify pgrst, 'reload schema';
