-- URGENT — run this now if you already ran add_conversations_and_blocks.sql
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Bug found right after deploying: accept_message_request and
-- decline_message_request checked `auth.uid() <> conv.user_low` as their
-- "are you actually part of this conversation" guard. For a signed-out
-- (anon) caller, auth.uid() is NULL, and `NULL <> x` evaluates to NULL --
-- which a plpgsql `IF` treats as false, so the guard silently didn't
-- fire. That meant anyone, without even being logged in, could call
-- these two functions directly against the API and accept or decline
-- someone else's message request by guessing a conversation id.
--
-- Fix: every function below now checks `auth.uid() is null` first and
-- refuses immediately. block_user/unblock_user/report_user/get_inbox
-- were already safe by accident (a NOT NULL column, or a delete/select
-- that just matches nothing), but get the same explicit check anyway.
--
-- Safe to run more than once -- these are all `create or replace`.
-- add_conversations_and_blocks.sql has been updated in the repo with
-- this fix already folded in, so a future fresh run of that one file is
-- also fine; this smaller file exists only so the one broken piece can
-- be patched right now without re-running everything.

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
