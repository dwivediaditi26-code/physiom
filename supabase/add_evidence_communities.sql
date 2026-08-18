-- PhysioMind Pro — PhysioFeed evidence + communities tables
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Step 3 of the PhysioFeed real-world rollout (steps 1-2 were profiles and
-- the core social tables -- posts/likes/comments/follows/saves -- both
-- already run). This adds the Evidence (research library) and Communities
-- tabs' real tables, plus one small addition to `profiles`: an `is_admin`
-- flag. That flag is needed here (not just for the later moderation step)
-- because research articles and communities are curated/admin-managed
-- content in V1 -- there's no "submit a research article" or "create a
-- community" button in the app, so only an admin should be able to add
-- rows, the same way only you should be able to add new exercises to a
-- library, not every visitor.
--
-- Safe to run ahead of the db.js rewire that follows this file, exactly
-- like the previous two migrations -- nothing in the app changes behaviour
-- the moment this SQL runs.

-- ── Admin flag (used by this file's write policies, and again later by
--    the moderation/reports table) ─────────────────────────────────────
alter table profiles add column if not exists is_admin boolean not null default false;

-- ── Research articles (Evidence tab) ───────────────────────────────────
create table if not exists research_articles (
  id text primary key default ('ev' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text),
  title text not null,
  journal text not null default '',
  type text not null default '',        -- 'Systematic Review' | 'Meta-Analysis' | 'RCT' | 'Narrative Review' | ...
  year integer,
  level text not null default '',       -- 'Level 1' | 'Level 2' | 'Level 3'
  category text not null default 'General',
  tags text[] not null default '{}',
  gradient text not null default 'violet',
  created_at timestamptz not null default now()
);
alter table research_articles enable row level security;

-- Everyone can read the research library -- it's reference content, not
-- private data.
create policy "research_articles_select_all" on research_articles
  for select using (true);
-- Only admins can add/edit/remove articles (curated content, not user posts).
create policy "research_articles_admin_write" on research_articles
  for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "research_articles_admin_update" on research_articles
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "research_articles_admin_delete" on research_articles
  for delete using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ── Saved/bookmarked research (private, like saved_posts) ──────────────
create table if not exists research_saves (
  article_id text not null references research_articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);
alter table research_saves enable row level security;

create policy "research_saves_select_own" on research_saves
  for select using (auth.uid() = user_id);
create policy "research_saves_insert_own" on research_saves
  for insert with check (auth.uid() = user_id);
create policy "research_saves_delete_own" on research_saves
  for delete using (auth.uid() = user_id);

-- ── Communities ─────────────────────────────────────────────────────────
create table if not exists communities (
  id text primary key default ('cm' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text),
  name text not null,
  description text not null default '',
  gradient text not null default 'violet',
  created_at timestamptz not null default now()
);
alter table communities enable row level security;

create policy "communities_select_all" on communities
  for select using (true);
-- Same reasoning as research_articles: creating a community is an admin
-- action in V1, not a per-user one (no "create community" UI exists).
create policy "communities_admin_write" on communities
  for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "communities_admin_update" on communities
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "communities_admin_delete" on communities
  for delete using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ── Community membership ────────────────────────────────────────────────
-- Member counts are computed live (count of rows) rather than a
-- denormalized counter column -- same "revisit if it turns out to be hot"
-- reasoning as posts/follows in the previous migration.
create table if not exists community_members (
  community_id text not null references communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
alter table community_members enable row level security;

-- Open read: membership + member counts are public, same as follows.
create policy "community_members_select_all" on community_members
  for select using (true);
-- You can only ever join/leave as yourself.
create policy "community_members_insert_own" on community_members
  for insert with check (auth.uid() = user_id);
create policy "community_members_delete_own" on community_members
  for delete using (auth.uid() = user_id);
