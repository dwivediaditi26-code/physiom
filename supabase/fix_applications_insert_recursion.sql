-- ============================================================
-- Fix: "infinite recursion detected in policy for relation applications"
--
-- add_opportunity_lifecycle.sql's applications_insert_own policy counts
-- existing rows with `select count(*) from applications a2 ...` INSIDE the
-- policy on applications itself. Postgres refuses that, so every Apply /
-- Register insert failed (found 2026-10-03 testing with a second account).
--
-- The seat count moves into a SECURITY DEFINER function: it reads the table
-- directly (no policy re-entry), and it also counts ALL registrations, not
-- only the ones the current user is allowed to see -- which is what a seat
-- limit needs. The function only returns a number.
-- Safe to run more than once.
-- ============================================================

create or replace function public.application_count(p_opportunity_id bigint)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.applications where opportunity_id = p_opportunity_id;
$$;

revoke all on function public.application_count(bigint) from public;
grant execute on function public.application_count(bigint) to anon, authenticated;

drop policy if exists "applications_insert_own" on applications;
create policy "applications_insert_own" on applications
  for insert with check (
    auth.uid() = applicant_id
    and exists (
      select 1 from opportunities o
      where o.id = applications.opportunity_id
        and o.status = 'published'
        and o.deleted_at is null
        and (o.deadline is null or o.deadline >= current_date)
        and (o.event_date is null or o.event_date >= current_date)
        and (
          o.max_participants is null
          or public.application_count(o.id) < o.max_participants
        )
    )
  );
