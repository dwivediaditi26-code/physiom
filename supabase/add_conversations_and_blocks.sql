-- PhysioMind Pro — PhysioFeed message requests, blocking, and connection
-- state-machine hardening
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds a real `conversations` table so a DM thread has state (request /
-- accepted / declined), and moves every rule that currently lives only in
-- MessagesPage.jsx (the 3-message cap) into the database, where it can't
-- be bypassed by calling the API directly or by a stale client. Also
-- closes two holes found in the existing `connections` table: today a
-- requester can INSERT status='accepted' directly, and either party can
-- UPDATE any field on a row they're part of (so a requester can accept
-- their own request). Fixed here with a BEFORE UPDATE trigger that only
-- allows specific transitions by the correct party.
--
-- Connections, follows, and conversations stay three independent systems,
-- same as the rest of the app: accepting a message request never creates
-- a connection or a follow, and connecting never touches an existing
-- conversation.
--
-- Safe to run more than once: every statement is `if not exists` /
-- `create or replace` / `drop ... if exists` first, same convention as
-- every other file in this folder. Existing direct_messages rows are
-- migrated into `conversations` as status='accepted' (guarded by `where
-- conversation_id is null`, so re-running this file is a no-op the second
-- time) -- nothing currently in Primary disappears.
--
-- ── Rollback (commented out — nothing below this comment block runs) ────
-- drop trigger if exists trg_enforce_message_rules on direct_messages;
-- drop trigger if exists trg_notify_on_message_v2 on direct_messages;
-- drop trigger if exists trg_notify_message_request_accepted on conversations;
-- drop trigger if exists trg_enforce_connection_transition on connections;
-- drop function if exists enforce_message_rules();
-- drop function if exists notify_on_message();
-- drop function if exists notify_message_request_accepted();
-- drop function if exists enforce_connection_transition();
-- drop function if exists accept_message_request(bigint);
-- drop function if exists decline_message_request(bigint);
-- drop function if exists block_user(uuid);
-- drop function if exists unblock_user(uuid);
-- drop function if exists report_user(uuid, bigint, bigint, text);
-- drop function if exists get_inbox(text, text, int, timestamptz);
-- alter table direct_messages drop column if exists conversation_id;
-- alter table direct_messages drop column if exists request_round;
-- alter table direct_messages drop column if exists client_id;
-- alter table direct_messages drop constraint if exists direct_messages_text_length;
-- drop table if exists conversation_mutes;
-- drop table if exists user_reports;
-- drop table if exists conversations;
-- drop table if exists user_blocks;
-- drop table if exists app_settings;
-- (connections_insert_own / follows_insert_own would need to be reverted
-- to their pre-block-check bodies from add_mvp_network_opportunities.sql
-- / add_social_tables.sql by hand if you ever roll this back)

-- ============================================================
-- SETTINGS (so the decline cooldown is changeable without a migration)
-- ============================================================
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;

-- Settings are read by RPCs (security definer, bypasses RLS) and are not
-- secret, so a public read policy is fine; no client-facing write policy
-- at all -- only you, from the SQL editor, change these.
drop policy if exists "app_settings_select_all" on app_settings;
create policy "app_settings_select_all" on app_settings
  for select using (true);

insert into app_settings (key, value)
  values ('message_cooldown_days', '7')
  on conflict (key) do nothing;

insert into app_settings (key, value)
  values ('message_rate_limit_per_minute', '20')
  on conflict (key) do nothing;

-- ============================================================
-- BLOCKING
-- ============================================================
create table if not exists user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);
alter table user_blocks enable row level security;

-- You can see a block only if you're one of the two people in it -- this
-- is what lets the client show "you can't message this person" without
-- exposing who's blocked whom to anyone else.
drop policy if exists "user_blocks_select_party" on user_blocks;
create policy "user_blocks_select_party" on user_blocks
  for select using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "user_blocks_insert_own" on user_blocks;
create policy "user_blocks_insert_own" on user_blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists "user_blocks_delete_own" on user_blocks;
create policy "user_blocks_delete_own" on user_blocks
  for delete using (auth.uid() = blocker_id);

-- ============================================================
-- CONVERSATIONS (the message-request state machine)
-- ============================================================
create table if not exists conversations (
  id bigint generated always as identity primary key,
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  status text not null default 'request_pending',  -- request_pending | accepted | declined
  request_initiator_id uuid references auth.users(id) on delete set null,
  request_round int not null default 1,
  accepted_at timestamptz,
  declined_at timestamptz,
  cooldown_until timestamptz,
  last_message_text text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_ordered_pair check (user_low < user_high),
  constraint conversations_status_valid check (status in ('request_pending', 'accepted', 'declined')),
  constraint conversations_pair_unique unique (user_low, user_high)
);
alter table conversations enable row level security;

create index if not exists conversations_user_low_idx on conversations (user_low, updated_at desc);
create index if not exists conversations_user_high_idx on conversations (user_high, updated_at desc);

-- Read-only from the client. Every write goes through either the
-- direct_messages BEFORE INSERT trigger below or one of the RPCs
-- (accept/decline/block), all SECURITY DEFINER -- same "no client insert
-- policy, only trusted server-side code writes this table" shape as
-- `notifications`. That's what makes the 3-message cap and the decline
-- cooldown unbypassable from the client.
drop policy if exists "conversations_select_party" on conversations;
create policy "conversations_select_party" on conversations
  for select using (auth.uid() = user_low or auth.uid() = user_high);

-- ============================================================
-- CONVERSATION MUTES (per-user, doesn't affect the other party)
-- ============================================================
create table if not exists conversation_mutes (
  conversation_id bigint not null references conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table conversation_mutes enable row level security;

drop policy if exists "conversation_mutes_select_own" on conversation_mutes;
create policy "conversation_mutes_select_own" on conversation_mutes
  for select using (auth.uid() = user_id);

drop policy if exists "conversation_mutes_insert_own" on conversation_mutes;
create policy "conversation_mutes_insert_own" on conversation_mutes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_mutes.conversation_id
        and (c.user_low = auth.uid() or c.user_high = auth.uid())
    )
  );

drop policy if exists "conversation_mutes_delete_own" on conversation_mutes;
create policy "conversation_mutes_delete_own" on conversation_mutes
  for delete using (auth.uid() = user_id);

-- ============================================================
-- USER REPORTS (reporting a PERSON, distinct from the post-only `reports`
-- table in add_moderation.sql)
-- ============================================================
create table if not exists user_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id bigint references conversations(id) on delete set null,
  message_id bigint references direct_messages(id) on delete set null,
  reason text not null,
  status text not null default 'open',   -- open | dismissed | actioned
  created_at timestamptz not null default now(),
  constraint user_reports_no_self check (reporter_id <> reported_user_id)
);
alter table user_reports enable row level security;

drop policy if exists "user_reports_insert_own" on user_reports;
create policy "user_reports_insert_own" on user_reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "user_reports_select_own_or_admin" on user_reports;
create policy "user_reports_select_own_or_admin" on user_reports
  for select using (
    auth.uid() = reporter_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "user_reports_admin_update" on user_reports;
create policy "user_reports_admin_update" on user_reports
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create index if not exists user_reports_status_idx on user_reports (status, created_at desc);

-- ============================================================
-- DIRECT_MESSAGES — new columns for the request/round system
-- ============================================================
alter table direct_messages add column if not exists conversation_id bigint references conversations(id) on delete cascade;
alter table direct_messages add column if not exists request_round int;
alter table direct_messages add column if not exists client_id text;

create index if not exists direct_messages_conversation_idx on direct_messages (conversation_id, created_at);

-- One row per (sender, client_id) -- lets the app generate a UUID per
-- send attempt so a retried request after a dropped connection can never
-- insert the same message twice. NULLs don't collide with each other, so
-- old rows and any future insert that skips client_id are unaffected.
drop index if exists direct_messages_sender_client_idx;
create unique index direct_messages_sender_client_idx
  on direct_messages (sender_id, client_id) where client_id is not null;

-- NOT VALID: enforced on every new row from now on, but existing rows
-- (some may be empty/oversized from earlier testing) are never checked,
-- so this can't fail partway through on old data.
alter table direct_messages drop constraint if exists direct_messages_text_length;
alter table direct_messages add constraint direct_messages_text_length
  check (char_length(text) between 1 and 2000) not valid;

-- ============================================================
-- BACKFILL — existing direct_messages become accepted conversations
-- ============================================================
-- Every pair that has ever exchanged a DM already had an open, unlimited
-- thread under the old (no-cap-enforced) behavior. Treating them as
-- already 'accepted' is what keeps them in Primary instead of demoting
-- real history into Requests.
insert into conversations (user_low, user_high, status, accepted_at, created_at, updated_at,
                            last_message_text, last_message_at, last_message_sender_id)
select
  least(sender_id, recipient_id),
  greatest(sender_id, recipient_id),
  'accepted',
  min(created_at),
  min(created_at),
  now(),
  (array_agg(left(text, 200) order by created_at desc))[1],
  max(created_at),
  (array_agg(sender_id order by created_at desc))[1]
from direct_messages
where conversation_id is null
group by least(sender_id, recipient_id), greatest(sender_id, recipient_id)
on conflict (user_low, user_high) do nothing;

update direct_messages dm
set conversation_id = c.id
from conversations c
where dm.conversation_id is null
  and c.user_low = least(dm.sender_id, dm.recipient_id)
  and c.user_high = greatest(dm.sender_id, dm.recipient_id);

-- ============================================================
-- THE 3-MESSAGE CAP, ENFORCED SERVER-SIDE
-- ============================================================
-- BEFORE INSERT so a rejected message never lands in the table -- no row
-- to clean up, no gap in the id sequence to explain. pg_advisory_xact_lock
-- serializes two people (or two tabs/devices of the same person) hitting
-- send on the same pair at the same instant, so the count-then-insert
-- below can't race past the cap; the lock releases automatically at the
-- end of the transaction either way.
create or replace function enforce_message_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_low uuid;
  v_high uuid;
  v_conv conversations%rowtype;
  v_connected boolean;
  v_round_count int;
  v_recent_count int;
  v_rate_limit int;
begin
  if new.sender_id = new.recipient_id then
    raise exception 'MSG_INVALID';
  end if;

  v_low := least(new.sender_id, new.recipient_id);
  v_high := greatest(new.sender_id, new.recipient_id);

  perform pg_advisory_xact_lock(hashtextextended(v_low::text || ':' || v_high::text, 0));

  if exists (
    select 1 from user_blocks
    where (blocker_id = new.sender_id and blocked_id = new.recipient_id)
       or (blocker_id = new.recipient_id and blocked_id = new.sender_id)
  ) then
    raise exception 'MSG_BLOCKED';
  end if;

  select coalesce((select (value::text)::int from app_settings where key = 'message_rate_limit_per_minute'), 20)
    into v_rate_limit;
  select count(*) into v_recent_count
    from direct_messages
    where sender_id = new.sender_id and created_at > now() - interval '1 minute';
  if v_recent_count >= v_rate_limit then
    raise exception 'MSG_RATE';
  end if;

  select * into v_conv from conversations where user_low = v_low and user_high = v_high for update;

  if v_conv.id is null then
    select exists (
      select 1 from connections
      where status = 'accepted'
        and least(requester_id, recipient_id) = v_low
        and greatest(requester_id, recipient_id) = v_high
    ) into v_connected;

    insert into conversations (user_low, user_high, status, request_initiator_id, request_round, accepted_at)
    values (
      v_low, v_high,
      case when v_connected then 'accepted' else 'request_pending' end,
      case when v_connected then null else new.sender_id end,
      1,
      case when v_connected then now() else null end
    )
    returning * into v_conv;
  end if;

  if v_conv.status = 'accepted' then
    null; -- unlimited

  elsif v_conv.status = 'declined' then
    if v_conv.cooldown_until is not null and now() < v_conv.cooldown_until then
      raise exception 'MSG_COOLDOWN';
    end if;
    -- Cooldown over (or a very old row with no cooldown set): a fresh
    -- round starts, whoever sends now is that round's initiator.
    update conversations
      set status = 'request_pending',
          request_initiator_id = new.sender_id,
          request_round = request_round + 1,
          declined_at = null,
          cooldown_until = null,
          updated_at = now()
      where id = v_conv.id
      returning * into v_conv;

  elsif v_conv.status = 'request_pending' then
    if new.sender_id = v_conv.request_initiator_id then
      select count(*) into v_round_count
        from direct_messages
        where conversation_id = v_conv.id
          and request_round = v_conv.request_round
          and sender_id = new.sender_id;
      if v_round_count >= 3 then
        raise exception 'MSG_LIMIT_REACHED';
      end if;
    else
      -- The other person replied: that IS acceptance, per spec.
      update conversations
        set status = 'accepted', accepted_at = now(), updated_at = now()
        where id = v_conv.id
        returning * into v_conv;
    end if;
  end if;

  new.conversation_id := v_conv.id;
  new.request_round := v_conv.request_round;

  update conversations
    set last_message_text = left(new.text, 200),
        last_message_at = now(),
        last_message_sender_id = new.sender_id,
        updated_at = now()
    where id = v_conv.id;

  return new;
end;
$$;

drop trigger if exists trg_enforce_message_rules on direct_messages;
create trigger trg_enforce_message_rules
  before insert on direct_messages
  for each row execute function enforce_message_rules();

-- ============================================================
-- NOTIFICATIONS — one "message request" per round, not one per message
-- ============================================================
-- Replaces the notify_on_message() from add_notification_links.sql.
-- AFTER INSERT so conversation_id/request_round (set by the BEFORE
-- trigger above) are already on `new`.
create or replace function notify_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor_name text;
  v_status text;
  v_initiator uuid;
  v_round_count int;
  v_muted boolean;
begin
  select status, request_initiator_id into v_status, v_initiator
    from conversations where id = new.conversation_id;

  select exists (
    select 1 from conversation_mutes
    where conversation_id = new.conversation_id and user_id = new.recipient_id
  ) into v_muted;
  if v_muted then
    return new;
  end if;

  select name into v_actor_name from profiles where id = new.sender_id;

  if v_status = 'accepted' then
    insert into notifications (user_id, icon_name, text, tone, actor_id, kind, entity_type, entity_id)
      values (
        new.recipient_id, 'MessageSquare',
        coalesce(v_actor_name, 'Someone') || ' sent you a message',
        'text-blue-500', new.sender_id, 'message', 'conversation', new.conversation_id::text
      );
  elsif v_status = 'request_pending' and new.sender_id = v_initiator then
    select count(*) into v_round_count
      from direct_messages
      where conversation_id = new.conversation_id
        and request_round = new.request_round
        and sender_id = new.sender_id;
    if v_round_count = 1 then
      insert into notifications (user_id, icon_name, text, tone, actor_id, kind, entity_type, entity_id)
        values (
          new.recipient_id, 'MessageSquare',
          coalesce(v_actor_name, 'Someone') || ' sent you a message request',
          'text-blue-500', new.sender_id, 'message_request', 'conversation', new.conversation_id::text
        );
    end if;
  end if;
  -- v_status = 'request_pending' and sender = the replying party: that
  -- insert already flipped the conversation to 'accepted' inside the
  -- BEFORE trigger by the time this reads it, so it takes the first
  -- branch above -- no separate case needed here.

  return new;
end;
$$;

drop trigger if exists trg_notify_on_message on direct_messages;
drop trigger if exists trg_notify_on_message_v2 on direct_messages;
create trigger trg_notify_on_message_v2
  after insert on direct_messages
  for each row execute function notify_on_message();

create or replace function notify_message_request_accepted() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor_name text;
  v_other uuid;
begin
  if old.status is distinct from new.status and new.status = 'accepted' and new.request_initiator_id is not null then
    v_other := case when new.user_low = new.request_initiator_id then new.user_high else new.user_low end;
    select name into v_actor_name from profiles where id = v_other;
    insert into notifications (user_id, icon_name, text, tone, actor_id, kind, entity_type, entity_id)
      values (
        new.request_initiator_id, 'MessageSquare',
        coalesce(v_actor_name, 'Someone') || ' accepted your message request',
        'text-blue-500', v_other, 'message_request_accepted', 'conversation', new.id::text
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_message_request_accepted on conversations;
create trigger trg_notify_message_request_accepted
  after update on conversations
  for each row execute function notify_message_request_accepted();

-- ============================================================
-- SECURITY FIX — connections: force pending on insert, lock down who can
-- move a request to which state
-- ============================================================
drop policy if exists "connections_insert_own" on connections;
create policy "connections_insert_own" on connections
  for insert with check (
    auth.uid() = requester_id
    and status = 'pending'
    and not exists (
      select 1 from user_blocks
      where (blocker_id = requester_id and blocked_id = recipient_id)
         or (blocker_id = recipient_id and blocked_id = requester_id)
    )
  );

create or replace function enforce_connection_transition() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.requester_id <> old.requester_id or new.recipient_id <> old.recipient_id then
    raise exception 'CONN_INVALID_TRANSITION';
  end if;

  if old.status = 'pending' and new.status = 'accepted' and auth.uid() = old.recipient_id then
    return new;
  elsif old.status = 'pending' and new.status = 'rejected' and auth.uid() = old.recipient_id then
    return new;
  elsif old.status = 'pending' and new.status = 'withdrawn' and auth.uid() = old.requester_id then
    return new;
  elsif old.status in ('rejected', 'withdrawn') and new.status = 'pending' and auth.uid() = old.requester_id then
    return new;
  elsif new.status = old.status then
    return new; -- no state change (e.g. touching updated_at only) -- allow
  else
    raise exception 'CONN_INVALID_TRANSITION';
  end if;
end;
$$;

drop trigger if exists trg_enforce_connection_transition on connections;
create trigger trg_enforce_connection_transition
  before update on connections
  for each row execute function enforce_connection_transition();

-- ============================================================
-- SECURITY FIX — follows: respect blocks
-- ============================================================
drop policy if exists "follows_insert_own" on follows;
create policy "follows_insert_own" on follows
  for insert with check (
    auth.uid() = follower_id
    and not exists (
      select 1 from user_blocks
      where (blocker_id = follower_id and blocked_id = following_id)
         or (blocker_id = following_id and blocked_id = follower_id)
    )
  );

-- ============================================================
-- RPCs
-- ============================================================
create or replace function accept_message_request(p_conversation_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_conv conversations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  select * into v_conv from conversations where id = p_conversation_id for update;
  if v_conv.id is null then
    raise exception 'CONV_NOT_FOUND';
  end if;
  if auth.uid() <> v_conv.user_low and auth.uid() <> v_conv.user_high then
    raise exception 'CONV_NOT_PARTY';
  end if;
  if v_conv.status <> 'request_pending' or auth.uid() = v_conv.request_initiator_id then
    raise exception 'CONV_NOT_PENDING_FOR_YOU';
  end if;
  update conversations set status = 'accepted', accepted_at = now(), updated_at = now()
    where id = p_conversation_id;
end;
$$;

create or replace function decline_message_request(p_conversation_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_conv conversations%rowtype;
  v_cooldown_days int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  select * into v_conv from conversations where id = p_conversation_id for update;
  if v_conv.id is null then
    raise exception 'CONV_NOT_FOUND';
  end if;
  if auth.uid() <> v_conv.user_low and auth.uid() <> v_conv.user_high then
    raise exception 'CONV_NOT_PARTY';
  end if;
  if v_conv.status <> 'request_pending' or auth.uid() = v_conv.request_initiator_id then
    raise exception 'CONV_NOT_PENDING_FOR_YOU';
  end if;
  select coalesce((select (value::text)::int from app_settings where key = 'message_cooldown_days'), 7)
    into v_cooldown_days;
  update conversations
    set status = 'declined', declined_at = now(), cooldown_until = now() + (v_cooldown_days || ' days')::interval, updated_at = now()
    where id = p_conversation_id;
end;
$$;

create or replace function block_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if auth.uid() = p_user_id then
    raise exception 'CANNOT_BLOCK_SELF';
  end if;
  insert into user_blocks (blocker_id, blocked_id) values (auth.uid(), p_user_id)
    on conflict do nothing;

  delete from connections
    where status = 'pending'
      and least(requester_id, recipient_id) = least(auth.uid(), p_user_id)
      and greatest(requester_id, recipient_id) = greatest(auth.uid(), p_user_id);

  delete from follows
    where (follower_id = auth.uid() and following_id = p_user_id)
       or (follower_id = p_user_id and following_id = auth.uid());
end;
$$;

create or replace function unblock_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  delete from user_blocks where blocker_id = auth.uid() and blocked_id = p_user_id;
end;
$$;

create or replace function report_user(
  p_reported_user_id uuid,
  p_reason text,
  p_conversation_id bigint default null,
  p_message_id bigint default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  insert into user_reports (reporter_id, reported_user_id, conversation_id, message_id, reason)
    values (auth.uid(), p_reported_user_id, p_conversation_id, p_message_id, p_reason);
end;
$$;

-- Inbox: one call, no N+1. `p_tab` = 'primary' (accepted) or 'requests'
-- (pending both directions, plus declined-but-only-to-the-person-who-sent-
-- it -- the person who declined never sees that row again, per spec).
create or replace function get_inbox(
  p_tab text,
  p_search text default null,
  p_limit int default 30,
  p_before timestamptz default null
) returns table (
  conversation_id bigint,
  other_user_id uuid,
  other_name text,
  other_role text,
  other_avatar_url text,
  other_initials text,
  other_gradient text,
  status text,
  request_initiator_id uuid,
  request_round int,
  request_direction text,
  messages_sent_this_round int,
  last_message_text text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count int,
  connection_status text,
  connection_requester_id uuid,
  is_following boolean,
  cooldown_until timestamptz,
  updated_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  return query
  select
    c.id,
    other.id,
    p.name, p.role, p.avatar_url, p.initials, p.gradient,
    c.status,
    c.request_initiator_id,
    c.request_round,
    case when c.status = 'request_pending' or (c.status = 'declined' and c.request_initiator_id = auth.uid())
      then case when c.request_initiator_id = auth.uid() then 'outgoing' else 'incoming' end
      else null end,
    case when c.status = 'request_pending' and c.request_initiator_id = auth.uid()
      then (select count(*)::int from direct_messages dm
            where dm.conversation_id = c.id and dm.request_round = c.request_round and dm.sender_id = auth.uid())
      else null end,
    c.last_message_text, c.last_message_at, c.last_message_sender_id,
    (select count(*)::int from direct_messages dm2
      where dm2.conversation_id = c.id and dm2.recipient_id = auth.uid() and dm2.read = false),
    conn.status,
    conn.requester_id,
    exists (select 1 from follows f where f.follower_id = auth.uid() and f.following_id = other.id),
    c.cooldown_until,
    c.updated_at
  from conversations c
  join lateral (select case when c.user_low = auth.uid() then c.user_high else c.user_low end as id) other on true
  join profiles p on p.id = other.id
  left join connections conn
    on least(conn.requester_id, conn.recipient_id) = least(auth.uid(), other.id)
   and greatest(conn.requester_id, conn.recipient_id) = greatest(auth.uid(), other.id)
  where (c.user_low = auth.uid() or c.user_high = auth.uid())
    and (
      (p_tab = 'primary' and c.status = 'accepted')
      or (p_tab = 'requests' and (
            c.status = 'request_pending'
            or (c.status = 'declined' and c.request_initiator_id = auth.uid())
          ))
    )
    and (p_search is null or p_search = '' or p.name ilike '%' || p_search || '%')
    and (p_before is null or c.updated_at < p_before)
  order by c.updated_at desc
  limit p_limit;
end;
$$;

-- ============================================================
-- REALTIME
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table conversations;
exception when duplicate_object then null;
end $$;
