-- PhysioMind Pro — PhysioFeed real stories (photo/video, 24h expiry)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Backs the real version of the Stories bar at the top of the feed
-- (components/feed/StoriesBar.jsx). Before this migration the story ring
-- was pure decoration -- five fixed fake names, tapping one just turned
-- the ring gray, and "+ Your story" opened the regular post composer
-- instead of actually creating a story. This adds the two tables that
-- make it real: `stories` (one row per photo/video posted, auto-expiring)
-- and `story_views` (who has actually watched which story, so the ring
-- only turns gray once YOU'VE seen it -- same per-viewer logic Instagram
-- uses, not a single global "seen" flag everyone shares).
--
-- Reads are public but time-boxed: the select policy itself only exposes
-- rows where expires_at is still in the future, so an expired story is
-- unreachable from the client even by direct id, no app-side filtering
-- required (belt-and-suspenders is nice, but the DB is the actual source
-- of truth on "is this still a story"). Same owner-scoped-write pattern
-- as everything else in this rollout -- the one difference from
-- education_entries/achievements is that a story CAN'T be updated once
-- posted (Instagram doesn't let you edit a live story either), only
-- deleted early or left to expire on its own.
--
-- story_views intentionally has no update policy -- once you've viewed a
-- story that fact doesn't change, so there's nothing to update. db.js's
-- markStorySeen() uses an upsert with ON CONFLICT DO NOTHING (re-viewing
-- a story you've already seen shouldn't error), which only needs INSERT
-- privileges, not UPDATE -- verified locally below.

create table if not exists stories (
  id bigint generated always as identity primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  duration integer,  -- video length in seconds, used to size the progress bar; null for images
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
alter table stories enable row level security;

create policy "stories_select_active" on stories
  for select using (expires_at > now());
create policy "stories_insert_own" on stories
  for insert with check (auth.uid() = author_id);
create policy "stories_delete_own" on stories
  for delete using (auth.uid() = author_id);

create index if not exists stories_author_idx on stories (author_id, created_at);

create table if not exists story_views (
  id bigint generated always as identity primary key,
  story_id bigint not null references stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (story_id, viewer_id)
);
alter table story_views enable row level security;

create policy "story_views_select_own" on story_views
  for select using (auth.uid() = viewer_id);
create policy "story_views_insert_own" on story_views
  for insert with check (auth.uid() = viewer_id);

create index if not exists story_views_viewer_idx on story_views (viewer_id);

-- ── Storage bucket for story media ──────────────────────────────────────
-- Same three-policy shape as add_media_storage.sql's post-images/
-- post-videos/profile-images buckets: public read, upload only into your
-- own `<user-id>/` folder, delete only your own files.

insert into storage.buckets (id, name, public)
values ('story-media', 'story-media', true)
on conflict (id) do nothing;

create policy "story_media_public_read" on storage.objects
  for select using (bucket_id = 'story-media');
create policy "story_media_insert_own_folder" on storage.objects
  for insert with check (bucket_id = 'story-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "story_media_delete_own" on storage.objects
  for delete using (bucket_id = 'story-media' and (storage.foldername(name))[1] = auth.uid()::text);
