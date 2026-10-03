alter table public.consultation_bookings add column duration_minutes integer not null default 30 check(duration_minutes in (30,60));
create function public.schedule_consultation_slot(actor uuid,booking uuid,link text,appointment timestamptz,minutes integer) returns void language plpgsql security invoker set search_path='' as $$
declare target public.consultation_bookings;
begin
 if not exists(select 1 from public.admin_users where auth_user_id=actor and role in ('admin','super_admin','moderator')) then raise exception 'Administrator required'; end if;
 if appointment is null or appointment<=now() or minutes is null or minutes not in (30,60) then raise exception 'Future appointment and valid duration required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('consultation_calendar',0));
 select * into target from public.consultation_bookings where id=booking for update;
 if target.id is null or target.payment_status<>'approved' then raise exception 'Approved booking required'; end if;
 if exists(select 1 from public.consultation_bookings b where b.id<>booking and b.payment_status='approved' and b.scheduled_at is not null
 and (b.user_id=target.user_id or b.astrologer_id=target.astrologer_id or b.astrologer_id is null or target.astrologer_id is null)
 and b.scheduled_at<appointment+make_interval(mins=>minutes)
 and b.scheduled_at+make_interval(mins=>b.duration_minutes)>appointment) then raise exception 'Appointment overlaps an existing booking'; end if;
 if target.meeting_url is not distinct from link and target.scheduled_at is not distinct from appointment and target.duration_minutes=minutes then return; end if;
 update public.consultation_bookings set meeting_url=link,scheduled_at=appointment,duration_minutes=minutes,consultation_date=(appointment at time zone 'Asia/Kolkata')::date where id=booking;
 insert into public.activity_logs(action,metadata) values('ADMIN_SCHEDULE_CONSULTATION',jsonb_build_object('booking_id',booking,'target_user_id',target.user_id,'actor',actor,'scheduled_at',appointment,'duration_minutes',minutes));
 insert into public.notifications(user_id,title,message,type,is_read) values(target.user_id,'Consultation scheduled','Your consultation appointment has been scheduled. View My Bookings for the time and meeting link.','consultation',false);
end $$;
revoke all on function public.schedule_consultation_slot(uuid,uuid,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.schedule_consultation_slot(uuid,uuid,text,timestamptz,integer) to service_role;
create or replace function public.schedule_consultation(actor uuid,booking uuid,link text,appointment timestamptz) returns void language sql security invoker set search_path='' as $$select public.schedule_consultation_slot(actor,booking,link,appointment,30);$$;
create or replace function private.guard_consultation_schedule() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('anon','authenticated') and not private.admin_verified() then
  if TG_OP='INSERT' then
   if new.meeting_url is not null or new.scheduled_at is not null or new.duration_minutes<>30 then raise exception 'Administrator scheduling required'; end if;
  elsif new.meeting_url is distinct from old.meeting_url or new.scheduled_at is distinct from old.scheduled_at or new.duration_minutes is distinct from old.duration_minutes then raise exception 'Administrator scheduling required'; end if;
 end if;
 return new;
end $$;
notify pgrst,'reload schema';
