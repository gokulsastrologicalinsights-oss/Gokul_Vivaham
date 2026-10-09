-- Keep the two-photo limit enforced for every insert path, not only the upload RPC.
create or replace function public.enforce_gallery_photo_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  photo_count integer;
begin
  select count(*) into photo_count
  from public.gallery_images
  where user_id = new.user_id;

  if photo_count >= 2 then
    raise exception 'Maximum two photos';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_gallery_photo_limit on public.gallery_images;
create trigger enforce_gallery_photo_limit
before insert on public.gallery_images
for each row execute function public.enforce_gallery_photo_limit();

revoke execute on function public.enforce_gallery_photo_limit() from public, anon, authenticated;
