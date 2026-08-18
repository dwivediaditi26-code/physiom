-- PhysioMind Pro — PhysioFeed moderation (reports + admin)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Step 5 of the PhysioFeed real-world rollout. Adds the minimum a real
-- social feed needs before strangers can post to it: a way to flag a post,
-- and a way for an admin to act on that flag. This deliberately does NOT
-- build a full moderation dashboard (user bans, content history, appeal
-- flow, etc.) -- that's real V2/V3 scope. V1 is: report a post, an admin
-- sees open reports, an admin can remove the post or dismiss the report.
--
-- `is_admin` on profiles already exists (added in
-- add_evidence_communities.sql) -- this file reuses it rather than adding
-- a second flag, and the `if not exists` guard below makes this safe to
-- run even if that migration hasn't been run yet, in either order.

alter table profiles add column if not exists is_admin boolean not null default false;

create table if not exists reports (
  id bigint generated always as identity primary key,
  post_id text not null references posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open',   -- 'open' | 'dismissed' | 'removed'
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)          -- one open report per person per post, not a spam vector
);
alter table reports enable row level security;

-- You can file a report as yourself.
create policy "reports_insert_own" on reports
  for insert with check (auth.uid() = reporter_id);
-- You can see your own reports (so the app could show "reported" state
-- later); admins can see everyone's.
create policy "reports_select_own_or_admin" on reports
  for select using (
    auth.uid() = reporter_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
-- Only admins can change a report's status (dismiss / mark removed).
create policy "reports_admin_update" on reports
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create index if not exists reports_status_idx on reports (status, created_at desc);

-- Admins can also delete ANY post (not just their own) -- this is what
-- powers the admin page's "Remove post" action. This is an ADDITIONAL
-- permissive policy alongside the existing "posts_delete_own" from
-- add_social_tables.sql -- Postgres OR's multiple permissive policies of
-- the same type together, so this only ever ADDS admin capability, it
-- never narrows what authors can already do to their own posts.
create policy "posts_admin_delete" on posts
  for delete using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ── Grant yourself admin access ─────────────────────────────────────────
-- Run this separately, after signing in at least once so your profiles row
-- exists (replace the email with your real PhysioFeed login email):
--
--   update profiles set is_admin = true
--   where id = (select id from auth.users where email = 'dwivediaditi26@gmail.com');
