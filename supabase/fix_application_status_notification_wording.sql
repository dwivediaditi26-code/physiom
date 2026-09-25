-- Fix application-status notification wording (Phase H, 2026-09-25)
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Run this AFTER add_mvp_network_opportunities.sql.
-- Applied directly to physiomind-prod via the Supabase MCP; this file
-- documents it here so it stays in sync with every other migration in this
-- folder, which are all "run once in the dashboard" scripts.
--
-- notify_on_application_status() said "is now rejected" -- but every other
-- screen in the app (MyOpportunitiesPage's status chip, db.js's own
-- APP_STATUS_TO_UI) calls that same state "Not selected". It also said
-- "is now under_review" (the raw db enum, underscore and all) instead of
-- "under review". This brings the notification text in line with what the
-- applicant sees everywhere else in the product, per the spec's exact
-- copy ("...is now under review." / "...was not selected."). Also adds
-- `set search_path = public`, missing on the original -- every trigger
-- function touched since Phase A pins this to avoid the search-path-
-- hijacking risk the Supabase advisor flags.

create or replace function notify_on_application_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_phrase text;
begin
  select title into v_title from opportunities where id = new.opportunity_id;
  v_phrase := case new.status
    when 'rejected' then 'was not selected'
    when 'under_review' then 'is now under review'
    else 'is now ' || replace(new.status, '_', ' ')
  end;
  insert into notifications (user_id, icon_name, text, tone, kind, entity_type, entity_id)
    values (
      new.applicant_id, 'Briefcase',
      'Your application for ' || coalesce(v_title, 'an opportunity') || ' ' || v_phrase,
      'text-violet-600', 'application_status', 'application', new.id::text
    );
  return new;
end;
$$;
