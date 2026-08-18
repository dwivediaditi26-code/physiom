-- PhysioMind Pro — PhysioFeed direct messages
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Lets clinicians message each other directly (Aditi's request: "chat
-- area to message the physios"). One flat table holds every 1:1 message
-- -- a "conversation" is just every row where you're the sender or the
-- recipient, grouped client-side by the other person; no separate
-- conversations table needed for a straightforward 1:1 DM feature (same
-- reasoning as comments not needing a separate "threads" table).
--
-- RLS here is two-sided on select (you can read a message if you're
-- EITHER party, not just the sender) -- a conversation is meaningless if
-- only the sender could ever read it back. Only the recipient can flip
-- `read` (same "update just one boolean flag on your own visible row"
-- trust shape as notifications_update_own in add_notifications.sql).

create table if not exists direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false,
  constraint direct_messages_no_self_message check (sender_id <> recipient_id)
);
alter table direct_messages enable row level security;

create policy "direct_messages_select_participant" on direct_messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "direct_messages_insert_own" on direct_messages
  for insert with check (auth.uid() = sender_id);
create policy "direct_messages_update_recipient_read" on direct_messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create index if not exists direct_messages_sender_idx on direct_messages (sender_id, recipient_id, created_at desc);
create index if not exists direct_messages_recipient_idx on direct_messages (recipient_id, sender_id, created_at desc);

-- ── Auto-notify on new message ─────────────────────────────────────────
-- Same SECURITY DEFINER trigger pattern as add_notifications.sql -- lets
-- the recipient find out about a new message via the existing bell icon,
-- without giving the client any way to write into someone else's
-- notifications directly.
create or replace function notify_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sender_name text;
begin
  select name into v_sender_name from profiles where id = new.sender_id;
  insert into notifications (user_id, icon_name, text, tone)
    values (new.recipient_id, 'MessageSquare', coalesce(v_sender_name, 'Someone') || ' sent you a message', 'text-blue-500');
  return new;
end;
$$;
drop trigger if exists trg_notify_on_message on direct_messages;
create trigger trg_notify_on_message after insert on direct_messages
  for each row execute function notify_on_message();
