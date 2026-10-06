// kcImages.js -- the one place a Kinetic Chain test's photo slots are named.
//
// Every place that shows a kinetic chain test's photos (the Kinetic Chain
// step, its info card, the AI Ortho / Objective screen, and PhysioFeed's
// Learn study view) asks for the ids from here, so they can never show
// different pictures. Uploading to an id is what makes the photo appear for
// every user and every screen (see services/cloudinary.js), with no
// database write in between.

export const KC_IMAGE_SLOTS = 4;

// Slot 1 keeps the bare test id: photos for several foot/ankle and hip tests
// were already uploaded to that exact Cloudinary id before there were four
// slots, and they must keep showing. Slots 2-4 add a suffix, the same
// convention the Cardio/Neuro info cards use ("c_heart_rate_2").
export function kcImageIds(testId) {
  return Array.from({ length: KC_IMAGE_SLOTS }, (_, i) => (i === 0 ? testId : `${testId}_${i + 1}`));
}

// The Functional Movement Screen tests get the same 4 uploadable slots
// (2026-10-05, Aditi: "do same for functional movement screen"). Their ids are
// prefixed so they can never clash with another library's Cloudinary id. A test
// that appears under several regions (the fms_* battery on Hip/Knee/Ankle) is
// the same real-world test, so it shares one set of photos.
export const FMA_IMAGE_SLOTS = 4;
export function fmaImageIds(testId) {
  return Array.from({ length: FMA_IMAGE_SLOTS }, (_, i) => (i === 0 ? `fma_${testId}` : `fma_${testId}_${i + 1}`));
}
