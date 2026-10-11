-- PhysioMind Pro -- AI credits
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query (production project).
-- Safe to run more than once.
--
-- What costs a credit (Aditi, 2026-10-10):
--   * "Fill in a paragraph" -> Generate with AI ............ 1 credit, taken only if the AI answers
--   * Analyze Case (first analysis of a case) .............. 1 credit
--   * Analyze again with NO meaningful change .............. free (the app shows the saved result)
--   * The first 3 meaningful re-analyses of the same case .. free
--   * Every meaningful re-analysis after those 3 ........... 1 credit
--   * Viewing a saved analysis ............................. always free
-- A "case" is one assessment + one body region, so each region has its own 3 free re-analyses.
--
-- Admins (profiles.is_admin) are charged like everyone else by default so they can test (2026-10-11, Aditi); an admin can
-- switch themselves to unlimited, set their own balance and reset a case from the app: Get credits -> Admin test tools.
-- Every signed-in user gets a one-time
-- starter balance of 50 the first time the app asks for their credits (change v_starter below).
--
-- Nothing in the browser can write to these tables: the only way to change a balance is through
-- the functions at the bottom, which take the user from the login (auth.uid()), never from the
-- request. api/parse.js (server) reserves/refunds the paragraph credit with the service key.

create table if not exists public.ai_credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  starter_granted boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Admins only: true = this admin is charged like everyone else (the default, so you can test), false = unlimited.
-- Switched from inside the app (Get credits -> Admin test tools), no SQL needed.
alter table public.ai_credit_accounts add column if not exists admin_pays boolean not null default true;

create table if not exists public.ai_credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,            -- starter | analysis | generation | refund | grant
  case_key text,
  request_id text,
  created_at timestamptz not null default now()
);
create index if not exists ai_credit_ledger_user_idx on public.ai_credit_ledger (user_id, created_at desc);
-- One charge per analysis request, even if the same request is replayed or raced.
create unique index if not exists ai_credit_ledger_analysis_once
  on public.ai_credit_ledger (user_id, request_id) where reason = 'analysis' and request_id is not null;

create table if not exists public.ai_case_analyses (
  user_id uuid not null references auth.users(id) on delete cascade,
  case_key text not null,
  last_sig text,                              -- fingerprint of the scores the student last analyzed
  analyses integer not null default 0,
  free_reanalyses_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, case_key)
);

create table if not exists public.ai_generation_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  status text not null check (status in ('reserved', 'done', 'refunded')),
  charged boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table public.ai_credit_accounts enable row level security;
alter table public.ai_credit_ledger enable row level security;
alter table public.ai_case_analyses enable row level security;
alter table public.ai_generation_requests enable row level security;

-- Read-only for the owner. No insert/update/delete policies at all.
drop policy if exists ai_credit_accounts_select_own on public.ai_credit_accounts;
create policy ai_credit_accounts_select_own on public.ai_credit_accounts for select using (auth.uid() = user_id);
drop policy if exists ai_credit_ledger_select_own on public.ai_credit_ledger;
create policy ai_credit_ledger_select_own on public.ai_credit_ledger for select using (auth.uid() = user_id);
drop policy if exists ai_case_analyses_select_own on public.ai_case_analyses;
create policy ai_case_analyses_select_own on public.ai_case_analyses for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------------------------
-- Internal helpers (not callable from the app)
-- ---------------------------------------------------------------------------------------------

create or replace function public._ai_credit_is_admin(p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = p_user), false);
$$;

-- Who is never charged: an admin whose own "Charge me like a normal user" switch (admin_pays) is off.
create or replace function public._ai_credit_is_unlimited(p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.is_admin and not a.admin_pays
       from public.profiles p join public.ai_credit_accounts a on a.user_id = p.id
      where p.id = p_user),
    false);
$$;

-- Makes sure the account exists, gives the one-time starter balance, and LOCKS the row for the
-- rest of the transaction, so two taps at once cannot both spend the same credit.
create or replace function public._ai_credit_account(p_user uuid)
returns public.ai_credit_accounts
language plpgsql security definer set search_path = public as $$
declare
  acct public.ai_credit_accounts;
  v_starter constant integer := 50;   -- <- starter credits for every user's first visit (was 10; 50 from 2026-10-11)
begin
  insert into public.ai_credit_accounts (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into acct from public.ai_credit_accounts where user_id = p_user for update;
  if not acct.starter_granted then
    update public.ai_credit_accounts
       set balance = balance + v_starter, starter_granted = true, updated_at = now()
     where user_id = p_user
     returning * into acct;
    insert into public.ai_credit_ledger (user_id, delta, balance_after, reason)
      values (p_user, v_starter, acct.balance, 'starter');
  end if;
  return acct;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Called by the app (signed-in users)
-- ---------------------------------------------------------------------------------------------

-- Balance, plus (when a case is given) how many free re-analyses that case has left.
create or replace function public.ai_credits_status(p_case_key text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  acct public.ai_credit_accounts;
  cs public.ai_case_analyses;
  v_found boolean := false;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  acct := public._ai_credit_account(uid);
  if p_case_key is not null then
    select * into cs from public.ai_case_analyses where user_id = uid and case_key = p_case_key;
    v_found := found;
  end if;
  return jsonb_build_object(
    'balance', acct.balance,
    'unlimited', public._ai_credit_is_unlimited(uid),
    'is_admin', public._ai_credit_is_admin(uid),
    'admin_pays', acct.admin_pays,
    'analyzed', v_found,
    'free_reanalyses_remaining', greatest(3 - coalesce(cs.free_reanalyses_used, 0), 0)
  );
end;
$$;

-- Analyze Case. p_sig is the fingerprint of the scores about to be shown.
--   first analysis of the case ........ 1 credit
--   same fingerprint as last time ..... free (nothing changed)
--   different, free re-analyses left .. free (counts one of the 3)
--   different, none left .............. 1 credit
-- Nothing is changed unless the answer is ok = true.
create or replace function public.ai_spend_analysis(p_case_key text, p_sig text, p_request_id text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_free_limit constant integer := 3;
  acct public.ai_credit_accounts;
  cs public.ai_case_analyses;
  v_unlimited boolean;
  v_reason text;
  v_charge boolean := false;
  v_balance integer;
  v_used integer;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  if p_case_key is null or length(p_case_key) = 0 or length(p_case_key) > 200 then raise exception 'bad_case'; end if;
  acct := public._ai_credit_account(uid);           -- also locks this user's account row
  v_unlimited := public._ai_credit_is_unlimited(uid);
  v_balance := acct.balance;

  select * into cs from public.ai_case_analyses where user_id = uid and case_key = p_case_key for update;

  -- The same request arriving twice (double tap, network retry) is never charged twice.
  if p_request_id is not null and exists (
    select 1 from public.ai_credit_ledger where user_id = uid and request_id = p_request_id and reason = 'analysis'
  ) then
    return jsonb_build_object('ok', true, 'charged', false, 'reason', 'replay', 'balance', v_balance,
      'free_reanalyses_remaining', greatest(v_free_limit - coalesce(cs.free_reanalyses_used, 0), 0));
  end if;

  if cs.user_id is null then
    v_reason := 'first';
    v_charge := true;
  elsif cs.last_sig is not distinct from p_sig then
    return jsonb_build_object('ok', true, 'charged', false, 'reason', 'unchanged', 'balance', v_balance,
      'free_reanalyses_remaining', greatest(v_free_limit - cs.free_reanalyses_used, 0));
  elsif cs.free_reanalyses_used < v_free_limit then
    v_reason := 'free_reanalysis';
  else
    v_reason := 'paid_reanalysis';
    v_charge := true;
  end if;

  if v_charge and not v_unlimited then
    if v_balance < 1 then
      return jsonb_build_object('ok', false, 'charged', false, 'reason', 'insufficient', 'balance', v_balance,
        'free_reanalyses_remaining', greatest(v_free_limit - coalesce(cs.free_reanalyses_used, 0), 0));
    end if;
    update public.ai_credit_accounts set balance = balance - 1, updated_at = now()
      where user_id = uid returning balance into v_balance;
    insert into public.ai_credit_ledger (user_id, delta, balance_after, reason, case_key, request_id)
      values (uid, -1, v_balance, 'analysis', p_case_key, p_request_id);
  else
    v_charge := false;
  end if;

  if cs.user_id is null then
    insert into public.ai_case_analyses (user_id, case_key, last_sig, analyses, free_reanalyses_used)
      values (uid, p_case_key, p_sig, 1, 0);
    v_used := 0;
  else
    v_used := cs.free_reanalyses_used + case when v_reason = 'free_reanalysis' then 1 else 0 end;
    update public.ai_case_analyses
       set last_sig = p_sig, analyses = analyses + 1, free_reanalyses_used = v_used, updated_at = now()
     where user_id = uid and case_key = p_case_key;
  end if;

  return jsonb_build_object('ok', true, 'charged', v_charge, 'reason', v_reason, 'balance', v_balance,
    'free_reanalyses_remaining', greatest(v_free_limit - v_used, 0));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Called by the server only (api/parse.js, with the service key)
-- ---------------------------------------------------------------------------------------------

-- Takes the paragraph credit BEFORE the AI is called (so two taps at once cannot both get through
-- on one credit); api/parse.js gives it back if the AI fails. The same request id is never charged
-- twice. A request that was refunded can be charged again if it is retried.
create or replace function public.ai_reserve_generation(p_user uuid, p_request_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  acct public.ai_credit_accounts;
  gr public.ai_generation_requests;
  v_unlimited boolean;
  v_balance integer;
begin
  if p_user is null or p_request_id is null or length(p_request_id) = 0 or length(p_request_id) > 100 then
    raise exception 'bad_request';
  end if;
  acct := public._ai_credit_account(p_user);
  v_unlimited := public._ai_credit_is_unlimited(p_user);
  v_balance := acct.balance;
  select * into gr from public.ai_generation_requests where user_id = p_user and request_id = p_request_id for update;
  if gr.user_id is not null and gr.status in ('reserved', 'done') then
    return jsonb_build_object('ok', true, 'charged', false, 'reason', 'replay', 'balance', v_balance, 'unlimited', v_unlimited);
  end if;
  if not v_unlimited then
    if v_balance < 1 then
      return jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', v_balance, 'unlimited', false);
    end if;
    update public.ai_credit_accounts set balance = balance - 1, updated_at = now()
      where user_id = p_user returning balance into v_balance;
    insert into public.ai_credit_ledger (user_id, delta, balance_after, reason, request_id)
      values (p_user, -1, v_balance, 'generation', p_request_id);
  end if;
  insert into public.ai_generation_requests (user_id, request_id, status, charged)
    values (p_user, p_request_id, 'reserved', not v_unlimited)
    on conflict (user_id, request_id) do update set status = 'reserved', charged = not v_unlimited, created_at = now();
  return jsonb_build_object('ok', true, 'charged', not v_unlimited, 'reason', 'reserved', 'balance', v_balance, 'unlimited', v_unlimited);
end;
$$;

create or replace function public.ai_complete_generation(p_user uuid, p_request_id text)
returns void
language sql security definer set search_path = public as $$
  update public.ai_generation_requests set status = 'done'
   where user_id = p_user and request_id = p_request_id and status = 'reserved';
$$;

-- The AI failed: give the credit back (once).
create or replace function public.ai_refund_generation(p_user uuid, p_request_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  acct public.ai_credit_accounts;
  gr public.ai_generation_requests;
  v_balance integer;
begin
  acct := public._ai_credit_account(p_user);
  v_balance := acct.balance;
  select * into gr from public.ai_generation_requests where user_id = p_user and request_id = p_request_id for update;
  if gr.user_id is null or gr.status <> 'reserved' then
    return jsonb_build_object('ok', true, 'refunded', false, 'balance', v_balance);
  end if;
  if gr.charged then
    update public.ai_credit_accounts set balance = balance + 1, updated_at = now()
      where user_id = p_user returning balance into v_balance;
    insert into public.ai_credit_ledger (user_id, delta, balance_after, reason, request_id)
      values (p_user, 1, v_balance, 'refund', p_request_id);
  end if;
  update public.ai_generation_requests set status = 'refunded' where user_id = p_user and request_id = p_request_id;
  return jsonb_build_object('ok', true, 'refunded', gr.charged, 'balance', v_balance);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Top-up by an admin (or from this SQL editor):  select admin_grant_ai_credits('<user uuid>', 20, 'why');
-- ---------------------------------------------------------------------------------------------

create or replace function public.admin_grant_ai_credits(p_user uuid, p_amount integer, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  acct public.ai_credit_accounts;
  v_balance integer;
begin
  -- auth.uid() is null in the SQL editor (that is you); in the app it must be an admin.
  if auth.uid() is not null and not public._ai_credit_is_admin(auth.uid()) then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if p_amount is null or p_amount = 0 then raise exception 'bad_amount'; end if;
  acct := public._ai_credit_account(p_user);
  v_balance := greatest(acct.balance + p_amount, 0);
  update public.ai_credit_accounts set balance = v_balance, updated_at = now() where user_id = p_user;
  insert into public.ai_credit_ledger (user_id, delta, balance_after, reason, case_key)
    values (p_user, v_balance - acct.balance, v_balance, 'grant', p_note);
  return jsonb_build_object('ok', true, 'balance', v_balance);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Admin test tools (used by the app's Get credits -> Admin test tools; only for admins, only on their OWN account)
-- ---------------------------------------------------------------------------------------------

create or replace function public.admin_set_my_ai_credits(p_balance integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  acct public.ai_credit_accounts;
begin
  if uid is null or not public._ai_credit_is_admin(uid) then raise exception 'admin_only' using errcode = '42501'; end if;
  if p_balance is null or p_balance < 0 or p_balance > 100000 then raise exception 'bad_amount'; end if;
  acct := public._ai_credit_account(uid);
  update public.ai_credit_accounts set balance = p_balance, updated_at = now() where user_id = uid;
  insert into public.ai_credit_ledger (user_id, delta, balance_after, reason, case_key)
    values (uid, p_balance - acct.balance, p_balance, 'grant', 'admin-test-set');
  return jsonb_build_object('ok', true, 'balance', p_balance);
end;
$$;

create or replace function public.admin_set_my_ai_admin_pays(p_pays boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not public._ai_credit_is_admin(uid) then raise exception 'admin_only' using errcode = '42501'; end if;
  perform public._ai_credit_account(uid);
  update public.ai_credit_accounts set admin_pays = coalesce(p_pays, true), updated_at = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'admin_pays', coalesce(p_pays, true));
end;
$$;

-- Forget one case's analysis history so the next Analyze Case counts as the first one again (and the 3 free re-analyses reset).
create or replace function public.admin_reset_my_ai_case(p_case_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not public._ai_credit_is_admin(uid) then raise exception 'admin_only' using errcode = '42501'; end if;
  delete from public.ai_case_analyses where user_id = uid and case_key = p_case_key;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------------------------
revoke all on function public._ai_credit_is_admin(uuid) from public, anon, authenticated;
revoke all on function public._ai_credit_is_unlimited(uuid) from public, anon, authenticated;
revoke all on function public._ai_credit_account(uuid) from public, anon, authenticated;
revoke all on function public.ai_credits_status(text) from public, anon;
revoke all on function public.ai_spend_analysis(text, text, text) from public, anon;
revoke all on function public.ai_reserve_generation(uuid, text) from public, anon, authenticated;
revoke all on function public.ai_complete_generation(uuid, text) from public, anon, authenticated;
revoke all on function public.ai_refund_generation(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_grant_ai_credits(uuid, integer, text) from public, anon;
revoke all on function public.admin_set_my_ai_credits(integer) from public, anon;
revoke all on function public.admin_set_my_ai_admin_pays(boolean) from public, anon;
revoke all on function public.admin_reset_my_ai_case(text) from public, anon;

grant execute on function public.ai_credits_status(text) to authenticated;
grant execute on function public.ai_spend_analysis(text, text, text) to authenticated;
grant execute on function public.admin_grant_ai_credits(uuid, integer, text) to authenticated;
grant execute on function public.admin_set_my_ai_credits(integer) to authenticated;
grant execute on function public.admin_set_my_ai_admin_pays(boolean) to authenticated;
grant execute on function public.admin_reset_my_ai_case(text) to authenticated;
grant execute on function public.ai_reserve_generation(uuid, text) to service_role;
grant execute on function public.ai_complete_generation(uuid, text) to service_role;
grant execute on function public.ai_refund_generation(uuid, text) to service_role;

-- ---------------------------------------------------------------------------------------------
-- One-time top-up (2026-10-11, Aditi: "give credits of 50 for everyone"): anyone who already got the old
-- 10-credit start gets 40 more, so every account starts with 50. Safe to run again: each account is topped up
-- only once (it is marked in the ledger as a 'grant' with the note 'starter-50').
-- ---------------------------------------------------------------------------------------------
with todo as (
  select a.user_id
    from public.ai_credit_accounts a
   where a.starter_granted
     and exists (select 1 from public.ai_credit_ledger l where l.user_id = a.user_id and l.reason = 'starter' and l.delta = 10)
     and not exists (select 1 from public.ai_credit_ledger l where l.user_id = a.user_id and l.reason = 'grant' and l.case_key = 'starter-50')
), bumped as (
  update public.ai_credit_accounts a
     set balance = a.balance + 40, updated_at = now()
    from todo
   where a.user_id = todo.user_id
  returning a.user_id, a.balance
)
insert into public.ai_credit_ledger (user_id, delta, balance_after, reason, case_key)
select user_id, 40, balance, 'grant', 'starter-50' from bumped;
