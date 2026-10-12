create schema if not exists private;
alter table public.membership_audit_logs alter column actor_auth_user_id drop not null;
