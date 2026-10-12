create or replace function public.fulfill_subscription_payment(payment_row uuid, gateway_payment text)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare pay public.payments; plan public.subscription_plans; sub public.subscriptions; tx public.transactions; role_name text; start_at timestamptz; expires_at timestamptz;
begin
  select * into pay from public.payments where id=payment_row for update;
  if pay.id is null or pay.payment_type<>'subscription' then raise exception 'Subscription payment required'; end if;
  if pay.fulfilled_at is not null then
    if pay.razorpay_payment_id is distinct from gateway_payment then raise exception 'Payment reference mismatch'; end if;
    select * into sub from public.subscriptions where razorpay_payment_id=gateway_payment;
    select * into tx from public.transactions where payment_id=pay.id;
    return jsonb_build_object('success',true,'subscription',to_jsonb(sub),'transaction',to_jsonb(tx),'idempotent',true);
  end if;
  if pay.status not in ('pending','cancelled') or pay.currency<>'INR' or pay.selected_plan_id is null or gateway_payment is null then raise exception 'Incomplete or ineligible payment'; end if;
  select * into plan from public.subscription_plans where id=pay.selected_plan_id and is_active and price>0 for update;
  if plan.id is null then raise exception 'Paid plan unavailable'; end if;
  if pay.plan_duration_days is not null and pay.plan_duration_days<>plan.duration_days then raise exception 'Payment plan snapshot mismatch'; end if;
  perform 1 from public.users where id=pay.user_id and status='active' and deleted_at is null for update;
  if not found then raise exception 'Inactive member'; end if;
  if exists(select 1 from public.payments where razorpay_payment_id=gateway_payment and id<>pay.id) then raise exception 'Payment already used'; end if;
  update public.subscriptions
    set payment_status = case when payment_status = 'Pending' then 'Cancelled' else 'Expired' end,
        end_date = case when payment_status = 'Completed' then least(coalesce(end_date,now()),now()) else end_date end,
        updated_at = now()
    where user_id=pay.user_id and payment_status in ('Completed','Pending') and grant_type<>'system_free';
  start_at := now();
  expires_at := private.membership_expiry(plan,start_at);
  insert into public.subscriptions(user_id,plan_id,payment_status,start_date,end_date,razorpay_payment_id,grant_type)
  values(pay.user_id,plan.id,'Completed',start_at,expires_at,gateway_payment,'online_payment') returning * into sub;
  insert into public.transactions(user_id,payment_id,invoice_number,amount,tax,total_amount,description,status,billing_snapshot)
  values(pay.user_id,pay.id,'GV-INV-'||pay.id::text,pay.amount,0,pay.amount,plan.name||' membership','completed',pay.billing_snapshot) returning * into tx;
  if pay.coupon_id is not null then update public.coupons set uses_count=uses_count+1 where id=pay.coupon_id; end if;
  role_name := plan.plan_key;
  update public.users set role=case when role_name='startup' then 'user' else role_name end, updated_at=now() where id=pay.user_id;
  update public.profiles set is_premium=(role_name<>'startup') where user_id=pay.user_id;
  insert into public.notifications(user_id,title,message,type,is_read) values(pay.user_id,'Membership Activated',plan.name||' membership activated. Manual renewal is required before expiry.','billing',false);
  update public.payments set status='completed',razorpay_payment_id=gateway_payment,fulfilled_at=now(),updated_at=now() where id=pay.id;
  insert into public.membership_audit_logs(action,actor_auth_user_id,target_user_id,subscription_id,plan_id,new_values,reason)
  select 'online_membership_activated',u.auth_user_id,pay.user_id,sub.id,plan.id,to_jsonb(sub),'Provider-verified captured payment' from public.users u where u.id=pay.user_id;
  return jsonb_build_object('success',true,'newRole',role_name,'subscription',to_jsonb(sub)||jsonb_build_object('plan',to_jsonb(plan)),'transaction',to_jsonb(tx),'idempotent',false);
end;
$$;
revoke all on function public.fulfill_subscription_payment(uuid,text) from public, anon, authenticated;
grant execute on function public.fulfill_subscription_payment(uuid,text) to service_role;

-- The public catalogue is deliberately fixed to the four source-of-truth plans.
-- Membership administrators can grant/revoke access, but a browser request cannot
-- introduce a fifth plan or alter the amount and benefits a payment must buy.
