-- ============================================================
-- Workshop waiting list (Aditi, 2026-10-04: "even if seat limit they can
-- send registration now ... if allowed by lister").
--
-- A workshop with max_participants normally stops taking registrations once
-- that many people have registered (applications_insert_own). If the poster
-- ticks "Keep taking registrations after the seats are full" the wizard
-- stores details.allowWaitlist = true, and this policy lets registrations
-- through past the limit -- the poster sees everyone past the limit as
-- "Waiting list" and decides who gets in.
--
-- Everything else in the rule is unchanged: the listing must be published,
-- not deleted, and before its closing date / event date.
-- Needs fix_applications_insert_recursion.sql first (application_count()).
-- Safe to run more than once.
-- ============================================================

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
          or coalesce(o.details->>'allowWaitlist', '') = 'true'
          or public.application_count(o.id) < o.max_participants
        )
    )
  );
