begin;

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('profile-photos', 'profile-photos', true, 5242880)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists vmli_profile_photos_select on storage.objects;
create policy vmli_profile_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists vmli_profile_photos_insert on storage.objects;
create policy vmli_profile_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists vmli_profile_photos_update on storage.objects;
create policy vmli_profile_photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists vmli_profile_photos_delete on storage.objects;
create policy vmli_profile_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;