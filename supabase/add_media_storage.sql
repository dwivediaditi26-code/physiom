-- PhysioMind Pro — PhysioFeed real media upload (Storage buckets)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Step 6 of the PhysioFeed real-world rollout, and the last piece of the V1
-- roadmap: real photo/video posts instead of the gradient-tile placeholders
-- every demo post uses. Three public buckets, one per media kind (keeps
-- storage RLS simple -- one bucket-per-purpose instead of one bucket with
-- type-sniffing policies). Files are always uploaded under
-- `<your-user-id>/<filename>` -- that per-user folder is what the RLS
-- policies below check against, using Supabase Storage's own
-- storage.foldername() helper (splits the object path on "/" and returns
-- everything except the filename).
--
-- Buckets are marked public because posts are public content -- the same
-- "profiles/posts are public, only writes are owner-scoped" reasoning as
-- every table in this rollout. A public bucket serves files over a plain
-- CDN URL with no signed-URL expiry to manage, same as any social app's
-- media. The explicit SELECT policies below are belt-and-suspenders on top
-- of the bucket's public flag.
--
-- profile-images is created here too (for a future avatar-upload feature)
-- but nothing in the app uploads to it yet -- only post-images/post-videos
-- are wired up from Composer.jsx as of this migration.

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true), ('post-videos', 'post-videos', true), ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

-- ── Public read ──────────────────────────────────────────────────────────
create policy "post_images_public_read" on storage.objects
  for select using (bucket_id = 'post-images');
create policy "post_videos_public_read" on storage.objects
  for select using (bucket_id = 'post-videos');
create policy "profile_images_public_read" on storage.objects
  for select using (bucket_id = 'profile-images');

-- ── Upload only into your own folder ────────────────────────────────────
create policy "post_images_insert_own_folder" on storage.objects
  for insert with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post_videos_insert_own_folder" on storage.objects
  for insert with check (bucket_id = 'post-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_images_insert_own_folder" on storage.objects
  for insert with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Delete only your own files ──────────────────────────────────────────
create policy "post_images_delete_own" on storage.objects
  for delete using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post_videos_delete_own" on storage.objects
  for delete using (bucket_id = 'post-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_images_delete_own" on storage.objects
  for delete using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
