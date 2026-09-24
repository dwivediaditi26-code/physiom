-- PhysioMind Pro — PhysioFeed Clinical Discussion (Quora-style Q&A)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds threaded answers/replies + case-update flags to the existing
-- `comments` table (additive only). No changes to `posts` -- post_type has
-- no CHECK constraint (add_content_types.sql), so 'discussion' just works
-- the moment db.js writes it. "Closed" state lives in the existing
-- `posts.media` jsonb column, same pattern as case/research/poll fields
-- (posts_update_own RLS already scopes writes to the author).
--
-- Threading: parent_comment_id is null for a top-level entry (an answer or
-- a case/final update) and set for a one-level-deep reply under an answer
-- or update. The insert policy enforces both that a reply's parent belongs
-- to the same post and that the parent is itself top-level (depth-one
-- only, matching the UI).

alter table comments add column if not exists parent_comment_id bigint references comments(id) on delete cascade;
alter table comments add column if not exists is_case_update boolean not null default false;
alter table comments add column if not exists is_final_update boolean not null default false;

create index if not exists comments_parent_comment_id_idx on comments (parent_comment_id);

-- ── Tightened insert policy ──────────────────────────────────────────────
-- comments_reply_parent_ok() exists so the parent-lookup subquery's own
-- "comments pc" alias can't shadow the NEW row's parent_comment_id/post_id
-- (a bare correlated subquery referencing those two column names against
-- the SAME table silently resolves to the subquery's own aliased columns
-- instead of the row being inserted -- passing them in as function
-- arguments sidesteps that ambiguity entirely).
create or replace function comments_reply_parent_ok(p_parent_id bigint, p_post_id text) returns boolean
language sql stable as $$
  select exists (
    select 1 from comments pc
    where pc.id = p_parent_id and pc.post_id = p_post_id and pc.parent_comment_id is null
  );
$$;

drop policy if exists "comments_insert_own" on comments;
create policy "comments_insert_own" on comments
  for insert with check (
    auth.uid() = author_id
    and (parent_comment_id is null or comments_reply_parent_ok(parent_comment_id, post_id))
    and (
      (not is_case_update and not is_final_update)
      or (
        parent_comment_id is null
        and auth.uid() = (select author_id from posts where id = post_id and post_type = 'discussion')
      )
    )
  );

-- ── notify_on_comment(): re-targeted for replies + discussion wording ────
-- Replaces the version from add_notification_post_id.sql (the LAST real
-- migration to touch this function -- verified, NOT add_notifications.sql's
-- original 4-column version). Keeps the exact same
-- (user_id, icon_name, text, tone, actor_id, kind, post_id) insert shape so
-- getNotifications()'s kind==='comment' -> /feed?post=<id> deep link keeps
-- working unchanged for every post type, not just discussions.
create or replace function notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author_id uuid;
  v_heading text;
  v_post_type text;
  v_actor_name text;
  v_parent_author_id uuid;
begin
  select author_id, heading, post_type into v_author_id, v_heading, v_post_type from posts where id = new.post_id;
  select name into v_actor_name from profiles where id = new.author_id;

  if new.parent_comment_id is not null then
    select author_id into v_parent_author_id from comments where id = new.parent_comment_id;
    if v_parent_author_id is null or v_parent_author_id = new.author_id then
      return new;
    end if;
    insert into notifications (user_id, icon_name, text, tone, actor_id, kind, post_id)
      values (v_parent_author_id, 'MessageCircle', coalesce(v_actor_name, 'Someone') || ' replied to your answer: ' || left(coalesce(v_heading, ''), 40), 'text-violet-600', new.author_id, 'comment', new.post_id);
    return new;
  end if;

  if v_author_id is null or v_author_id = new.author_id then
    return new; -- post gone, or you commented/updated your own post -- no notification
  end if;

  insert into notifications (user_id, icon_name, text, tone, actor_id, kind, post_id)
    values (
      v_author_id, 'MessageCircle',
      coalesce(v_actor_name, 'Someone') || (case when v_post_type = 'discussion' then ' answered your discussion: ' else ' commented on your post: ' end) || left(coalesce(v_heading, ''), 40),
      'text-violet-600', new.author_id, 'comment', new.post_id
    );
  return new;
end;
$$;
-- Trigger already exists (add_notifications.sql) and keeps firing on the
-- updated function body -- no need to drop/recreate the trigger itself.

-- ── New: notify prior participants on a case/final update ────────────────
create or replace function notify_on_case_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_heading text;
  v_actor_name text;
  v_recipient uuid;
  v_text text;
begin
  if not (new.is_case_update or new.is_final_update) then
    return new;
  end if;
  select heading into v_heading from posts where id = new.post_id;
  select name into v_actor_name from profiles where id = new.author_id;
  v_text := coalesce(v_actor_name, 'Someone') || ' added ' || (case when new.is_final_update then 'a final update' else 'new information' end) || ' to a discussion you answered: ' || left(coalesce(v_heading, ''), 40);

  for v_recipient in
    select distinct author_id from comments
    where post_id = new.post_id and author_id <> new.author_id and id <> new.id
  loop
    insert into notifications (user_id, icon_name, text, tone, actor_id, kind, post_id)
      values (v_recipient, 'MessageSquare', v_text, 'text-emerald-600', new.author_id, 'comment', new.post_id);
  end loop;
  return new;
end;
$$;
drop trigger if exists trg_notify_on_case_update on comments;
create trigger trg_notify_on_case_update after insert on comments
  for each row execute function notify_on_case_update();

-- ── Storage: optional "Add document" attachment ───────────────────────────
-- Same three-policy shape as add_media_storage.sql (post-images/post-videos)
-- and add_profile_clinical_cv.sql (resumes).
insert into storage.buckets (id, name, public)
values ('post-documents', 'post-documents', true)
on conflict (id) do nothing;

create policy "post_documents_public_read" on storage.objects
  for select using (bucket_id = 'post-documents');
create policy "post_documents_insert_own_folder" on storage.objects
  for insert with check (bucket_id = 'post-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post_documents_delete_own" on storage.objects
  for delete using (bucket_id = 'post-documents' and (storage.foldername(name))[1] = auth.uid()::text);
