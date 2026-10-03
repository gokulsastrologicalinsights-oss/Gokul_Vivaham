
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

-- Supabase PostgreSQL Schema for Gokul Vivaham Matrimony Platform

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. USERS TABLE
create table users (
    id uuid primary key default gen_random_uuid(),
    auth_user_id uuid unique not null,
    
    email text unique,
    mobile_number varchar(15) unique,

    role varchar(20) default 'user',
    status varchar(20) default 'active',

    email_verified boolean default false,
    mobile_verified boolean default false,

    last_login_at timestamptz,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted_at timestamptz
);

-- 2. PROFILES TABLE
create table profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique references users(id) on delete cascade,

    profile_id varchar(20) unique not null,

    first_name varchar(100),
    last_name varchar(100),

    gender varchar(20),
    date_of_birth date,
    age integer,

    height_cm integer,
    weight_kg integer,

    marital_status varchar(50),

    religion varchar(100),
    caste varchar(100),
    sub_caste varchar(100),

    mother_tongue varchar(100),

    rasi varchar(100),
    nakshatra varchar(100),
    padam varchar(20),
    is_astro_valid boolean default true,
    gothram varchar(100),

    education varchar(255),
    occupation varchar(255),
    company_name varchar(255),

    annual_income numeric,

    country varchar(100),
    state varchar(100),
    city varchar(100),

    native_place varchar(255),

    father_name varchar(255),
    father_occupation varchar(255),

    mother_name varchar(255),
    mother_occupation varchar(255),

    siblings text,

    family_type varchar(100),

    physical_status varchar(100),

    about_me text,
    partner_expectations text,

    is_verified boolean default false,
    is_premium boolean default false,

    profile_completion integer default 0,

    visibility varchar(20) default 'public',

    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted_at timestamptz
);

-- 3. PARTNER PREFERENCES
create table partner_preferences (
    id uuid primary key default gen_random_uuid(),
    
    user_id uuid unique references users(id) on delete cascade,

    min_age integer,
    max_age integer,

    min_height integer,
    max_height integer,

    religion varchar(100),
    caste varchar(100),

    mother_tongue varchar(100),

    education text,
    occupation text,

    country varchar(100),
    state varchar(100),

    marital_status varchar(100),

    rasi varchar(100),
    nakshatra varchar(100),
    padam varchar(20),

    annual_income_min numeric,

    created_at timestamptz default now()
);

-- 4. HOROSCOPE UPLOADS
create table horoscope_uploads (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id) on delete cascade,

    file_url text not null,
    file_name text,

    file_type varchar(50),

    uploaded_at timestamptz default now()
);

-- 5. GALLERY IMAGES
create table gallery_images (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id) on delete cascade,

    image_url text not null,

    is_profile_picture boolean default false,
    is_private boolean default false,

    uploaded_at timestamptz default now()
);

-- 6. MATCH REQUESTS
create table match_requests (
    id uuid primary key default gen_random_uuid(),

    sender_user_id uuid references users(id) on delete cascade,
    receiver_user_id uuid references users(id) on delete cascade,

    status varchar(20) default 'pending',

    message text,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 7. SUBSCRIPTION PLANS
create table subscription_plans (
    id uuid primary key default gen_random_uuid(),

    name varchar(100),
    price numeric,

    duration_days integer,

    features jsonb,

    created_at timestamptz default now()
);

-- 8. USER SUBSCRIPTIONS
create table subscriptions (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id) on delete cascade,

    plan_id uuid references subscription_plans(id),

    payment_status varchar(50) check (payment_status in ('Completed', 'Expired', 'Pending', 'Failed')),

    start_date timestamptz,
    end_date timestamptz,

    razorpay_payment_id text,
    razorpay_subscription_id text,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 9. ADMIN USERS
create table admin_users (
    id uuid primary key default gen_random_uuid(),

    auth_user_id uuid unique not null,

    full_name varchar(255),

    email varchar(255) unique,

    role varchar(50) default 'admin',

    is_super_admin boolean default false,

    last_login_at timestamptz,

    created_at timestamptz default now()
);

-- 10. NOTIFICATIONS
create table notifications (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id) on delete cascade,

    title varchar(255),
    message text,

    type varchar(100),

    is_read boolean default false,

    created_at timestamptz default now()
);

-- 11. CHATS
create table chats (
    id uuid primary key default gen_random_uuid(),

    user_one uuid references users(id),
    user_two uuid references users(id),

    created_at timestamptz default now()
);

-- 12. CHAT MESSAGES
create table chat_messages (
    id uuid primary key default gen_random_uuid(),

    chat_id uuid references chats(id) on delete cascade,

    sender_id uuid references users(id),

    message text,

    image_url text,

    is_seen boolean default false,

    created_at timestamptz default now()
);

-- 13. FAVORITES / SHORTLIST
create table favorites (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id),
    favorite_user_id uuid references users(id),

    created_at timestamptz default now()
);

-- 14. BLOCKED USERS
create table blocked_users (
    id uuid primary key default gen_random_uuid(),

    blocker_user_id uuid references users(id),
    blocked_user_id uuid references users(id),

    reason text,

    created_at timestamptz default now()
);

-- 15. REPORTS TABLE
create table reports (
    id uuid primary key default gen_random_uuid(),

    reporter_user_id uuid references users(id),
    reported_user_id uuid references users(id),

    reason text,
    status varchar(20) default 'pending',

    created_at timestamptz default now()
);

-- 16. SUCCESS STORIES
create table success_stories (
    id uuid primary key default gen_random_uuid(),

    husband_user_id uuid references users(id),
    wife_user_id uuid references users(id),

    story text,

    wedding_date date,

    image_url text,

    created_at timestamptz default now()
);

-- 17. PROFILE VIEWS
create table profile_views (
    id uuid primary key default gen_random_uuid(),

    viewer_user_id uuid references users(id),
    viewed_user_id uuid references users(id),

    viewed_at timestamptz default now()
);

-- 18. VERIFICATION REQUESTS
create table verification_requests (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id),

    document_url text,

    status varchar(20) default 'pending',

    reviewed_by uuid references admin_users(id),

    reviewed_at timestamptz,

    created_at timestamptz default now()
);

-- 19. COMPATIBILITY SCORES
create table compatibility_scores (
    id uuid primary key default gen_random_uuid(),

    user_one uuid references users(id),
    user_two uuid references users(id),

    astrology_score integer,
    ai_score integer,
    total_score integer,

    notes text,

    calculated_at timestamptz default now()
);

-- 20. ACTIVITY LOGS
create table activity_logs (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id),

    action varchar(255),

    metadata jsonb,

    ip_address text,

    created_at timestamptz default now()
);


-- ROW LEVEL SECURITY (RLS)
alter table users enable row level security;
alter table profiles enable row level security;
alter table partner_preferences enable row level security;
alter table horoscope_uploads enable row level security;
alter table gallery_images enable row level security;
alter table match_requests enable row level security;
alter table subscription_plans enable row level security;
alter table subscriptions enable row level security;
alter table admin_users enable row level security;
alter table notifications enable row level security;
alter table chats enable row level security;
alter table chat_messages enable row level security;
alter table favorites enable row level security;
alter table blocked_users enable row level security;
alter table reports enable row level security;
alter table success_stories enable row level security;
alter table profile_views enable row level security;
alter table verification_requests enable row level security;
alter table compatibility_scores enable row level security;
alter table activity_logs enable row level security;


-- SAMPLE RLS POLICIES

-- Users can view own profile
create policy "Users can view own profile"
on profiles
for select
using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = profiles.user_id
    )
);

-- Admins can manage all profiles
create policy "Admins can manage all profiles"
on profiles
for all
using (
    exists (
        select 1 from admin_users
        where auth.uid() = admin_users.auth_user_id
    )
);

-- General read permission on profiles for authenticated users (public visibility)
create policy "Authenticated users can select public profiles"
on profiles
for select
using (
    auth.uid() is not null and visibility = 'public'
);

-- Users can insert own profile
create policy "Users can insert own profile"
on profiles
for insert
with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = profiles.user_id
    )
);

-- Users can update own profile
create policy "Users can update own profile"
on profiles
for update
using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = profiles.user_id
    )
);


-- RLS POLICIES FOR OTHER TABLES
create policy "Users can view own user row" on users for select using (auth.uid() = auth_user_id);
create policy "Users can insert own user row" on users for insert with check (auth.uid() = auth_user_id);
create policy "Users can update own user row" on users for update using (auth.uid() = auth_user_id);

create policy "Users can view own preferences" on partner_preferences for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = partner_preferences.user_id
    )
);
create policy "Users can insert own preferences" on partner_preferences for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = partner_preferences.user_id
    )
);
create policy "Users can update own preferences" on partner_preferences for update using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = partner_preferences.user_id
    )
);

create policy "Users can view own horoscope" on horoscope_uploads for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = horoscope_uploads.user_id
    )
);
create policy "Users can insert own horoscope" on horoscope_uploads for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = horoscope_uploads.user_id
    )
);

create policy "Users can view own gallery" on gallery_images for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = gallery_images.user_id
    )
);
create policy "Users can insert own gallery" on gallery_images for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = gallery_images.user_id
    )
);

create policy "Users can view own match requests" on match_requests for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and (users.id = match_requests.sender_user_id or users.id = match_requests.receiver_user_id)
    )
);
create policy "Users can insert own match requests" on match_requests for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = match_requests.sender_user_id
    )
);
create policy "Users can update own match requests" on match_requests for update using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and (users.id = match_requests.sender_user_id or users.id = match_requests.receiver_user_id)
    )
);

create policy "Users can view own chats" on chats for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and (users.id = chats.user_one or users.id = chats.user_two)
    )
);
create policy "Users can insert own chats" on chats for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and (users.id = chats.user_one or users.id = chats.user_two)
    )
);

create policy "Users can view messages in own chats" on chat_messages for select using (
    exists (
        select 1 from chats
        join users on users.auth_user_id = auth.uid()
        where chats.id = chat_messages.chat_id
          and (chats.user_one = users.id or chats.user_two = users.id)
    )
);
create policy "Users can insert messages in own chats" on chat_messages for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = chat_messages.sender_id
    ) and exists (
        select 1 from chats
        join users on users.auth_user_id = auth.uid()
        where chats.id = chat_messages.chat_id
          and (chats.user_one = users.id or chats.user_two = users.id)
    )
);

create policy "Users can view own notifications" on notifications for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = notifications.user_id
    )
);
create policy "Users can update own notifications" on notifications for update using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = notifications.user_id
    )
);

create policy "Users can view own favorites" on favorites for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = favorites.user_id
    )
);
create policy "Users can insert own favorites" on favorites for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = favorites.user_id
    )
);
create policy "Users can delete own favorites" on favorites for delete using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = favorites.user_id
    )
);

create policy "Users can view own subscriptions" on subscriptions for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = subscriptions.user_id
    )
);
create policy "Users can insert own subscriptions" on subscriptions for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = subscriptions.user_id
    )
);


-- INDEXING STRATEGY
create index idx_profiles_gender on profiles(gender);
create index idx_profiles_rasi on profiles(rasi);
create index idx_profiles_nakshatra on profiles(nakshatra);
create index idx_profiles_city on profiles(city);
create index idx_profiles_premium on profiles(is_premium);


-- TRIGGER FOR UPDATING TIMESTAMPS
create or replace function handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trigger_users_updated_at before update on users for each row execute procedure handle_updated_at();
create trigger trigger_profiles_updated_at before update on profiles for each row execute procedure handle_updated_at();
create trigger trigger_match_requests_updated_at before update on match_requests for each row execute procedure handle_updated_at();
create trigger trigger_subscriptions_updated_at before update on subscriptions for each row execute procedure handle_updated_at();


-- =========================================================================
-- COMPLIANCE AND SAFETY EXTENSIONS
-- =========================================================================

-- Consent Logs for DPDP Act Compliance
create table consent_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    consent_type varchar(50) not null, -- 'eligibility', 'terms_privacy', 'data_processing', 'info_accuracy'
    accepted boolean default true,
    policy_version varchar(10) not null,
    ip_address text,
    device_metadata text,
    created_at timestamptz default now()
);

-- User Deletion / Permanent Erasure requests (DPDP Act right to be forgotten)
create table deletion_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    status varchar(20) default 'pending', -- 'pending', 'completed', 'cancelled'
    is_permanent boolean default false,
    requested_at timestamptz default now(),
    completed_at timestamptz
);

-- Profiles Table Modifications for Moderation and Suspension
alter table profiles 
add column is_suspended boolean default false,
add column suspended_at timestamptz,
add column moderation_status varchar(20) default 'pending', -- 'pending', 'approved', 'rejected'
add column moderated_at timestamptz,
add column moderated_by uuid,
add column phone_visible boolean default false;

-- Gallery Images Table Modifications for Moderation Status
alter table gallery_images 
add column moderation_status varchar(20) default 'approved', -- 'pending', 'approved', 'rejected'
add column moderated_at timestamptz,
add column moderated_by uuid;

-- Enable Row Level Security (RLS)
alter table consent_logs enable row level security;
alter table deletion_requests enable row level security;

-- RLS Policies
create policy "Users can view own consent logs" on consent_logs for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = consent_logs.user_id
    )
);
create policy "Users can insert own consent logs" on consent_logs for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = consent_logs.user_id
    )
);

create policy "Users can view own deletion requests" on deletion_requests for select using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = deletion_requests.user_id
    )
);
create policy "Users can insert own deletion requests" on deletion_requests for insert with check (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = deletion_requests.user_id
    )
);
create policy "Users can update own deletion requests" on deletion_requests for update using (
    exists (
        select 1 from users
        where users.auth_user_id = auth.uid()
          and users.id = deletion_requests.user_id
    )
);


-- =========================================================================
-- SYSTEM TRIGGERS (AUTOMATIC PROFILE AND USER CREATION ON SIGNUP)
-- =========================================================================

-- Trigger function to automatically create public.users, public.profiles, etc.
-- when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
declare
  username text;
  first_name_val text;
  last_name_val text;
  profile_id_val text;
  gender_val text;
  dob_val date;
  age_val integer;
  marital_status_val text;
  religion_val text;
  caste_val text;
  sub_caste_val text;
  mother_tongue_val text;
  star_val text;
  rasi_val text;
  padam_val text;
  gothram_val text;
  height_val integer;
  weight_val integer;
  physical_status_val text;
  education_val text;
  occupation_val text;
  company_name_val text;
  annual_income_val numeric;
  city_val text;
  native_place_val text;
  father_name_val text;
  father_occupation_val text;
  mother_name_val text;
  mother_occupation_val text;
  siblings_val text;
  family_type_val text;
  about_me_val text;
  partner_expectations_val text;
begin
  -- 1. Insert into public.users
  insert into public.users (id, auth_user_id, email, role, status)
  values (new.id, new.id, new.email, 'user', 'active')
  on conflict (auth_user_id) do update 
  set email = excluded.email, updated_at = now();

  -- 2. Extract metadata fields
  username := coalesce(new.raw_user_meta_data->>'full_name', '');
  first_name_val := split_part(username, ' ', 1);
  last_name_val := substring(username from position(' ' in username) + 1);
  if last_name_val = username or last_name_val is null then
    last_name_val := '';
  end if;

  profile_id_val := 'GV' || replace(new.id::text, '-', '');
  gender_val := new.raw_user_meta_data->>'gender';
  dob_val := nullif(new.raw_user_meta_data->>'dob', '')::date;
  age_val := nullif(new.raw_user_meta_data->>'age', '')::integer;
  marital_status_val := new.raw_user_meta_data->>'maritalStatus';
  religion_val := coalesce(new.raw_user_meta_data->>'religion', 'Hindu');
  caste_val := new.raw_user_meta_data->>'caste';
  sub_caste_val := new.raw_user_meta_data->>'subCaste';
  mother_tongue_val := new.raw_user_meta_data->>'motherTongue';
  star_val := new.raw_user_meta_data->>'star';
  rasi_val := new.raw_user_meta_data->>'rasi';
  padam_val := new.raw_user_meta_data->>'padam';
  gothram_val := new.raw_user_meta_data->>'gothram';
  height_val := nullif(new.raw_user_meta_data->>'height', '')::integer;
  weight_val := nullif(new.raw_user_meta_data->>'weight', '')::integer;
  physical_status_val := coalesce(new.raw_user_meta_data->>'physicalStatus', 'Normal');
  education_val := new.raw_user_meta_data->>'education';
  occupation_val := new.raw_user_meta_data->>'occupation';
  company_name_val := new.raw_user_meta_data->>'companyName';
  annual_income_val := nullif(new.raw_user_meta_data->>'annualIncome', '')::numeric;
  city_val := new.raw_user_meta_data->>'workLocation';
  native_place_val := new.raw_user_meta_data->>'nativePlace';
  father_name_val := new.raw_user_meta_data->>'fatherName';
  father_occupation_val := new.raw_user_meta_data->>'fatherOccupation';
  mother_name_val := new.raw_user_meta_data->>'motherName';
  mother_occupation_val := new.raw_user_meta_data->>'motherOccupation';
  siblings_val := new.raw_user_meta_data->>'siblings';
  family_type_val := coalesce(new.raw_user_meta_data->>'familyType', 'Nuclear');
  about_me_val := new.raw_user_meta_data->>'aboutMe';
  partner_expectations_val := new.raw_user_meta_data->>'partnerExpectations';

  -- 3. Insert into public.profiles
  insert into public.profiles (
    user_id, profile_id, first_name, last_name, gender, date_of_birth, age,
    marital_status, religion, caste, sub_caste, mother_tongue, rasi, nakshatra, padam, gothram,
    height_cm, weight_kg, physical_status, education, occupation, company_name,
    annual_income, city, native_place, father_name, father_occupation, mother_name,
    mother_occupation, siblings, family_type, about_me, partner_expectations,
    is_verified, is_premium, profile_completion
  ) values (
    new.id, profile_id_val, first_name_val, last_name_val, gender_val, dob_val, age_val,
    marital_status_val, religion_val, caste_val, sub_caste_val, mother_tongue_val, rasi_val, star_val, padam_val, gothram_val,
    height_val, weight_val, physical_status_val, education_val, occupation_val, company_name_val,
    annual_income_val, city_val, native_place_val, father_name_val, father_occupation_val, mother_name_val,
    mother_occupation_val, siblings_val, family_type_val, about_me_val, partner_expectations_val,
    false, false, 40
  )
  on conflict (user_id) do nothing;

  -- 4. Insert into public.partner_preferences
  insert into public.partner_preferences (
    user_id, min_age, max_age, religion, caste, mother_tongue
  ) values (
    new.id,
    case when gender_val = 'Male' then 18 else 21 end,
    case when gender_val = 'Male' then 35 else 40 end,
    religion_val,
    caste_val,
    mother_tongue_val
  )
  on conflict (user_id) do nothing;

  -- 5. Insert into public.consent_logs
  insert into public.consent_logs (user_id, consent_type, accepted, policy_version, ip_address, device_metadata)
  values (
    new.id, 
    'eligibility', 
    coalesce((new.raw_user_meta_data->>'consentEligibility')::boolean, false), 
    '1.0', 
    coalesce(new.raw_user_meta_data->>'clientIp', '127.0.0.1'), 
    coalesce(new.raw_user_meta_data->>'userAgent', 'Unknown')
  );

  insert into public.consent_logs (user_id, consent_type, accepted, policy_version, ip_address, device_metadata)
  values (
    new.id, 
    'terms_privacy', 
    coalesce((new.raw_user_meta_data->>'consentTermsPrivacy')::boolean, false), 
    '1.0', 
    coalesce(new.raw_user_meta_data->>'clientIp', '127.0.0.1'), 
    coalesce(new.raw_user_meta_data->>'userAgent', 'Unknown')
  );

  insert into public.consent_logs (user_id, consent_type, accepted, policy_version, ip_address, device_metadata)
  values (
    new.id, 
    'data_processing', 
    coalesce((new.raw_user_meta_data->>'consentProcessing')::boolean, false), 
    '1.0', 
    coalesce(new.raw_user_meta_data->>'clientIp', '127.0.0.1'), 
    coalesce(new.raw_user_meta_data->>'userAgent', 'Unknown')
  );

  insert into public.consent_logs (user_id, consent_type, accepted, policy_version, ip_address, device_metadata)
  values (
    new.id, 
    'info_accuracy', 
    coalesce((new.raw_user_meta_data->>'consentAccuracy')::boolean, false), 
    '1.0', 
    coalesce(new.raw_user_meta_data->>'clientIp', '127.0.0.1'), 
    coalesce(new.raw_user_meta_data->>'userAgent', 'Unknown')
  );

  -- 6. Insert horoscope uploads (if file URL exists)
  if new.raw_user_meta_data->>'horoscopeUrl' is not null and new.raw_user_meta_data->>'horoscopeUrl' != '' then
    insert into public.horoscope_uploads (user_id, file_url, file_name, file_type)
    values (
      new.id,
      new.raw_user_meta_data->>'horoscopeUrl',
      coalesce(new.raw_user_meta_data->>'horoscopeFileName', 'horoscope.pdf'),
      coalesce(new.raw_user_meta_data->>'horoscopeFileType', 'application/pdf')
    );
  end if;

  -- 7. Insert gallery images (if profile photo URL exists)
  if new.raw_user_meta_data->>'profilePhotoUrl' is not null and new.raw_user_meta_data->>'profilePhotoUrl' != '' then
    insert into public.gallery_images (user_id, image_url, is_profile_picture, is_private, moderation_status)
    values (
      new.id,
      new.raw_user_meta_data->>'profilePhotoUrl',
      true,
      false,
      'approved'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute the function on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =========================================================================
-- SUBSCRIPTION AND PAYMENT INTEGRATION TABLES
-- =========================================================================

-- 21. COUPONS TABLE
create table coupons (
    id uuid primary key default gen_random_uuid(),
    code varchar not null unique,
    discount_type varchar not null check (discount_type in ('percentage', 'flat')),
    discount_value numeric not null,
    expiry_date timestamptz not null,
    max_uses integer default 100,
    uses_count integer default 0,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- 22. PAYMENTS TABLE
create table payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    amount numeric not null,
    currency varchar default 'INR',
    status varchar default 'pending' check (status in ('pending', 'completed', 'failed')),
    payment_type varchar not null check (payment_type in ('subscription', 'featured_profile', 'consultation')),
    razorpay_order_id varchar,
    razorpay_payment_id varchar,
    razorpay_signature varchar,
    razorpay_subscription_id varchar,
    coupon_id uuid references coupons(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 23. TRANSACTIONS TABLE
create table transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    payment_id uuid references payments(id) on delete set null,
    invoice_number varchar not null unique,
    amount numeric not null,
    tax numeric default 0,
    total_amount numeric not null,
    description text,
    status varchar default 'completed' check (status in ('pending', 'completed', 'failed')),
    created_at timestamptz default now()
);

-- 24. FEATURED PROFILES TABLE
create table featured_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    payment_id uuid references payments(id) on delete set null,
    start_date timestamptz not null,
    end_date timestamptz not null,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- 25. CONSULTATION BOOKINGS TABLE
create table consultation_bookings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    payment_id uuid references payments(id) on delete set null,
    astrologer_id uuid,
    consultation_reason varchar not null,
    horoscope_url text,
    consultation_date date not null,
    payment_status varchar default 'pending' check (payment_status in ('pending', 'approved', 'cancelled')),
    notes text,
    created_at timestamptz default now()
);


-- ROW LEVEL SECURITY (RLS) FOR NEW TABLES
alter table coupons enable row level security;
alter table payments enable row level security;
alter table transactions enable row level security;
alter table featured_profiles enable row level security;
alter table consultation_bookings enable row level security;


-- RLS POLICIES FOR SUBSCRIPTION AND PAYMENT TABLES

-- coupons
create policy "Anyone can select active coupons" on coupons for select using (is_active = true and expiry_date > now());
create policy "Admins can manage coupons" on coupons for all using (exists (select 1 from admin_users where auth.uid() = admin_users.auth_user_id));

-- payments
create policy "Users can view own payments" on payments for select using (exists (select 1 from users where users.auth_user_id = auth.uid() and users.id = payments.user_id));
create policy "Admins can view all payments" on payments for all using (exists (select 1 from admin_users where auth.uid() = admin_users.auth_user_id));

-- transactions
create policy "Users can view own transactions" on transactions for select using (exists (select 1 from users where users.auth_user_id = auth.uid() and users.id = transactions.user_id));
create policy "Admins can view all transactions" on transactions for all using (exists (select 1 from admin_users where auth.uid() = admin_users.auth_user_id));

-- featured_profiles
create policy "Anyone can view active featured profiles" on featured_profiles for select using (is_active = true and end_date > now());
create policy "Users can view own featured profile" on featured_profiles for select using (exists (select 1 from users where users.auth_user_id = auth.uid() and users.id = featured_profiles.user_id));
create policy "Admins can manage featured profiles" on featured_profiles for all using (exists (select 1 from admin_users where auth.uid() = admin_users.auth_user_id));

-- consultation_bookings
create policy "Users can manage own consultation bookings" on consultation_bookings for select using (exists (select 1 from users where users.auth_user_id = auth.uid() and users.id = consultation_bookings.user_id));
create policy "Users can insert own consultation bookings" on consultation_bookings for insert with check (exists (select 1 from users where users.auth_user_id = auth.uid() and users.id = consultation_bookings.user_id));
create policy "Users can update own consultation bookings" on consultation_bookings for update using (exists (select 1 from users where users.auth_user_id = auth.uid() and users.id = consultation_bookings.user_id));
create policy "Admins can manage all consultation bookings" on consultation_bookings for all using (exists (select 1 from admin_users where auth.uid() = admin_users.auth_user_id));

-- subscription_plans select and admin policies
drop policy if exists "Anyone can select subscription plans" on subscription_plans;
create policy "Anyone can select subscription plans" on subscription_plans for select using (true);
drop policy if exists "Admins can manage subscription plans" on subscription_plans;
create policy "Admins can manage subscription plans" on subscription_plans for all using (exists (select 1 from admin_users where auth.uid() = admin_users.auth_user_id));


-- INDEXING STRATEGY FOR SUBSCRIPTIONS AND PAYMENTS
create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_plan_id on subscriptions(plan_id);
create index idx_subscriptions_razorpay_subscription_id on subscriptions(razorpay_subscription_id);
create index idx_payments_user_id on payments(user_id);
create index idx_payments_razorpay_order_id on payments(razorpay_order_id);
create index idx_payments_razorpay_subscription_id on payments(razorpay_subscription_id);
create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_payment_id on transactions(payment_id);
create index idx_featured_profiles_user_id on featured_profiles(user_id);
create index idx_consultation_bookings_user_id on consultation_bookings(user_id);

-- Enforce one active subscription per user at database level
create unique index unique_active_subscription_per_user on subscriptions (user_id) where (payment_status = 'Completed');

-- 26. PROCESSED WEBHOOK EVENTS (Idempotency and Replay Attack Prevention)
create table processed_webhook_events (
    id uuid primary key default gen_random_uuid(),
    event_id varchar(255) unique not null,
    event_type varchar(255) not null,
    status varchar(50) default 'processing' check (status in ('processing', 'completed', 'failed')),
    payload jsonb,
    processed_at timestamptz default now(),
    error_message text
);

alter table processed_webhook_events enable row level security;

create policy "Admins can manage webhook logs" on processed_webhook_events for all using (
    exists (
        select 1 from admin_users where auth.uid() = admin_users.auth_user_id
    )
);


-- =========================================================================
-- 27. AUTOMATIC CHAT CREATION ON ACCEPTED MATCH REQUEST
-- =========================================================================

-- Trigger function to automatically create a chat room when match status is 'accepted'
create or replace function public.handle_accepted_match()
returns trigger as $$
begin
    if new.status = 'accepted' and (old.status is null or old.status = 'pending') then
        -- Prevent duplicate chats by checking if one exists in either direction
        if not exists (
            select 1 from public.chats 
            where (user_one = new.sender_user_id and user_two = new.receiver_user_id)
               or (user_one = new.receiver_user_id and user_two = new.sender_user_id)
        ) then
            insert into public.chats (user_one, user_two)
            values (new.sender_user_id, new.receiver_user_id);
        end if;
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute the function on match_requests updates
drop trigger if exists trigger_on_match_accepted on public.match_requests;
create trigger trigger_on_match_accepted
    after update on public.match_requests
    for each row execute procedure public.handle_accepted_match();






create trigger trigger_payments_updated_at before update on payments for each row execute procedure handle_updated_at();
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
