alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check(status in ('pending','completed','failed','cancelled'));
alter table public.payments add column if not exists checkout_key text;
create unique index if not exists payments_checkout_key_unique on public.payments(user_id, checkout_key) where checkout_key is not null;
create unique index if not exists payments_gateway_payment_unique on public.payments(razorpay_payment_id) where razorpay_payment_id is not null;

notify pgrst, 'reload schema';

-- Rollback guidance (manual, intentionally non-destructive):
-- 1. Point application routes back to the previous activity_logs implementation.
-- 2. Drop only the new triggers/functions and revoke their grants.
-- 3. Keep the four usage tables and added columns for audit/history. They may be
--    archived later after confirming no application version reads them.
