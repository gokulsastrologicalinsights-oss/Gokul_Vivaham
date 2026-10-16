-- Security-relevant schema captured read-only from production on 2026-10-15.
-- No member data. Non-security defaults/constraints and unrelated triggers are
-- omitted: use the staging API suite for full Supabase service verification.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth; create schema private; create schema storage;
create table public.verification_requests (
"id" uuid,
"user_id" uuid,
"document_url" text,
"status" character varying(20),
"reviewed_by" uuid,
"reviewed_at" timestamp with time zone,
"created_at" timestamp with time zone,
"verification_type" text,
"document_type" text,
"notes" text,
"updated_at" timestamp with time zone,
"rejection_reason" text
);
create table auth.users(id uuid primary key);
create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
create table storage.objects(id uuid,bucket_id text,name text,owner uuid,owner_id text);
create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
grant usage on schema public,private,auth,storage to anon,authenticated,service_role;
set check_function_bodies = false;
create table public."users" (
  "id" uuid,
  "auth_user_id" uuid,
  "email" text,
  "mobile_number" character varying(15),
  "role" character varying(20),
  "status" character varying(20),
  "email_verified" boolean,
  "mobile_verified" boolean,
  "last_login_at" timestamp with time zone,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);
alter table public."users" enable row level security;
create table public."profiles" (
  "id" uuid,
  "user_id" uuid,
  "profile_id" character varying(40),
  "first_name" character varying(100),
  "last_name" character varying(100),
  "gender" character varying(20),
  "date_of_birth" date,
  "age" integer,
  "height_cm" integer,
  "weight_kg" integer,
  "marital_status" character varying(50),
  "religion" character varying(100),
  "caste" character varying(100),
  "sub_caste" character varying(100),
  "mother_tongue" character varying(100),
  "rasi" character varying(100),
  "nakshatra" character varying(100),
  "padam" character varying(20),
  "is_astro_valid" boolean,
  "gothram" character varying(100),
  "education" character varying(255),
  "occupation" character varying(255),
  "company_name" character varying(255),
  "annual_income" numeric,
  "country" character varying(100),
  "state" character varying(100),
  "city" character varying(100),
  "native_place" character varying(255),
  "father_name" character varying(255),
  "father_occupation" character varying(255),
  "mother_name" character varying(255),
  "mother_occupation" character varying(255),
  "siblings" text,
  "family_type" character varying(100),
  "physical_status" character varying(100),
  "about_me" text,
  "partner_expectations" text,
  "is_verified" boolean,
  "is_premium" boolean,
  "profile_completion" integer,
  "visibility" character varying(20),
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "is_suspended" boolean,
  "suspended_at" timestamp with time zone,
  "moderation_status" character varying(20),
  "moderated_at" timestamp with time zone,
  "moderated_by" uuid,
  "phone_visible" boolean,
  "image_url" text,
  "star" character varying(100),
  "id_verification_status" text,
  "id_verification_document_url" text,
  "id_verification_type" text,
  "id_verification_rejection_reason" text,
  "horoscope_verification_status" text,
  "horoscope_verification_rejection_reason" text,
  "warning_count" integer,
  "warning_notes" text,
  "is_banned" boolean,
  "banned_at" timestamp with time zone,
  "profile_photo_visibility" text,
  "album_photo_visibility" text,
  "photo_replacement_count" integer
);
alter table public."profiles" enable row level security;
create table public."admin_users" (
  "id" uuid,
  "auth_user_id" uuid,
  "full_name" character varying(255),
  "email" character varying(255),
  "role" character varying(50),
  "is_super_admin" boolean,
  "last_login_at" timestamp with time zone,
  "created_at" timestamp with time zone,
  "password_login_allowed" boolean
);
alter table public."admin_users" enable row level security;
create table public."blocked_users" (
  "id" uuid,
  "blocker_user_id" uuid,
  "blocked_user_id" uuid,
  "reason" text,
  "created_at" timestamp with time zone
);
alter table public."blocked_users" enable row level security;
create table public."gallery_images" (
  "id" uuid,
  "user_id" uuid,
  "image_url" text,
  "is_profile_picture" boolean,
  "is_private" boolean,
  "uploaded_at" timestamp with time zone,
  "moderation_status" character varying(20),
  "moderated_at" timestamp with time zone,
  "moderated_by" uuid,
  "privacy_level" text,
  "sort_order" integer,
  "thumbnail_key" text,
  "display_key" text,
  "thumbnail_url" text,
  "rejection_reason" text,
  "crop_metadata" jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "image_format" text,
  "thumbnail_width" integer,
  "thumbnail_height" integer,
  "thumbnail_bytes" integer,
  "display_width" integer,
  "display_height" integer,
  "display_bytes" integer
);
alter table public."gallery_images" enable row level security;
create table public."favorites" (
  "id" uuid,
  "user_id" uuid,
  "favorite_user_id" uuid,
  "created_at" timestamp with time zone
);
alter table public."favorites" enable row level security;
create table public."match_requests" (
  "id" uuid,
  "sender_user_id" uuid,
  "receiver_user_id" uuid,
  "status" character varying(20),
  "message" text,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "responded_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone
);
alter table public."match_requests" enable row level security;
create table public."featured_profiles" (
  "id" uuid,
  "user_id" uuid,
  "payment_id" uuid,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "is_active" boolean,
  "created_at" timestamp with time zone
);
alter table public."featured_profiles" enable row level security;
create table public."membership_profile_views" (
  "id" uuid,
  "subscription_id" uuid,
  "viewer_user_id" uuid,
  "viewed_profile_id" uuid,
  "view_date_ist" date,
  "viewed_at" timestamp with time zone
);
alter table public."membership_profile_views" enable row level security;
create table public."success_stories" (
  "id" uuid,
  "husband_user_id" uuid,
  "wife_user_id" uuid,
  "story" text,
  "wedding_date" date,
  "image_url" text,
  "created_at" timestamp with time zone
);
alter table public."success_stories" enable row level security;
create table public."subscriptions" (
  "id" uuid,
  "user_id" uuid,
  "plan_id" uuid,
  "payment_status" character varying(50),
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "razorpay_payment_id" text,
  "razorpay_subscription_id" text,
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "grant_type" text
);
alter table public."subscriptions" enable row level security;
create table public."subscription_plans" (
  "id" uuid,
  "name" character varying(100),
  "price" numeric,
  "duration_days" integer,
  "features" jsonb,
  "created_at" timestamp with time zone,
  "description" text,
  "is_active" boolean,
  "contact_view_limit" integer,
  "messaging_enabled" boolean,
  "profile_visibility_benefit" text,
  "photo_viewing_enabled" boolean,
  "premium_badge_eligible" boolean,
  "search_enabled" boolean,
  "plan_key" text,
  "duration_unit" text,
  "duration_value" integer,
  "is_lifetime" boolean,
  "contact_viewing_enabled" boolean,
  "daily_profile_view_limit" integer,
  "horoscope_percentage_level" text,
  "detailed_report_limit" integer,
  "consultation_limit" integer,
  "advanced_filters_enabled" boolean,
  "interest_send_enabled" boolean,
  "is_most_popular" boolean
);
alter table public."subscription_plans" enable row level security;
create table public."chats" (
  "id" uuid,
  "user_one" uuid,
  "user_two" uuid,
  "created_at" timestamp with time zone
);
alter table public."chats" enable row level security;
create table public."chat_messages" (
  "id" uuid,
  "chat_id" uuid,
  "sender_id" uuid,
  "message" text,
  "image_url" text,
  "is_seen" boolean,
  "created_at" timestamp with time zone
);
alter table public."chat_messages" enable row level security;
create table public."contact_unlocks" (
  "id" uuid,
  "user_id" uuid,
  "target_profile_id" uuid,
  "payment_id" uuid,
  "unlocked_at" timestamp with time zone
);
alter table public."contact_unlocks" enable row level security;
CREATE OR REPLACE FUNCTION private.admin_verified()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select private.member_session_active() and auth.jwt()->>'aal'='aal2' and exists(select 1 from public.admin_users a where a.auth_user_id=auth.uid() and a.role in ('admin','super_admin','moderator')); $function$;

CREATE OR REPLACE FUNCTION private.chat_allowed(one uuid, two uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.member_session_active() and one <> two
  and exists(
    select 1 from public.users me
    where me.auth_user_id = auth.uid() and me.id in (one, two)
      and (
        exists(
          select 1 from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
          where s.user_id = me.id and s.payment_status = 'Completed' and s.end_date > now()
            and coalesce(s.start_date, '-infinity'::timestamptz) <= now() and p.messaging_enabled
        )
        or exists(
          select 1 from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id
          where s.user_id = case when me.id = one then two else one end
            and s.payment_status = 'Completed' and s.end_date > now()
            and coalesce(s.start_date, '-infinity'::timestamptz) <= now() and p.messaging_enabled
            and exists(
              select 1 from public.chats c join public.chat_messages m on m.chat_id = c.id
              where ((c.user_one = one and c.user_two = two) or (c.user_one = two and c.user_two = one))
                and m.sender_id = s.user_id and m.created_at >= s.start_date and m.created_at < s.end_date
            )
        )
      )
  )
  and (
    select count(*) = 2 from public.users u join public.profiles p on p.user_id = u.id
    where u.id in (one, two) and u.status = 'active' and u.deleted_at is null
      and p.deleted_at is null and not p.is_suspended
  )
  and exists(
    select 1 from public.match_requests r where r.status = 'accepted'
      and ((r.sender_user_id = one and r.receiver_user_id = two) or (r.sender_user_id = two and r.receiver_user_id = one))
  )
  and not exists(
    select 1 from public.blocked_users b
    where (b.blocker_user_id = one and b.blocked_user_id = two)
       or (b.blocked_user_id = one and b.blocker_user_id = two)
  );
$function$;

CREATE OR REPLACE FUNCTION private.guard_match_interest()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.member_session_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from auth.sessions s join public.users u on u.auth_user_id = s.user_id
    where s.id::text = auth.jwt()->>'session_id' and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now())
      and u.status = 'active' and u.deleted_at is null
      and not exists(select 1 from public.profiles p where p.user_id = u.id and (p.is_suspended or p.deleted_at is not null))
  );
$function$;

CREATE OR REPLACE FUNCTION private.profile_detail_allowed(target_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    exists(select 1 from public.admin_users a where a.auth_user_id = auth.uid() and a.role in ('admin','super_admin','moderator'))
    or exists(select 1 from public.users viewer where viewer.auth_user_id = auth.uid() and viewer.id = target_user)
    or exists(
      select 1 from public.membership_profile_views v
      join public.users viewer on viewer.id = v.viewer_user_id
      join public.profiles target on target.id = v.viewed_profile_id
      where viewer.auth_user_id = auth.uid() and target.user_id = target_user
        and v.view_date_ist = (now() at time zone 'Asia/Kolkata')::date
    )
    or exists(
      select 1 from public.success_stories story
      where target_user in (story.husband_user_id, story.wife_user_id)
    );
$function$;

CREATE OR REPLACE FUNCTION private.profile_discoverable(target uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select private.admin_verified() or exists(select 1 from public.users where id=target and auth_user_id=auth.uid())
 or (
 exists(select 1 from public.users u join public.profiles p on p.user_id=u.id where u.id=target and u.status='active' and u.deleted_at is null and p.visibility='public' and p.deleted_at is null and not p.is_suspended)
 and not exists(select 1 from public.blocked_users b join public.users viewer on viewer.auth_user_id=auth.uid() where (b.blocker_user_id=viewer.id and b.blocked_user_id=target) or (b.blocker_user_id=target and b.blocked_user_id=viewer.id))
 );
$function$;

CREATE OR REPLACE FUNCTION public.guard_member_profile_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user in ('anon', 'authenticated') and not private.admin_verified() then
    if TG_OP = 'INSERT' then
      if new.is_verified or new.is_premium or new.is_suspended
         or new.moderation_status <> 'pending'
         or coalesce(new.photo_replacement_count, 0) <> 0
         or new.image_url is not null then
        raise exception 'Protected profile fields' using errcode = '42501';
      end if;
    elsif new.is_verified is distinct from old.is_verified
      or new.is_premium is distinct from old.is_premium
      or new.is_suspended is distinct from old.is_suspended
      or new.moderation_status is distinct from old.moderation_status
      or new.moderated_by is distinct from old.moderated_by
      or new.user_id is distinct from old.user_id
      or new.photo_replacement_count is distinct from old.photo_replacement_count
      or new.image_url is distinct from old.image_url
      or (new.id_verification_status is distinct from old.id_verification_status
          and new.id_verification_status not in ('unverified', 'pending'))
      or (new.horoscope_verification_status is distinct from old.horoscope_verification_status
          and new.horoscope_verification_status not in ('unverified', 'pending')) then
      raise exception 'Protected profile fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_member_user_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$;

grant all on all tables in schema public,storage to anon,authenticated,service_role;
grant execute on all functions in schema private to authenticated,service_role;
create policy "Authenticated users can upload chat images" on "storage"."objects" as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'chat-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "Authenticated users can read chat images" on "storage"."objects" as PERMISSIVE for SELECT to authenticated using ((bucket_id = 'chat-images'::text));
create policy "Users can update their own chat images" on "storage"."objects" as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'chat-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "Users can delete their own chat images" on "storage"."objects" as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'chat-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "Authenticated users can upload photos" on "storage"."objects" as PERMISSIVE for INSERT to authenticated with check ((bucket_id = 'galleries'::text));
create policy "Users can update own photos" on "storage"."objects" as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'galleries'::text) AND (owner = auth.uid())));
create policy "Users can delete own photos" on "storage"."objects" as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'galleries'::text) AND (owner = auth.uid())));
create policy "Users can view own profile" on "public"."profiles" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = profiles.user_id)))));
create policy "Admins can manage all profiles" on "public"."profiles" as PERMISSIVE for ALL to public using (private.admin_verified()) with check (private.admin_verified());
create policy "Users can insert own profile" on "public"."profiles" as PERMISSIVE for INSERT to public with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = profiles.user_id)))));
create policy "Users can update own profile" on "public"."profiles" as PERMISSIVE for UPDATE to public using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = profiles.user_id)))));
create policy "Users can view own user row" on "public"."users" as PERMISSIVE for SELECT to public using ((auth.uid() = auth_user_id));
create policy "Users can insert own user row" on "public"."users" as PERMISSIVE for INSERT to public with check ((auth.uid() = auth_user_id));
create policy "Users can update own user row" on "public"."users" as PERMISSIVE for UPDATE to public using ((auth.uid() = auth_user_id));
create policy "Users can view own gallery" on "public"."gallery_images" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = gallery_images.user_id)))));
create policy "Users can insert own gallery" on "public"."gallery_images" as PERMISSIVE for INSERT to public with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = gallery_images.user_id)))));
create policy "Admins can manage featured profiles" on "public"."featured_profiles" as PERMISSIVE for ALL to public using (private.admin_verified()) with check (private.admin_verified());
create policy "Users can view own match requests" on "public"."match_requests" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND ((users.id = match_requests.sender_user_id) OR (users.id = match_requests.receiver_user_id))))));
create policy "Users can insert own match requests" on "public"."match_requests" as PERMISSIVE for INSERT to public with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = match_requests.sender_user_id)))));
create policy "Users can view own chats" on "public"."chats" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND ((users.id = chats.user_one) OR (users.id = chats.user_two))))));
create policy "Users can insert own chats" on "public"."chats" as PERMISSIVE for INSERT to public with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND ((users.id = chats.user_one) OR (users.id = chats.user_two))))));
create policy "Users can view messages in own chats" on "public"."chat_messages" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM (chats
     JOIN users ON ((users.auth_user_id = auth.uid())))
  WHERE ((chats.id = chat_messages.chat_id) AND ((chats.user_one = users.id) OR (chats.user_two = users.id))))));
create policy "Users can insert messages in own chats" on "public"."chat_messages" as PERMISSIVE for INSERT to public with check (((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = chat_messages.sender_id)))) AND (EXISTS ( SELECT 1
   FROM (chats
     JOIN users ON ((users.auth_user_id = auth.uid())))
  WHERE ((chats.id = chat_messages.chat_id) AND ((chats.user_one = users.id) OR (chats.user_two = users.id)))))));
create policy "Users can view own favorites" on "public"."favorites" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = favorites.user_id)))));
create policy "Users can insert own favorites" on "public"."favorites" as PERMISSIVE for INSERT to public with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = favorites.user_id)))));
create policy "Users can delete own favorites" on "public"."favorites" as PERMISSIVE for DELETE to public using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = favorites.user_id)))));
create policy "Users can view own subscriptions" on "public"."subscriptions" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = subscriptions.user_id)))));
create policy "active_member_session" on "public"."success_stories" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "blocks_owner_insert" on "public"."blocked_users" as PERMISSIVE for INSERT to authenticated with check (((blocker_user_id = auth.uid()) AND (blocked_user_id <> auth.uid())));
create policy "Anyone can view active featured profiles" on "public"."featured_profiles" as PERMISSIVE for SELECT to public using (((is_active = true) AND (end_date > now())));
create policy "Users can view own featured profile" on "public"."featured_profiles" as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = featured_profiles.user_id)))));
create policy "blocks_owner_delete" on "public"."blocked_users" as PERMISSIVE for DELETE to authenticated using ((blocker_user_id = auth.uid()));
create policy "Authenticated users can select public profiles" on "public"."profiles" as PERMISSIVE for SELECT to authenticated using ((((visibility)::text = 'public'::text) AND (NOT is_suspended) AND (deleted_at IS NULL)));
create policy "contact_unlocks_owner_read" on "public"."contact_unlocks" as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = contact_unlocks.user_id) AND (users.auth_user_id = auth.uid())))));
create policy "admin_membership_self_read" on "public"."admin_users" as PERMISSIVE for SELECT to authenticated using ((auth_user_id = auth.uid()));
create policy "blocks_participant_read" on "public"."blocked_users" as PERMISSIVE for SELECT to authenticated using (((auth.uid() = blocker_user_id) OR (auth.uid() = blocked_user_id)));
create policy "gallery_owner_update" on "public"."gallery_images" as PERMISSIVE for UPDATE to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
create policy "active_member_session" on "public"."users" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."profiles" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."gallery_images" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."favorites" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."blocked_users" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."match_requests" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."chat_messages" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."chats" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."admin_users" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."subscriptions" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."featured_profiles" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "active_member_session" on "public"."contact_unlocks" as RESTRICTIVE for ALL to authenticated using (private.member_session_active()) with check (private.member_session_active());
create policy "member_documents_insert" on "storage"."objects" as PERMISSIVE for INSERT to authenticated with check (((bucket_id = ANY (ARRAY['id-proofs'::text, 'horoscopes'::text])) AND private.member_session_active() AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "member_documents_read" on "storage"."objects" as PERMISSIVE for SELECT to authenticated using (((bucket_id = ANY (ARRAY['id-proofs'::text, 'horoscopes'::text])) AND private.member_session_active() AND (((storage.foldername(name))[1] = (auth.uid())::text) OR private.admin_verified())));
create policy "member_documents_delete" on "storage"."objects" as PERMISSIVE for DELETE to authenticated using (((bucket_id = ANY (ARRAY['id-proofs'::text, 'horoscopes'::text])) AND private.member_session_active() AND ((storage.foldername(name))[1] = (auth.uid())::text) AND (NOT (EXISTS ( SELECT 1
   FROM verification_requests v
  WHERE (v.document_url = objects.name))))));
create policy "owned_photo_upload" on "storage"."objects" as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'photos'::text) AND private.member_session_active() AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "owned_photo_read" on "storage"."objects" as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'photos'::text) AND private.member_session_active() AND (((storage.foldername(name))[1] = (auth.uid())::text) OR private.admin_verified())));
create policy "owned_photo_delete" on "storage"."objects" as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'photos'::text) AND private.member_session_active() AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "gallery_verified_admin" on "public"."gallery_images" as PERMISSIVE for ALL to authenticated using (private.admin_verified()) with check (private.admin_verified());
create policy "chat_membership_gate" on "public"."chats" as RESTRICTIVE for ALL to authenticated using (private.chat_allowed(user_one, user_two)) with check (private.chat_allowed(user_one, user_two));
create policy "message_membership_gate" on "public"."chat_messages" as RESTRICTIVE for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM chats c
  WHERE ((c.id = chat_messages.chat_id) AND private.chat_allowed(c.user_one, c.user_two))))) with check ((EXISTS ( SELECT 1
   FROM chats c
  WHERE ((c.id = chat_messages.chat_id) AND private.chat_allowed(c.user_one, c.user_two)))));
create policy "discovery_visibility_gate" on "public"."profiles" as RESTRICTIVE for SELECT to authenticated using (private.profile_discoverable(user_id));
create policy "recipient_read_receipt" on "public"."chat_messages" as PERMISSIVE for UPDATE to authenticated using (((sender_id <> auth.uid()) AND (EXISTS ( SELECT 1
   FROM chats c
  WHERE ((c.id = chat_messages.chat_id) AND private.chat_allowed(c.user_one, c.user_two)))))) with check (((sender_id <> auth.uid()) AND (is_seen = true) AND (EXISTS ( SELECT 1
   FROM chats c
  WHERE ((c.id = chat_messages.chat_id) AND private.chat_allowed(c.user_one, c.user_two))))));
create policy "Anyone can select active subscription plans" on "public"."subscription_plans" as PERMISSIVE for SELECT to public using ((is_active = true));
create policy "gallery_approved_public" on "public"."gallery_images" as PERMISSIVE for SELECT to authenticated using ((((moderation_status)::text = 'approved'::text) AND (deleted_at IS NULL) AND (privacy_level = 'public'::text) AND (NOT is_private) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = gallery_images.user_id) AND ((p.visibility)::text = 'public'::text) AND (NOT p.is_suspended) AND (p.deleted_at IS NULL))))));
create policy "Users can cancel own pending match requests" on "public"."match_requests" as PERMISSIVE for UPDATE to public using ((((status)::text = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = match_requests.sender_user_id)))))) with check ((((status)::text = 'cancelled'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = match_requests.sender_user_id))))));
create policy "Recipients can respond to pending match requests" on "public"."match_requests" as PERMISSIVE for UPDATE to public using ((((status)::text = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = match_requests.receiver_user_id)))))) with check ((((status)::text = ANY ((ARRAY['accepted'::character varying, 'declined'::character varying])::text[])) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.id = match_requests.receiver_user_id))))));
create policy "membership_profile_detail_gate" on "public"."profiles" as RESTRICTIVE for SELECT to authenticated using (( SELECT private.profile_detail_allowed(profiles.user_id) AS profile_detail_allowed));
alter table storage.objects enable row level security;
create trigger guard_member_user_fields before insert or update on public.users for each row execute function public.guard_member_user_fields();
create trigger guard_member_profile_fields before insert or update on public.profiles for each row execute function public.guard_member_profile_fields();
