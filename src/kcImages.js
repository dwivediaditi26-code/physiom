// kcImages.js -- the one place a Kinetic Chain test's photo slots are named.
//
// Every place that shows a kinetic chain test's photos (the Kinetic Chain
// step, its info card, the AI Ortho / Objective screen, and PhysioFeed's
// Learn study view) asks for the ids from here, so they can never show
// different pictures. Uploading to an id is what makes the photo appear for
// every user and every screen (see services/cloudinary.js), with no
// database write in between.

export const KC_IMAGE_SLOTS = 3;

// Slot 1 keeps the bare test id: photos for several foot/ankle and hip tests
// were already uploaded to that exact Cloudinary id before there were several
// slots, and they must keep showing. Slots 2-3 add a suffix, the same
// convention the Cardio/Neuro info cards use ("c_heart_rate_2").
export function kcImageIds(testId) {
  return Array.from({ length: KC_IMAGE_SLOTS }, (_, i) => (i === 0 ? testId : `${testId}_${i + 1}`));
}

// The Functional Movement Screen tests get the same 3 uploadable slots
// (2026-10-05, Aditi: "do same for functional movement screen"). Their ids are
// prefixed so they can never clash with another library's Cloudinary id. A test
// that appears under several regions (the fms_* battery on Hip/Knee/Ankle) is
// the same real-world test, so it shares one set of photos.
//
// Some tests share an id across regions but must not share pictures: the photo
// of Trunk Stability Push-Up taken for the Lumbar spine is not the one wanted
// under Shoulder (2026-10-07, Aditi: "in shoulder trunk stability push up it
// takes the image of lumbar"). The FIRST region keeps the original id so photos
// already uploaded keep showing; the listed regions get their own set.
export const FMA_IMAGE_SLOTS = 3;
const FMA_OWN_PHOTOS_IN = { fms_tspu: ["shoulder"] };
export function fmaImageIds(testId, region) {
  const r = String(region || "").toLowerCase();
  const own = (FMA_OWN_PHOTOS_IN[testId] || []).find((x) => r.startsWith(x));
  const base = own ? `${testId}_${own}` : testId;
  return Array.from({ length: FMA_IMAGE_SLOTS }, (_, i) => (i === 0 ? `fma_${base}` : `fma_${base}_${i + 1}`));
}
