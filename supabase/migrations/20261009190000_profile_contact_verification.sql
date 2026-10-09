-- Contact verification requests are separate from document verification requests.
-- Members can create requests only through the server-side functions below.

create table if not exists public.profile_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  profile_uuid uuid not null references public.profiles(id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  requested_mobile_number text check (requested_mobile_number is null or requested_mobile_number ~ '^\+[1-9][0-9]{7,14}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  mobile_status text not null default 'requested' check (mobile_status in ('requested', 'verified', 'rejected')),
  verification_method text,
  internal_notes text,
  rejection_reason text,
  reviewed_by uuid references public.admin_users(id) on delete set null,
  reviewed_at timestamptz,
  requested_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_verification_requests_status_requested
  on public.profile_verification_requests(status, requested_at desc);
create index if not exists idx_profile_verification_requests_user_requested
  on public.profile_verification_requests(user_id, requested_at desc);

create table if not exists public.profile_verification_audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.profile_verification_requests(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  actor_auth_user_id uuid,
  action text not null check (action in ('request_initiated', 'mobile_approved', 'email_marked_verified', 'request_rejected', 'internal_note_added', 'contact_synced')),
  from_status text,
  to_status text,
  verification_method text,
  reason text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_verification_audit_request_created
  on public.profile_verification_audit_logs(request_id, created_at desc);
create index if not exists idx_profile_verification_audit_user_created
  on public.profile_verification_audit_logs(user_id, created_at desc);

alter table public.profile_verification_requests enable row level security;
alter table public.profile_verification_audit_logs enable row level security;

create policy profile_verification_requests_owner_read
  on public.profile_verification_requests for select to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = profile_verification_requests.user_id
      and u.auth_user_id = (select auth.uid())
  ));

create policy profile_verification_requests_admin_read
  on public.profile_verification_requests for select to authenticated
  using (exists (
    select 1 from public.admin_users a
    where a.auth_user_id = (select auth.uid())
      and a.role in ('admin', 'super_admin')
  ));

create policy profile_verification_audit_admin_read
  on public.profile_verification_audit_logs for select to authenticated
  using (exists (
    select 1 from public.admin_users a
    where a.auth_user_id = (select auth.uid())
      and a.role in ('admin', 'super_admin')
  ));

-- Do not expose write access to members. The API uses the service role to call
-- these functions after it has validated the authenticated session and origin.
revoke insert, update, delete on public.profile_verification_requests from anon, authenticated;
revoke insert, update, delete on public.profile_verification_audit_logs from anon, authenticated;

drop function if exists public.create_profile_verification_request(uuid);

create or replace function public.create_profile_verification_request(actor uuid, requested_phone text)
returns table(request_id uuid, request_status text, mobile_status text, requested_at timestamptz, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.users;
  member_profile public.profiles;
  existing public.profile_verification_requests;
  created public.profile_verification_requests;
  normalized_requested text;
  normalized_registered text;
begin
  select * into account
  from public.users
  where auth_user_id = actor and status = 'active' and deleted_at is null
  for update;

  if not found then
    raise exception 'Member account not found';
  end if;

  normalized_requested := regexp_replace(trim(coalesce(requested_phone, '')), '[^0-9+]', '', 'g');
  if normalized_requested !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Invalid phone number';
  end if;

  normalized_registered := regexp_replace(trim(coalesce(account.mobile_number, '')), '[^0-9+]', '', 'g');
  if normalized_registered ~ '^[0-9]{10}$' then
    normalized_registered := '+91' || normalized_registered;
  end if;
  if normalized_registered <> '' and normalized_registered <> normalized_requested then
    raise exception 'Phone number must match the registered mobile number';
  end if;

  select * into member_profile
  from public.profiles
  where user_id = account.id and deleted_at is null
  limit 1;

  if not found then
    raise exception 'Member profile not found';
  end if;

  -- A click within 15 minutes reuses the pending request rather than creating
  -- an unbounded queue. The last_opened_at value still records the interaction.
  select * into existing
  from public.profile_verification_requests
  where user_id = account.id
    and status = 'pending'
    and requested_at >= now() - interval '15 minutes'
  order by requested_at desc
  limit 1
  for update;

  if found then
    update public.profile_verification_requests
    set requested_mobile_number = normalized_requested, last_opened_at = now(), updated_at = now()
    where id = existing.id;

    return query select existing.id, existing.status, existing.mobile_status, existing.requested_at, true;
    return;
  end if;

  insert into public.profile_verification_requests(user_id, profile_uuid, requested_mobile_number)
  values (account.id, member_profile.id, normalized_requested)
  returning * into created;

  insert into public.profile_verification_audit_logs(
    request_id, user_id, actor_auth_user_id, action, from_status, to_status, verification_method
  ) values (
    created.id, account.id, actor, 'request_initiated', null, created.status, 'whatsapp_click_to_chat'
  );

  return query select created.id, created.status, created.mobile_status, created.requested_at, false;
end;
$$;

create or replace function public.sync_member_contact_verification(actor uuid, field_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.users;
  latest_request public.profile_verification_requests;
begin
  if field_name not in ('email', 'mobile') then
    raise exception 'Unsupported verification field';
  end if;

  select * into account
  from public.users
  where auth_user_id = actor and status = 'active' and deleted_at is null
  for update;
  if not found then raise exception 'Member account not found'; end if;

  if field_name = 'email' then
    update public.users set email_verified = true, updated_at = now() where id = account.id;
    account.email_verified := true;
  else
    update public.users set mobile_verified = true, updated_at = now() where id = account.id;
    account.mobile_verified := true;
  end if;

  select * into latest_request
  from public.profile_verification_requests
  where user_id = account.id and status = 'pending'
  order by requested_at desc limit 1;

  if found and account.mobile_verified and account.email_verified then
    update public.profile_verification_requests
    set status = 'approved', mobile_status = 'verified', updated_at = now()
    where id = latest_request.id;
  end if;

  insert into public.profile_verification_audit_logs(
    request_id, user_id, actor_auth_user_id, action, from_status, to_status, verification_method
  ) values (
    case when found then latest_request.id else null end,
    account.id,
    actor,
    'contact_synced',
    case when found then latest_request.status else null end,
    case when found and account.mobile_verified and account.email_verified then 'approved' else null end,
    case when field_name = 'email' then 'supabase_auth_email_confirmation' else 'supabase_auth_phone_otp' end
  );
  return true;
end;
$$;

create or replace function public.review_profile_verification_request(
  actor uuid,
  request_id uuid,
  verification_action text,
  reason text default null,
  internal_notes text default null,
  verification_method text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.profile_verification_requests;
  account public.users;
  admin_row public.admin_users;
  next_status text;
  normalized_reason text := nullif(trim(coalesce(reason, '')), '');
  normalized_notes text := nullif(trim(coalesce(internal_notes, '')), '');
begin
  select * into admin_row
  from public.admin_users
  where auth_user_id = actor and role in ('admin', 'super_admin');
  if not found then raise exception 'Administrator authorization required'; end if;

  select * into request_row
  from public.profile_verification_requests
  where id = request_id
  for update;
  if not found then raise exception 'Verification request not found'; end if;

  select * into account from public.users where id = request_row.user_id for update;
  if not found then raise exception 'Member account not found'; end if;

  if request_row.status <> 'pending' and verification_action <> 'add_note' then
    raise exception 'This verification request has already been reviewed';
  end if;

  if verification_action = 'approve_mobile' then
    update public.users
    set mobile_verified = true,
        mobile_number = coalesce(request_row.requested_mobile_number, mobile_number),
        updated_at = now()
    where id = account.id;
    next_status := case when account.email_verified then 'approved' else 'pending' end;
    update public.profile_verification_requests
    set mobile_status = 'verified', status = next_status, reviewed_by = admin_row.id,
        reviewed_at = now(), verification_method = coalesce(verification_method, 'admin_manual_whatsapp_confirmation'),
        internal_notes = coalesce(normalized_notes, internal_notes), updated_at = now()
    where id = request_row.id;
    insert into public.profile_verification_audit_logs(request_id, user_id, actor_auth_user_id, action, from_status, to_status, verification_method, notes)
    values (request_row.id, request_row.user_id, actor, 'mobile_approved', request_row.status, next_status,
            coalesce(verification_method, 'admin_manual_whatsapp_confirmation'), normalized_notes);
    insert into public.notifications(user_id, title, message, type)
    values (request_row.user_id, 'Mobile verification approved', 'Your registered mobile number was approved by the Gokul Vivaham verification team.', 'verification_approved');
  elsif verification_action = 'mark_email_verified' then
    if coalesce(verification_method, '') <> 'independent_email_confirmation' then
      raise exception 'Independent email confirmation is required';
    end if;
    update public.users set email_verified = true, updated_at = now() where id = account.id;
    next_status := case when account.mobile_verified then 'approved' else 'pending' end;
    update public.profile_verification_requests
    set status = next_status, reviewed_by = admin_row.id, reviewed_at = now(),
        verification_method = verification_method,
        internal_notes = coalesce(normalized_notes, internal_notes), updated_at = now()
    where id = request_row.id;
    insert into public.profile_verification_audit_logs(request_id, user_id, actor_auth_user_id, action, from_status, to_status, verification_method, reason, notes)
    values (request_row.id, request_row.user_id, actor, 'email_marked_verified', request_row.status, next_status,
            verification_method, normalized_reason, normalized_notes);
    insert into public.notifications(user_id, title, message, type)
    values (request_row.user_id, 'Email verification updated', 'Your email verification status was updated after independent confirmation.', 'verification_approved');
  elsif verification_action = 'reject' then
    if normalized_reason is null then raise exception 'A rejection reason is required'; end if;
    update public.profile_verification_requests
    set status = 'rejected', rejection_reason = normalized_reason, reviewed_by = admin_row.id,
        reviewed_at = now(), verification_method = coalesce(verification_method, 'admin_review'),
        internal_notes = coalesce(normalized_notes, internal_notes), updated_at = now()
    where id = request_row.id;
    insert into public.profile_verification_audit_logs(request_id, user_id, actor_auth_user_id, action, from_status, to_status, verification_method, reason, notes)
    values (request_row.id, request_row.user_id, actor, 'request_rejected', request_row.status, 'rejected',
            coalesce(verification_method, 'admin_review'), normalized_reason, normalized_notes);
    insert into public.notifications(user_id, title, message, type)
    values (request_row.user_id, 'Verification request needs attention', 'Your profile verification request was not approved. Reason: ' || normalized_reason, 'verification_rejected');
  elsif verification_action = 'add_note' then
    if normalized_notes is null then raise exception 'An internal note is required'; end if;
    update public.profile_verification_requests
    set internal_notes = normalized_notes, updated_at = now() where id = request_row.id;
    insert into public.profile_verification_audit_logs(request_id, user_id, actor_auth_user_id, action, from_status, to_status, verification_method, notes)
    values (request_row.id, request_row.user_id, actor, 'internal_note_added', request_row.status, request_row.status, 'admin_note', normalized_notes);
  else
    raise exception 'Unsupported verification action';
  end if;

  return true;
end;
$$;

revoke all on function public.create_profile_verification_request(uuid, text) from public, anon, authenticated;
revoke all on function public.sync_member_contact_verification(uuid, text) from public, anon, authenticated;
revoke all on function public.review_profile_verification_request(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_profile_verification_request(uuid, text) to service_role;
grant execute on function public.sync_member_contact_verification(uuid, text) to service_role;
grant execute on function public.review_profile_verification_request(uuid, uuid, text, text, text, text) to service_role;
