begin;
set local statement_timeout = '15s';
do $test$
declare
  actor uuid := gen_random_uuid();
  prefix text;
  first_photo public.gallery_images;
  second_photo public.gallery_images;
  replacement public.gallery_images;
  replacement_version public.gallery_photo_versions;
  i integer;
  blocked boolean;
begin
  insert into auth.users(id, email, raw_user_meta_data)
    values (actor, 'photo-cap-' || actor || '@example.invalid', '{"full_name":"Photo Limit Test","gender":"Male"}'::jsonb);
  prefix := actor::text || '/' || gen_random_uuid()::text;
  first_photo := public.attach_member_photo(actor,prefix || '/display.webp',prefix || '/thumbnail.webp',true);
  prefix := actor::text || '/' || gen_random_uuid()::text;
  second_photo := public.attach_member_photo(actor,prefix || '/display.webp',prefix || '/thumbnail.webp',false);
  if (select count(*) from public.gallery_images where user_id=actor) <> 2 then raise exception 'Expected two photos'; end if;
  -- Retrying an existing attachment must not use another slot.
  replacement := public.attach_member_photo(actor,prefix || '/display.webp',prefix || '/thumbnail.webp',false);
  if replacement.id <> second_photo.id then raise exception 'Attachment retry was not idempotent'; end if;
  prefix := actor::text || '/' || gen_random_uuid()::text;
  blocked := false;
  begin
    perform public.attach_member_photo(actor,prefix || '/display.webp',prefix || '/thumbnail.webp',false);
  exception when others then
    if SQLERRM not like 'Maximum two photos%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Third RPC photo accepted'; end if;
  blocked := false;
  begin
    insert into public.gallery_images(user_id,image_url,moderation_status)
      values(actor,'/test-third-photo','pending');
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Direct insert bypassed cap'; end if;
  delete from public.gallery_images where id=second_photo.id;
  replacement := public.attach_member_photo(actor,prefix || '/display.webp',prefix || '/thumbnail.webp',false);
  if replacement.id=second_photo.id or (select count(*) from public.gallery_images where user_id=actor)<>2 then
    raise exception 'Delete then replace failed';
  end if;
  -- Pending, rejected and hidden photos all still occupy slots.
  update public.gallery_images set moderation_status='rejected', privacy_level='hidden', is_private=true where id=first_photo.id;
  blocked := false;
  begin
    insert into public.gallery_images(user_id,image_url,moderation_status) values(actor,'/test-hidden-bypass','pending');
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Hidden/rejected photo bypassed cap'; end if;

  -- A failed replacement does not consume the durable replacement allowance.
  update public.gallery_images set moderation_status = 'approved' where id = first_photo.id;
  blocked := false;
  begin
    replacement_version := public.replace_member_photo(actor, first_photo.id, actor::text || '/not-a-valid-path/display.webp', actor::text || '/not-a-valid-path/thumbnail.webp');
  exception when others then
    blocked := true;
  end;
  if not blocked or (select photo_replacement_count from public.profiles where user_id = actor) <> 0 then
    raise exception 'Failed replacement consumed allowance';
  end if;

  -- Three accepted replacement submissions consume the allowance exactly once.
  for i in 1..3 loop
    prefix := actor::text || '/' || gen_random_uuid()::text;
    replacement_version := public.replace_member_photo(actor, first_photo.id, prefix || '/display.webp', prefix || '/thumbnail.webp');
    update public.gallery_photo_versions set moderation_status = 'approved' where id = replacement_version.id;
  end loop;
  if (select photo_replacement_count from public.profiles where user_id = actor) <> 3 then
    raise exception 'Expected three replacement submissions';
  end if;
  blocked := false;
  begin
    prefix := actor::text || '/' || gen_random_uuid()::text;
    perform public.replace_member_photo(actor, first_photo.id, prefix || '/display.webp', prefix || '/thumbnail.webp');
  exception when others then
    if SQLERRM not like 'You have reached the maximum of 3 photo changes%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Fourth replacement accepted'; end if;
end;
$test$;
rollback;
select 'PASS: two-photo cap, pending/rejected occupancy, failed replacement rollback, three-replacement cap, and direct-insert protection verified; fixtures rolled back' as result;
