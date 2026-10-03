alter table public.admin_users add column password_login_allowed boolean not null default false;
create unique index one_password_owner on public.admin_users ((password_login_allowed)) where password_login_allowed;
alter table public.admin_users add constraint admin_auth_user_fk foreign key(auth_user_id) references auth.users(id) on delete cascade;
create or replace function private.admin_verified() returns boolean
language sql stable security definer set search_path='' as $$
  select private.member_session_active() and exists (
    select 1 from public.admin_users a where a.auth_user_id=auth.uid() and a.role in ('admin','super_admin','moderator')
      and (auth.jwt()->>'aal'='aal2' or (a.password_login_allowed and not exists(
        select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified'
      )))
  );
$$;

-- All account/profile changes and their audit entries commit together.
create or replace function public.admin_edit_member(actor uuid, target uuid, account_patch jsonb, profile_patch jsonb)
returns void language plpgsql set search_path=public as $$
declare previous_account jsonb; previous_profile jsonb; next_account public.users; next_profile public.profiles;
begin
  if not exists(select 1 from admin_users where auth_user_id=actor and role in ('admin','super_admin')) then raise exception 'Administrator required'; end if;
  if exists(select 1 from admin_users where auth_user_id=target) then raise exception 'Administrator accounts cannot be changed here'; end if;
  select to_jsonb(u) into previous_account from users u where id=target for update;
  if previous_account is null then raise exception 'Member not found'; end if;
  next_account := jsonb_populate_record(null::public.users,previous_account || account_patch);
  update users set email=next_account.email,mobile_number=next_account.mobile_number,email_verified=next_account.email_verified,
    mobile_verified=next_account.mobile_verified,status=next_account.status where id=target;
  select to_jsonb(p) into previous_profile from profiles p where user_id=target for update;
  if previous_profile is not null then
    next_profile := jsonb_populate_record(null::public.profiles,previous_profile || profile_patch);
    update profiles set first_name=next_profile.first_name,last_name=next_profile.last_name,gender=next_profile.gender,
      date_of_birth=next_profile.date_of_birth,age=next_profile.age,height_cm=next_profile.height_cm,weight_kg=next_profile.weight_kg,
      marital_status=next_profile.marital_status,religion=next_profile.religion,caste=next_profile.caste,sub_caste=next_profile.sub_caste,
      mother_tongue=next_profile.mother_tongue,rasi=next_profile.rasi,nakshatra=next_profile.nakshatra,padam=next_profile.padam,gothram=next_profile.gothram,
      education=next_profile.education,occupation=next_profile.occupation,company_name=next_profile.company_name,annual_income=next_profile.annual_income,
      country=next_profile.country,state=next_profile.state,city=next_profile.city,native_place=next_profile.native_place,
      father_name=next_profile.father_name,father_occupation=next_profile.father_occupation,mother_name=next_profile.mother_name,mother_occupation=next_profile.mother_occupation,
      siblings=next_profile.siblings,family_type=next_profile.family_type,physical_status=next_profile.physical_status,about_me=next_profile.about_me,
      partner_expectations=next_profile.partner_expectations,is_verified=next_profile.is_verified,visibility=next_profile.visibility,
      is_suspended=next_profile.is_suspended,moderation_status=next_profile.moderation_status where user_id=target;
  end if;
  insert into activity_logs(user_id,action,metadata) values(actor,'ADMIN_EDIT_MEMBER',jsonb_build_object('target_user_id',target,'account_changes',account_patch,'profile_changes',profile_patch));
end $$;
create or replace function public.admin_delete_member(actor uuid, target uuid, restore boolean default false)
returns void language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from admin_users where auth_user_id=actor and role in ('admin','super_admin')) then raise exception 'Administrator required'; end if;
  if exists(select 1 from admin_users where auth_user_id=target) then raise exception 'Administrator accounts cannot be deleted here'; end if;
  perform 1 from users where id=target for update;
  if not found then raise exception 'Member not found'; end if;
  update users set deleted_at=case when restore then null else now() end,status=case when restore then 'active' else 'deleted' end where id=target;
  update profiles set deleted_at=case when restore then null else now() end,is_suspended=not restore where user_id=target;
  insert into activity_logs(user_id,action,metadata) values(actor,case when restore then 'ADMIN_RESTORE_MEMBER' else 'ADMIN_DELETE_MEMBER' end,jsonb_build_object('target_user_id',target));
end $$;
revoke execute on function public.admin_edit_member(uuid,uuid,jsonb,jsonb),public.admin_delete_member(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_edit_member(uuid,uuid,jsonb,jsonb),public.admin_delete_member(uuid,uuid,boolean) to service_role;
notify pgrst,'reload schema';
