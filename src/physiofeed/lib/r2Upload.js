// Cloudflare R2 upload (2026-09-21, Aditi: set up R2 for PhysioFeed's post
// composer -- no egress fees, unlike Supabase Storage). Talks to
// api/uploadPresign.js for a short-lived signed URL, then PUTs the file
// straight to R2 -- the bytes never pass through our own server.
//
// Same async-returns-a-url contract as db.js's uploadPostImage()/
// uploadPostVideo(), so swapping the Composer over later (AppDataContext.jsx's
// uploadImage/uploadVideo) is a one-line change, not a PostComposer.jsx
// rewrite -- NOT wired in yet (2026-09-21): this needs real R2 credentials
// configured (see .env.local.example) before it can work at all, and
// flipping the live composer over to an untested path would break uploads
// for real users in the meantime. Supabase Storage stays the active path
// until this is confirmed working end-to-end.
import { authHeader } from "../../supabase.js";

export async function uploadToR2(fileOrBlob) {
  const contentType = fileOrBlob.type;
  const res = await fetch("/api/uploadPresign", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ contentType, sizeBytes: fileOrBlob.size }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Couldn't prepare that upload -- please try again.");
  }
  const { uploadUrl, publicUrl } = await res.json();

  const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: fileOrBlob });
  if (!putRes.ok) throw new Error("Upload failed -- please try again.");

  return publicUrl;
}
