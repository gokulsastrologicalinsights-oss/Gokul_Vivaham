-- Additive hardening for the audited, recovered-source production schema.
-- No member data is rewritten. Existing permissive and restrictive policies remain.
begin;

create or replace function private.profile_discoverable(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.member_session_active() and (
    private.admin_verified()
    or exists(select 1 from public.users u where u.id = target and u.auth_user_id = auth.uid())
    or exists(
      select 1 from public.users viewer
      join public.profiles mine on mine.user_id = viewer.id
      join public.users candidate on candidate.id = target
      join public.profiles p on p.user_id = candidate.id
      where viewer.auth_user_id = auth.uid()
        and viewer.status = 'active' and viewer.deleted_at is null
        and mine.deleted_at is null and mine.is_suspended = false and mine.is_banned = false
        and ((mine.gender = 'Male' and p.gender = 'Female')
          or (mine.gender = 'Female' and p.gender = 'Male'))
        and candidate.status = 'active' and candidate.deleted_at is null
        and p.visibility = 'public' and p.deleted_at is null
        and p.is_suspended = false and p.is_banned = false
        and not exists(select 1 from public.blocked_users b
          where (b.blocker_user_id = viewer.id and b.blocked_user_id = target)
             or (b.blocker_user_id = target and b.blocked_user_id = viewer.id))
    )
  ), false);
$$;
alter function private.profile_discoverable(uuid) owner to postgres;
revoke all on function private.profile_discoverable(uuid) from public, anon, authenticated, service_role;
grant execute on function private.profile_discoverable(uuid) to authenticated;

-- A deliberately small RPC for server endpoints using privileged reads. The
-- target is an identifier only; caller identity/role/gender always come from JWT/DB.
create function public.can_discover_profile(target_user uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.profile_discoverable(target_user);
$$;
revoke all on function public.can_discover_profile(uuid) from public, anon, service_role;
grant execute on function public.can_discover_profile(uuid) to authenticated;

alter table public.profiles enable row level security;
-- Never grant other members the entire physical row (DOB, document references,
-- moderation notes). Cards and details use explicit allowlists instead. Owners
-- retain SELECT needed by their existing edit-profile UPDATE flow.
create policy profile_private_fields_gate on public.profiles as restrictive
for select to authenticated using (
  private.admin_verified() or exists(select 1 from public.users u
    where u.id = profiles.user_id and u.auth_user_id = auth.uid())
);
-- The pre-existing discovery_visibility_gate already calls the replaced helper.
-- Add an explicit gate as well so installation cannot depend on that old policy.
create policy opposite_gender_profile_gate on public.profiles as restrictive
for select to authenticated using (private.profile_discoverable(user_id));
create policy profile_no_anonymous_read on public.profiles as restrictive
for select to anon using (false);

-- Registration can set a gender; a member cannot switch an established gender
-- or ownership to change who they may discover. Missing/invalid legacy values
-- stay excluded and may be corrected once. Admin corrections use existing APIs.
create function private.guard_discovery_identity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') and not private.admin_verified() then
    if new.id is distinct from old.id or new.user_id is distinct from old.user_id
      or (new.gender is distinct from old.gender and
        (old.gender in ('Male','Female') or new.gender is null or new.gender not in ('Male','Female'))) then
      raise exception 'Profile identity changes require an administrator' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_discovery_identity() from public, anon, authenticated;
create trigger guard_discovery_identity before update on public.profiles
for each row execute function private.guard_discovery_identity();

create policy featured_discovery_gate on public.featured_profiles as restrictive
for select to authenticated using (private.profile_discoverable(user_id));
create policy featured_no_anonymous_read on public.featured_profiles as restrictive
for select to anon using (false);
create policy favorite_eligible_insert on public.favorites as restrictive
for insert to authenticated with check (private.profile_discoverable(favorite_user_id));
create policy interest_eligible_insert on public.match_requests as restrictive
for insert to authenticated with check (private.profile_discoverable(receiver_user_id));
-- Existing interest transitions and chat/message participant policies are left
-- intact, including paid-initiated free replies and accepted-match history.

-- Gallery metadata is subject to both the existing policies and eligibility.
create policy gallery_discovery_gate on public.gallery_images as restrictive
for select to authenticated using (private.profile_discoverable(user_id));

-- Raw Supabase photo downloads remain owner/admin only. Member images are served
-- by the existing authenticated /api/photos and R2 signed-URL authorization.
-- Restrictive gates also cap any legacy permissive bucket policies.
create policy private_photo_storage_gate on storage.objects as restrictive
for select to authenticated using (
  bucket_id not in ('photos','galleries') or
  (private.member_session_active() and
    ((storage.foldername(name))[1] = auth.uid()::text or private.admin_verified()))
);
create policy private_photo_storage_anon_gate on storage.objects as restrictive
for select to anon using (bucket_id not in ('photos','galleries','chat-images'));

-- The legacy chat-images policy grants every member SELECT. Narrow it to the
-- uploader or authorized participants of a message sent by that uploader.
-- Definer scope is limited to a boolean: the receiver's users RLS otherwise
-- hides the sender's auth ID needed to verify upload ownership.
create function private.chat_image_readable(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.member_session_active() and (
    (storage.foldername(object_name))[1] = auth.uid()::text or private.admin_verified()
    or exists(select 1 from public.chat_messages m
      join public.chats c on c.id = m.chat_id
      join public.users sender on sender.id = m.sender_id
      where sender.auth_user_id::text = (storage.foldername(object_name))[1]
        and private.chat_allowed(c.user_one,c.user_two)
        and (m.image_url = object_name or
          m.image_url like '%/storage/v1/object/%/chat-images/' || object_name))
  ),false);
$$;
alter function private.chat_image_readable(text) owner to postgres;
revoke all on function private.chat_image_readable(text) from public,anon,service_role;
grant execute on function private.chat_image_readable(text) to authenticated;
create policy chat_image_participant_gate on storage.objects as restrictive
for select to authenticated using (
  bucket_id <> 'chat-images' or private.chat_image_readable(name)
);

-- Safe card projection: no DOB, contact details, document keys or moderation
-- notes. SECURITY DEFINER is needed to avoid the full-row membership detail gate;
-- the trusted eligibility predicate is mandatory before count/order/limit.
create function public.discover_profile_cards(filters jsonb default '{}',
  page_size integer default 500, page_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare viewer uuid; eligible_gender text; administrator boolean; result jsonb;
begin
  if not private.member_session_active() then
    raise exception 'Active session required' using errcode = '42501';
  end if;
  if filters is null or jsonb_typeof(filters) <> 'object' or
    page_size is null or page_size < 1 or page_size > 500 or
    page_offset is null or page_offset < 0 then
    raise exception 'Invalid discovery filters' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_object_keys(filters) k where k not in
    ('gender','ageMin','ageMax','religion','caste','rasi','star','padam','location',
     'profession','featured','recent','shortlisted','userIds')) then
    raise exception 'Unsupported discovery filter' using errcode = '22023';
  end if;
  select u.id, case p.gender when 'Male' then 'Female' when 'Female' then 'Male' end
    into viewer, eligible_gender from public.users u
    left join public.profiles p on p.user_id = u.id where u.auth_user_id = auth.uid();
  administrator := private.admin_verified();
  if not administrator and eligible_gender is null then
    return jsonb_build_object('profiles','[]'::jsonb,'total',0,'eligibleGender',null);
  end if;
  if not administrator and exists(select 1 from jsonb_each_text(filters) f
    where f.key in ('caste','rasi','star','padam','location','profession') and coalesce(f.value,'') <> '')
    and not exists(select 1 from public.subscriptions s
      join public.subscription_plans plan on plan.id = s.plan_id
      where s.user_id = viewer and s.payment_status = 'Completed'
        and coalesce(s.start_date,'-infinity'::timestamptz) <= now()
        and (plan.is_lifetime or s.end_date > now()) and plan.advanced_filters_enabled) then
    raise exception 'Advanced search requires an active plan' using errcode = '42501';
  end if;
  with eligible as materialized (
    select p.id,p.user_id,p.profile_id,p.first_name,p.last_name,p.gender,p.age,
      p.height_cm,p.religion,p.caste,p.sub_caste,p.rasi,p.nakshatra,p.padam,p.gothram,
      p.city,p.native_place,p.education,p.occupation,p.company_name,p.annual_income,
      p.about_me,p.family_type,p.siblings,p.is_verified,p.marital_status,
      p.id_verification_status,p.horoscope_verification_status,p.created_at,
      jsonb_build_object('email_verified',u.email_verified,'mobile_verified',u.mobile_verified) as users,
      exists(select 1 from public.subscriptions s join public.subscription_plans plan on plan.id=s.plan_id
        where s.user_id=p.user_id and s.payment_status='Completed' and plan.price>0
          and coalesce(s.start_date,'-infinity'::timestamptz)<=now() and s.end_date>now()) as is_premium,
      exists(select 1 from public.featured_profiles f where f.user_id=p.user_id
        and f.is_active and f.end_date > now()) as is_featured
    from public.profiles p join public.users u on u.id = p.user_id
    where p.user_id <> viewer and private.profile_discoverable(p.user_id)
      and (nullif(filters->>'gender','') is null or p.gender = filters->>'gender')
      and (nullif(filters->>'ageMin','') is null or p.age >= (filters->>'ageMin')::integer)
      and (nullif(filters->>'ageMax','') is null or p.age <= (filters->>'ageMax')::integer)
      and (nullif(filters->>'religion','') is null or p.religion = filters->>'religion')
      and (nullif(filters->>'caste','') is null or p.caste ilike '%' || (filters->>'caste') || '%')
      and (nullif(filters->>'rasi','') is null or p.rasi = filters->>'rasi')
      and (nullif(filters->>'star','') is null or p.nakshatra ilike '%' || (filters->>'star') || '%')
      and (nullif(filters->>'padam','') is null or p.padam = filters->>'padam')
      and (nullif(filters->>'location','') is null or p.city ilike '%' || (filters->>'location') || '%')
      and (nullif(filters->>'profession','') is null or p.education ilike '%' || (filters->>'profession') || '%')
      and (coalesce((filters->>'recent')::boolean,false) = false or p.is_verified)
      and (coalesce((filters->>'shortlisted')::boolean,false) = false or exists(
        select 1 from public.favorites f where f.user_id = viewer and f.favorite_user_id = p.user_id))
      and (not filters ? 'userIds' or p.user_id in
        (select value::uuid from jsonb_array_elements_text(filters->'userIds')))
  ), filtered as materialized (
    select * from eligible where coalesce((filters->>'featured')::boolean,false) = false or is_featured
  ), page as (
    select * from filtered order by created_at desc nulls last, id limit page_size offset page_offset
  )
  select jsonb_build_object('profiles',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc nulls last,id) from page),'[]'::jsonb),
    'total',(select count(*) from filtered),'eligibleGender',eligible_gender) into result;
  return result;
end;
$$;
alter function public.discover_profile_cards(jsonb,integer,integer) owner to postgres;
revoke all on function public.discover_profile_cards(jsonb,integer,integer) from public, anon, service_role;
grant execute on function public.discover_profile_cards(jsonb,integer,integer) to authenticated;

notify pgrst, 'reload schema';
commit;
