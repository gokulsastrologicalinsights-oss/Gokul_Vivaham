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

  return new;
end;
$$ language plpgsql security definer;


alter function public.handle_new_user() set search_path=public,extensions;
revoke execute on function public.handle_new_user() from public,anon,authenticated;

