# PhysioFeed media storage: today and the move to AWS

## Today (Phase A, done)
- Every PhysioFeed upload goes through `putMedia()` in `src/physiofeed/data/mediaStorage.js`.
  Kinds: post photos, post videos, post documents, profile pictures, CVs, workshop covers.
- Files live in Supabase Storage (public buckets, one per kind). The backend is chosen by
  `STORAGE_BACKEND`.
- Photos are shrunk on the phone before upload (max 1600 px, JPEG). Limits per bucket are in
  `BUCKET_LIMIT_MB` (photos 10 MB, videos 100 MB, documents and CVs 8 MB).
- Each upload records a small `media_uploaded` analytics event (bucket, bytes, type, store) so growth
  can be seen in the `analytics_events` table before the bill shows it.
- The reference photos (ROM, MMT, exercises, Neuro and so on) are NOT PhysioFeed media. They are in
  Cloudinary and are uploaded by admins only.

## Moving to AWS later (Phase B)
Do this when storage or delivery cost becomes a real number, not at a fixed number of users.
Videos are what grow the cost.

1. Compare prices first (AWS S3 Mumbai + CloudFront, and other stores that charge nothing for data
   going out to users). Pick one.
2. Create the bucket in the Mumbai region (`ap-south-1`) so data stays in India, and a CDN in front.
3. Add a server step (like `api/admin/cloudinarySign.js`) that checks the person is signed in, then
   gives their phone a short-lived upload address. AWS keys go only in Vercel's environment
   variables.
4. Add a second backend to `mediaStorage.js` (`put(bucket, path, file)` returns the public URL).
5. Copy the old files across, then rewrite the stored links in one pass:
   `posts` media URLs, `profiles` picture and CV links, workshop covers. All old links start with
   `https://gkhcysvayjrkrufcnqvz.supabase.co/storage/v1/object/public/<bucket>/`, so the rewrite is
   a straight replace of that start.
6. Switch `STORAGE_BACKEND`. Keep the old buckets read-only for a few weeks, then delete.

A media address on your own domain (for example `media.yourdomain.com`) set up BEFORE the move would
make step 5 unnecessary. It needs a domain you own; none is set up yet.

## Server-side limits (recommended, needs a decision)
The size limits above are checked in the app. A determined person could upload directly to Supabase
and skip them. Supabase lets each bucket have its own file-size limit and allowed types. That is a
database setting and would be run only with your approval.
