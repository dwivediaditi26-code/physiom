-- PhysioMind Pro — PhysioFeed Clinical Profile, Evidence & Contributions, Opportunities
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Backs the 2026-09-22 profile redesign (Aditi's "PhysioFeed Therapist
-- Profile" spec): a new Clinical tab (components/profile/
-- ClinicalProfileTab.jsx), a new Evidence tab (EvidenceContributionsTab.jsx)
-- and a real multi-select "Open to Opportunities" status (ProfileHeader.jsx,
-- EditClinicalProfileModal.jsx) replacing the old open_to_work boolean.
-- Same "run this manually, db.js falls back to the demo list on ANY
-- failure (table/column doesn't exist yet, not signed in)" shape as every
-- other PhysioFeed migration -- safe to run before or after the app code
-- that reads these columns ships.
--
-- Fixed-taxonomy fields (area_of_practice, clinical_skills_*,
-- patient_populations, open_to_types) are still plain text[] columns, not
-- enums -- same reasoning as skills/willing_to_relocate elsewhere in this
-- rollout: the UI (ClinicalProfileTab.jsx) is what enforces the fixed
-- option list, so adding/renaming an option later never needs a schema
-- migration. Defaults are all blank/empty, not fabricated sample content.

alter table profiles add column if not exists headline text not null default '';
alter table profiles add column if not exists area_of_practice text[] not null default '{}';
alter table profiles add column if not exists clinical_interests text[] not null default '{}';
alter table profiles add column if not exists clinical_skills_assessment text[] not null default '{}';
alter table profiles add column if not exists clinical_skills_treatment text[] not null default '{}';
alter table profiles add column if not exists patient_populations text[] not null default '{}';
alter table profiles add column if not exists clinical_approach text not null default '';
alter table profiles add column if not exists research_interests text[] not null default '{}';
-- Replaces open_to_work (still kept -- see add_profile_clinical_cv.sql --
-- so a row from before this migration doesn't silently look "closed"; the
-- UI now derives its own boolean from open_to_types.length > 0 instead of
-- reading open_to_work directly).
alter table profiles add column if not exists open_to_types text[] not null default '{}';

-- Certifications (achievements table, add_profile_education_achievements.sql)
-- gets the fields the Licenses & Certifications section of the spec asks
-- for. verified defaults false and is NOT settable from any user-facing
-- form (see EditAchievementsModal.jsx) -- there's no admin/staff
-- verification flow yet, and the spec is explicit: "do not visually imply
-- a certification is verified unless PhysioFeed actually verifies it."
alter table achievements add column if not exists issuer text not null default '';
alter table achievements add column if not exists year text not null default '';
alter table achievements add column if not exists month text not null default '';
alter table achievements add column if not exists credential_id text not null default '';
alter table achievements add column if not exists verified boolean not null default false;

-- Education & certifications (education_entries table,
-- add_profile_education_achievements.sql) gets the same month/year an
-- entry was earned -- Aditi: "year month in education an[d] certification".
-- Plain text, not a date type: a degree only ever needs "when", never a
-- specific day, same reasoning as achievements.year above.
alter table education_entries add column if not exists month text not null default '';
alter table education_entries add column if not exists year text not null default '';

-- Publications (spec section 9's "If the therapist has publications...").
-- Same list-of-owned-rows shape as education_entries/achievements: public
-- read (a recruiter or peer should be able to see them), owner-only write.
create table if not exists publications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  journal text not null default '',
  year text not null default '',
  authors text not null default '',
  doi_url text not null default '',
  created_at timestamptz not null default now()
);
alter table publications enable row level security;

create policy "publications_select_all" on publications
  for select using (true);
create policy "publications_insert_own" on publications
  for insert with check (auth.uid() = user_id);
create policy "publications_update_own" on publications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "publications_delete_own" on publications
  for delete using (auth.uid() = user_id);

create index if not exists publications_user_idx on publications (user_id, created_at);
