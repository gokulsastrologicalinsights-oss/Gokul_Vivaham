create table public.operational_settings(id boolean primary key default true check(id),paid_orders_enabled boolean not null default true,support_requests_enabled boolean not null default true,version integer not null default 1,updated_at timestamptz not null default now());
insert into public.operational_settings(id) values(true);
alter table public.operational_settings enable row level security;
revoke all on public.operational_settings from anon,authenticated;
grant all on public.operational_settings to service_role;
create function public.update_operational_settings(actor_auth uuid,expected_version integer,paid_enabled boolean,support_enabled boolean) returns integer language plpgsql security invoker set search_path='' as $$
declare current_settings public.operational_settings;
begin
 if not exists(select 1 from public.admin_users where auth_user_id=actor_auth and role in ('admin','super_admin')) then raise exception 'Administrator required'; end if;
 if paid_enabled is null or support_enabled is null then raise exception 'Settings required'; end if;
 select * into current_settings from public.operational_settings where id=true for update;
 if current_settings.version<>expected_version then raise exception 'Settings changed; reload'; end if;
 update public.operational_settings set paid_orders_enabled=paid_enabled,support_requests_enabled=support_enabled,version=version+1,updated_at=now() where id=true;
 insert into public.activity_logs(action,metadata) values('ADMIN_SETTINGS_UPDATED',jsonb_build_object('actor',actor_auth,'before',to_jsonb(current_settings),'paid_orders_enabled',paid_enabled,'support_requests_enabled',support_enabled));
 return current_settings.version+1;
end $$;
revoke all on function public.update_operational_settings(uuid,integer,boolean,boolean) from public,anon,authenticated;
grant execute on function public.update_operational_settings(uuid,integer,boolean,boolean) to service_role;
notify pgrst,'reload schema';
