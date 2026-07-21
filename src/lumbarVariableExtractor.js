// lumbarVariableExtractor.js
//
// Layer between the Lumbar/SI Subjective Assessment (however it got
// filled -- ticked by hand, or auto-filled by the AI intake parser via
// aiIntakeParser.js) and the Lumbar Reasoning Engine (the differential
// logic in runEngineV6, and the referenced knowledge base in
// PhysioMind-Lumbar-Reasoning-Engine-v1.md).
//
// Two-pass design, matching how the rest of this codebase already
// separates "certain" from "AI-interpreted" data (see aiIntakeParser.js's
// comment on why pmh_conditions/med_current are never AI-written
// directly):
//
//   Pass 1 (this file, extractLumbarVariablesStructured) -- 100%
//   deterministic. Reads the real lx_* multicheck/select fields (exact
//   option strings, defined in sharedClinicalData.js) and maps them onto
//   the canonical variable set the reasoning engine needs. Zero
//   hallucination risk: it's reading exact strings the clinician (or a
//   previous AI-apply step) actually selected, not interpreting language.
//
//   Pass 2 (api/extractLumbarNoteVariables.js, called separately) -- AI
//   pass over ONLY the free-text note fields (lx_loc_notes, lx_moi_notes,
//   lx_agg_notes, lx_rel_notes, lx_symp_notes, lx_neuro_notes,
//   lx_rf_notes, lx_yf_notes, lx_fn_notes, cc_main, goal_concern,
//   goal_belief, hx_notes) -- the one place genuinely unstructured
//   language needs interpreting. Told explicitly what Pass 1 already
//   found, so it only ever SUPPLEMENTS gaps, never overrides a real
//   selection. Same four permitted actions as the narrative parser:
//   Extract / Normalize / Classify / Mark Unknown -- never invent, never
//   diagnose.
//
// Every variable below carries a `state` of "present" | "absent" |
// "unknown" -- never silently treated as "no" when it was actually just
// never asked. This mirrors the explicit build-order principle from the
// Lumbar Reasoning Engine doc: unknown data should lower confidence, not
// count as negative evidence.

const SEP = "|||";

function arr(data, key) {
  const x = data[key];
  if (!x) return [];
  return String(x).split(SEP).filter(Boolean);
}
function str(data, key) {
  return String(data[key] || "").trim();
}

// A multicheck field where one (or more) of its options is an explicit
// "No X" / "Not applicable" answer. Ticking ONLY that option means the
// clinician actively screened for this and it's absent -- different from
// never having touched the field at all (unknown).
function multicheckState(data, key, negativeOptions) {
  const values = arr(data, key);
  if (values.length === 0) return { state: "unknown", values: [] };
  const positives = values.filter((v) => !negativeOptions.includes(v));
  if (positives.length === 0) return { state: "absent", values: [] };
  return { state: "present", values: positives };
}

function selectState(data, key) {
  const v = str(data, key);
  if (!v) return { state: "unknown", value: null };
  return { state: "answered", value: v };
}

function boolFromMulticheck(data, key, negativeOptions, positiveMatch) {
  const s = multicheckState(data, key, negativeOptions);
  if (s.state === "unknown") return "unknown";
  if (s.state === "absent") return false;
  return positiveMatch ? s.values.some((v) => positiveMatch(v)) : true;
}

/**
 * Pass 1: deterministic extraction from the structured Lumbar/SI fields.
 * @param {object} data - the full app data object (all field id -> value)
 * @returns {object} canonical Lumbar variable set, grouped by category
 */
function extractLumbarVariablesStructured(data) {
  // ── Demographics / chief complaint (shared, not region-prefixed) ────
  const demographics = {
    age: str(data, "dem_age") || null,
    sex: str(data, "dem_sex") || null,
    occupation: str(data, "dem_occupation") || null,
  };
  const chiefComplaint = {
    summary: str(data, "cc_main") || null,
    onset: str(data, "cc_onset") || null,
    duration: str(data, "cc_duration") || null,
    nrsNow: str(data, "cc_vas_now") || null,
    nrsWorst: str(data, "cc_vas_worst") || null,
    nrsBest: str(data, "cc_vas_best") || null,
    quality: arr(data, "cc_quality"),
  };

  // ── Location ─────────────────────────────────────────────────────
  const location = {
    primaryLocation: multicheckState(data, "lx_loc", []),
    radiation: multicheckState(data, "lx_radiation", ["No radiation — local only"]),
    dermatomal: multicheckState(data, "lx_dermatomal", ["Not dermatomal"]),
    belowKnee: selectState(data, "lx_below_knee"),
  };
  const belowKneeVal = location.belowKnee.value || "";
  const belowKneePain =
    location.belowKnee.state === "unknown" ? "unknown" :
    belowKneeVal.includes("bilateral") ? "bilateral" :
    belowKneeVal.includes("below knee") || belowKneeVal.includes("extends to foot") ? true :
    belowKneeVal.includes("back pain only") || belowKneeVal.includes("above knee") ? false :
    "unknown";

  // ── Mechanism / onset ────────────────────────────────────────────
  const mechanism = {
    type: multicheckState(data, "lx_moi", ["No clear mechanism — insidious onset", "No identified mechanism"]),
    loadEstimate: selectState(data, "lx_moi_load"),
    spinePosition: multicheckState(data, "lx_moi_position", ["Not applicable"]),
    firstSymptomTiming: selectState(data, "lx_moi_first"),
  };
  const acuteLiftingMechanism = boolFromMulticheck(data, "lx_moi",
    ["No clear mechanism — insidious onset", "No identified mechanism"],
    (v) => v.toLowerCase().includes("lifting"));
  const flexionRotationMechanism = mechanism.spinePosition.values.includes("Flexed + rotated (highest disc risk)");

  // ── Aggravating factors ──────────────────────────────────────────
  const aggravating = {
    postures: multicheckState(data, "lx_agg_post", []),
    movements: multicheckState(data, "lx_agg_mov", []),
    activities: multicheckState(data, "lx_agg_act", []),
    other: multicheckState(data, "lx_agg_other", []),
    worstSingle: str(data, "lx_agg_worst") || null,
  };
  const flexionAggravates = aggravating.movements.values.includes("Forward bending (flexion)");
  const extensionAggravates = aggravating.movements.values.includes("Backward bending (extension)");
  const rotationAggravates = aggravating.movements.values.some((v) => v.toLowerCase().includes("rotation"));
  const sittingAggravates = aggravating.postures.values.some((v) => v.toLowerCase().startsWith("sitting"));
  const coughSneezeAggravates = aggravating.activities.values.some((v) =>
    v.startsWith("Coughing") || v.startsWith("Sneezing"));
  const valsalvaAggravates = aggravating.activities.values.includes("Straining — toilet (Valsalva)");
  const walkingAggravatesBilateral = aggravating.other.values.includes("Prolonged walking bilateral leg symptoms (stenosis)");
  const morningStiffness30Steps = aggravating.other.values.includes("Morning stiffness first 30 steps");

  // ── Relieving factors ────────────────────────────────────────────
  const relieving = {
    postures: multicheckState(data, "lx_rel_post", []),
    movements: multicheckState(data, "lx_rel_mov", []),
    manual: multicheckState(data, "lx_rel_manual", []),
    medications: multicheckState(data, "lx_rel_med", []),
    directionalPreference: selectState(data, "lx_directional"),
    bestSingle: str(data, "lx_rel_best") || null,
  };
  const dirPref = relieving.directionalPreference.value || "";
  const extensionRelieves = relieving.movements.values.includes("Extension — McKenzie press-up / cobra") ||
    dirPref.startsWith("Extension preference");
  const flexionRelieves = relieving.movements.values.includes("Flexion — knee to chest") ||
    dirPref.startsWith("Flexion preference");
  const walkingRelieves = relieving.movements.values.includes("Walking");
  const peripheralizes = dirPref.startsWith("Peripheralises");
  const nsaidVeryEffective = relieving.medications.values.includes("NSAIDs — very effective (inflammatory indicator)");

  // ── Symptom behaviour ────────────────────────────────────────────
  const symptomBehaviour = {
    overallPattern: multicheckState(data, "lx_pattern", []),
    morning: selectState(data, "lx_morning"),
    night: multicheckState(data, "lx_night", ["No night symptoms"]),
    pattern24hr: selectState(data, "lx_24hr"),
    trajectory: selectState(data, "lx_trajectory"),
    irritability: selectState(data, "lx_irritability"),
  };
  const constantUnremitting = symptomBehaviour.overallPattern.values.includes("Constant — never goes away");
  const morningVal = symptomBehaviour.morning.value || "";
  const morningStiffnessOver60 = morningVal.includes(">1 hour");
  const constantNightPain = symptomBehaviour.night.values.includes("Constant night pain — cannot sleep");

  // ── Neurological ─────────────────────────────────────────────────
  const neurological = {
    legNeuroPresent: selectState(data, "lx_neuro_present"),
    quality: multicheckState(data, "lx_neuro_quality", ["Not applicable"]),
    signs: multicheckState(data, "lx_neuro_signs", ["No neurological signs"]),
    claudication: selectState(data, "lx_claudication"),
    bladderBaseline: selectState(data, "lx_bladder_baseline"),
  };
  const legNeuroVal = neurological.legNeuroPresent.value || "";
  const hasLegNeuro = neurological.legNeuroPresent.state === "unknown" ? "unknown" :
    legNeuroVal.startsWith("No leg") ? false : true;
  const footDrop = neurological.signs.values.some((v) => v.startsWith("Foot drop"));
  const reflexChanges = neurological.signs.values.some((v) => v.includes("reflex"));
  const claudicationVal = neurological.claudication.value || "";
  const neurogenicClaudication = claudicationVal.includes("neurogenic claudication — stenosis") ||
    claudicationVal.includes("Can walk further uphill");

  // ── Red flags (mandatory screen — never inferred, only reported) ───
  const redFlags = {
    cauda: multicheckState(data, "lx_rf_cauda", ["No cauda equina signs"]),
    fracture: multicheckState(data, "lx_rf_fracture", ["No fracture indicators"]),
    inflammatory: multicheckState(data, "lx_rf_inflammatory", ["No inflammatory features"]),
    serious: multicheckState(data, "lx_rf_serious", ["No other red flags"]),
  };
  const anyState = (...fields) => {
    if (fields.some((f) => f.state === "present")) return "positive";
    if (fields.every((f) => f.state === "absent")) return "negative";
    return "incomplete"; // at least one screen never touched
  };
  const redFlagScreen = anyState(redFlags.cauda, redFlags.fracture, redFlags.inflammatory, redFlags.serious);

  // ── Yellow flags / psychosocial ──────────────────────────────────
  const yellowFlags = {
    beliefs: multicheckState(data, "lx_yf_beliefs", ["No unhelpful beliefs"]),
    fearAvoidance: selectState(data, "lx_yf_fear"),
    emotional: multicheckState(data, "lx_yf_emotion", ["No emotional / psychological concerns"]),
    work: multicheckState(data, "lx_yf_work", ["No work-related yellow flags"]),
    social: multicheckState(data, "lx_yf_social", ["Adequate social support"]),
    startBack: selectState(data, "lx_yf_startback"),
  };
  const concerningCategories = [yellowFlags.beliefs, yellowFlags.emotional, yellowFlags.work, yellowFlags.social]
    .filter((f) => f.state === "present").length;
  const highPsychosocialLoad = concerningCategories >= 2;

  // ── Functional impact ────────────────────────────────────────────
  const functional = {
    sittingTolerance: selectState(data, "lx_fn_sitting"),
    standingTolerance: selectState(data, "lx_fn_standing"),
    walkingTolerance: selectState(data, "lx_fn_walking"),
    adlRestrictions: multicheckState(data, "lx_fn_adl", ["No ADL restrictions"]),
    workImpact: selectState(data, "lx_fn_work"),
  };

  // ── History (shared fields) ──────────────────────────────────────
  const history = {
    priorEpisodeCount: str(data, "hx_episodes") || null,
    priorEpisodeOutcome: str(data, "hx_resolve") || null,
    medicalHistory: str(data, "pmh_notes") || null,
    patientGoals: str(data, "goal_main") || null,
    patientConcern: str(data, "goal_concern") || null,
    patientBelief: str(data, "goal_belief") || null,
  };

  return {
    demographics,
    chiefComplaint,
    location: { ...location, belowKneePain },
    mechanism: { ...mechanism, acuteLiftingMechanism, flexionRotationMechanism },
    aggravating: {
      ...aggravating, flexionAggravates, extensionAggravates, rotationAggravates,
      sittingAggravates, coughSneezeAggravates, valsalvaAggravates,
      walkingAggravatesBilateral, morningStiffness30Steps,
    },
    relieving: {
      ...relieving, extensionRelieves, flexionRelieves, walkingRelieves,
      peripheralizes, nsaidVeryEffective,
    },
    symptomBehaviour: {
      ...symptomBehaviour, constantUnremitting, morningStiffnessOver60, constantNightPain,
    },
    neurological: {
      ...neurological, hasLegNeuro, footDrop, reflexChanges, neurogenicClaudication,
    },
    redFlags: { ...redFlags, redFlagScreen },
    yellowFlags: { ...yellowFlags, highPsychosocialLoad },
    functional,
    history,
    // Free-text fields Pass 2 (AI) should read — not interpreted here.
    _notesForAiPass: {
      cc_main: str(data, "cc_main"),
      lx_loc_notes: str(data, "lx_loc_notes"),
      lx_moi_notes: str(data, "lx_moi_notes"),
      lx_agg_notes: str(data, "lx_agg_notes"),
      lx_rel_notes: str(data, "lx_rel_notes"),
      lx_symp_notes: str(data, "lx_symp_notes"),
      lx_neuro_notes: str(data, "lx_neuro_notes"),
      lx_rf_notes: str(data, "lx_rf_notes"),
      lx_yf_notes: str(data, "lx_yf_notes"),
      lx_fn_notes: str(data, "lx_fn_notes"),
      hx_notes: str(data, "hx_notes"),
      goal_belief: str(data, "goal_belief"),
      goal_concern: str(data, "goal_concern"),
    },
  };
}

export { extractLumbarVariablesStructured };
