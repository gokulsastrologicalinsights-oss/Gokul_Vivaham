alter table public.payments add column billing_snapshot jsonb;
alter table public.transactions add column billing_snapshot jsonb;
create or replace function private.keep_billing_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.billing_snapshot is distinct from old.billing_snapshot then raise exception 'Billing snapshot is immutable'; end if;
 if TG_OP='INSERT' and TG_TABLE_NAME='transactions' and new.payment_id is not null then
  select billing_snapshot into new.billing_snapshot from public.payments where id=new.payment_id;
 end if;
 return new;
end $$;
revoke all on function private.keep_billing_snapshot() from public,anon,authenticated;
create trigger payment_billing_snapshot before update on public.payments for each row execute function private.keep_billing_snapshot();
create trigger transaction_billing_snapshot before insert or update on public.transactions for each row execute function private.keep_billing_snapshot();
notify pgrst,'reload schema';
