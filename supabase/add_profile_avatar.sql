-- PhysioMind Pro — PhysioFeed profile photo
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds a real avatar_url column to profiles so "Edit Profile" can upload
-- an actual photo instead of only picking a gradient color. Uses the
-- profile-images Storage bucket that add_media_storage.sql already
-- created (with RLS scoping uploads to your own folder, public read) --
-- nothing new needed there, just this one column. No new RLS policies
-- needed either: profiles_update_own already covers updating ANY column
-- on your own row (RLS is row-level, not column-level), and
-- profiles_select_all already makes the new column publicly readable,
-- same as every other profile field.

alter table profiles add column if not exists avatar_url text;
