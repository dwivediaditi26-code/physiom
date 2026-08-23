/* ============================================================
   orthoObjectiveSuggestions.js — deterministic rule engine that
   suggests which OBJECTIVE test categories are worth running,
   based on what was documented in Subjective/Pain/Observation
   and the region/condition picked earlier. No LLM call: this is
   the same "reasoning from structured signals" approach the
   reference app uses (subjectiveTiering.js / ObjectiveHub.jsx),
   adapted to this module's own data shape and test list.

   The clinician always sees WHY a test was suggested and can
   accept, remove, or search/add anything else — nothing here is
   ever mandatory or auto-filled.
   ============================================================ */

const SPINE_REGIONS = ["cervical", "thoracic", "lumbar", "spine"];

function includesAny(value, needles) {
  if (!value) return false;
  const hay = Array.isArray(value) ? value.join(" | ").toLowerCase() : String(value).toLowerCase();
  return needles.some((n) => hay.includes(n.toLowerCase()));
}

function isSpineRegion(selectedRegions) {
  return (selectedRegions || []).some((r) => SPINE_REGIONS.some((s) => String(r.id || r).toLowerCase().includes(s)));
}

/* Returns [{ id, reason }] — id is one of the Outpatient pathway's
   OPTIONAL_IDS. Order is suggestion priority, duplicates removed
   (first reason wins). */
export function suggestObjectiveTests({ subjective = {}, condition, selectedRegions = [] } = {}) {
  const out = [];
  const seen = new Set();
  function add(id, reason) {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, reason });
  }

  // Baseline — always worth checking for a first OPD visit.
  add("rom", "Baseline range of motion for the involved region");
  add("mmt", "Baseline strength for the involved region");
  add("specialTests", "Region-specific special tests narrow the differential");
  add("outcomeMeasure", "A baseline outcome score to track progress over visits");

  const complaint = subjective.chiefComplaint;
  const aggravating = subjective.aggravating;

  if (includesAny(complaint, ["swelling"])) add("edema", "Chief complaint mentions swelling");
  if (includesAny(complaint, ["instability", "reduced mobility", "stiffness"])) add("jointMobility", "Chief complaint suggests a joint mobility restriction or instability");
  if (includesAny(complaint, ["numbness", "tingling"])) {
    add("specialTests", "Neuro-type symptoms reported — dermatomal/dural signs worth screening");
    add("sttt", "Numbness/tingling warrants a soft-tissue/neural tension screen (Cyriax/STTT)");
  }

  if (isSpineRegion(selectedRegions)) {
    add("sttt", "Spinal region — soft-tissue tension/screening test relevant");
    add("gait", "Spinal conditions can affect gait pattern");
  }

  if (condition === "sportsOveruse") {
    add("kineticChain", "Sports/overuse injuries often involve a kinetic-chain deficit upstream or downstream");
    add("fma", "A functional movement screen helps identify the movement fault behind an overuse injury");
    add("activityTolerance", "Return-to-sport decisions need an activity tolerance baseline");
  }
  if (condition === "arthritis") {
    add("jointMobility", "Degenerative joint conditions typically show accessory-motion restriction");
    add("balance", "Lower-limb arthritis commonly affects balance");
    add("activityTolerance", "Chronic conditions benefit from an activity tolerance baseline");
  }
  if (condition === "softTissue") {
    add("edema", "Soft-tissue injuries commonly present with localized swelling");
    add("jointMobility", "Check adjacent joint mobility for compensatory restriction");
    add("cpa", "Central/peripheral sensitization screen (NKT) can be relevant in soft-tissue pain");
  }
  if (condition === "spine") {
    add("specialTests", "Spine conditions need a radiculopathy/dural-tension screen");
    add("sttt", "Cyriax/STTT soft-tissue screen relevant for spinal pain");
    add("activityTolerance", "Track functional tolerance through the episode of care");
  }

  if (includesAny(aggravating, ["stairs", "sport-specific movement", "overhead activity"])) {
    add("kineticChain", "Aggravating activity is a compound/loaded movement — kinetic chain worth screening");
  }

  return out;
}
