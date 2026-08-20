-- PhysioMind Pro — PhysioFeed notification deep-links
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Phase (2026-08-19): notifications were readable/mark-as-readable but had
-- no way to know WHO triggered them or WHERE clicking one should go --
-- Header.jsx's dropdown just showed text with no click target. There's no
-- single-post detail page in PhysioFeed yet (only the /feed list and
-- /profile/:userId), so the honest, always-real destination for every
-- notification kind is the actor's profile (or the message thread for
-- direct messages) -- not a link to a page that doesn't exist.
--
-- Additive-only: both new columns are nullable, so this is safe to run
-- against existing rows/data without a backfill.

alter table notifications add column if not exists actor_id uuid references auth.users(id) on delete set null;
alter table notifications add column if not exists kind text; -- 'like' | 'comment' | 'follow' | 'message'

-- ── Re-create the auto-notify triggers to also record actor_id/kind ─────

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
  insert into notifications (user_id, icon_name, text, tone, actor_id, kind)
    values (v_author_id, 'Heart', coalesce(v_actor_name, 'Someone') || ' liked your post: ' || left(coalesce(v_heading, ''), 40), 'text-rose-500', new.user_id, 'like');
  return new;
end;
$$;

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
  insert into notifications (user_id, icon_name, text, tone, actor_id, kind)
    values (v_author_id, 'MessageCircle', coalesce(v_actor_name, 'Someone') || ' commented on your post: ' || left(coalesce(v_heading, ''), 40), 'text-violet-600', new.author_id, 'comment');
  return new;
end;
$$;

create or replace function notify_on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor_name text;
begin
  select name into v_actor_name from profiles where id = new.follower_id;
  insert into notifications (user_id, icon_name, text, tone, actor_id, kind)
    values (new.following_id, 'UserPlus', coalesce(v_actor_name, 'Someone') || ' started following you', 'text-blue-500', new.follower_id, 'follow');
  return new;
end;
$$;

create or replace function notify_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor_name text;
begin
  select name into v_actor_name from profiles where id = new.sender_id;
  insert into notifications (user_id, icon_name, text, tone, actor_id, kind)
    values (new.recipient_id, 'MessageSquare', coalesce(v_actor_name, 'Someone') || ' sent you a message', 'text-blue-500', new.sender_id, 'message');
  return new;
end;
$$;

-- Triggers already exist (created in add_notifications.sql / add_direct_messages.sql)
-- and keep firing on the updated function bodies automatically -- no need
-- to drop/recreate the triggers themselves, only the functions.
