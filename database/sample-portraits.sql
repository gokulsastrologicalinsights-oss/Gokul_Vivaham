alter table public.sample_profiles add column if not exists portrait_id text;
update public.sample_profiles set portrait_id=id where portrait_id is null;
alter table public.sample_profiles add constraint sample_portrait_id_valid check (portrait_id ~ '^sample-[mf](0[1-9]|10)$');
notify pgrst,'reload schema';
delete from public.sample_profiles where id not in ('sample-m01','sample-m02','sample-m03','sample-f01','sample-f02','sample-f03');
