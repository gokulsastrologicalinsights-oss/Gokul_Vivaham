alter table public.payments add column selected_plan_id uuid references public.subscription_plans(id), add column plan_duration_days integer, add column fulfilled_at timestamptz;
create or replace function public.fulfill_subscription_payment(payment_row uuid,gateway_payment text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare pay public.payments; plan public.subscription_plans; sub public.subscriptions; tx public.transactions; role_name text; base numeric;
begin
 select * into pay from public.payments where id=payment_row for update;
 if pay.id is null or pay.payment_type<>'subscription' then raise exception 'Subscription payment required'; end if;
 if pay.fulfilled_at is not null then
  if pay.razorpay_payment_id is distinct from gateway_payment then raise exception 'Payment reference mismatch'; end if;
  select * into sub from public.subscriptions where user_id=pay.user_id and razorpay_payment_id=gateway_payment;
  select * into tx from public.transactions where payment_id=pay.id;
  return jsonb_build_object('success',true,'subscription',to_jsonb(sub),'transaction',to_jsonb(tx));
 end if;
 if pay.status='completed' then raise exception 'Legacy completed payment needs reconciliation'; end if;
 if pay.currency<>'INR' or pay.selected_plan_id is null or pay.plan_duration_days is null or pay.plan_duration_days<=0 or gateway_payment is null then raise exception 'Incomplete payment selection'; end if;
 select * into plan from public.subscription_plans where id=pay.selected_plan_id;
 if plan.id is null then raise exception 'Plan unavailable'; end if;
 perform 1 from public.users where id=pay.user_id and status='active' and deleted_at is null for update;
 if not found then raise exception 'Inactive member'; end if;
 if exists(select 1 from public.payments where razorpay_payment_id=gateway_payment and id<>pay.id) then raise exception 'Payment already used'; end if;
 update public.subscriptions set payment_status='Expired' where user_id=pay.user_id and payment_status='Completed';
 insert into public.subscriptions(user_id,plan_id,payment_status,start_date,end_date,razorpay_payment_id)
 values(pay.user_id,plan.id,'Completed',now(),now()+make_interval(days=>pay.plan_duration_days),gateway_payment) returning * into sub;
 base:=round(pay.amount/1.18,2);
 insert into public.transactions(user_id,payment_id,invoice_number,amount,tax,total_amount,description,status)
 values(pay.user_id,pay.id,'GV-INV-'||pay.id::text,base,pay.amount-base,pay.amount,plan.name||' membership','completed') returning * into tx;
 if pay.coupon_id is not null then update public.coupons set uses_count=uses_count+1 where id=pay.coupon_id; end if;
 role_name:=case when lower(plan.name) like '%diamond%' then 'diamond' when lower(plan.name) like '%gold%' then 'gold' when lower(plan.name) like '%silver%' then 'silver' else 'user' end;
 update public.users set role=role_name where id=pay.user_id;
 update public.profiles set is_premium=(role_name<>'user') where user_id=pay.user_id;
 insert into public.notifications(user_id,title,message,type,is_read) values(pay.user_id,'Membership Activated',plan.name||' membership activated.','billing',false);
 update public.payments set status='completed',razorpay_payment_id=gateway_payment,fulfilled_at=now(),updated_at=now() where id=pay.id;
 return jsonb_build_object('success',true,'newRole',role_name,'subscription',to_jsonb(sub)||jsonb_build_object('plan',to_jsonb(plan)),'transaction',to_jsonb(tx));
end $$;
revoke all on function public.fulfill_subscription_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.fulfill_subscription_payment(uuid,text) to service_role;
notify pgrst,'reload schema';
