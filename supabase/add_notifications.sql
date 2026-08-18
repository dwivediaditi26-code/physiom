-- PhysioMind Pro — PhysioFeed notifications table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Step 4 of the PhysioFeed real-world rollout. Notifications are different
-- from every table added so far: a notification has to be WRITTEN by one
-- person's action (liking a post) but be readable only by a DIFFERENT
-- person (the post's author). A simple "insert with check (auth.uid() =
-- user_id)" policy can't express that -- it would either block the real
-- use case entirely, or (if loosened to "insert with check (auth.uid() is
-- not null)") let any signed-in clinician insert fake notifications into
-- anyone's inbox, which is exactly the kind of hole this rollout has been
-- careful to avoid everywhere else.
--
-- The correct, standard fix: give this table NO client-facing insert
-- policy at all (RLS defaults to deny, so the app can never insert a
-- notification directly), and instead create SECURITY DEFINER trigger
-- functions on post_likes / comments / follows that write the
-- notification row automatically, server-side, the instant the real
-- action happens. A trigger function owned by the table owner runs with
-- the owner's privileges regardless of who's connected, so it can safely
-- write into another user's notifications row -- but ONLY in the exact,
-- narrow shape this file defines. The client still can't forge one.

create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,  -- recipient
  icon_name text not null default 'Bell',
  text text not null,
  tone text not null default 'text-violet-600',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;

-- You can only ever see your own notifications.
create policy "notifications_select_own" on notifications
  for select using (auth.uid() = user_id);
-- You can mark your own notifications read (no other field should change
-- from the client -- that's a UI-trust assumption, same as every other
-- update-your-own-row policy in this app; a stricter version would need a
-- column-level grant, not worth it for V1).
create policy "notifications_update_own" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Deliberately NO insert or delete policy -- see comment above. Only the
-- trigger functions below (SECURITY DEFINER) can write rows here.

create index if not exists notifications_user_id_created_at_idx on notifications (user_id, created_at desc);

-- ── Auto-notify triggers ────────────────────────────────────────────────

create or replace function notify_on_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author_id uuid;
  v_heading text;
  v_actor_name text;
begin
  select author_id, heading into v_author_id, v_heading from posts where id = new.post_id;
  if v_author_id is null or v_author_id = new.user_id then
    return new; -- post gone, or you liked your own post -- no notification either way
  end if;
  select name into v_actor_name from profiles where id = new.user_id;
  insert into notifications (user_id, icon_name, text, tone)
    values (v_author_id, 'Heart', coalesce(v_actor_name, 'Someone') || ' liked your post: ' || left(coalesce(v_heading, ''), 40), 'text-rose-500');
  return new;
end;
$$;
drop trigger if exists trg_notify_on_like on post_likes;
create trigger trg_notify_on_like after insert on post_likes
  for each row execute function notify_on_like();

create or replace function notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author_id uuid;
  v_heading text;
  v_actor_name text;
begin
  select author_id, heading into v_author_id, v_heading from posts where id = new.post_id;
  if v_author_id is null or v_author_id = new.author_id then
    return new;
  end if;
  select name into v_actor_name from profiles where id = new.author_id;
  insert into notifications (user_id, icon_name, text, tone)
    values (v_author_id, 'MessageCircle', coalesce(v_actor_name, 'Someone') || ' commented on your post: ' || left(coalesce(v_heading, ''), 40), 'text-violet-600');
  return new;
end;
$$;
drop trigger if exists trg_notify_on_comment on comments;
create trigger trg_notify_on_comment after insert on comments
  for each row execute function notify_on_comment();

create or replace function notify_on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor_name text;
begin
  select name into v_actor_name from profiles where id = new.follower_id;
  insert into notifications (user_id, icon_name, text, tone)
    values (new.following_id, 'UserPlus', coalesce(v_actor_name, 'Someone') || ' started following you', 'text-blue-500');
  return new;
end;
$$;
drop trigger if exists trg_notify_on_follow on follows;
create trigger trg_notify_on_follow after insert on follows
  for each row execute function notify_on_follow();
