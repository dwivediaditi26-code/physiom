-- Test script for supabase/add_conversations_and_blocks.sql
-- Run this in: Supabase Dashboard > SQL Editor > New Query
--
-- WHAT THIS DOES: exercises the 3-message cap, blocking, the decline
-- cooldown, and the auth bug that was found and fixed (see
-- fix_message_rpcs_auth_guard.sql) -- all against three THROWAWAY test
-- users, entirely inside one transaction that ends in ROLLBACK. Nothing
-- here is left behind either way: if every check passes, the ROLLBACK
-- undoes the fixtures anyway; if a check fails, the RAISE EXCEPTION
-- aborts the transaction, which also undoes everything up to that point.
-- Safe to run against production for this reason -- it never COMMITs.
--
-- Each check is `do $$ ... if not (condition) then raise exception
-- 'FAIL: ...'; end if; end $$;` -- a clean run prints nothing but NOTICEs;
-- a failing one stops the whole script with a message naming exactly
-- which rule broke.
--
-- WHAT THIS DOESN'T COVER: true concurrent double-sends (two people
-- hitting Send in the same instant) can't be simulated from one session/
-- one script -- Postgres has no way to run two statements from the same
-- connection "at once". To check the pg_advisory_xact_lock actually
-- serializes that, open two SQL Editor tabs, `begin;` in both, run
-- section 2's "message 3" insert in tab A, and WHILE THAT TRANSACTION IS
-- STILL OPEN (don't commit/rollback yet) run the same insert in tab B --
-- tab B should hang until tab A finishes, not run concurrently and both
-- succeed. `rollback;` both tabs after.

begin;

-- ============================================================
-- 0. FIXTURES -- three throwaway users, rolled back at the end
-- ============================================================
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'test-a@example.invalid'),
  ('00000000-0000-0000-0000-00000000a002', 'test-b@example.invalid'),
  ('00000000-0000-0000-0000-00000000a003', 'test-c@example.invalid');

insert into profiles (id, name) values
  ('00000000-0000-0000-0000-00000000a001', 'Test A'),
  ('00000000-0000-0000-0000-00000000a002', 'Test B'),
  ('00000000-0000-0000-0000-00000000a003', 'Test C');

-- Simulates one request's worth of PostgREST auth context: `set local
-- role authenticated` is what makes RLS actually apply (the `postgres`
-- role used by the SQL editor bypasses RLS by default, same as
-- service_role does); the JWT claim GUCs are what auth.uid() reads.
-- Both claim.sub (older projects) and the claims JSON (current) are set
-- so this works regardless of which auth.uid() definition this project
-- has.
create or replace function _test_become(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- ============================================================
-- 1. FIRST CONTACT: A messages B (not connected) -- pending, capped at 3
-- ============================================================
select _test_become('00000000-0000-0000-0000-00000000a001');
insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a002', 'msg 1');

do $$
declare v_conv conversations%rowtype;
begin
  select * into v_conv from conversations
    where user_low = least('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000a002'::uuid)
      and user_high = greatest('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000a002'::uuid);
  if v_conv.status <> 'request_pending' or v_conv.request_initiator_id <> '00000000-0000-0000-0000-00000000a001' then
    raise exception 'FAIL: first message should create a request_pending conversation with A as initiator, got status=%, initiator=%', v_conv.status, v_conv.request_initiator_id;
  end if;
  raise notice 'PASS: first message creates request_pending, A is initiator';
end $$;

-- Messages 2 and 3 from A: still allowed.
select _test_become('00000000-0000-0000-0000-00000000a001');
insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a002', 'msg 2');
insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a002', 'msg 3');

do $$ begin raise notice 'PASS: messages 2 and 3 from the initiator went through'; end $$;

-- Message 4 from A: must be rejected with MSG_LIMIT_REACHED.
do $$
begin
  select _test_become('00000000-0000-0000-0000-00000000a001');
  begin
    insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a002', 'msg 4 -- should be blocked');
    raise exception 'FAIL: a 4th unanswered message from the initiator was allowed through';
  exception when others then
    if sqlerrm <> 'MSG_LIMIT_REACHED' then
      raise exception 'FAIL: expected MSG_LIMIT_REACHED, got: %', sqlerrm;
    end if;
    raise notice 'PASS: 4th unanswered message rejected with MSG_LIMIT_REACHED';
  end;
end $$;

-- ============================================================
-- 2. REPLY = ACCEPT, then unlimited messaging
-- ============================================================
select _test_become('00000000-0000-0000-0000-00000000a002');
insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-00000000a001', 'sure, happy to help');

do $$
declare v_status text;
begin
  select status into v_status from conversations
    where user_low = least('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000a002'::uuid)
      and user_high = greatest('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000a002'::uuid);
  if v_status <> 'accepted' then
    raise exception 'FAIL: B replying should auto-accept the conversation, got status=%', v_status;
  end if;
  raise notice 'PASS: B replying auto-accepts the conversation';
end $$;

-- Now unlimited both ways -- A sends a 4th, 5th, 6th with no error.
select _test_become('00000000-0000-0000-0000-00000000a001');
insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a002', 'thanks!');
insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a002', 'one more question');

do $$ begin raise notice 'PASS: unlimited messaging after acceptance'; end $$;

-- ============================================================
-- 3. AUTHORIZATION -- the exact bug found after the first deploy
-- ============================================================
-- C (not a party to A/B's conversation) must not be able to accept or
-- decline it.
do $$
declare v_conv_id bigint;
begin
  select id into v_conv_id from conversations
    where user_low = least('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000a002'::uuid)
      and user_high = greatest('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000a002'::uuid);

  perform _test_become('00000000-0000-0000-0000-00000000a003');
  begin
    perform accept_message_request(v_conv_id);
    raise exception 'FAIL: a non-party (C) was able to accept A/B''s conversation';
  exception when others then
    if sqlerrm <> 'CONV_NOT_PARTY' then raise exception 'FAIL: expected CONV_NOT_PARTY for a non-party accept, got: %', sqlerrm; end if;
  end;

  -- An UNAUTHENTICATED caller (no JWT at all -- this is the exact bug:
  -- auth.uid() is NULL, and NULL <> x used to evaluate to NULL/false
  -- instead of raising) must also be refused.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    perform accept_message_request(v_conv_id);
    raise exception 'FAIL: an UNAUTHENTICATED (anon) caller was able to accept someone else''s conversation -- the auth-bypass bug is back';
  exception when others then
    if sqlerrm <> 'NOT_AUTHENTICATED' then raise exception 'FAIL: expected NOT_AUTHENTICATED for an anon accept, got: %', sqlerrm; end if;
  end;

  raise notice 'PASS: a non-party and an unauthenticated caller are both refused';
end $$;

-- ============================================================
-- 4. DECLINE + COOLDOWN, then a fresh round
-- ============================================================
-- Fresh pair for this section: C requests A, A declines.
select _test_become('00000000-0000-0000-0000-00000000a003');
insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-00000000a001', 'hello from C');

do $$
declare v_conv_id bigint;
begin
  select id into v_conv_id from conversations
    where user_low = least('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000a003'::uuid)
      and user_high = greatest('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000a003'::uuid);

  perform _test_become('00000000-0000-0000-0000-00000000a001');
  perform decline_message_request(v_conv_id);

  if (select status from conversations where id = v_conv_id) <> 'declined' then
    raise exception 'FAIL: decline_message_request did not set status to declined';
  end if;
  if (select cooldown_until from conversations where id = v_conv_id) is null then
    raise exception 'FAIL: decline_message_request did not set a cooldown_until';
  end if;
  raise notice 'PASS: decline sets status=declined with a cooldown';

  -- C tries again immediately -- must be rejected with MSG_COOLDOWN.
  perform _test_become('00000000-0000-0000-0000-00000000a003');
  begin
    insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-00000000a001', 'please reconsider');
    raise exception 'FAIL: a message during the cooldown window was allowed through';
  exception when others then
    if sqlerrm <> 'MSG_COOLDOWN' then raise exception 'FAIL: expected MSG_COOLDOWN, got: %', sqlerrm; end if;
  end;
  raise notice 'PASS: messaging during the cooldown window is rejected';

  -- Backdate the cooldown (test-only shortcut for "time passed") and
  -- confirm a fresh round starts, with C as the new round's initiator.
  -- `reset role` first -- `conversations` has no UPDATE policy for
  -- `authenticated` at all (it's read-only from the client by design, see
  -- the migration), so this write needs the session's own un-simulated
  -- role (postgres/service_role, which bypasses RLS), not whichever
  -- test user _test_become() last became.
  reset role;
  update conversations set cooldown_until = now() - interval '1 minute' where id = v_conv_id;
  perform _test_become('00000000-0000-0000-0000-00000000a003');
  insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a003', '00000000-0000-0000-0000-00000000a001', 'trying again after cooldown');

  if (select status from conversations where id = v_conv_id) <> 'request_pending' then
    raise exception 'FAIL: a message after cooldown should start a fresh request_pending round';
  end if;
  if (select request_round from conversations where id = v_conv_id) <> 2 then
    raise exception 'FAIL: expected request_round to advance to 2, got %', (select request_round from conversations where id = v_conv_id);
  end if;
  raise notice 'PASS: a message after cooldown starts round 2 with a fresh 3-message allowance';
end $$;

-- ============================================================
-- 5. BLOCKING
-- ============================================================
do $$
begin
  -- B blocks A.
  perform _test_become('00000000-0000-0000-0000-00000000a002');
  perform block_user('00000000-0000-0000-0000-00000000a001');

  -- A tries to message B -- must be rejected with MSG_BLOCKED, both
  -- directions (the check is symmetric).
  perform _test_become('00000000-0000-0000-0000-00000000a001');
  begin
    insert into direct_messages (sender_id, recipient_id, text) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a002', 'hey, why so quiet');
    raise exception 'FAIL: a message to someone who blocked you was allowed through';
  exception when others then
    if sqlerrm <> 'MSG_BLOCKED' then raise exception 'FAIL: expected MSG_BLOCKED, got: %', sqlerrm; end if;
  end;
  raise notice 'PASS: blocked pair cannot message either way';

  -- Connection request from the blocked side must also be refused (RLS
  -- policy, not the trigger -- surfaces as a generic RLS violation on
  -- INSERT, not a custom code, so this only checks it's rejected at all).
  begin
    insert into connections (requester_id, recipient_id, status) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a002', 'pending');
    raise exception 'FAIL: a connection request from a blocked person was allowed through';
  exception when others then
    raise notice 'PASS: connection request from a blocked person is rejected (%)', sqlerrm;
  end;
end $$;

-- ============================================================
-- 6. CONNECTIONS STATE MACHINE (the self-accept hole)
-- ============================================================
do $$
declare v_conn_id bigint;
begin
  -- Fresh pair for this section.
  perform _test_become('00000000-0000-0000-0000-00000000a002');
  insert into connections (requester_id, recipient_id, status) values ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-00000000a003', 'pending')
    returning id into v_conn_id;

  -- The REQUESTER trying to flip their own request straight to accepted
  -- must be rejected -- this was the original hole.
  begin
    update connections set status = 'accepted' where id = v_conn_id;
    raise exception 'FAIL: the requester was able to accept their own connection request';
  exception when others then
    if sqlerrm <> 'CONN_INVALID_TRANSITION' then raise exception 'FAIL: expected CONN_INVALID_TRANSITION, got: %', sqlerrm; end if;
  end;
  raise notice 'PASS: requester cannot self-accept';

  -- The actual recipient accepting is still allowed.
  perform _test_become('00000000-0000-0000-0000-00000000a003');
  update connections set status = 'accepted' where id = v_conn_id;
  if (select status from connections where id = v_conn_id) <> 'accepted' then
    raise exception 'FAIL: the real recipient accepting the request did not go through';
  end if;
  raise notice 'PASS: the real recipient can accept';
end $$;

do $$ begin raise notice '=== ALL CHECKS PASSED ==='; end $$;

-- Undo every fixture and every row the checks above created -- this
-- script is designed to never actually persist anything.
rollback;
