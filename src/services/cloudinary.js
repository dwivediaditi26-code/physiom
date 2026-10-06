// cloudinary.js — the one place that uploads a reference/finding photo.
//
// Before this file the same upload (check the photo, POST it, check the
// answer, show the same three error messages) was copy-pasted into the ROM/
// MMT/Special-Test sheet photo (orthoFieldKit.jsx), the Cardio/Neuro info
// cards (InfoCard.jsx) and the Objective-screen finding photos
// (ConditionObjectiveAssessment.jsx, which still has its own two copies).
//
// Every slot is a deterministic Cloudinary public_id known before any photo
// exists (e.g. "c_heart_rate_2" or "physiom_findings/<region>/<category>/
// <label>"); uploading to that id is what makes the photo appear for every
// user of the app, so the checks below matter.

import { supabase } from "../supabase.js";

export const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dr15y1pwj/image/upload";

// Rejects a picked file before it reaches Cloudinary if it isn't a real
// photo -- guards against a rare mobile-browser failure mode where the file
// picker hands back a valid-but-empty stub image (e.g. an iCloud photo
// whose full-res version hadn't finished downloading yet) instead of the
// actual photo. These slots are shared across every user of the app, so a
// stub upload silently overwrites the real photo for everyone, not just
// the uploader (2026-09-25, Aditi: a Neuro info-card photo showed solid
// black after upload -- the stored file turned out to be a genuine, fully
// opaque 1x1px image, not a broken render).
export function isRealPhoto(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img.naturalWidth >= 40 && img.naturalHeight >= 40); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    img.src = url;
  });
}

// Asks the server for a signed upload. Only an admin gets one (the server checks); everyone else, a
// signed-out person, or a server without the Cloudinary keys gets null and uses the open preset.
async function getSignedUpload(publicId) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;
    const r = await fetch("/api/admin/cloudinarySign", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ public_id: publicId }),
    });
    if (r.status === 501) return { notConfigured: true };
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// Uploads `file` to the Cloudinary slot `publicId`. Resolves with
// Cloudinary's answer; rejects with an Error whose message is one of
// "empty-image", "Upload failed" or "blocked-overwrite" (pass it to
// uploadErrorMessage() for the text to show the user).
export async function uploadImage(file, publicId) {
  if (!(await isRealPhoto(file))) throw new Error("empty-image");
  // An admin gets a signed upload, which (unlike the open preset) may replace an existing photo.
  const signed = await getSignedUpload(publicId);
  if (signed?.signature) {
    const sfd = new FormData();
    sfd.append("file", file);
    sfd.append("api_key", signed.api_key);
    sfd.append("timestamp", String(signed.timestamp));
    sfd.append("signature", signed.signature);
    sfd.append("public_id", signed.public_id);
    sfd.append("overwrite", "true");
    sfd.append("invalidate", "true");
    const sres = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: sfd });
    if (!sres.ok) throw new Error("Upload failed");
    return await sres.json();
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "ml_default");
  fd.append("public_id", publicId);
  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  // The unsigned "ml_default" preset has Overwrite off in Cloudinary's
  // dashboard -- uploading to a public_id that already holds a photo is
  // silently ignored: Cloudinary still answers 200 OK, but `existing: true`
  // means it just handed back the OLD asset's info and stored nothing new
  // (2026-09-25, Aditi: replaced a wrong CN II photo and "its not replacing
  // at all"). Needs the Overwrite toggle turned on for ml_default in the
  // Cloudinary console -- and Cloudinary hard-blocks that toggle for
  // unsigned presets ("Cannot set overwrite to true in unsigned presets"),
  // so a real fix needs signed uploads from a server-side endpoint. Until
  // then this at least stops the app from claiming success when nothing
  // actually changed.
  const json = await res.json();
  if (json.existing) throw new Error(signed?.notConfigured ? "replace-not-set-up" : "blocked-overwrite");
  return json;
}

// The text to show (alert) for an error thrown by uploadImage().
export function uploadErrorMessage(err) {
  if (err?.message === "empty-image") {
    return "That photo didn't come through properly (it looked empty) — please try again.";
  }
  if (err?.message === "blocked-overwrite") {
    return "This photo slot already has an image and couldn't be replaced right now — please let the app admin know.";
  }
  if (err?.message === "replace-not-set-up") {
    return "Replacing photos isn't switched on yet: the Cloudinary keys still need to be added on Vercel (CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET).";
  }
  return "Photo upload failed — check your connection and try again.";
}
