create or replace function public.admin_upsert_membership_plan(actor_auth uuid, target_plan uuid, plan_payload jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.admin_users
    where auth_user_id = actor_auth and role in ('admin', 'super_admin')
  ) then raise exception 'Administrator required'; end if;
  raise exception 'Canonical membership plans are migration-managed';
end;
$$;

create or replace function public.admin_delete_membership_plan(actor_auth uuid, target_plan uuid, reason_text text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.admin_users
    where auth_user_id = actor_auth and role in ('admin', 'super_admin')
  ) then raise exception 'Administrator required'; end if;
  raise exception 'Canonical membership plans cannot be deleted';
end;
$$;
