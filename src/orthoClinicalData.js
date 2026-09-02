/* ============================================================
   Bridges the Ortho module to the REAL PhysioMind Pro clinical
   data — ROM_DATA / MMT_DATA / MMT_GRADES / SPECIAL_TESTS_DATA
   all live in sharedClinicalData.js in this codebase — instead
   of a separate hand-copied library. Importing the real consts
   means the Ortho ROM/MMT/Special Tests screens can never drift
   from the main app: one source of truth, reused.
   ============================================================ */
import { ROM_DATA, MMT_DATA, RESTRICTION_GRADE, MMT_GRADES, MMT_GRADE_OPTIONS, SPECIAL_TESTS_DATA } from "./sharedClinicalData.js";
import { REGION_LABEL } from "./orthoRegionLibrary.js";

export { ROM_DATA, MMT_DATA, RESTRICTION_GRADE, MMT_GRADES, MMT_GRADE_OPTIONS, SPECIAL_TESTS_DATA };

export const ROM_REGION_KEYS = Object.keys(ROM_DATA);
export const MMT_REGION_KEYS = Object.keys(MMT_DATA);
export const SPECIAL_TEST_REGION_KEYS = Object.keys(SPECIAL_TESTS_DATA);

/* Bug fix: "keys[0]" as a bare fallback silently mismatched any region
   whose first word never appears in a dataset's keys -- e.g. MMT_DATA has
   no "Cervical"... no "Lumbar"/"Thoracic"/"Sacrum" key at all (spine/core
   muscles are grouped under a single "Spine & Core" entry there, unlike
   ROM_DATA and SPECIAL_TESTS_DATA which do key those regions individually),
   so lumbar and thoracic cases were silently falling through to keys[0]
   ("Cervical") and showing Sternocleidomastoid/Scalenes/etc as the
   Suggested Objective MMT list for a Lumbar assessment. This synonym map
   is only a second-chance lookup BEFORE the keys[0] fallback -- it never
   overrides a direct match (knee/hip/etc already match as-is).

   2026-09-01 audit (Aditi: "AI suggested objective assessment condition
   wise -- is it working for all regions"): the SAME keys[0] fallback was
   still live for six more region ids the original fix didn't cover --
   confirmed by actually calling matchRegionKey() for every id in
   REGION_GROUPS (orthoRegionLibrary.js) against ROM_DATA/MMT_DATA/
   SPECIAL_TESTS_DATA's real keys, not by inspection. Selecting Sacrum,
   Upper Arm, Forearm, Thigh, Leg, or Pelvis as the case region silently
   produced Cervical ROM movements and Cervical special tests on the
   Suggested Objective screen (Cervical happens to be keys[0] in both
   datasets) -- clinically wrong and, because it fails silently rather
   than erroring, easy to ship without noticing. Extended per anatomical
   adjacency, cross-checked against how this same dataset already groups
   its own MMT categories (e.g. quadriceps lives under MMT's "Knee", SI-
   joint special tests live under "lumbar"/"hip"): sacrum -> lumbar (after
   spine, which only resolves for MMT), upper arm -> shoulder (biceps/
   triceps and the shoulder special tests that assess them), forearm ->
   elbow (pronation/supination ROM, "Elbow & Forearm" MMT), thigh -> knee
   (quad/hamstring MMT), leg -> ankle (gastroc/soleus MMT groups under
   "Ankle & Foot"), pelvis -> hip ("Hip & Pelvis" MMT, FABER/SI tests). */
const REGION_KEY_SYNONYMS = {
  lumbar: ["spine"],
  thoracic: ["spine"],
  sacrum: ["spine", "lumbar"],
  upperArm: ["shoulder"],
  forearm: ["elbow"],
  thigh: ["knee"],
  leg: ["ankle"],
  pelvis: ["hip"],
  // Special Tests has no dedicated "hand" bucket (hand/wrist tests are
  // grouped under "elbow_wrist", same as Wrist) -- direct-matches fine for
  // ROM/MMT ("Hand & Fingers"/"Wrist & Hand"), only Special Tests needed
  // the synonym; harmless there since a direct match always wins first.
  hand: ["wrist"],
};

/* The Ortho case-level region (chosen at Setup, e.g. "knee", "cervical")
   uses its own canonical id scheme. Each real clinical dataset keys its
   regions slightly differently (ROM: "Shoulder", MMT: "Shoulder & Scapula",
   Special Tests: "shoulder"), so this picks the closest match by first
   word, then by REGION_KEY_SYNONYMS's clinically-adjacent second try.

   Returns null when NEITHER finds anything -- e.g. Kinetic Chain's own
   dataset only has 7 buckets (no per-limb-segment breakdown), so "wrist"
   genuinely has no Kinetic Chain content and null is the honest answer,
   not a bug to paper over. Every caller in orthoIndividualSuggestions.js
   already treats a falsy key as "skip this category for this region" --
   confirmed by reading each one, not assumed. A caller that instead just
   wants *some* tab open by default (orthoExercisePrescription.jsx,
   orthoRegionAssessments.jsx -- picking an arbitrary starting tab is
   harmless since every other tab is one tap away) supplies its own
   `|| keys[0]` at the call site; this function itself no longer guesses
   on their behalf, which is what let a genuinely uncovered clinical
   region (Forearm, Sacrum, Thigh, Leg, Pelvis, Upper Arm, and several
   more once CPA/Kinetic Chain/FMA/Cyriax were added) silently inherit
   keys[0]'s real content instead -- Cervical ROM/special tests shown for
   a Forearm case, "foot_ankle" Kinetic Chain shown for a Shoulder case,
   etc, all silently, all wrong, none of them a defaulted-tab situation. */
export function matchRegionKey(regionId, keys) {
  const label = (REGION_LABEL[regionId] || regionId || "").toLowerCase();
  const firstWord = label.split(/[\s/]+/)[0];
  const hit = keys.find((k) => k.toLowerCase().includes(firstWord));
  if (hit) return hit;
  for (const syn of REGION_KEY_SYNONYMS[regionId] || []) {
    const synHit = keys.find((k) => k.toLowerCase().includes(syn));
    if (synHit) return synHit;
  }
  return null;
}

export function gradeColor(g) {
  const found = MMT_GRADES.find((x) => x.g === g);
  return found ? found.color : undefined;
}

export function gradeDesc(g) {
  const found = MMT_GRADES.find((x) => x.g === g);
  return found ? found.desc : "";
}
