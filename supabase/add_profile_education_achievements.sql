-- PhysioMind Pro — PhysioFeed education, certifications & achievements
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Backs the new "Edit" buttons on the About tab's Education & certifications
-- and Achievements cards (src/physiofeed/components/profile/EducationCard.jsx,
-- AchievementsCard.jsx). Before this migration those two cards showed fixed
-- placeholder text ("MPT — Orthopaedics", "Top Contributor", etc.) for every
-- clinician with no way to change it -- these two tables let each clinician
-- keep their own real list, editable from their profile.
--
-- Same shape as every other PhysioFeed table: one row per list item, scoped
-- to its owner. Reads are public (profiles_select_all in
-- add_profiles_table.sql already established that pattern -- other
-- clinicians' credentials/achievements should be visible, same as their
-- name or bio), writes are owner-only. Unlike profiles (one row per user,
-- no delete policy), these ARE deletable by design -- removing an entry
-- from the list is a normal, expected action here.
--
-- Safe to run before or after the app code that uses it ships: db.js's
-- getEducation()/getAchievements() already catch a missing table and fall
-- back to the old placeholder list, so nothing breaks either order. The
-- new "Add"/"Edit"/"Delete" actions do need this run first, though --
-- until then they'll show a real error instead of silently doing nothing.

create table if not exists education_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  icon_name text not null default 'GraduationCap',
  created_at timestamptz not null default now()
);
alter table education_entries enable row level security;

create policy "education_entries_select_all" on education_entries
  for select using (true);
create policy "education_entries_insert_own" on education_entries
  for insert with check (auth.uid() = user_id);
create policy "education_entries_update_own" on education_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "education_entries_delete_own" on education_entries
  for delete using (auth.uid() = user_id);

create index if not exists education_entries_user_idx on education_entries (user_id, created_at);

create table if not exists achievements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  icon_name text not null default 'Trophy',
  tone text not null default 'text-amber-500',
  created_at timestamptz not null default now()
);
alter table achievements enable row level security;

create policy "achievements_select_all" on achievements
  for select using (true);
create policy "achievements_insert_own" on achievements
  for insert with check (auth.uid() = user_id);
create policy "achievements_update_own" on achievements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "achievements_delete_own" on achievements
  for delete using (auth.uid() = user_id);

create index if not exists achievements_user_idx on achievements (user_id, created_at);
