create or replace function public.book_included_consultation(actor uuid, astrologer uuid, consultation_day date, reason_text text, note_text text, request_key text)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare sub public.subscriptions; plan public.subscription_plans; booking public.consultation_bookings; redemption public.membership_consultation_redemptions; reserved_count integer;
begin
  if consultation_day <= (now() at time zone 'Asia/Kolkata')::date then raise exception 'Consultation date must be in the future'; end if;
  if request_key is null or length(request_key) < 8 or length(request_key) > 200 then raise exception 'Valid idempotency key required'; end if;
  if length(trim(coalesce(reason_text,''))) < 3 then raise exception 'Consultation reason required'; end if;
  perform 1 from public.users where id = actor and status='active' and deleted_at is null for update;
  if not found then raise exception 'Active member required'; end if;
  select * into redemption from public.membership_consultation_redemptions where user_id=actor and idempotency_key=request_key;
  if redemption.id is not null then
    select * into booking from public.consultation_bookings where id=redemption.booking_id;
    return jsonb_build_object('success',true,'booking',to_jsonb(booking),'redemption_status',redemption.status,'idempotent',true);
  end if;
  select s.* into sub from public.subscriptions s join private.current_membership(actor,true) c on c.subscription_id=s.id for update of s;
  if sub.id is null then raise exception 'Paid membership required'; end if;
  select * into plan from public.subscription_plans where id=sub.plan_id;
  if plan.consultation_limit <= 0 then raise exception 'Included consultations not available'; end if;
  select count(*) into reserved_count from public.membership_consultation_redemptions where subscription_id=sub.id and status in ('reserved','consumed');
  if reserved_count >= plan.consultation_limit then raise exception 'Included consultation limit reached'; end if;
  insert into public.consultation_bookings(user_id,payment_id,astrologer_id,consultation_reason,consultation_date,payment_status,notes,subscription_id,benefit_source)
  values(actor,null,astrologer,trim(reason_text),consultation_day,'pending',nullif(trim(coalesce(note_text,'')),''),sub.id,'membership_included') returning * into booking;
  insert into public.membership_consultation_redemptions(subscription_id,user_id,booking_id,idempotency_key)
  values(sub.id,actor,booking.id,request_key) returning * into redemption;
  return jsonb_build_object('success',true,'booking',to_jsonb(booking),'redemption_status',redemption.status,'idempotent',false,'message','Request received; the consultation is not confirmed until the team approves and schedules it.');
end;
$$;
revoke all on function public.book_included_consultation(uuid, uuid, date, text, text, text) from public, anon, authenticated;
grant execute on function public.book_included_consultation(uuid, uuid, date, text, text, text) to service_role;

create or replace function private.sync_consultation_redemption()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.benefit_source = 'membership_included' then
    if new.payment_status = 'approved' and old.payment_status is distinct from 'approved' then
      update public.membership_consultation_redemptions set status='consumed', consumed_at=now(), restored_at=null where booking_id=new.id and status='reserved';
    elsif new.payment_status = 'cancelled' and old.payment_status is distinct from 'cancelled' then
      update public.membership_consultation_redemptions set status='restored', restored_at=now() where booking_id=new.id and status in ('reserved','consumed');
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_consultation_redemption() from public, anon, authenticated;
drop trigger if exists sync_membership_consultation_redemption on public.consultation_bookings;
create trigger sync_membership_consultation_redemption
after update of payment_status on public.consultation_bookings for each row execute function private.sync_consultation_redemption();
