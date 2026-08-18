-- PhysioMind Pro — PhysioFeed profiles table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Backs src/physiofeed/data/db.js's getProfile() (already wired to read/
-- create real rows here as of the commit that added this file) -- until
-- this table exists, getProfile() catches the "relation does not exist"
-- error and quietly falls back to the shared demo profile, so the app
-- keeps working either way. This is the piece that turns that fallback
-- off: every signed-in clinician gets their own real PhysioFeed identity
-- instead of everyone seeing "Dr. Aditi Sharma, PT".
--
-- Column shapes match CURRENT_USER in src/physiofeed/data/mockData.js and
-- the defaults getProfile() inserts on a clinician's first PhysioFeed
-- visit -- no app-side rename needed after this runs.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'New Physiotherapist',
  role text not null default 'Physiotherapist',
  verified boolean not null default false,
  gradient text not null default 'violet',
  initials text not null default 'P',
  location text not null default '',
  bio text not null default '',
  quote text not null default '',
  followers_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Profiles are meant to be publicly viewable within the app -- PhysioFeed's
-- People page, post authors, and follower lists all need to read OTHER
-- clinicians' profiles, not just your own. This is the one place a broad
-- SELECT policy is actually correct (same as any social app: profiles are
-- public, only writes need owner-scoping). The mistake to avoid is the
-- patients-table one -- `for all using (true)` -- which also opens up
-- UPDATE/DELETE of ANY row to ANY caller. This table never does that:
create policy "profiles_select_all" on profiles
  for select using (true);

-- You may only ever create your own row (id must match your own auth uid).
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- You may only ever update your own row. No delete policy at all -- RLS
-- defaults to deny, so profile rows can't be deleted from the client.
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create index if not exists profiles_updated_at_idx on profiles (updated_at desc);
