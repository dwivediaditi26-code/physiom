-- PhysioMind Pro — private storage for the files attached to a patient (scans, lab reports, protocols)
-- Run this in: Supabase Dashboard → SQL Editor → New Query. Safe to run more than once.
--
-- Until now an attached file was kept INSIDE the patient record as text, which made every save bigger
-- and could fill the phone's small local storage. With this bucket the file itself is stored here and
-- the record keeps only a small reference to it (see src/patientFiles.js).
--
-- The bucket is PRIVATE: these are patient documents, so there is no public link. Each person can read,
-- add, replace and delete only files inside their own folder -- the first part of the path is their
-- user id: "<user id>/<document id>-<file name>" -- the same rule the PhysioFeed buckets use, checked
-- with storage.foldername().
--
-- Until this has been run the app keeps working: files stay inside the patient record as before.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-files', 'patient-files', false, 5242880,   -- 5 MB, the same limit the app enforces
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream']
)
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "patient_files_read_own" on storage.objects;
create policy "patient_files_read_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'patient-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "patient_files_insert_own" on storage.objects;
create policy "patient_files_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'patient-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "patient_files_update_own" on storage.objects;
create policy "patient_files_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'patient-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'patient-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "patient_files_delete_own" on storage.objects;
create policy "patient_files_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'patient-files' and (storage.foldername(name))[1] = auth.uid()::text);
