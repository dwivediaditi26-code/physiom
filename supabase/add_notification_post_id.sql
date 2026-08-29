-- PhysioMind Pro — PhysioFeed notification deep-links to the actual post
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Phase (2026-08-27, Aditi's request: "like how it happens in Insta"):
-- add_notification_links.sql pointed like/comment notifications at the
-- actor's profile because there was no single-post view to link to at the
-- time. PostDetailModal.jsx (opened from GridPostCard.jsx on the
-- Profile/Saved/Explore grids) already exists now, so this adds the
-- missing post_id onto the notification row and re-points those two
-- trigger functions at it -- getNotifications() in db.js turns that into
-- a /feed?post=<id> link that opens the same modal on the main feed.
--
-- Additive-only: the new column is nullable, so this is safe to run
-- against existing rows/data without a backfill. Older like/comment rows
-- (from before this migration) simply have a null post_id and fall back to
-- the actor's profile, same as they do today.

alter table notifications add column if not exists post_id text references posts(id) on delete set null;

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
  insert into notifications (user_id, icon_name, text, tone, actor_id, kind, post_id)
    values (v_author_id, 'Heart', coalesce(v_actor_name, 'Someone') || ' liked your post: ' || left(coalesce(v_heading, ''), 40), 'text-rose-500', new.user_id, 'like', new.post_id);
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
  insert into notifications (user_id, icon_name, text, tone, actor_id, kind, post_id)
    values (v_author_id, 'MessageCircle', coalesce(v_actor_name, 'Someone') || ' commented on your post: ' || left(coalesce(v_heading, ''), 40), 'text-violet-600', new.author_id, 'comment', new.post_id);
  return new;
end;
$$;

-- Triggers already exist (created in add_notifications.sql) and keep
-- firing on the updated function bodies automatically -- no need to
-- drop/recreate the triggers themselves, only the functions.
