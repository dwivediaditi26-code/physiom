-- PhysioMaster — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- Patients table
-- Stores the complete patient record including all clinical data as JSONB
-- This matches the app's existing localStorage data model exactly
create table if not exists patients (
  id text primary key,                        -- app-generated ID (e.g. "demo_001" or genId())
  name text not null default 'Unknown',
  data jsonb not null default '{}',           -- full flat clinical data object
  created_at text,
  updated_at text,
  has_red_flags boolean default false,
  last_dx text default ''
);

-- Enable row level security
alter table patients enable row level security;

-- Open policy for now (tighten when auth is added)
create policy "allow_all_patients" on patients
  for all using (true) with check (true);

-- Index for faster queries
create index if not exists patients_updated_at_idx on patients (updated_at desc);
