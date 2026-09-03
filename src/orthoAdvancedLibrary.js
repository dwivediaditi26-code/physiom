/* ============================================================
   Bridges Ortho → Outpatient/Musculoskeletal to real PhysioMind
   Pro modules: Kinetic Chain / CPA (NKT) / Cyriax regions from
   sharedClinicalData.js, and Functional Movement screening from
   RegionalFunctionalScreens.jsx's FUNCTIONAL_SCREEN_DATA. Same
   principle as orthoClinicalData.js — import the real data, never
   hand-copy it, so these screens can't drift from the app.
   ============================================================ */
import { KC_REGIONS, NKT_REGIONS, CYRIAX_REGIONS_DATA } from "./sharedClinicalData.js";
import { FUNCTIONAL_SCREEN_DATA } from "./RegionalFunctionalScreens.jsx";
// Myofascial lines + the region-grouped fascia tests, straight from the same
// Phase 0.5 module the old flow renders (2026-09-03, Aditi: "fascia ... like
// in old 0.5 phase does") -- imported, never hand-copied, same rule as every
// other dataset in this file.
import { FASCIA_LINES_DATA, FASCIA_REGIONS_DATA } from "./FasciaNKT.jsx";

export { KC_REGIONS, NKT_REGIONS, CYRIAX_REGIONS_DATA, FASCIA_LINES_DATA, FASCIA_REGIONS_DATA };

export const FASCIA_REGION_KEYS = Object.keys(FASCIA_REGIONS_DATA);
export const FASCIA_LINE_KEYS = Object.keys(FASCIA_LINES_DATA);

export const KC_REGION_KEYS = Object.keys(KC_REGIONS);
export const NKT_REGION_KEYS = Object.keys(NKT_REGIONS);
export const CYRIAX_REGION_KEYS = Object.keys(CYRIAX_REGIONS_DATA);

/* The real Functional Movement screen (FUNCTIONAL_SCREEN_DATA) is a
   { regionKey: { label, tests: [...] } } map keyed by lowercase region
   name. We remap it into a flat, capitalized-key lookup (same shape the
   FmaSection/formatFmaSection renderer already expects) and render it
   through one shared compact card renderer — the per-test data (setup,
   normal description, observations, grading) stays fully faithful to
   the real clinical content; only the bespoke inline SVG stick-figures
   are dropped in favor of the text description. */
const FMA_KEY_MAP = { lumbar: "Lumbar", shoulder: "Shoulder", hip: "Hip", knee: "Knee", ankle: "Ankle", cervical: "Cervical", thoracic: "Thoracic", elbow: "Elbow", wrist: "Wrist", tmj: "TMJ" };
export const FMA_DATA = Object.fromEntries(
  Object.entries(FUNCTIONAL_SCREEN_DATA).map(([k, v]) => [FMA_KEY_MAP[k] || k, v.tests])
);
export const FMA_REGION_KEYS = Object.keys(FMA_DATA);

/* Cyriax selective-tension result vocabularies (from CyriaxModule /
   CyriaxRegionTests) — kept here since they aren't individually exported
   consts, just literal arrays inline in the real component. */
export const CYRIAX_RESISTED_RESULTS = ["Strong & Painless", "Strong & Painful", "Weak & Painless", "Weak & Painful"];
export const CYRIAX_PAIN_OPTIONS = ["No pain", "Pain on initiation", "Painful arc", "Pain at end range", "Pain throughout", "Unable to test"];
export const CYRIAX_LIMITED_OPTIONS = ["Full ROM", "Slightly limited", "Moderately limited", "Severely limited", "Cannot perform"];
export const CYRIAX_DEFAULT_ENDFEEL = ["Normal / Capsular", "Muscle Spasm", "Empty (No End-Feel)", "Hard (Bony/Osteophyte)", "Springy Block"];
export const CYRIAX_CAPSULAR_OPTIONS = ["Classic capsular pattern present", "Non-capsular pattern", "Full ROM, no restriction", "Not assessed"];
export const KALTENBORN_GRADES = ["Grade 0 — Ankylosed", "Grade 1 — Considerably hypomobile", "Grade 2 — Slightly hypomobile", "Grade 3 — Normal", "Grade 4 — Slightly hypermobile", "Grade 5 — Considerably hypermobile", "Grade 6 — Unstable"];
