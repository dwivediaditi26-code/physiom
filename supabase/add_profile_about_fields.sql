-- PhysioMind Pro — PhysioFeed About card fields
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Backs the new "Edit" button on the About card (components/profile/
-- AboutCard.jsx). That card was 100% hardcoded text before this -- "5+
-- years of experience", "Speaks: English, Hindi, Marathi", "Member: IAP,
-- WCPT" -- the same for every clinician, with no way to change it. The
-- profession-title row already reuses profiles.role (no new column
-- needed there -- same value ProfileHeader.jsx already shows and already
-- edits via "Edit Profile" -> Role/title). These three columns cover the
-- rest.
--
-- Defaults are deliberately EMPTY/false, not the old placeholder text --
-- same reasoning as education_entries/achievements not auto-filling real
-- clinicians with fake credentials (see add_profile_education_
-- achievements.sql). A brand-new real signed-in user gets a blank slate
-- to fill in via Edit, same as bio/location already do. db.js's
-- getProfile() keeps the OLD hardcoded text for the signed-out demo
-- profile only (CURRENT_USER in mockData.js), so nothing changes for a
-- guest browsing the demo.
--
-- No new RLS policies needed: profiles_update_own (add_profiles_table.sql)
-- already covers UPDATE on every column on your own row -- RLS is
-- row-level, not column-level -- and profiles_select_all already makes
-- these three columns publicly readable too, same as every other profile
-- field. Same "nothing new needed" note as add_profile_avatar.sql.

alter table profiles add column if not exists experience text not null default '';
alter table profiles add column if not exists languages text not null default '';
alter table profiles add column if not exists memberships text not null default '';
alter table profiles add column if not exists available_for_consults boolean not null default false;
