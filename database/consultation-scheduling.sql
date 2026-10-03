alter table public.consultation_bookings add column meeting_url text, add column scheduled_at timestamptz;
create or replace function public.schedule_consultation(actor uuid,booking uuid,link text,appointment timestamptz) returns void language plpgsql security invoker set search_path='' as $$
declare target public.consultation_bookings;
begin
 if not exists(select 1 from public.admin_users where auth_user_id=actor and role in ('admin','super_admin','moderator')) then raise exception 'Administrator required'; end if;
 select * into target from public.consultation_bookings where id=booking for update;
 if target.id is null or target.payment_status<>'approved' then raise exception 'Approved booking required'; end if;
 if appointment<=now() then raise exception 'Future appointment required'; end if;
 update public.consultation_bookings set meeting_url=link,scheduled_at=appointment where id=booking;
 insert into public.activity_logs(action,metadata) values('ADMIN_SCHEDULE_CONSULTATION',jsonb_build_object('booking_id',booking,'target_user_id',target.user_id,'actor',actor,'scheduled_at',appointment));
 insert into public.notifications(user_id,title,message,type,is_read) values(target.user_id,'Consultation scheduled','Your consultation appointment has been scheduled. View My Bookings for the time and meeting link.','consultation',false);
end $$;
revoke all on function public.schedule_consultation(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.schedule_consultation(uuid,uuid,text,timestamptz) to service_role;
notify pgrst,'reload schema';
