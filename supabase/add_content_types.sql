-- PhysioMind Pro — PhysioFeed structured content types
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Step 7 of the PhysioFeed rollout, and the start of the "make PhysioFeed
-- feel purpose-built for physiotherapy" phase: instead of every post being
-- generic text+media, a post now carries a `post_type` --
-- 'post' | 'case' | 'research' | 'poll' -- and the structured fields for
-- Case/Research/Poll live inside the existing `media` jsonb column (same
-- "type-specific extras live in one flexible jsonb column" pattern the
-- posts table already used for checklist/carousel/phases demo content --
-- see add_social_tables.sql's header comment).
--
-- Video and Photo posts are deliberately NOT a separate post_type -- they
-- render identically to a normal Post (heading + caption + media tile),
-- just with a title-first composer and a required attachment. media_type
-- ('photo'/'video', already added in add_media_storage.sql's rollout step)
-- already distinguishes them. Only Case/Research/Poll need a genuinely
-- different card layout, so only those get their own post_type.

alter table posts add column if not exists post_type text not null default 'post';

-- ── Poll votes ──────────────────────────────────────────────────────────
-- One vote per person per poll (the primary key enforces that), and votes
-- are final in V1 -- no update policy, so nobody can flip their vote after
-- seeing results. That's a deliberate simplification, not an oversight:
-- it avoids upsert-vs-insert edge cases for a feature that's genuinely
-- optional to get exactly right on day one. Revisit if physios actually
-- ask to change a vote.
create table if not exists poll_votes (
  post_id text not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table poll_votes enable row level security;

-- Results (vote counts) are public the moment you can see the poll post
-- itself -- same as likes/follows being publicly visible.
create policy "poll_votes_select_all" on poll_votes
  for select using (true);
-- You can only ever vote as yourself.
create policy "poll_votes_insert_own" on poll_votes
  for insert with check (auth.uid() = user_id);

create index if not exists poll_votes_post_id_idx on poll_votes (post_id);
