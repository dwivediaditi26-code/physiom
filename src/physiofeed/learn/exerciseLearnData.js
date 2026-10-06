// Exercise Learn reads the app's own exercise library (EXERCISE_DB in sharedClinicalData.js):
// 270 exercises in 20 regions, each with a name, target, description, dosage, phase, an evidence
// label, cues and a progression line. Nothing here adds clinical content -- this only flattens,
// groups and filters what is already there. Fields the library does not have (steps, muscles,
// precautions, common errors, regression, equipment, position, difficulty, references) are not
// invented; the detail page simply leaves those sections out.
import { EXERCISE_DB } from "../../sharedClinicalData.js";

// The four shortcuts at the top of Exercise Learn. Which region sits under which is an
// organising choice only (Sports Rehab is listed under Orthopaedic in the brief).
export const EXERCISE_GROUPS = [
  { key: "ortho", label: "Orthopaedic", regions: ["cervical", "thoracic", "lumbar", "shoulder", "elbow", "wrist_hand", "hip", "knee", "ankle", "sports"] },
  { key: "neuro", label: "Neurological", regions: ["neurological"] },
  { key: "cardio", label: "Cardio & Respiratory", regions: ["respiratory", "cardiac"] },
  { key: "functional", label: "Functional", regions: ["posture_correction", "pelvic_floor", "older_adult", "pilates_yoga", "hydrotherapy", "paediatric", "oncology"] },
];

// Anatomy picture for a region card (public/anatomy). Regions without one show their emoji.
export const REGION_ART = {
  cervical: "spine/cervical", thoracic: "spine/thoracic", lumbar: "spine/lumbar",
  shoulder: "upper-limb/shoulder", elbow: "upper-limb/elbow", wrist_hand: "upper-limb/hand-fingers",
  hip: "lower-limb/hip", knee: "lower-limb/knee", ankle: "lower-limb/ankle",
};

// The library's evidence label is sometimes a long sentence ("Strongest — gold standard"). The
// first word is the level; the whole label is still shown on the detail page, unchanged.
export function evidenceTier(label) {
  const first = String(label || "").trim().split(/[\s—–-]+/)[0].replace(/[^A-Za-z]/g, "");
  if (!first) return "";
  if (/^strongest$/i.test(first)) return "Strongest";
  if (/^strong$/i.test(first)) return "Strong";
  if (/^moderate$/i.test(first)) return "Moderate";
  if (/^(weak|mixed|solid)$/i.test(first)) return first[0].toUpperCase() + first.slice(1).toLowerCase();
  return first;
}

export const TIERS = ["Strongest", "Strong", "Moderate", "Weak", "Mixed", "Solid"];

let cache = null;
export function allExercises() {
  if (cache) return cache;
  const out = [];
  for (const [regionKey, region] of Object.entries(EXERCISE_DB)) {
    for (const [category, list] of Object.entries(region.categories || {})) {
      for (const e of list) {
        out.push({ ...e, regionKey, regionLabel: region.label, category, tier: evidenceTier(e.evidence) });
      }
    }
  }
  cache = out;
  return out;
}

export function regionList() {
  return Object.entries(EXERCISE_DB).map(([key, r]) => ({
    key, label: r.label, icon: r.icon, count: allExercises().filter((e) => e.regionKey === key).length,
    categories: Object.keys(r.categories || {}),
  }));
}

export function searchExercises(list, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return list;
  return list.filter((e) => [e.name, e.target, e.desc, e.category, e.regionLabel, e.cues].some((f) => String(f || "").toLowerCase().includes(q)));
}

// filters: { category, phase, tier } -- an empty / "All" value means no filter on that field.
export function filterExercises(list, { category = "", phase = "", tier = "" } = {}) {
  return list.filter((e) => (!category || e.category === category) && (!phase || e.phase === phase) && (!tier || e.tier === tier));
}
