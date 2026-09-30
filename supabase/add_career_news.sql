-- PhysioMind -- Career & Opportunities News section (2026-09-30, Aditi's
-- ChatGPT planning session: a daily-refreshed briefing of physio jobs,
-- conferences and professional/regulatory updates, pulled from outside
-- RSS sources -- separate from the existing `opportunities` table
-- (add_mvp_network_opportunities.sql), which is community members posting
-- their own jobs/workshops inside the app. This is the other kind: things
-- an outside body (WHO, a physio association, a hospital) published.
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query

create table if not exists career_news (
  id uuid primary key default gen_random_uuid(),
  -- Kept broad on purpose -- v1's real sources (News-Medical's
  -- Physiotherapy feed, WHO's news feed) are physio/health news, not a
  -- job board. 'job_india' and
  -- 'job_international' exist for when a real job-listing source is
  -- wired in later; until then the fetcher never writes those categories.
  category text not null check (category in ('job_india', 'job_international', 'conference', 'regulation', 'research', 'alert')),
  title text not null,
  summary text,
  source_name text not null,
  source_url text not null,
  location text,
  published_at timestamptz,
  deadline_at timestamptz,
  last_checked_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'expired')),
  -- Same source_url can reappear across daily fetch runs -- this is what
  -- the fetcher upserts on to avoid duplicate rows instead of a fresh
  -- insert every day.
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists career_news_status_idx on career_news (status, published_at desc);
create index if not exists career_news_category_idx on career_news (category, published_at desc);

alter table career_news enable row level security;

-- Public read -- this is published, official information, same trust
-- level as a news site; no reason to gate it behind login, and guest
-- mode (see PersonCard/ProfileHeader's guest fallback) can show it too.
drop policy if exists career_news_select_all on career_news;
create policy career_news_select_all on career_news for select using (true);

-- No insert/update/delete policy for anon or authenticated -- on purpose.
-- Only the daily fetch job writes here, using the service role key
-- (which bypasses RLS entirely), from api/cron/fetchCareerNews.js. A
-- logged-in user should never be able to plant a fake "job" or "alert"
-- row in this table the way they could in the community `opportunities`
-- board.

-- ── Rollback ───────────────────────────────────────────────────────────
-- drop table if exists career_news;
