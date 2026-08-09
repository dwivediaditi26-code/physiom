-- PhysioMind Pro — API rate-limit table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Run on the PRODUCTION project (dlauxdokkrqbvbormxte) — this backs the
-- rate limiter for /api/parse (and any other Groq-calling endpoint that
-- adopts api/_lib/rateLimit.js later), which only runs against production.

-- One row per API call, used to count "how many calls in the last N
-- seconds/minutes" for both the global (all-users) and per-user limits.
-- See api/_lib/rateLimit.js for how these counts are used.
create table if not exists api_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  called_at timestamptz not null default now()
);

-- Both the global limiter (WHERE endpoint = ? AND called_at > ?) and the
-- per-user limiter (WHERE endpoint = ? AND user_id = ? AND called_at > ?)
-- need to scan this efficiently as the table grows.
create index if not exists api_calls_endpoint_called_at_idx
  on api_calls (endpoint, called_at);
create index if not exists api_calls_user_endpoint_called_at_idx
  on api_calls (user_id, endpoint, called_at);

-- RLS: intentionally NO policies. This table is only ever read/written by
-- api/_lib/rateLimit.js using the SUPABASE_SERVICE_ROLE_KEY, which bypasses
-- RLS by default -- nothing in the browser (anon or authenticated role)
-- should ever read or write this table directly, so leaving it policy-free
-- means those roles get zero access, which is exactly what we want.
alter table api_calls enable row level security;

-- Housekeeping: this table grows forever otherwise. A cheap, no-cron-needed
-- approach -- delete rows older than 24h opportunistically. Run this
-- manually every so often (or wire to pg_cron if you set that up later);
-- the rate limiter only ever looks back 1 hour, so nothing this deletes is
-- still in use.
-- delete from api_calls where called_at < now() - interval '24 hours';
