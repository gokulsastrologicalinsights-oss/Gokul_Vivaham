-- Interest requests are directional and have one immutable lifetime record per
-- (sender_user_id, receiver_user_id) pair. Existing duplicate rows are copied
-- to an archive before the live table is constrained.

create table if not exists public.match_request_history (
  archive_id uuid primary key default gen_random_uuid(),
  original_request_id uuid not null,
  sender_user_id uuid,
  receiver_user_id uuid,
  status text not null,
  message text,
  created_at timestamptz,
  updated_at timestamptz,
  responded_at timestamptz,
  cancelled_at timestamptz,
  archived_at timestamptz not null default now(),
  archive_reason text not null
);

alter table public.match_request_history enable row level security;
revoke all on public.match_request_history from anon, authenticated;
grant all on public.match_request_history to service_role;

alter table public.match_requests
  add column if not exists responded_at timestamptz,
  add column if not exists cancelled_at timestamptz;

update public.match_requests
set status = lower(coalesce(status, 'pending')),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, created_at, now());

-- Invalid legacy rows cannot participate in the constrained live lifecycle,
-- so archive them before enforcing the required sender/receiver/status fields.
with archived as (
  insert into public.match_request_history (
    original_request_id, sender_user_id, receiver_user_id, status, message,
    created_at, updated_at, responded_at, cancelled_at, archive_reason
  )
  select id, sender_user_id, receiver_user_id, coalesce(status, 'pending'), message,
         created_at, updated_at, responded_at, cancelled_at,
         'invalid legacy interest request archived before lifecycle constraint'
  from public.match_requests
  where sender_user_id is null
     or receiver_user_id is null
     or status not in ('pending', 'cancelled', 'accepted', 'declined')
  returning original_request_id
)
delete from public.match_requests r
using archived a
where r.id = a.original_request_id;

-- Keep the strongest terminal outcome if old code created duplicates. Every
-- discarded live row remains queryable in match_request_history.
with ranked as (
  select id,
         row_number() over (
           partition by sender_user_id, receiver_user_id
           order by case status
             when 'accepted' then 4
             when 'declined' then 3
             when 'pending' then 2
             when 'cancelled' then 1
             else 0
           end desc, updated_at desc nulls last, created_at asc nulls last, id
         ) as duplicate_rank
  from public.match_requests
  where sender_user_id is not null and receiver_user_id is not null
), archived as (
  insert into public.match_request_history (
    original_request_id, sender_user_id, receiver_user_id, status, message,
    created_at, updated_at, responded_at, cancelled_at, archive_reason
  )
  select r.id, r.sender_user_id, r.receiver_user_id, r.status, r.message,
         r.created_at, r.updated_at, r.responded_at, r.cancelled_at,
         'duplicate ordered interest request archived before uniqueness constraint'
  from public.match_requests r
  join ranked d on d.id = r.id
  where d.duplicate_rank > 1
  returning original_request_id
)
delete from public.match_requests r
using ranked d
where r.id = d.id and d.duplicate_rank > 1;

update public.match_requests
set responded_at = coalesce(responded_at, updated_at)
where status in ('accepted', 'declined');

update public.match_requests
set cancelled_at = coalesce(cancelled_at, updated_at)
where status = 'cancelled';

alter table public.match_requests
  alter column sender_user_id set not null,
  alter column receiver_user_id set not null,
  alter column status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.match_requests
  drop constraint if exists match_requests_status_check,
  drop constraint if exists match_requests_sender_not_receiver,
  add constraint match_requests_status_check check (status in ('pending', 'cancelled', 'accepted', 'declined')),
  add constraint match_requests_sender_not_receiver check (sender_user_id <> receiver_user_id),
  add constraint match_requests_sender_receiver_unique unique (sender_user_id, receiver_user_id);

create index if not exists idx_match_requests_receiver_status
  on public.match_requests (receiver_user_id, status);
create index if not exists idx_match_requests_sender_status
  on public.match_requests (sender_user_id, status);

create or replace function private.guard_match_interest() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
begin
  if auth.uid() is null then
    if current_user in ('anon', 'authenticated') then
      raise exception 'Authentication required';
    end if;
    return new;
  end if;

  select id into actor
  from public.users
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null;
  if actor is null then raise exception 'Inactive member'; end if;

  if tg_op = 'INSERT' then
    if new.sender_user_id is distinct from actor
       or new.receiver_user_id = actor
       or new.status is distinct from 'pending' then
      raise exception 'Invalid interest';
    end if;
  else
    if new.sender_user_id is distinct from old.sender_user_id
       or new.receiver_user_id is distinct from old.receiver_user_id
       or new.id is distinct from old.id
       or new.created_at is distinct from old.created_at
       or new.message is distinct from old.message
       or old.status is distinct from 'pending' then
      raise exception 'Interest details cannot be changed';
    end if;

    if actor = old.sender_user_id then
      if new.status is distinct from 'cancelled' then
        raise exception 'Only the sender can cancel a pending interest';
      end if;
      new.cancelled_at = coalesce(old.cancelled_at, now());
      new.responded_at = old.responded_at;
    elsif actor = old.receiver_user_id then
      if new.status not in ('accepted', 'declined') then
        raise exception 'Only the recipient can accept or decline a pending interest';
      end if;
      new.responded_at = coalesce(old.responded_at, now());
      new.cancelled_at = old.cancelled_at;
    else
      raise exception 'You are not a participant in this interest';
    end if;
  end if;

  if not exists (
    select 1
    from public.users u
    join public.profiles p on p.user_id = u.id
    where u.id = new.receiver_user_id
      and u.status = 'active'
      and u.deleted_at is null
      and p.deleted_at is null
      and not p.is_suspended
  ) then
    raise exception 'Member unavailable';
  end if;

  if exists (
    select 1 from public.blocked_users
    where (blocker_user_id = new.sender_user_id and blocked_user_id = new.receiver_user_id)
       or (blocker_user_id = new.receiver_user_id and blocked_user_id = new.sender_user_id)
  ) then
    raise exception 'Connection blocked';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_match_interest() from public, anon, authenticated;
drop trigger if exists guard_match_interest on public.match_requests;
create trigger guard_match_interest
before insert or update on public.match_requests
for each row execute function private.guard_match_interest();

drop policy if exists "Users can update own match requests" on public.match_requests;
drop policy if exists "Users can cancel own pending match requests" on public.match_requests;
drop policy if exists "Recipients can respond to pending match requests" on public.match_requests;

create policy "Users can cancel own pending match requests"
on public.match_requests for update
using (
  status = 'pending' and exists (
    select 1 from public.users
    where users.auth_user_id = auth.uid()
      and users.id = match_requests.sender_user_id
  )
)
with check (
  status = 'cancelled' and exists (
    select 1 from public.users
    where users.auth_user_id = auth.uid()
      and users.id = match_requests.sender_user_id
  )
);

create policy "Recipients can respond to pending match requests"
on public.match_requests for update
using (
  status = 'pending' and exists (
    select 1 from public.users
    where users.auth_user_id = auth.uid()
      and users.id = match_requests.receiver_user_id
  )
)
with check (
  status in ('accepted', 'declined') and exists (
    select 1 from public.users
    where users.auth_user_id = auth.uid()
      and users.id = match_requests.receiver_user_id
  )
);

create or replace function public.handle_match_request_notification()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor_name text;
begin
  if tg_op = 'INSERT' then
    select concat_ws(' ', first_name, last_name) into actor_name
    from public.profiles where user_id = new.sender_user_id;
    insert into public.notifications (user_id, title, message, type)
    values (new.receiver_user_id, 'New Interest Request',
      coalesce(nullif(actor_name, ''), 'Someone') || ' sent you an interest request.', 'interest_received');
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('accepted', 'declined') then
    select concat_ws(' ', first_name, last_name) into actor_name
    from public.profiles where user_id = new.receiver_user_id;
    insert into public.notifications (user_id, title, message, type)
    values (
      new.sender_user_id,
      case when new.status = 'accepted' then 'Interest Accepted' else 'Interest Declined' end,
      coalesce(nullif(actor_name, ''), 'Someone') || case when new.status = 'accepted' then ' accepted your interest request.' else ' declined your interest request.' end,
      case when new.status = 'accepted' then 'interest_accepted' else 'interest_declined' end
    );
  end if;
  return new;
end;
$$;

revoke all on function public.handle_match_request_notification() from public, anon, authenticated;
drop trigger if exists on_match_request_notification on public.match_requests;
create trigger on_match_request_notification
after insert or update on public.match_requests
for each row execute function public.handle_match_request_notification();

notify pgrst, 'reload schema';
