-- PhysioMind Pro — PhysioFeed Clinical Profile & CV
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Backs the new "Clinical" card on the About tab (components/profile/
-- ClinicalCard.jsx, RotationsCard.jsx) -- Aditi's brief: one form that
-- feeds two outputs, your public profile's credentials section AND a
-- pre-filled "Instant Apply" message on the Explore opportunities board
-- (see OpportunityChat.jsx). Same shape as every other PhysioFeed table
-- in this rollout: reads are public (people vetting a candidate need to
-- see rotations/skills/CV same as they already see bio/education),
-- writes are owner-only.
--
-- Defaults are blank/true-where-neutral, not fabricated sample data --
-- same reasoning as add_profile_about_fields.sql. open_to_work defaults
-- true (a brand-new clinician is presumed open until they say otherwise,
-- matching the wireframe's default-selected "Open to Internships & Jobs"
-- radio) -- everything else defaults empty/false.
--
-- phone is intentionally never read back by getProfileById() / shown on
-- ClinicalCard in read-only (public) mode -- "Phone (shared only with
-- applied clinics)" in the brief. It's only ever surfaced to whoever you
-- choose to message via OpportunityChat, same as typing it into a chat
-- yourself. profiles_update_own/profiles_select_all (add_profiles_table.sql)
-- still technically make the column public-readable at the DB layer (RLS
-- here is row-level, not column-level, same caveat every other profiles
-- migration in this rollout notes) -- the privacy is app-layer only.

alter table profiles add column if not exists clinical_title text not null default '';
alter table profiles add column if not exists college text not null default '';
alter table profiles add column if not exists phone text not null default '';
alter table profiles add column if not exists open_to_work boolean not null default true;
alter table profiles add column if not exists willing_to_relocate boolean not null default false;
alter table profiles add column if not exists skills text[] not null default '{}';
alter table profiles add column if not exists resume_url text;
alter table profiles add column if not exists resume_name text;

-- One row per rotation/posting, same list-of-owned-rows shape as
-- education_entries (add_profile_education_achievements.sql) -- plain
-- text fields rather than an enum so "Ortho & MSK OPD" vs "Orthopaedics
-- OPD" doesn't need a schema change; RotationsCard.jsx's datalist nudges
-- toward consistent wording without enforcing it server-side.
create table if not exists rotations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  department text not null,
  duration text not null default '',
  created_at timestamptz not null default now()
);
alter table rotations enable row level security;

create policy "rotations_select_all" on rotations
  for select using (true);
create policy "rotations_insert_own" on rotations
  for insert with check (auth.uid() = user_id);
create policy "rotations_update_own" on rotations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rotations_delete_own" on rotations
  for delete using (auth.uid() = user_id);

create index if not exists rotations_user_idx on rotations (user_id, created_at);

-- Resume/CV storage -- same public-bucket, own-folder-write shape as
-- add_media_storage.sql's post-images/post-videos/profile-images. Public
-- (not signed-URL) because the whole point is a recruiter can open
-- "View CV" straight from your profile with no auth of their own.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

create policy "resumes_public_read" on storage.objects
  for select using (bucket_id = 'resumes');
create policy "resumes_insert_own_folder" on storage.objects
  for insert with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resumes_delete_own" on storage.objects
  for delete using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
