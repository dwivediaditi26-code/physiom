// mediaStorage.js -- the ONE place PhysioFeed files leave the phone for storage.
//
// Every upload (post photos, videos, documents, profile pictures, CVs, workshop covers) goes through
// putMedia(). Today the files live in Supabase Storage. When the cost of storing and delivering
// them becomes a real number, moving to another store (for example AWS S3 in Mumbai with a CDN in
// front) means writing one more backend below and switching STORAGE_BACKEND -- no screen changes.
// See docs/MEDIA_STORAGE.md for the plan.
//
// This file also holds the hard size limit per kind of file, as a last backstop: the screens
// (lib/media.js) check and shrink files first, but a screen that forgets can no longer upload
// something huge.
import { supabase } from "../../supabase.js";
import { trackEvent } from "../../analytics/trackEvent.js";

export const STORAGE_BACKEND = "supabase";

// Largest file each bucket accepts, in MB. Photos are normally shrunk to a few hundred KB before
// they get here; videos are the part that costs money as PhysioFeed grows.
export const BUCKET_LIMIT_MB = {
  "post-images": 10,
  "profile-images": 10,
  "opportunity-covers": 10,
  "post-videos": 100,
  "post-documents": 8,
  resumes: 8,
};

const backends = {
  supabase: {
    async put(bucket, path, file) {
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },
  },
};

export function bucketLimitBytes(bucket) {
  const mb = BUCKET_LIMIT_MB[bucket];
  return mb ? mb * 1024 * 1024 : null;
}

// Stores `file` for the signed-in person `uid` and returns its public URL.
export async function putMedia({ bucket, uid, file, ext }) {
  const limit = bucketLimitBytes(bucket);
  if (limit == null) throw new Error(`Unknown storage bucket "${bucket}".`);
  if (file.size > limit) throw new Error(`That file is too large (the limit is ${BUCKET_LIMIT_MB[bucket]}MB).`);
  const backend = backends[STORAGE_BACKEND];
  const path = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const url = await backend.put(bucket, path, file);
  // So growth is visible before the bill is: one small event per upload (kind, size, store).
  trackEvent("media_uploaded", { entityType: "media", entityId: bucket, properties: { bytes: file.size, type: file.type || "", backend: STORAGE_BACKEND } });
  return url;
}
