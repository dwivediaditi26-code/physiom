-- PhysioFeed — notify applicants/registrants when a published listing's
-- critical details change (2026-09-24, the Edit workflow)
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- Run this AFTER supabase/add_opportunity_lifecycle.sql.
-- Applied directly to physiomind-prod via the Supabase MCP; this file
-- documents it here so it stays in sync with every other migration in this
-- folder, which are all "run once in the dashboard" scripts.
--
-- Notifies every applicant/registrant when the organiser edits a published
-- listing's date, deadline, location, or registration link -- the fields
-- most likely to actually disrupt someone who already signed up. Fee
-- changes live inside `details` jsonb, not a real column, so they're left
-- out here rather than diffing jsonb keys in a trigger; the edit form's own
-- "N students already registered" confirmation (client-side) is what
-- covers those instead.

create or replace function notify_on_opportunity_details_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from 'published' or new.status is distinct from 'published' then
    return new;
  end if;
  if (old.event_date is distinct from new.event_date)
     or (old.deadline is distinct from new.deadline)
     or (old.location is distinct from new.location)
     or (old.registration_url is distinct from new.registration_url) then
    insert into notifications (user_id, icon_name, text, tone, kind, entity_type, entity_id)
      select a.applicant_id, 'RefreshCw',
             'Details for ' || coalesce(new.title, 'an opportunity') || ' have been updated.',
             'text-amber-600', 'opportunity_updated', 'opportunity', new.id::text
      from applications a
      where a.opportunity_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_opportunity_details_changed on opportunities;
create trigger trg_notify_opportunity_details_changed
  after update on opportunities
  for each row
  execute function notify_on_opportunity_details_changed();
