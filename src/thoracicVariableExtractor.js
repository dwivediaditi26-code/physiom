// thoracicVariableExtractor.js
//
// Same two-pass design as lumbarVariableExtractor.js / cervicalVariableExtractor.js,
// applied to the Thoracic Spine subjective section (REG_MOD_S["Thoracic spine"]
// in sharedClinicalData.js, prefix "tx" -- e.g. tx_loc, tx_moi, tx_agg_mov).
// That structured intake was already fully built (location, mechanism,
// aggravating/relieving, symptom behaviour, a single combined red-flag
// screen, function) -- this file turns it into the canonical variable set
// a reasoning engine can score against, exactly the gap that used to exist
// for Lumbar/SI and Cervical spine before their extractors were built.
//
//   Pass 1 (this file, extractThoracicVariablesStructured) -- 100%
//   deterministic. Reads the real tx_* multicheck/select fields (exact
//   option strings from sharedClinicalData.js) onto the canonical
//   variable set. Zero hallucination risk.
//
//   Pass 2 (api/extractThoracicNoteVariables.js) -- AI pass over ONLY
//   the free-text note fields (tx_loc_notes, tx_moi_notes, tx_agg_notes,
//   tx_rel_notes, tx_symp_notes, tx_rf_notes, tx_fn_notes) for anything
//   Pass 1 left "unknown". Told explicitly what Pass 1 already found;
//   only fills genuine gaps, never overrides a real selection.
//
// IMPORTANT DIFFERENCE from Lumbar/Cervical: the thoracic red-flag screen
// (tx_rf) is a SINGLE combined multicheck field, not split into separate
// structured categories the way lumbar's cauda/fracture/inflammatory/serious
// or cervical's myelopathy/vbi/instability/other are. Grounded directly in
// Magee Ch.8 Table 8-1 "Thoracic Spine and Rib Cage Red Flags" (cardiac,
// respiratory, visceral/GI, renal, cancer, infection, fracture, cord
// compression, and general serious-pathology indicators all live in one
// checklist here) -- this file sub-buckets tx_rf's selected values into
// named categories below so the reasoning engine can still differentiate
// urgency (e.g. cardiac/cord-compression vs. a general "positive" screen),
// without inventing structured fields the real form doesn't have.
//
// Every variable carries present/absent/unknown (or answered/unknown for
// selects) -- never collapsing "never asked" into "no".

const SEP = "|||";

function arr(data, key) {
  const x = data[key];
  if (!x) return [];
  return String(x).split(SEP).filter(Boolean);
}
function str(data, key) {
  return String(data[key] || "").trim();
}
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

/**
 * Pass 1: deterministic extraction from the structured Thoracic spine
 * fields.
 * @param {object} data - the full app data object (all field id -> value)
 * @returns {object} canonical Thoracic variable set, grouped by category
 */
function extractThoracicVariablesStructured(data) {
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
    primaryLocation: multicheckState(data, "tx_loc", []),
    radiation: multicheckState(data, "tx_radiation", ["No radiation — local"]),
  };
  // Costovertebral-origin indicator (Magee p.572: "Pain referred around
  // the chest wall tends to be costovertebral in origin").
  const costovertebralLocation = location.primaryLocation.values.some((v) =>
    v.startsWith("Costovertebral"));
  const interscapularLocation = location.primaryLocation.values.some((v) =>
    v.startsWith("Interscapular"));
  // Direct urgent flag already named in the form's own option string.
  const cardiacLikeRadiation = location.radiation.values.includes(
    "Cardiac-like radiation — left chest / arm (urgent flag)");

  // ── Mechanism / onset ────────────────────────────────────────────
  const mechanism = {
    type: multicheckState(data, "tx_moi", ["No clear mechanism"]),
  };
  const insidiousPosturalOnset = mechanism.type.values.includes(
    "Insidious — postural / sustained");
  // Guarded against an untouched tx_moi collapsing into a false "no
  // trauma" -- found via a fully-blank-form sweep: T05's "No traumatic
  // mechanism" supporting check was wrongly scoring a match on an
  // entirely untouched form (an unasked mechanism field defaulted to
  // the same `false` a genuine "mechanism asked, no trauma selected"
  // answer would produce). Same fix pattern as cervical's
  // whiplashMechanism/objectiveNeuroSigns.
  const traumaticMechanism = mechanism.type.state === "unknown" ? "unknown" :
    mechanism.type.values.some((v) =>
      v.startsWith("Lifting") || v.startsWith("Rotation injury") ||
      v.startsWith("Fall") || v.startsWith("MVA"));
  const osteoporoticFractureRiskMechanism = mechanism.type.values.includes(
    "Osteoporotic fracture — minimal trauma");
  const postViralCostochondritis = mechanism.type.values.includes(
    "Viral illness — post-viral costochondritis");

  // ── Aggravating factors ──────────────────────────────────────────
  const aggravating = {
    movements: multicheckState(data, "tx_agg_mov", []),
    postures: multicheckState(data, "tx_agg_post", []),
  };
  const rotationAggravates = aggravating.movements.values.includes(
    "Rotation (most thoracic sensitive to)");
  const sideBendingAggravates = aggravating.movements.values.includes("Side bending");
  const extensionAggravates = aggravating.movements.values.includes("Extension");
  const flexionAggravates = aggravating.movements.values.includes("Flexion");
  // Dural tension indicator -- Magee p.572: "Is the pain affected by
  // coughing, sneezing, or straining? Dural pain is often accentuated
  // by these maneuvers."
  const coughSneezeLaughAggravates = aggravating.movements.values.some((v) =>
    v === "Coughing" || v === "Sneezing" || v === "Laughing");
  const breathingAggravates = aggravating.movements.values.some((v) =>
    v.startsWith("Deep breathing"));
  const overheadReachingAggravates = aggravating.movements.values.includes(
    "Reaching overhead");
  const sustainedPostureAggravates = aggravating.postures.values.some((v) =>
    v.startsWith("Prolonged sitting") || v.startsWith("Computer work") ||
    v.startsWith("Driving") || v.startsWith("Backpack"));

  // ── Relieving factors ────────────────────────────────────────────
  const relieving = {
    treatments: multicheckState(data, "tx_rel", []),
  };
  const manipulationSignificantRelief = relieving.treatments.values.includes(
    "Manipulation — significant relief");
  const breathingExercisesHelp = relieving.treatments.values.includes(
    "Breathing exercises");
  const postureCorrectionHelps = relieving.treatments.values.includes(
    "Postural correction");
  const nsaidEffective = relieving.treatments.values.includes("NSAIDs effective");

  // ── Symptom behaviour ────────────────────────────────────────────
  const symptomBehaviour = {
    pattern: multicheckState(data, "tx_pattern", []),
    irritability: selectState(data, "tx_irritability"),
  };
  const mechanicalPattern = symptomBehaviour.pattern.values.includes(
    "Mechanical — movement and posture related");
  const constantUnaffectedPattern = symptomBehaviour.pattern.values.includes(
    "Constant — unrelated to movement (red flag)");
  const breathingRelatedPattern = symptomBehaviour.pattern.values.includes(
    "Breathing-related — with respiration");
  const morningStiffness = symptomBehaviour.pattern.values.some((v) =>
    v === "Morning stiffness" ||
    v === "Inflammatory — morning stiffness / eases with movement");
  const inflammatoryPattern = symptomBehaviour.pattern.values.includes(
    "Inflammatory — morning stiffness / eases with movement");

  // ── Red flags (single combined screen — see file header) ───────────
  // Directly mirrors Magee Table 8-1's own category breadth: cardiac
  // (MI, angina, pericarditis), respiratory (PE, pleurisy, pneumothorax,
  // pneumonia), visceral/GI (cholecystitis, peptic ulcer), renal
  // (pyelonephritis, nephrolithiasis) -- plus the app's own additions
  // for cancer, infection, fracture, and cord-compression indicators.
  const rf = multicheckState(data, "tx_rf", ["No red flags"]);
  const rfHas = (...needles) => rf.values.some((v) => needles.some((n) => v.startsWith(n)));
  const redFlags = {
    screen: rf,
    cardiac: rfHas("Cardiac symptoms with pain", "Cardiac history"),
    respiratory: rfHas("Respiratory symptoms"),
    visceral: rfHas("Abdominal symptoms"),
    oncologic: rfHas("Cancer history", "Unexplained weight loss"),
    infection: rfHas("Fever + thoracic pain"),
    fracture: rfHas("Recent trauma — fracture risk", "Known osteoporosis"),
    cordCompression: rfHas("Neurological symptoms in legs", "Bilateral leg weakness"),
    generalSerious: rfHas("Constant pain completely unaffected",
      "Progressive worsening", "Age >50 — first episode without cause",
      "Systemically unwell"),
  };
  const redFlagScreen = rf.state === "unknown" ? "incomplete" : rf.state === "absent" ? "negative" : "positive";

  // ── Functional impact ──────────────────────────────────────────────
  const functional = {
    adlRestrictions: multicheckState(data, "tx_fn", ["No limitations"]),
    psfs: str(data, "tx_fn_psfs") || null,
  };

  // ── History (shared fields, same as lumbar/cervical) ──────────────
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
    location: { ...location, costovertebralLocation, interscapularLocation, cardiacLikeRadiation },
    mechanism: {
      ...mechanism, insidiousPosturalOnset, traumaticMechanism,
      osteoporoticFractureRiskMechanism, postViralCostochondritis,
    },
    aggravating: {
      ...aggravating, rotationAggravates, sideBendingAggravates, extensionAggravates,
      flexionAggravates, coughSneezeLaughAggravates, breathingAggravates,
      overheadReachingAggravates, sustainedPostureAggravates,
    },
    relieving: {
      ...relieving, manipulationSignificantRelief, breathingExercisesHelp,
      postureCorrectionHelps, nsaidEffective,
    },
    symptomBehaviour: {
      ...symptomBehaviour, mechanicalPattern, constantUnaffectedPattern,
      breathingRelatedPattern, morningStiffness, inflammatoryPattern,
    },
    redFlags: { ...redFlags, redFlagScreen },
    functional,
    history,
    // Free-text fields Pass 2 (AI) should read — not interpreted here.
    _notesForAiPass: {
      cc_main: str(data, "cc_main"),
      tx_loc_notes: str(data, "tx_loc_notes"),
      tx_moi_notes: str(data, "tx_moi_notes"),
      tx_agg_notes: str(data, "tx_agg_notes"),
      tx_rel_notes: str(data, "tx_rel_notes"),
      tx_symp_notes: str(data, "tx_symp_notes"),
      tx_rf_notes: str(data, "tx_rf_notes"),
      tx_fn_notes: str(data, "tx_fn_notes"),
      hx_notes: str(data, "hx_notes"),
      goal_belief: str(data, "goal_belief"),
      goal_concern: str(data, "goal_concern"),
    },
  };
}

// Same design as lumbarVariableExtractor.js / cervicalVariableExtractor.js's
// AI_MERGEABLE_FIELD_MAP: each entry pairs a setter with an explicit
// isUnknown() check against the REAL underlying Pass 1 field state, and
// red-flag categories are deliberately excluded from this map entirely
// (routed to pendingRedFlagReview instead -- never silently written into
// redFlags.*, which drives the emergency-referral override).
const AI_MERGEABLE_FIELD_MAP = {
  rotationAggravates:          { isUnknown: (tv) => tv.aggravating.movements.state === "unknown",
                                   set: (tv, val) => { tv.aggravating.rotationAggravates = (val === "true" || val === true); } },
  sideBendingAggravates:       { isUnknown: (tv) => tv.aggravating.movements.state === "unknown",
                                   set: (tv, val) => { tv.aggravating.sideBendingAggravates = (val === "true" || val === true); } },
  extensionAggravates:         { isUnknown: (tv) => tv.aggravating.movements.state === "unknown",
                                   set: (tv, val) => { tv.aggravating.extensionAggravates = (val === "true" || val === true); } },
  flexionAggravates:           { isUnknown: (tv) => tv.aggravating.movements.state === "unknown",
                                   set: (tv, val) => { tv.aggravating.flexionAggravates = (val === "true" || val === true); } },
  coughSneezeLaughAggravates:  { isUnknown: (tv) => tv.aggravating.movements.state === "unknown",
                                   set: (tv, val) => { tv.aggravating.coughSneezeLaughAggravates = (val === "true" || val === true); } },
  breathingAggravates:         { isUnknown: (tv) => tv.aggravating.movements.state === "unknown",
                                   set: (tv, val) => { tv.aggravating.breathingAggravates = (val === "true" || val === true); } },
  overheadReachingAggravates:  { isUnknown: (tv) => tv.aggravating.movements.state === "unknown",
                                   set: (tv, val) => { tv.aggravating.overheadReachingAggravates = (val === "true" || val === true); } },
  sustainedPostureAggravates:  { isUnknown: (tv) => tv.aggravating.postures.state === "unknown",
                                   set: (tv, val) => { tv.aggravating.sustainedPostureAggravates = (val === "true" || val === true); } },
  manipulationSignificantRelief: { isUnknown: (tv) => tv.relieving.treatments.state === "unknown",
                                   set: (tv, val) => { tv.relieving.manipulationSignificantRelief = (val === "true" || val === true); } },
  mechanicalPattern:           { isUnknown: (tv) => tv.symptomBehaviour.pattern.state === "unknown",
                                   set: (tv, val) => { tv.symptomBehaviour.mechanicalPattern = (val === "true" || val === true); } },
  constantUnaffectedPattern:   { isUnknown: (tv) => tv.symptomBehaviour.pattern.state === "unknown",
                                   set: (tv, val) => { tv.symptomBehaviour.constantUnaffectedPattern = (val === "true" || val === true); } },
  breathingRelatedPattern:     { isUnknown: (tv) => tv.symptomBehaviour.pattern.state === "unknown",
                                   set: (tv, val) => { tv.symptomBehaviour.breathingRelatedPattern = (val === "true" || val === true); } },
  morningStiffness:            { isUnknown: (tv) => tv.symptomBehaviour.pattern.state === "unknown",
                                   set: (tv, val) => { tv.symptomBehaviour.morningStiffness = (val === "true" || val === true); } },
  costovertebralLocation:      { isUnknown: (tv) => tv.location.primaryLocation.state === "unknown",
                                   set: (tv, val) => { tv.location.costovertebralLocation = (val === "true" || val === true); } },
  priorEpisodeCount:           { isUnknown: (tv) => !tv.history.priorEpisodeCount,
                                   set: (tv, val) => { tv.history.priorEpisodeCount = String(val); } },
};

const RED_FLAG_CATEGORIES = new Set([
  "cardiacConcern", "respiratoryConcern", "visceralConcern", "oncologicConcern",
  "infectionConcern", "fractureConcern", "cordCompressionConcern",
]);

/**
 * Merge Pass 2 (AI note-reading) findings into a Pass 1 (structured
 * field) variable object. Pure function -- never mutates the input.
 * Additive-only: Pass 1 checkbox answers always win.
 *
 * @param {object} tv - output of extractThoracicVariablesStructured()
 * @param {Array}  aiFindings - the `findings` array from
 *   api/extractThoracicNoteVariables.js: [{variable, value, sourceQuote, confidence}]
 * @returns {{ merged: object, aiFilledFields: string[], pendingRedFlagReview: Array }}
 */
function mergeThoracicVariables(tv, aiFindings) {
  const merged = JSON.parse(JSON.stringify(tv));
  const aiFilledFields = [];
  const pendingRedFlagReview = [];

  (Array.isArray(aiFindings) ? aiFindings : []).forEach((f) => {
    if (!f || !f.variable) return;

    if (RED_FLAG_CATEGORIES.has(f.variable)) {
      pendingRedFlagReview.push(f);
      return;
    }

    const entry = AI_MERGEABLE_FIELD_MAP[f.variable];
    if (!entry) return; // not an allowed/known field -- ignore silently
    if (!entry.isUnknown(merged)) return; // Pass 1 already answered this -- never override

    try {
      entry.set(merged, f.value);
      aiFilledFields.push(f.variable);
    } catch { /* malformed AI value -- skip rather than corrupt state */ }
  });

  return { merged, aiFilledFields, pendingRedFlagReview };
}

export { extractThoracicVariablesStructured, mergeThoracicVariables, AI_MERGEABLE_FIELD_MAP, RED_FLAG_CATEGORIES };
