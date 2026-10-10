-- PhysioMind Pro — AI credit counters
-- Run in: Supabase Dashboard → SQL Editor → New Query (PRODUCTION project).
--
-- Two counters per student:
--   parser_credits  — one is spent each time "Parse with AI" (Subjective intake,
--                     POST /api/parse) is run. Spent on the SERVER.
--   analyze_credits — one is spent each time "Re-analyze" is tapped on the
--                     AI Objective Assessment step. Spent via consume_my_credit().
-- At 0 the feature is locked (the API answers 402 / the button is disabled).
-- Admins (profiles.is_admin) are never charged — that check lives in the app code.
-- To change the starting amounts, edit the two DEFAULTs below (new students only);
-- to top someone up: update user_credits set parser_credits = 20 where user_id = '...';

create table if not exists user_credits (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  parser_credits  int  not null default 10 check (parser_credits  >= 0),
  analyze_credits int  not null default 20 check (analyze_credits >= 0),
  updated_at      timestamptz not null default now()
);

-- Students may READ their own balance. Nobody can write directly — all changes
-- go through the functions below, so a student can't give themselves credits.
alter table user_credits enable row level security;
drop policy if exists "read own credits" on user_credits;
create policy "read own credits" on user_credits for select using (auth.uid() = user_id);

-- Core: add p_delta (negative = spend) to one counter, atomically.
-- Returns the new balance, or -1 when a spend would take it below zero
-- (nothing is changed then). Creates the row with defaults on first use.
create or replace function adjust_credit(p_user uuid, p_kind text, p_delta int)
returns int language plpgsql security definer set search_path = public as $$
declare new_balance int;
begin
  if p_kind not in ('parser', 'analyze') then raise exception 'unknown credit kind %', p_kind; end if;
  insert into user_credits (user_id) values (p_user) on conflict (user_id) do nothing;
  if p_kind = 'parser' then
    update user_credits set parser_credits = parser_credits + p_delta, updated_at = now()
      where user_id = p_user and parser_credits + p_delta >= 0 returning parser_credits into new_balance;
  else
    update user_credits set analyze_credits = analyze_credits + p_delta, updated_at = now()
      where user_id = p_user and analyze_credits + p_delta >= 0 returning analyze_credits into new_balance;
  end if;
  return coalesce(new_balance, -1);
end $$;
revoke all on function adjust_credit(uuid, text, int) from public, anon, authenticated;
grant execute on function adjust_credit(uuid, text, int) to service_role;

-- For the signed-in student (the Re-analyze button): spend one, returns balance or -1.
create or replace function consume_my_credit(p_kind text)
returns int language sql security definer set search_path = public as $$
  select case when auth.uid() is null then -1 else adjust_credit(auth.uid(), p_kind, -1) end
$$;
revoke all on function consume_my_credit(text) from public, anon;
grant execute on function consume_my_credit(text) to authenticated;

-- For the signed-in student: both balances (creates the row on first call).
create or replace function get_my_credits()
returns table (parser_credits int, analyze_credits int) language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into user_credits (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  return query select c.parser_credits, c.analyze_credits from user_credits c where c.user_id = auth.uid();
end $$;
revoke all on function get_my_credits() from public, anon;
grant execute on function get_my_credits() to authenticated;
