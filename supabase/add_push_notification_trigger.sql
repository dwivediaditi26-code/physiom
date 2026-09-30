-- PhysioMind Pro — wires the send-push edge function up to something that
-- actually calls it. Until this runs, a student can enable push
-- notifications (PushOptInBanner.jsx) and never receive one -- the
-- subscribe side existed, nothing triggered a send.
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- ── ONE MANUAL STEP FIRST, before running the rest of this file ──────────
-- The trigger below has to call send-push as the service role (see
-- send-push/index.ts's 2026-09-29 security fix -- it now refuses any
-- caller that isn't). That means the service role key has to live
-- somewhere the trigger can read it at runtime. Supabase Vault stores it
-- encrypted, readable only from inside your own database, never sent
-- anywhere else.
--
-- Get your service role key from: Project Settings → API → service_role
-- (the "secret" one, NOT the anon/publishable key), then run, once:
--
--   select vault.create_secret('PASTE_YOUR_SERVICE_ROLE_KEY_HERE', 'service_role_key', 'used by trg_notify_push_on_notification to call send-push');
--
-- Do that in the SQL Editor directly -- not somewhere Claude/any AI sees
-- the actual key value. Everything below this comment is safe to run
-- without that step too (the trigger just silently does nothing until the
-- secret exists), so running this file first and the vault line after is
-- also fine, in either order.

create extension if not exists pg_net;

-- Only these kinds push -- a like/comment/follow notification firing on
-- every single interaction would make the opt-in feel like spam within a
-- day. Messages, connections, and application/opportunity status changes
-- are the "you should probably look at your phone" kind; the rest stay
-- bell-only (see getNotifications() in db.js for the full kind list).
create or replace function notify_push_on_notification() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_service_key text;
  v_title text;
  v_url text;
begin
  if new.kind not in (
    'message', 'message_request', 'message_request_accepted',
    'connection_request', 'connection_accepted',
    'application_received', 'application_status',
    'opportunity_cancelled', 'opportunity_closed', 'opportunity_updated',
    'workshop_registered'
  ) then
    return new;
  end if;

  -- Skip the HTTP round-trip entirely when this user has no device
  -- registered -- send-push would just report 0 sent anyway.
  if not exists (select 1 from push_subscriptions where user_id = new.user_id) then
    return new;
  end if;

  select decrypted_secret into v_service_key
    from vault.decrypted_secrets where name = 'service_role_key';
  if v_service_key is null then
    return new; -- Vault secret not set up yet (see this file's header) -- no-op, never blocks the notification insert itself
  end if;

  v_title := case new.kind
    when 'message' then 'New message'
    when 'message_request' then 'New message request'
    when 'message_request_accepted' then 'Message request accepted'
    when 'connection_request' then 'Connection request'
    when 'connection_accepted' then 'Connection accepted'
    when 'application_received' then 'New application'
    when 'application_status' then 'Application update'
    when 'workshop_registered' then 'Workshop registration'
    else 'Opportunity update'
  end;

  v_url := case
    when new.kind in ('message', 'message_request', 'message_request_accepted') and new.actor_id is not null
      then '/messages?with=' || new.actor_id::text
    when new.kind = 'connection_accepted' and new.actor_id is not null
      then '/profile/' || new.actor_id::text
    when new.kind = 'connection_request' then '/people'
    when new.kind in ('application_received', 'workshop_registered') then '/explore?view=postings'
    when new.kind = 'application_status' then '/explore?view=applications'
    when new.kind in ('opportunity_cancelled', 'opportunity_closed', 'opportunity_updated') and new.entity_id is not null
      then '/explore?opp=' || new.entity_id
    else '/'
  end;

  -- Fire-and-forget async HTTP call (pg_net queues it and returns
  -- immediately) -- the notification insert itself must never fail or
  -- wait on an external HTTP request.
  perform net.http_post(
    url := 'https://gkhcysvayjrkrufcnqvz.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_key),
    body := jsonb_build_object('user_id', new.user_id, 'title', v_title, 'body', left(coalesce(new.text, ''), 150), 'url', v_url)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_push_on_notification on notifications;
create trigger trg_notify_push_on_notification
  after insert on notifications
  for each row execute function notify_push_on_notification();

-- ── Rollback ───────────────────────────────────────────────────────────
-- drop trigger if exists trg_notify_push_on_notification on notifications;
-- drop function if exists notify_push_on_notification();
-- select vault.delete_secret((select id from vault.secrets where name = 'service_role_key'));
