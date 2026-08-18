-- PhysioMind Pro — PhysioFeed core social tables
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Step 2 of the PhysioFeed real-world rollout (step 1 was profiles --
-- see add_profiles_table.sql, already run). This is schema + RLS ONLY --
-- src/physiofeed/data/db.js still runs entirely on the in-memory mock
-- store (mockData.js) until step 3 rewires each function to actually
-- query these tables. Nothing in the app changes behaviour the moment
-- this SQL runs; it's safe to run ahead of the rewire.
--
-- Shapes match the // SUPABASE: comments already sitting above every
-- function in db.js. Post "type-specific" fields (checklist items,
-- carousel images, video duration, phase labels) vary by post -- rather
-- than a wide table of mostly-null columns, those live in one `media`
-- jsonb column, same pattern the existing `patients` table already uses
-- for its variable clinical data.
--
-- Deliberately NOT adding a followers_count/following_count sync trigger
-- here -- profiles already has those columns (from add_profiles_table.sql)
-- but keeping them in sync via triggers vs. computing live COUNT(*) is a
-- real design choice best made in step 3, once db.js's functions are
-- actually being rewired against this table and it's clear which reads
-- are hot enough to need a denormalized counter.

-- ── Posts ───────────────────────────────────────────────────────────────
create table if not exists posts (
  id text primary key default ('p' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text),
  author_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'General',
  heading text not null default '',
  caption text not null default '',
  media_type text not null default 'checklist',   -- 'image' | 'video' | 'carousel' | 'checklist' | 'phases'
  media jsonb not null default '{}',              -- type-specific extras: checklist[], images[], duration, phases[], gradient, iconName
  media_urls text[] not null default '{}',        -- real uploaded Storage URLs -- empty until real media upload exists
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table posts enable row level security;

create policy "posts_select_all" on posts
  for select using (true);
create policy "posts_insert_own" on posts
  for insert with check (auth.uid() = author_id);
create policy "posts_update_own" on posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "posts_delete_own" on posts
  for delete using (auth.uid() = author_id);

create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_author_id_idx on posts (author_id);

-- ── Likes ───────────────────────────────────────────────────────────────
create table if not exists post_likes (
  post_id text not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table post_likes enable row level security;

-- Open read: like counts and "who liked this" are public, same as any feed.
create policy "post_likes_select_all" on post_likes
  for select using (true);
-- You can only ever like/unlike as yourself.
create policy "post_likes_insert_own" on post_likes
  for insert with check (auth.uid() = user_id);
create policy "post_likes_delete_own" on post_likes
  for delete using (auth.uid() = user_id);

-- ── Comments ────────────────────────────────────────────────────────────
create table if not exists comments (
  id bigint generated always as identity primary key,
  post_id text not null references posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
alter table comments enable row level security;

create policy "comments_select_all" on comments
  for select using (true);
create policy "comments_insert_own" on comments
  for insert with check (auth.uid() = author_id);
create policy "comments_delete_own" on comments
  for delete using (auth.uid() = author_id);

create index if not exists comments_post_id_idx on comments (post_id);

-- ── Follows ─────────────────────────────────────────────────────────────
create table if not exists follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);
alter table follows enable row level security;

-- Open read: "X follows Y" / follower counts are public.
create policy "follows_select_all" on follows
  for select using (true);
-- You can only ever follow/unfollow as yourself.
create policy "follows_insert_own" on follows
  for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on follows
  for delete using (auth.uid() = follower_id);

-- ── Saved posts ─────────────────────────────────────────────────────────
-- Unlike likes/follows, saves are private -- nobody else should see what
-- you've bookmarked (matches how every mainstream app treats "saved").
create table if not exists saved_posts (
  post_id text not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table saved_posts enable row level security;

create policy "saved_posts_select_own" on saved_posts
  for select using (auth.uid() = user_id);
create policy "saved_posts_insert_own" on saved_posts
  for insert with check (auth.uid() = user_id);
create policy "saved_posts_delete_own" on saved_posts
  for delete using (auth.uid() = user_id);
