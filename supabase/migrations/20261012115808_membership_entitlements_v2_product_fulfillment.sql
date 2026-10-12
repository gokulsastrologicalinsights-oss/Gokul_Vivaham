create or replace function public.fulfill_product_payment(payment_row uuid, gateway_payment text)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare pay public.payments; tx public.transactions; booking public.consultation_bookings; notification_title text; notification_message text;
begin
  select * into pay from public.payments where id = payment_row for update;
  if pay.id is null or pay.payment_type not in ('contact_unlock','featured_profile','consultation') then raise exception 'Product payment required'; end if;
  if pay.fulfilled_at is not null then
    if pay.razorpay_payment_id is distinct from gateway_payment then raise exception 'Payment reference mismatch'; end if;
    select * into tx from public.transactions where payment_id = pay.id;
    if pay.payment_type = 'consultation' then select * into booking from public.consultation_bookings where payment_id = pay.id; end if;
    return jsonb_build_object('success',true,'transaction',to_jsonb(tx),'booking',to_jsonb(booking),'idempotent',true);
  end if;
  if pay.status not in ('pending','cancelled') or pay.currency <> 'INR' or gateway_payment is null then raise exception 'Invalid payment'; end if;
  perform 1 from public.users where id = pay.user_id and status = 'active' and deleted_at is null for update;
  if not found then raise exception 'Inactive member'; end if;
  if exists(select 1 from public.payments where razorpay_payment_id = gateway_payment and id <> pay.id) then raise exception 'Payment already used'; end if;

  if pay.payment_type = 'contact_unlock' then
    if pay.target_profile_id is null or not exists(
      select 1 from public.profiles p join public.users u on u.id = p.user_id
      where p.id = pay.target_profile_id and p.user_id <> pay.user_id
        and u.status = 'active' and u.deleted_at is null
        and not p.is_suspended and not p.is_banned and p.deleted_at is null
    ) then raise exception 'Contact target missing'; end if;
    insert into public.contact_unlocks(user_id,target_profile_id,payment_id)
    values(pay.user_id,pay.target_profile_id,pay.id) on conflict(user_id,target_profile_id) do nothing;
    notification_title := 'Contact Unlocked';
    notification_message := 'Your provider-verified single contact unlock is ready.';
  elsif pay.payment_type = 'featured_profile' then
    if pay.featured_duration_days not in (15,30) or pay.featured_duration_days is null then raise exception 'Featured duration missing'; end if;
    insert into public.featured_profiles(user_id,payment_id,start_date,end_date,is_active)
    values(pay.user_id,pay.id,now(),now()+make_interval(days=>pay.featured_duration_days),true);
    notification_title := 'Featured Profile Activated';
    notification_message := 'Your provider-verified featured profile period is active.';
  else
    update public.consultation_bookings
    set payment_status = 'pending', benefit_source = 'paid_checkout'
    where payment_id = pay.id and user_id = pay.user_id returning * into booking;
    if booking.id is null then raise exception 'Consultation request missing'; end if;
    notification_title := 'Consultation Request Received';
    notification_message := 'Payment was verified. Your requested date is pending team approval and scheduling.';
  end if;

  insert into public.transactions(user_id,payment_id,invoice_number,amount,tax,total_amount,description,status,billing_snapshot)
  values(pay.user_id,pay.id,'GV-INV-'||pay.id::text,pay.amount,0,pay.amount,pay.payment_type||' purchase','completed',pay.billing_snapshot)
  returning * into tx;
  if pay.coupon_id is not null then update public.coupons set uses_count = uses_count + 1 where id = pay.coupon_id; end if;
  insert into public.notifications(user_id,title,message,type,is_read)
  values(pay.user_id,notification_title,notification_message,'billing',false);
  update public.payments set status='completed',razorpay_payment_id=gateway_payment,fulfilled_at=now(),updated_at=now() where id=pay.id;
  return jsonb_build_object('success',true,'transaction',to_jsonb(tx),'booking',to_jsonb(booking),'idempotent',false);
end;
$$;
revoke all on function public.fulfill_product_payment(uuid,text) from public, anon, authenticated;
grant execute on function public.fulfill_product_payment(uuid,text) to service_role;
