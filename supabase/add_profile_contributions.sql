-- PhysioMind Pro — PhysioFeed professional contributions
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Backs the "Professional Evidence / Contributions" section on the
-- profile page (src/physiofeed/components/profile/ProfessionalContributionsSection.jsx).
-- Before this migration that section read a hard-coded CONTRIBUTIONS list
-- from mockData.js -- so every signed-in clinician appeared to have
-- given the same three talks, and viewing someone ELSE's profile hid the
-- section entirely rather than misrepresent that list as theirs. This
-- table lets each clinician keep their own real workshops / conference
-- talks / guest lectures / awards, editable from their profile and
-- visible on other people's profiles when set.
--
-- Same shape as achievements / education_entries / publications: one row
-- per list item, scoped to its owner. Reads are public (other clinicians'
-- workshops and talks should be visible, same as their name or
-- certifications), writes are owner-only.
--
-- Safe to run before or after the app code ships: db.js's
-- getContributions() falls back to the demo CONTRIBUTIONS list on a
-- missing-table error, and getContributionsByUser() returns an empty
-- list rather than the demo one (see that function's comment for why).

create table if not exists contributions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'Workshop',
  title text not null,
  year text not null default '',
  location text not null default '',
  created_at timestamptz not null default now()
);
alter table contributions enable row level security;

create policy "contributions_select_all" on contributions
  for select using (true);
create policy "contributions_insert_own" on contributions
  for insert with check (auth.uid() = user_id);
create policy "contributions_update_own" on contributions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "contributions_delete_own" on contributions
  for delete using (auth.uid() = user_id);

create index if not exists contributions_user_idx on contributions (user_id, created_at);
