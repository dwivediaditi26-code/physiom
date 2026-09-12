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

// Shared by every spine-region reasoning entry point (OrthoSuggestObjectiveStep.jsx
// and ConditionObjectiveAssessment.jsx) -- when AI intake was used,
// subjective.__aiExtracted carries the raw extracted fields but
// subjective.regions[regionId] (the manual checklist) is empty, so the
// spine engines' hasData() checks would otherwise report no Subjective
// data at all. Synthesize a minimal regionData object from the AI fields
// so both entry points agree on whether Subjective data exists and,
// when it does, run the exact same differential off of it (2026-09-11:
// "why the AI is not showing the result according to subjective
// assessment" -- ConditionObjectiveAssessment.jsx used to skip this
// fallback entirely and only ever check the manual checklist).
export function spineRegionData(d, r, engineKey) {
  const manual = d.subjective?.regions?.[r.id];
  if (manual && Object.values(manual).some((v) => String(v || "").trim())) return manual;
  const rows = d.subjective?.__aiExtracted;
  if (!rows?.length) return null;
  const byKey = {};
  rows.forEach((row) => { if (row.key && row.value) byKey[row.key] = row.value; });
  if (!Object.keys(byKey).length) return null;
  const rd = {};
  const low = (k) => (byKey[k] || "").toLowerCase();
  const aggMov = (byKey.aggMovements || "").split(", ").filter(Boolean);
  const FLEX = { cervical: "Flexion — looking down", lumbarSI: "Forward bending (flexion)", thoracic: "Forward bending (flexion)" };
  const EXT = { cervical: "Extension — looking up", lumbarSI: "Backward bending (extension)", thoracic: "Backward bending (extension)" };
  const mapped = [];
  for (const m of aggMov) {
    const ml = m.toLowerCase();
    if (ml.includes("look") && ml.includes("down") || ml.includes("flexion") || ml.includes("bending forward") || ml.includes("bend forward")) mapped.push(FLEX[engineKey] || m);
    else if (ml.includes("look") && ml.includes("up") || ml.includes("extension") || ml.includes("leaning back")) mapped.push(EXT[engineKey] || m);
    else if (ml.includes("turn") || ml.includes("rotation")) { if (ml.includes("right")) mapped.push("Rotation right"); else if (ml.includes("left")) mapped.push("Rotation left"); else mapped.push("Rotation"); }
    else if (ml.includes("side") || ml.includes("lateral")) mapped.push("Side bending");
    else mapped.push(m);
  }
  if (mapped.length) rd.aggMovements = mapped.join(", ");
  const aggAct = (byKey.aggActivities || "").split(", ").filter(Boolean);
  const mappedP = [];
  for (const a of aggAct) { const al = a.toLowerCase(); if (al.includes("computer") || al.includes("desk") || al.includes("screen")) mappedP.push("Computer / desk work"); else if (al.includes("driving")) mappedP.push("Driving"); else if (al.includes("sitting")) mappedP.push("Sitting — prolonged"); else if (al.includes("standing")) mappedP.push("Standing — prolonged"); else mappedP.push(a); }
  if (mappedP.length) rd.aggPostures = mappedP.join(", ");
  if (byKey.hasRadiation === "No" || low("hasRadiation") === "no") rd.radiation = "No radiation — local only";
  else if (byKey.radiationArea) rd.radiation = byKey.radiationArea;
  const neuro = low("neuroSymptoms");
  if (neuro.includes("no neuro") || neuro === "none" || neuro === "no") { rd.armNeuro = "No neurological symptoms"; rd.armPresent = "No arm / hand symptoms"; }
  else if (neuro && neuro !== "no neurological") rd.armNeuro = byKey.neuroSymptoms;
  const onset = low("onset");
  if (onset.includes("whiplash") || onset.includes("mva") || onset.includes("car accident")) rd.mechanismType = "Whiplash / rear-end collision";
  else if (onset.includes("no clear") || onset.includes("insidious") || onset.includes("gradual") || onset.includes("unknown")) rd.mechanismType = "No clear mechanism — insidious onset";
  else if (onset.includes("fall") || onset.includes("trauma")) rd.mechanismType = "Fall / direct trauma";
  else if (onset.includes("lift")) rd.mechanismType = "Lifting — heavy or awkward";
  const morning = low("morningSymptoms") || low("diurnalPattern");
  if (morning.includes("stiffness") && morning.includes("morning")) rd.morning = "Stiffness < 30 min (mechanical)";
  const loc = low("locationDescription");
  if (engineKey === "cervical") { if (loc.includes("right")) rd.location = "Right posterior cervical"; else if (loc.includes("left")) rd.location = "Left posterior cervical"; else rd.location = "Central/posterior cervical"; }
  else if (engineKey === "lumbarSI") { if (loc.includes("right")) rd.location = "Right lumbar"; else if (loc.includes("left")) rd.location = "Left lumbar"; else rd.location = "Central lumbar"; }
  else { if (loc.includes("right")) rd.location = "Right thoracic"; else if (loc.includes("left")) rd.location = "Left thoracic"; else rd.location = "Central thoracic"; }
  const pattern = low("symptomPattern");
  if (pattern.includes("mechanical")) rd.overallPattern = "Mechanical — varies with movement/position";
  else if (pattern.includes("constant")) rd.overallPattern = "Constant — never goes away";
  return Object.keys(rd).length > 0 ? rd : null;
}
