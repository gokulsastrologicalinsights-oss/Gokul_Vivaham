create or replace function private.reserve_payment_coupon() returns trigger
language plpgsql security invoker set search_path='' as $$
declare coupon public.coupons; reserved bigint;
begin
 if new.coupon_id is null or new.status<>'pending' then return new; end if;
 if TG_OP='UPDATE' and old.status='pending' and old.coupon_id is not distinct from new.coupon_id then return new; end if;
 select * into coupon from public.coupons where id=new.coupon_id for update;
 if coupon.id is null or not coupon.is_active or coupon.expiry_date<=now() then raise exception 'Coupon is invalid or expired'; end if;
 select count(*) into reserved from public.payments where coupon_id=coupon.id and status='pending' and id<>new.id;
 if coalesce(coupon.uses_count,0)+reserved>=coupon.max_uses then raise exception 'Coupon has no remaining uses'; end if;
 return new;
end $$;
revoke all on function private.reserve_payment_coupon() from public,anon,authenticated;
create trigger reserve_payment_coupon before insert or update on public.payments for each row execute function private.reserve_payment_coupon();
create index if not exists pending_coupon_reservations on public.payments(coupon_id) where status='pending';
notify pgrst,'reload schema';
