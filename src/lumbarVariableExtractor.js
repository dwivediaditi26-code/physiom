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
    // Bug fix (Layer 3 audit): the dedicated structured field
    // lx_spondylo_screen (real, defined in sharedClinicalData.js) captures
    // exactly this concept -- "Sport with repeated extension loading
    // (gymnastics / cricket fast bowling / swimming butterfly /
    // weightlifting)" and "Young athlete (10-25 years) with low back pain"
    // -- yet Pass 1 never read it, so a clinician ticking the spondylolysis
    // screen gave L07 zero deterministic credit (it worked only if the
    // Pass 2 AI note pass happened to catch it in free text). Now read it
    // here deterministically; still returns "unknown" (not false) when the
    // screen is present but the athlete-history options specifically
    // weren't ticked, so the AI note pass can still supplement.
    repetitiveExtensionAthleteHistory: (() => {
      const screen = multicheckState(data, "lx_spondylo_screen", ["Not applicable"]);
      if (screen.state === "unknown") return "unknown";
      if (screen.values.some((v) =>
        v.toLowerCase().includes("repeated extension loading") ||
        v.toLowerCase().includes("young athlete"))) return true;
      if (screen.state === "absent") return false;
      return "unknown";
    })(),
  };
  const spondyloScreen = multicheckState(data, "lx_spondylo_screen", ["Not applicable"]);
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
    mechanism: { ...mechanism, acuteLiftingMechanism, flexionRotationMechanism, spondyloScreen },
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

// Categories the reasoning engine treats as safe to auto-fill from AI's
// note-reading pass. Deliberately EXCLUDES anything red-flag-related
// (caudaEquinaConcern, fractureRiskConcern, inflammatoryConcern,
// otherSeriousPathologyConcern) -- those are handled by
// mergeLumbarVariables() as a separate "needs clinician screening" list,
// never silently flipped into the formal redFlags.*.state used by
// evaluateRedFlagOverride() in lumbarReasoningEngine.js. Matches the
// principle already established elsewhere in this codebase (see
// aiIntakeParser.js's comment on why bladder/bowel never auto-writes a
// red-flag field): a red-flag determination is a clinical judgement
// call, not something an AI note-reading pass should be allowed to
// silently assert into the field that drives an emergency-referral
// banner. Getting this wrong in either direction is dangerous -- so it
// isn't merged into that field at all, it's surfaced instead.
// Each entry pairs a setter with an EXPLICIT isUnknown() check against
// the real underlying field this derived value comes from -- NOT a
// generic check against the derived value itself. This matters because
// most of these derived booleans (flexionAggravates, sittingAggravates,
// etc.) are plain `.includes()`/`.some()` checks on an array in
// lumbarVariableExtractor.js's Pass 1 code, which default to `false`
// when the field was simply never touched -- they do NOT come back as
// the literal string "unknown" the way belowKneePain/hasLegNeuro/
// acuteLiftingMechanism do (those three route through a real
// state-aware helper already). Checking the derived boolean directly
// for "unknown" would silently never match, and the merge would look
// like it worked while actually never filling anything for most fields
// -- exactly the class of bug this merge function exists to fix, so it
// can't be allowed to reintroduce a version of it here.
const AI_MERGEABLE_FIELD_MAP = {
  belowKneePain:          { isUnknown: (lv) => lv.location.belowKneePain === "unknown",
                             set: (lv, val) => { lv.location.belowKneePain = (val === "true" || val === true); } },
  dermatomalPattern:      { isUnknown: (lv) => lv.location.dermatomal.state === "unknown",
                             // Bug fix: this setter previously always wrote
                             // state:"present" no matter what val was --
                             // there was no way to represent "no dermatomal
                             // pattern" from an AI finding (e.g. "no
                             // radiating pain", "does not radiate") even
                             // though the note-reading pass is explicitly
                             // allowed to report that negation. Now a
                             // false/none-style value correctly sets
                             // state:"absent" instead.
                             set: (lv, val) => {
                               const negative = val === "false" || val === false ||
                                 /^(none|no|absent|not dermatomal|not present)/i.test(String(val).trim());
                               lv.location.dermatomal = negative
                                 ? { state: "absent", values: [] }
                                 : { state: "present", values: [String(val)] };
                             } },
  acuteLiftingMechanism:  { isUnknown: (lv) => lv.mechanism.acuteLiftingMechanism === "unknown",
                             set: (lv, val) => { lv.mechanism.acuteLiftingMechanism = (val === "true" || val === true); } },
  flexionAggravates:      { isUnknown: (lv) => lv.aggravating.movements.state === "unknown",
                             set: (lv, val) => { lv.aggravating.flexionAggravates = (val === "true" || val === true); } },
  extensionAggravates:    { isUnknown: (lv) => lv.aggravating.movements.state === "unknown",
                             set: (lv, val) => { lv.aggravating.extensionAggravates = (val === "true" || val === true); } },
  sittingAggravates:      { isUnknown: (lv) => lv.aggravating.postures.state === "unknown",
                             set: (lv, val) => { lv.aggravating.sittingAggravates = (val === "true" || val === true); } },
  coughSneezeAggravates:  { isUnknown: (lv) => lv.aggravating.activities.state === "unknown",
                             set: (lv, val) => { lv.aggravating.coughSneezeAggravates = (val === "true" || val === true); } },
  valsalvaAggravates:     { isUnknown: (lv) => lv.aggravating.activities.state === "unknown",
                             set: (lv, val) => { lv.aggravating.valsalvaAggravates = (val === "true" || val === true); } },
  extensionRelieves:      { isUnknown: (lv) => lv.relieving.movements.state === "unknown" && lv.relieving.directionalPreference.state === "unknown",
                             set: (lv, val) => { lv.relieving.extensionRelieves = (val === "true" || val === true); } },
  flexionRelieves:        { isUnknown: (lv) => lv.relieving.movements.state === "unknown" && lv.relieving.directionalPreference.state === "unknown",
                             set: (lv, val) => { lv.relieving.flexionRelieves = (val === "true" || val === true); } },
  walkingRelieves:        { isUnknown: (lv) => lv.relieving.movements.state === "unknown",
                             set: (lv, val) => { lv.relieving.walkingRelieves = (val === "true" || val === true); } },
  constantUnremitting:    { isUnknown: (lv) => lv.symptomBehaviour.overallPattern.state === "unknown",
                             set: (lv, val) => { lv.symptomBehaviour.constantUnremitting = (val === "true" || val === true); } },
  constantNightPain:      { isUnknown: (lv) => lv.symptomBehaviour.night.state === "unknown",
                             set: (lv, val) => { lv.symptomBehaviour.constantNightPain = (val === "true" || val === true); } },
  hasLegNeuro:            { isUnknown: (lv) => lv.neurological.hasLegNeuro === "unknown",
                             set: (lv, val) => { lv.neurological.hasLegNeuro = (val === "true" || val === true); } },
  footDrop:               { isUnknown: (lv) => lv.neurological.signs.state === "unknown",
                             set: (lv, val) => { lv.neurological.footDrop = (val === "true" || val === true); } },
  neurogenicClaudication: { isUnknown: (lv) => lv.neurological.claudication.state === "unknown",
                             set: (lv, val) => { lv.neurological.neurogenicClaudication = (val === "true" || val === true); } },
  highPsychosocialLoad:   { isUnknown: (lv) => [lv.yellowFlags.beliefs, lv.yellowFlags.emotional, lv.yellowFlags.work, lv.yellowFlags.social].every((f) => f.state === "unknown"),
                             set: (lv, val) => { lv.yellowFlags.highPsychosocialLoad = (val === "true" || val === true); } },
  rotationAggravates:     { isUnknown: (lv) => lv.aggravating.movements.state === "unknown",
                             set: (lv, val) => { lv.aggravating.rotationAggravates = (val === "true" || val === true); } },
  morningStiffnessOver60: { isUnknown: (lv) => lv.symptomBehaviour.morning.state === "unknown",
                             set: (lv, val) => { lv.symptomBehaviour.morningStiffnessOver60 = (val === "true" || val === true); } },
  // Expects one of the five exact hx_episodes select-option strings (the
  // API prompt is told to map any free-text count onto these) so this
  // reads identically to a real checkbox pick, not a raw AI string.
  priorEpisodeCount:      { isUnknown: (lv) => !lv.history.priorEpisodeCount,
                             set: (lv, val) => { lv.history.priorEpisodeCount = String(val); } },
  repetitiveExtensionAthleteHistory: { isUnknown: (lv) => lv.mechanism.repetitiveExtensionAthleteHistory === "unknown",
                             set: (lv, val) => { lv.mechanism.repetitiveExtensionAthleteHistory = (val === "true" || val === true); } },
};

const RED_FLAG_CATEGORIES = new Set([
  "caudaEquinaConcern", "fractureRiskConcern", "inflammatoryConcern", "otherSeriousPathologyConcern",
]);

/**
 * Merge Pass 2 (AI note-reading) findings into a Pass 1 (structured
 * field) variable object. Pure function -- returns a NEW object, never
 * mutates the input, so callers can tell "before merge" and "after
 * merge" apart if needed (e.g. to show which values came from AI).
 *
 * Additive-only by construction: each field in AI_MERGEABLE_FIELD_MAP
 * carries its own isUnknown() check against the REAL underlying Pass 1
 * field state (not a generic check on the derived value), so a real
 * clinician/checkbox answer -- true OR false -- always wins and is
 * never overwritten by an AI note finding.
 *
 * @param {object} lv - output of extractLumbarVariablesStructured()
 * @param {Array}  aiFindings - the `findings` array from
 *   api/extractLumbarNoteVariables.js: [{variable, value, sourceQuote, confidence}]
 * @returns {{ merged: object, aiFilledFields: string[], pendingRedFlagReview: Array }}
 */
function mergeLumbarVariables(lv, aiFindings) {
  // Structured clone via JSON round-trip -- lv is plain data (no
  // functions/dates), so this is a safe, dependency-free deep copy that
  // guarantees the original object passed in is never mutated.
  const merged = JSON.parse(JSON.stringify(lv));
  const aiFilledFields = [];
  const pendingRedFlagReview = [];

  (Array.isArray(aiFindings) ? aiFindings : []).forEach((f) => {
    if (!f || !f.variable) return;

    if (RED_FLAG_CATEGORIES.has(f.variable)) {
      // Never auto-merged into redFlags.*.state -- surfaced separately
      // so a clinician has to actually look at it and screen properly.
      pendingRedFlagReview.push(f);
      return;
    }

    const field = AI_MERGEABLE_FIELD_MAP[f.variable];
    if (!field) return; // otherRelevantFinding and anything unrecognized: display-only, not merged into scoring

    if (!field.isUnknown(merged)) return; // Pass 1 already answered this -- never override

    field.set(merged, f.value);
    aiFilledFields.push(f.variable);
  });

  return { merged, aiFilledFields, pendingRedFlagReview };
}

export { extractLumbarVariablesStructured, mergeLumbarVariables };
