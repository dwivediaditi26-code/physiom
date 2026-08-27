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
   overrides a direct match (pelvis already matches "Hip & Pelvis" as-is). */
const REGION_KEY_SYNONYMS = { lumbar: ["spine"], thoracic: ["spine"], sacrum: ["spine"] };

/* The Ortho case-level region (chosen at Setup, e.g. "knee", "cervical")
   uses its own canonical id scheme. Each real clinical dataset keys its
   regions slightly differently (ROM: "Shoulder", MMT: "Shoulder & Scapula",
   Special Tests: "shoulder"), so this picks the closest match by first
   word — used only to choose which tab opens by default; every other tab
   stays one tap away regardless. */
export function matchRegionKey(regionId, keys) {
  const label = (REGION_LABEL[regionId] || regionId || "").toLowerCase();
  const firstWord = label.split(/[\s/]+/)[0];
  const hit = keys.find((k) => k.toLowerCase().includes(firstWord));
  if (hit) return hit;
  for (const syn of REGION_KEY_SYNONYMS[regionId] || []) {
    const synHit = keys.find((k) => k.toLowerCase().includes(syn));
    if (synHit) return synHit;
  }
  return keys[0];
}

export function gradeColor(g) {
  const found = MMT_GRADES.find((x) => x.g === g);
  return found ? found.color : undefined;
}

export function gradeDesc(g) {
  const found = MMT_GRADES.find((x) => x.g === g);
  return found ? found.desc : "";
}
