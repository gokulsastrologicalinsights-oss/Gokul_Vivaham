begin;
set local statement_timeout = '15s';
do $test$
declare
  actor uuid := gen_random_uuid();
  prefix text;
  first_photo public.gallery_images;
  second_photo public.gallery_images;
  replacement public.gallery_images;
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
end;
$test$;
rollback;
select 'PASS: two accepted; third RPC/direct insert blocked; retry idempotent; delete then replace succeeds; hidden/rejected count; fixtures rolled back' as result;
