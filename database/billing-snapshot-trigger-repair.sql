create or replace function private.keep_billing_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.billing_snapshot is distinct from old.billing_snapshot then raise exception 'Billing snapshot is immutable'; end if;
 elsif TG_TABLE_NAME='transactions' then
  if new.payment_id is not null then
   select billing_snapshot into new.billing_snapshot from public.payments where id=new.payment_id;
  end if;
 end if;
 return new;
end $$;
