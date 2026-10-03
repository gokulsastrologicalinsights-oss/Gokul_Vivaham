const fs = require('node:fs');
const path = require('node:path');

// This project was created for a different ZIP. Preserve its empty/member-free
// schema instead of deleting it. The installer is intentionally a one-time operation.
const archive = `
create schema zip_version_archive;
revoke all on schema zip_version_archive from public, anon, authenticated;
do $$ declare r record; begin
  if exists(select 1 from auth.users) or exists(select 1 from public.profiles) or exists(select 1 from public.payments) then
    raise exception 'Expected an unused setup project; aborting to preserve member data';
  end if;
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I set schema zip_version_archive',r.tablename);
  end loop;
  for r in select proname, pg_get_function_identity_arguments(oid) as args from pg_proc where pronamespace='public'::regnamespace loop
    execute format('alter function public.%I(%s) set schema zip_version_archive',r.proname,r.args);
  end loop;
end $$;
revoke all on all tables in schema zip_version_archive from public, anon, authenticated;
revoke all on all sequences in schema zip_version_archive from public, anon, authenticated;
revoke all on all functions in schema zip_version_archive from public, anon, authenticated;
set search_path = public, extensions;
`;

let schema = fs.readFileSync('supabase_schema.sql','utf8');
const paymentTrigger = 'create trigger trigger_payments_updated_at before update on payments for each row execute procedure handle_updated_at();';
schema = schema.replace(paymentTrigger, ''); // The original refers to payments before it exists.
schema = schema.replace("profile_id_val := 'GV' || floor(100000 + random() * 900000)::text;", "profile_id_val := 'GV' || replace(new.id::text, '-', '');");
schema = schema.replace(/coalesce\(\(new\.raw_user_meta_data->>'(consent\w+)'\)::boolean, true\)/g, "coalesce((new.raw_user_meta_data->>'$1')::boolean, false)");
schema = schema.replace("auth.role() = 'authenticated' and visibility = 'public'", "auth.uid() is not null and visibility = 'public'");

const extra = `
${paymentTrigger}
alter table users add constraint users_auth_identity_fk foreign key(auth_user_id) references auth.users(id) on delete cascade;
alter table profiles alter column profile_id type varchar(40);
drop policy "Authenticated users can select public profiles" on profiles;
create policy "Authenticated users can select public profiles" on profiles for select to authenticated
  using(visibility='public' and not is_suspended and deleted_at is null);
alter table profiles add column image_url text,
  add column star varchar(100) generated always as (nakshatra) stored,
  add column id_verification_status text default 'unverified',
  add column id_verification_document_url text,
  add column id_verification_type text,
  add column id_verification_rejection_reason text,
  add column horoscope_verification_status text default 'unverified',
  add column horoscope_verification_rejection_reason text;
alter table gallery_images add column privacy_level text default 'public', add column sort_order integer default 0;
alter table verification_requests add column verification_type text,
  add column document_type text, add column notes text, add column updated_at timestamptz default now();
alter table reports add column category text, add column admin_notes text,
  add column resolved_at timestamptz, add column resolved_by uuid references admin_users(id);
alter table payments drop constraint payments_payment_type_check;
alter table payments add constraint payments_payment_type_check check(payment_type in ('subscription','featured_profile','consultation','contact_unlock'));
alter table payments add column target_profile_id uuid references profiles(id);
create table contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  target_profile_id uuid not null references profiles(id) on delete cascade,
  payment_id uuid references payments(id),
  unlocked_at timestamptz not null default now(),
  unique(user_id,target_profile_id)
);
alter table contact_unlocks enable row level security;
create policy contact_unlocks_owner_read on contact_unlocks for select to authenticated
  using (exists(select 1 from users where users.id=contact_unlocks.user_id and users.auth_user_id=auth.uid()));
create policy admin_membership_self_read on admin_users for select to authenticated using(auth_user_id=auth.uid());
create policy activity_owner_read on activity_logs for select to authenticated using(user_id=auth.uid());
-- Usage writes are server-only; members must not manufacture entitlement usage.
create policy blocks_participant_read on blocked_users for select to authenticated using(auth.uid() in (blocker_user_id,blocked_user_id));
create policy blocks_owner_insert on blocked_users for insert to authenticated with check(blocker_user_id=auth.uid() and blocked_user_id<>auth.uid());
create policy blocks_owner_delete on blocked_users for delete to authenticated using(blocker_user_id=auth.uid());
create policy reports_owner_read on reports for select to authenticated using(reporter_user_id=auth.uid());
create policy reports_owner_insert on reports for insert to authenticated with check(reporter_user_id=auth.uid() and status='pending');
create policy verification_owner_read on verification_requests for select to authenticated using(user_id=auth.uid());
create policy verification_owner_insert on verification_requests for insert to authenticated with check(user_id=auth.uid() and status='pending' and reviewed_by is null);
create policy verification_owner_update on verification_requests for update to authenticated using(user_id=auth.uid() and status='pending') with check(user_id=auth.uid() and status='pending' and reviewed_by is null);
create policy horoscope_owner_delete on horoscope_uploads for delete to authenticated using(user_id=auth.uid());
create policy gallery_owner_update on gallery_images for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy gallery_owner_delete on gallery_images for delete to authenticated using(user_id=auth.uid());
drop policy "Users can insert own subscriptions" on subscriptions;

-- Row ownership alone must not allow a member to grant premium/admin status.
create or replace function public.guard_member_user_fields() returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in ('anon','authenticated') then
    if TG_OP='INSERT' then
      if new.id<>auth.uid() or new.auth_user_id<>auth.uid() or new.role<>'user' or new.status<>'active' or new.email_verified or new.mobile_verified then
        raise exception 'Protected account fields' using errcode='42501';
      end if;
    elsif new.id is distinct from old.id or new.auth_user_id is distinct from old.auth_user_id
      or new.role is distinct from old.role or new.status is distinct from old.status
      or new.email_verified is distinct from old.email_verified or new.mobile_verified is distinct from old.mobile_verified
      or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Protected account fields' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
create trigger guard_member_user_fields before insert or update on users for each row execute function guard_member_user_fields();
create or replace function public.guard_member_profile_fields() returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in ('anon','authenticated') and not exists(select 1 from public.admin_users where auth_user_id=auth.uid()) then
    if TG_OP='INSERT' then
      if new.is_verified or new.is_premium or new.is_suspended or new.moderation_status<>'pending' then
        raise exception 'Protected profile fields' using errcode='42501';
      end if;
    elsif new.is_verified is distinct from old.is_verified or new.is_premium is distinct from old.is_premium
      or new.is_suspended is distinct from old.is_suspended or new.moderation_status is distinct from old.moderation_status
      or new.moderated_by is distinct from old.moderated_by or new.user_id is distinct from old.user_id
      or (new.id_verification_status is distinct from old.id_verification_status and new.id_verification_status not in ('unverified','pending'))
      or (new.horoscope_verification_status is distinct from old.horoscope_verification_status and new.horoscope_verification_status not in ('unverified','pending')) then
      raise exception 'Protected profile fields' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
create trigger guard_member_profile_fields before insert or update on profiles for each row execute function guard_member_profile_fields();

alter function handle_new_user() set search_path=public,extensions;
alter function handle_accepted_match() set search_path=public;
alter function handle_updated_at() set search_path=public;
revoke execute on function handle_new_user(),handle_accepted_match(),handle_updated_at(),guard_member_user_fields(),guard_member_profile_fields() from public,anon,authenticated;
create function increment_coupon_uses(coupon_row_id uuid) returns void language sql set search_path=public as $$ update coupons set uses_count=uses_count+1 where id=coupon_row_id; $$;
revoke execute on function increment_coupon_uses(uuid) from public,anon,authenticated;
grant execute on function increment_coupon_uses(uuid) to service_role;

revoke all on all tables in schema public from anon,authenticated;
grant select on subscription_plans to anon,authenticated;
grant select,insert,update on users,profiles,partner_preferences to authenticated;
grant select,insert,update,delete on gallery_images,favorites,blocked_users,horoscope_uploads to authenticated;
grant select,insert,update on match_requests,verification_requests,deletion_requests,chat_messages to authenticated;
grant select,insert on chats,reports,consent_logs to authenticated;
grant select,update on notifications to authenticated;
grant select on admin_users,subscriptions,payments,transactions,featured_profiles,consultation_bookings,contact_unlocks,activity_logs to authenticated;
grant select,insert,update,delete on all tables in schema public to service_role;

insert into subscription_plans(id,name,price,duration_days,features) values
('0ffd3070-7aba-4554-8790-93c76b318df6','Startup Plan',0,3650,'{"contacts_limit":0,"horoscope_reports_limit":0,"consultations_limit":0}'),
('5d75dd4e-9e27-45aa-b9f5-0a71ff6327cf','Silver Plan',1499,30,'{"contacts_limit":15,"horoscope_reports_limit":1,"consultations_limit":0}'),
('d50e37d5-21df-454b-8ed8-0e7ddb33827c','Gold Plan',2999,90,'{"contacts_limit":30,"horoscope_reports_limit":5,"consultations_limit":1}'),
('b987dc02-0102-4279-b787-50987762532b','Diamond Plan',5999,180,'{"contacts_limit":60,"horoscope_reports_limit":10,"consultations_limit":5}');
notify pgrst,'reload schema';
`;
fs.mkdirSync('database',{recursive:true});
fs.writeFileSync(path.join('database','setup-recovered-source.sql'), archive+'\n'+schema+'\n'+extra);
console.log('Prepared reviewed setup SQL; no database changes performed.');
