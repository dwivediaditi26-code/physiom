-- PhysioFeed — Opportunities lifecycle (draft/publish/close/cancel/expire/delete)
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- Run this AFTER supabase/add_mvp_network_opportunities.sql.
--
-- Safe to run more than once: every statement is `if not exists`/`if exists`
-- guarded, or an idempotent `create or replace`/`drop ... if exists` +
-- `create`. Nothing here rewrites existing opportunity/application rows
-- except the two defensive backfills called out below.
--
-- What this adds on top of add_mvp_network_opportunities.sql:
--   1. Timestamps for each lifecycle transition (published/closed/cancelled/
--      deleted_at) — today only created_at/updated_at exist, so there's no
--      way to say "when was this cancelled".
--   2. A real `cancelled` status, distinct from `closed` (closed = organiser
--      stopped taking new registrations on purpose; cancelled = the
--      workshop/job/etc. itself isn't happening). `expired` stays OUT of the
--      stored vocabulary on purpose — nothing has ever written it (grep the
--      app: only `oppStatusToUi()` reads it), so it stays a derived,
--      never-written value computed from `deadline`/`event_date` at read
--      time. That's strictly safer than storing it: a stored 'expired' can
--      drift from the clock if a cron job doesn't run; a computed one can't.
--   3. `max_participants`, enforced at the RLS layer (not just disabling a
--      button), same reasoning as the deadline check below.
--   4. Soft delete: deleting a listing today is a hard SQL DELETE that
--      cascades to `applications`/`saved_items` via FK — so deleting a
--      workshop destroys the registration history of everyone who signed up.
--      This switches delete to setting `deleted_at`, and folds "is this
--      deleted" into the same SELECT policy that already hides drafts from
--      non-creators.
--   5. RLS on `applications` INSERT already checked `status = 'published'`;
--      it did NOT check the deadline/event date or a participant cap, so a
--      direct API call (not just the UI) could register for a workshop that
--      already happened, or one an organiser capped at 50 seats. Closing
--      that is a security-review-shaped fix, not a UI nicety — the button
--      being disabled was never what stopped it.
--   6. Notification triggers for "you're registered" (workshop only — job/
--      internship/collaboration applicants already see "Applied" in the UI
--      immediately) and "this was closed/cancelled", fanned out to everyone
--      who applied/registered, modeled on the existing
--      notify_on_application_received() trigger.
--   7. An `opportunity-covers` storage bucket (cover images upload as a
--      blob URL today and vanish on reload) — same own-folder/public-read
--      shape as every bucket in add_media_storage.sql.

-- ============================================================
-- 1. Lifecycle timestamps + max_participants
-- ============================================================
alter table opportunities add column if not exists published_at timestamptz;
alter table opportunities add column if not exists closed_at timestamptz;
alter table opportunities add column if not exists cancelled_at timestamptz;
alter table opportunities add column if not exists deleted_at timestamptz;
alter table opportunities add column if not exists max_participants integer;

-- Backfill so pre-existing published rows aren't left with a null
-- published_at forever (created_at is the best available approximation —
-- every row that exists today was published at creation, since draft/save
-- didn't exist as a UI action until now).
update opportunities set published_at = created_at
  where status = 'published' and published_at is null;

-- ============================================================
-- 2. Status vocabulary: draft | published | closed | cancelled
-- ============================================================
-- Defensive backfill before the CHECK constraint lands, in case any row
-- somehow has one of the two values that are being retired ('expired' was
-- never written by app code, and 'paused' was schema-only from day one —
-- see the comment block above — but this makes the migration correct
-- regardless of what's actually in the table rather than assuming).
update opportunities set status = 'closed' where status = 'expired';
update opportunities set status = 'published' where status = 'paused';

alter table opportunities drop constraint if exists opportunities_status_check;
alter table opportunities add constraint opportunities_status_check
  check (status in ('draft', 'published', 'closed', 'cancelled'));

-- ============================================================
-- 3. Soft delete: fold into the existing "who can see this" policy
-- ============================================================
drop policy if exists "opportunities_select_published" on opportunities;
drop policy if exists "opportunities_select_visible" on opportunities;
create policy "opportunities_select_visible" on opportunities
  for select using (
    deleted_at is null and (status <> 'draft' or auth.uid() = creator_id)
  );

-- ============================================================
-- 4. Applications: enforce deadline/event-date/capacity server-side, not
--    just via a disabled button. Same table, same UNIQUE(opportunity_id,
--    applicant_id) guard against double-registering as before.
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
          or (select count(*) from applications a2 where a2.opportunity_id = o.id) < o.max_participants
        )
    )
  );

-- ============================================================
-- 5. Notifications: registration confirmed, closed, cancelled
-- ============================================================

-- To the registrant (workshops only — a job/internship/collaboration
-- applicant already sees "Applied" instantly in the UI; this is
-- specifically the "you're on the list" confirmation the spec calls for).
--
-- `set search_path = public` pins name resolution inside a SECURITY
-- DEFINER function so it can't be hijacked by a same-named object in a
-- schema earlier on the caller's search_path -- Supabase's own linter
-- (`supabase db advisors`) flags every one of this project's existing
-- trigger functions for missing this; not fixing those here (out of
-- scope), but not repeating the gap in new ones.
create or replace function notify_on_registration() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_type text;
begin
  select title, type into v_title, v_type from opportunities where id = new.opportunity_id;
  if v_type is distinct from 'workshop' then
    return new;
  end if;
  insert into notifications (user_id, icon_name, text, tone, kind, entity_type, entity_id)
    values (
      new.applicant_id, 'CalendarCheck',
      'You''re registered for ' || coalesce(v_title, 'the workshop') || '.',
      'text-emerald-600', 'workshop_registered', 'application', new.id::text
    );
  return new;
end;
$$;

drop trigger if exists trg_notify_registration on applications;
create trigger trg_notify_registration
  after insert on applications
  for each row execute function notify_on_registration();

-- To every applicant/registrant, when the organiser closes or cancels.
create or replace function notify_on_opportunity_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_text text;
begin
  if new.status is distinct from 'cancelled' and new.status is distinct from 'closed' then
    return new;
  end if;
  v_text := case new.status
    when 'cancelled' then coalesce(new.title, 'An opportunity') || ' has been cancelled.'
    else 'Registration for ' || coalesce(new.title, 'this opportunity') || ' is now closed.'
  end;
  insert into notifications (user_id, icon_name, text, tone, kind, entity_type, entity_id)
    select a.applicant_id,
           case new.status when 'cancelled' then 'XCircle' else 'Lock' end,
           v_text, 'text-rose-600',
           case new.status when 'cancelled' then 'opportunity_cancelled' else 'opportunity_closed' end,
           'opportunity', new.id::text
    from applications a
    where a.opportunity_id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_notify_opportunity_status_change on opportunities;
create trigger trg_notify_opportunity_status_change
  after update on opportunities
  for each row
  when (old.status is distinct from new.status and new.status in ('cancelled', 'closed'))
  execute function notify_on_opportunity_status_change();

-- ============================================================
-- 6. Storage: opportunity cover images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('opportunity-covers', 'opportunity-covers', true)
on conflict (id) do nothing;

drop policy if exists "opportunity_covers_public_read" on storage.objects;
create policy "opportunity_covers_public_read" on storage.objects
  for select using (bucket_id = 'opportunity-covers');

drop policy if exists "opportunity_covers_insert_own_folder" on storage.objects;
create policy "opportunity_covers_insert_own_folder" on storage.objects
  for insert with check (bucket_id = 'opportunity-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "opportunity_covers_delete_own" on storage.objects;
create policy "opportunity_covers_delete_own" on storage.objects
  for delete using (bucket_id = 'opportunity-covers' and (storage.foldername(name))[1] = auth.uid()::text);
