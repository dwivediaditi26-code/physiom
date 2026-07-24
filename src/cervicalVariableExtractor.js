// cervicalVariableExtractor.js
//
// Same two-pass design as lumbarVariableExtractor.js, applied to the
// Cervical Spine subjective section (REG_MOD_S["Cervical spine"] in
// sharedClinicalData.js, prefix "cx" -- e.g. cx_loc, cx_moi, cx_agg_mov).
// That structured intake was already fully built (location, mechanism,
// aggravating/relieving, symptom behaviour, arm/hand symptoms, headache,
// red flags, functional impact) -- this file is the missing piece that
// turns it into the canonical variable set a reasoning engine can score
// against, exactly the gap that used to exist for Lumbar/SI before
// lumbarVariableExtractor.js was built.
//
//   Pass 1 (this file, extractCervicalVariablesStructured) -- 100%
//   deterministic. Reads the real cx_* multicheck/select fields (exact
//   option strings from sharedClinicalData.js) onto the canonical
//   variable set. Zero hallucination risk.
//
//   Pass 2 (api/extractCervicalNoteVariables.js) -- AI pass over ONLY
//   the free-text note fields (cx_loc_notes, cx_moi_notes, cx_agg_notes,
//   cx_rel_notes, cx_symp_notes, cx_arm_notes, cx_ha_notes, cx_rf_notes,
//   cx_fn_notes) for anything Pass 1 left "unknown". Told explicitly
//   what Pass 1 already found; only fills genuine gaps, never overrides
//   a real selection.
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
function boolFromMulticheck(data, key, negativeOptions, positiveMatch) {
  const s = multicheckState(data, key, negativeOptions);
  if (s.state === "unknown") return "unknown";
  if (s.state === "absent") return false;
  return positiveMatch ? s.values.some((v) => positiveMatch(v)) : true;
}

/**
 * Pass 1: deterministic extraction from the structured Cervical spine
 * fields.
 * @param {object} data - the full app data object (all field id -> value)
 * @returns {object} canonical Cervical variable set, grouped by category
 */
function extractCervicalVariablesStructured(data) {
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
    primaryLocation: multicheckState(data, "cx_loc", []),
    radiation: multicheckState(data, "cx_radiation", ["No radiation — local only"]),
    dermatomal: multicheckState(data, "cx_dermatomal", ["Not dermatomal / not applicable"]),
  };

  // ── Mechanism / onset (WAD grading is already a real structured
  //     field here -- cx_moi_wad -- unlike anything lumbar had) ───────
  const mechanism = {
    type: multicheckState(data, "cx_moi", ["No clear mechanism — insidious onset"]),
    wadGrade: selectState(data, "cx_moi_wad"),
    lossOfConsciousness: selectState(data, "cx_moi_loc"),
    firstSymptomTiming: selectState(data, "cx_moi_first"),
  };
  // Guarded against "never touched cx_moi at all" collapsing into a
  // false "no whiplash mechanism" -- found via a fully-blank-form sweep:
  // C05's "No clear traumatic/collision mechanism" supporting check was
  // wrongly scoring a match on an entirely untouched form, because an
  // untouched multicheck's default `false` is indistinguishable from a
  // real, deliberate "mechanism asked, whiplash not selected." Same fix
  // pattern as armHandPain/headachePresent below.
  const whiplashMechanism = mechanism.type.state === "unknown" ? "unknown" :
    mechanism.type.values.some((v) => v.toLowerCase().startsWith("whiplash"));
  const wadVal = mechanism.wadGrade.value || "";
  const wadGradeNum =
    wadVal.startsWith("Grade 0") ? 0 : wadVal.startsWith("Grade I ") ? 1 :
    wadVal.startsWith("Grade II") ? 2 : wadVal.startsWith("Grade III") ? 3 :
    wadVal.startsWith("Grade IV") ? 4 : null; // null = N/A or not answered, NOT grade 0

  // ── Arm/hand symptoms (this is cervical's below-knee-pain equivalent
  //     -- the single highest-value differentiator between mechanical/
  //     facet/muscle-strain patterns and radiculopathy/myelopathy) ────
  const armHand = {
    present: selectState(data, "cx_arm_present"),
    quality: multicheckState(data, "cx_arm_quality", ["Not applicable"]),
    fingers: multicheckState(data, "cx_arm_fingers", ["Not applicable"]),
    neuroSigns: multicheckState(data, "cx_arm_neuro", ["No neurological symptoms"]),
    positionEffect: multicheckState(data, "cx_arm_position", ["Not applicable"]),
    lhermitte: selectState(data, "cx_lhermitte"),
  };
  const armPresentVal = armHand.present.value || "";
  const armHandPain =
    armHand.present.state === "unknown" ? "unknown" :
    armPresentVal.startsWith("No arm") ? false :
    armPresentVal.includes("bilateral") ? "bilateral" : true;
  const bilateralArmSigns = armPresentVal.includes("bilateral");
  // Bakody's sign / shoulder-abduction relief sign -- Magee (Ch.3,
  // Patient History Q12): relief with the hand/arm placed on top of the
  // head is "usually indicative of problems in the C4 or C5 area."
  // Captured on the RELIEVING side (cx_rel_mov), not here, but the
  // underlying neurological signs that co-occur are read here.
  // Same guard: cx_arm_neuro never touched must not collapse into a
  // confirmed-negative "no objective neuro signs" (used as real support
  // for C01/C03/C10's "No objective neurological signs" checks).
  const objectiveNeuroSigns = armHand.neuroSigns.state === "unknown" ? "unknown" :
    armHand.neuroSigns.values.some((v) =>
      v.startsWith("Objective numbness") || v.startsWith("Wasting"));
  const lhermitteVal = armHand.lhermitte.value || "";
  const lhermittePositive = lhermitteVal.startsWith("Yes");

  // ── Aggravating factors ──────────────────────────────────────────
  const aggravating = {
    movements: multicheckState(data, "cx_agg_mov", []),
    postures: multicheckState(data, "cx_agg_post", []),
    activities: multicheckState(data, "cx_agg_act", []),
    other: multicheckState(data, "cx_agg_other", []),
    worstSingle: str(data, "cx_agg_worst") || null,
  };
  const flexionAggravates = aggravating.movements.values.includes("Flexion — looking down");
  // extensionAggravates/rotationAggravates/quadrantAggravates are guarded
  // against an untouched cx_agg_mov -- C08/C09's "no clear single
  // direction reproduces it" supporting checks test whether ALL THREE are
  // === false, so on a completely blank form the old unguarded booleans
  // (all defaulting to false) made that ternary fire as a false positive
  // for BOTH conditions on every single untouched case, not just a
  // genuine "asked, and no direction aggravates" finding.
  const extensionAggravates = aggravating.movements.state === "unknown" ? "unknown" :
    aggravating.movements.values.includes("Extension — looking up");
  const rotationAggravates = aggravating.movements.state === "unknown" ? "unknown" :
    aggravating.movements.values.some((v) => v.toLowerCase().startsWith("rotation"));
  // Quadrant position (combined extension + rotation, either side) --
  // Magee: end-range extension/side-flexion/rotation together is "highly
  // suggestive of nerve root pathology (radicular signs), apophyseal
  // joint involvement (localized pain), or vertebral artery involvement."
  const quadrantAggravates = aggravating.movements.state === "unknown" ? "unknown" :
    aggravating.movements.values.some((v) =>
      v.startsWith("Combined extension + rotation"));
  const sustainedPostureAggravates = aggravating.postures.values.some((v) =>
    v.startsWith("Prolonged sitting") || v.startsWith("Computer") || v.startsWith("Looking down") ||
    v.startsWith("Looking up") || v.startsWith("Forward head") || v.startsWith("Slumped"));
  const coughSneezeAggravates = aggravating.other.values.includes("Coughing / sneezing (dural / cord tension)");

  // ── Relieving factors ────────────────────────────────────────────
  const relieving = {
    movements: multicheckState(data, "cx_rel_mov", []),
    postures: multicheckState(data, "cx_rel_post", []),
    manual: multicheckState(data, "cx_rel_manual", []),
    medications: multicheckState(data, "cx_rel_med", []),
    bestSingle: str(data, "cx_rel_best") || null,
  };
  const chinTuckRelieves = relieving.movements.values.some((v) =>
    v.startsWith("Chin tuck") || v.startsWith("Cervical retraction"));
  // Direct Magee grounding: "shoulder abduction relief sign" (arm on
  // head relieving arm symptoms) -- Bakody's sign, C4/C5.
  const armOverheadRelievesArmSymptoms = relieving.movements.values.includes(
    "Arm overhead — relieves arm symptoms (shoulder abduction relief sign)");
  const manipulationImmediateRelief = relieving.manual.values.includes("Manipulation — immediate relief");
  const nsaidEffective = relieving.medications.values.includes("NSAIDs — effective");

  // ── Symptom behaviour ────────────────────────────────────────────
  const symptomBehaviour = {
    overallPattern: multicheckState(data, "cx_pattern", []),
    morning: multicheckState(data, "cx_morning", ["No morning symptoms"]),
    night: multicheckState(data, "cx_night", ["No night symptoms"]),
    pattern24hr: selectState(data, "cx_24hr"),
    trajectory: selectState(data, "cx_trajectory"),
    irritability: selectState(data, "cx_irritability"),
  };
  const constantUnremitting = symptomBehaviour.overallPattern.values.some((v) =>
    v.startsWith("Constant — never goes away"));
  const morningStiffnessOver30 = symptomBehaviour.morning.values.some((v) =>
    v.includes("stays bad all morning (inflammatory flag)") || v.includes("takes 30–60 min"));
  const constantNightPain = symptomBehaviour.night.values.includes("Constant night pain — cannot sleep");
  const rapidlyWorsening = (symptomBehaviour.trajectory.value || "").includes("Rapidly worsening (red flag)");

  // ── Headache (fully structured, unlike anything in the lumbar form —
  //     this whole section only exists for Cervical) ──────────────────
  const headache = {
    present: selectState(data, "cx_ha_present"),
    location: multicheckState(data, "cx_ha_location", ["Not applicable"]),
    quality: multicheckState(data, "cx_ha_quality", ["Not applicable"]),
    triggers: multicheckState(data, "cx_ha_triggers", ["Not applicable"]),
    classification: selectState(data, "cx_ha_type"),
    frequency: selectState(data, "cx_ha_frequency"),
  };
  const headacheVal = headache.present.value || "";
  const headachePresent = headache.present.state === "unknown" ? "unknown" : !headacheVal.startsWith("No headache");
  const occipitalHeadache = headache.location.values.includes("Occipital / base of skull (cervicogenic)");
  const headacheTriggeredByNeckMovement = headache.triggers.values.includes(
    "Triggered by neck movement (cervicogenic)");
  const meningismFeature = headache.triggers.values.includes(
    "Preceded by neck stiffness + fever (meningism — urgent)");

  // ── Red flags (mandatory screen — never inferred, only reported) ───
  // Directly mirrors Magee Table 3-6's own category structure: Fracture,
  // Neoplasm, Infection, Neurologic injury, Cervical myelopathy, Upper
  // cervical ligamentous instability, Vertebral artery insufficiency,
  // Inflammatory/systemic disease -- already how the app's own intake
  // form (cx_rf_myelopathy / cx_rf_vbi / cx_rf_instability / cx_rf_other)
  // groups them.
  const redFlags = {
    myelopathy: multicheckState(data, "cx_rf_myelopathy", ["No myelopathy signs"]),
    vbi: multicheckState(data, "cx_rf_vbi", ["No VBI signs"]),
    instability: multicheckState(data, "cx_rf_instability", ["No instability signs"]),
    other: multicheckState(data, "cx_rf_other", ["No other red flags"]),
    // Bug fix (Layer 3 audit): the dedicated cx_fracture_screen field
    // (real, defined in sharedClinicalData.js: high-energy trauma, axial
    // loading, Canadian C-Spine high-risk features, NEXUS not cleared,
    // odontoid peg fracture risk, etc.) was never read here, so a suspected
    // cervical fracture produced NO red-flag override at all -- the single
    // most dangerous thing to miss before cervical manipulation/end-range
    // testing. Now screened as a first-class red-flag category.
    fracture: multicheckState(data, "cx_fracture_screen", ["Not applicable"]),
    action: selectState(data, "cx_rf_action"),
  };
  const anyState = (...fields) => {
    if (fields.some((f) => f.state === "present")) return "positive";
    if (fields.every((f) => f.state === "absent")) return "negative";
    return "incomplete"; // at least one screen never touched
  };
  const redFlagScreen = anyState(redFlags.myelopathy, redFlags.vbi, redFlags.instability, redFlags.other, redFlags.fracture);

  // ── Functional impact ────────────────────────────────────────────
  const functional = {
    adlRestrictions: multicheckState(data, "cx_fn_adl", ["No functional limitation"]),
    workImpact: selectState(data, "cx_fn_work"),
  };

  // ── History (shared fields, same as lumbar) ──────────────────────
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
    location: { ...location, armHandPain, bilateralArmSigns },
    mechanism: { ...mechanism, whiplashMechanism, wadGradeNum },
    armHand: { ...armHand, objectiveNeuroSigns, lhermittePositive },
    aggravating: {
      ...aggravating, flexionAggravates, extensionAggravates, rotationAggravates,
      quadrantAggravates, sustainedPostureAggravates, coughSneezeAggravates,
    },
    relieving: {
      ...relieving, chinTuckRelieves, armOverheadRelievesArmSymptoms,
      manipulationImmediateRelief, nsaidEffective,
    },
    symptomBehaviour: {
      ...symptomBehaviour, constantUnremitting, morningStiffnessOver30,
      constantNightPain, rapidlyWorsening,
    },
    headache: {
      ...headache, headachePresent, occipitalHeadache,
      headacheTriggeredByNeckMovement, meningismFeature,
    },
    redFlags: { ...redFlags, redFlagScreen },
    functional,
    history,
    // Free-text fields Pass 2 (AI) should read — not interpreted here.
    _notesForAiPass: {
      cc_main: str(data, "cc_main"),
      cx_loc_notes: str(data, "cx_loc_notes"),
      cx_moi_notes: str(data, "cx_moi_notes"),
      cx_agg_notes: str(data, "cx_agg_notes"),
      cx_rel_notes: str(data, "cx_rel_notes"),
      cx_symp_notes: str(data, "cx_symp_notes"),
      cx_arm_notes: str(data, "cx_arm_notes"),
      cx_ha_notes: str(data, "cx_ha_notes"),
      cx_rf_notes: str(data, "cx_rf_notes"),
      cx_fracture_notes: str(data, "cx_fracture_notes"),
      cx_fn_notes: str(data, "cx_fn_notes"),
      hx_notes: str(data, "hx_notes"),
      goal_belief: str(data, "goal_belief"),
      goal_concern: str(data, "goal_concern"),
    },
  };
}

// Same design as lumbarVariableExtractor.js's AI_MERGEABLE_FIELD_MAP:
// each entry pairs a setter with an explicit isUnknown() check against
// the REAL underlying Pass 1 field state, and red-flag categories are
// deliberately excluded from this map entirely (routed to
// pendingRedFlagReview instead -- never silently written into
// redFlags.*.state, which drives the emergency-referral override).
const AI_MERGEABLE_FIELD_MAP = {
  armHandPain:                { isUnknown: (cv) => cv.location.armHandPain === "unknown",
                                 set: (cv, val) => {
                                   const v = String(val).trim().toLowerCase();
                                   cv.location.armHandPain = v === "bilateral" ? "bilateral" : (v === "true" || v === true);
                                 } },
  dermatomalPattern:          { isUnknown: (cv) => cv.location.dermatomal.state === "unknown",
                                 set: (cv, val) => {
                                   const negative = val === "false" || val === false ||
                                     /^(none|no|absent|not dermatomal|not present)/i.test(String(val).trim());
                                   cv.location.dermatomal = negative
                                     ? { state: "absent", values: [] }
                                     : { state: "present", values: [String(val)] };
                                 } },
  whiplashMechanism:          { isUnknown: (cv) => cv.mechanism.type.state === "unknown",
                                 set: (cv, val) => { cv.mechanism.whiplashMechanism = (val === "true" || val === true); } },
  flexionAggravates:          { isUnknown: (cv) => cv.aggravating.movements.state === "unknown",
                                 set: (cv, val) => { cv.aggravating.flexionAggravates = (val === "true" || val === true); } },
  extensionAggravates:        { isUnknown: (cv) => cv.aggravating.movements.state === "unknown",
                                 set: (cv, val) => { cv.aggravating.extensionAggravates = (val === "true" || val === true); } },
  rotationAggravates:         { isUnknown: (cv) => cv.aggravating.movements.state === "unknown",
                                 set: (cv, val) => { cv.aggravating.rotationAggravates = (val === "true" || val === true); } },
  quadrantAggravates:         { isUnknown: (cv) => cv.aggravating.movements.state === "unknown",
                                 set: (cv, val) => { cv.aggravating.quadrantAggravates = (val === "true" || val === true); } },
  sustainedPostureAggravates: { isUnknown: (cv) => cv.aggravating.postures.state === "unknown",
                                 set: (cv, val) => { cv.aggravating.sustainedPostureAggravates = (val === "true" || val === true); } },
  coughSneezeAggravates:      { isUnknown: (cv) => cv.aggravating.other.state === "unknown",
                                 set: (cv, val) => { cv.aggravating.coughSneezeAggravates = (val === "true" || val === true); } },
  chinTuckRelieves:           { isUnknown: (cv) => cv.relieving.movements.state === "unknown",
                                 set: (cv, val) => { cv.relieving.chinTuckRelieves = (val === "true" || val === true); } },
  armOverheadRelievesArmSymptoms: { isUnknown: (cv) => cv.relieving.movements.state === "unknown",
                                 set: (cv, val) => { cv.relieving.armOverheadRelievesArmSymptoms = (val === "true" || val === true); } },
  constantUnremitting:        { isUnknown: (cv) => cv.symptomBehaviour.overallPattern.state === "unknown",
                                 set: (cv, val) => { cv.symptomBehaviour.constantUnremitting = (val === "true" || val === true); } },
  morningStiffnessOver30:     { isUnknown: (cv) => cv.symptomBehaviour.morning.state === "unknown",
                                 set: (cv, val) => { cv.symptomBehaviour.morningStiffnessOver30 = (val === "true" || val === true); } },
  constantNightPain:          { isUnknown: (cv) => cv.symptomBehaviour.night.state === "unknown",
                                 set: (cv, val) => { cv.symptomBehaviour.constantNightPain = (val === "true" || val === true); } },
  occipitalHeadache:          { isUnknown: (cv) => cv.headache.location.state === "unknown",
                                 set: (cv, val) => { cv.headache.occipitalHeadache = (val === "true" || val === true); } },
  headacheTriggeredByNeckMovement: { isUnknown: (cv) => cv.headache.triggers.state === "unknown",
                                 set: (cv, val) => { cv.headache.headacheTriggeredByNeckMovement = (val === "true" || val === true); } },
  objectiveNeuroSigns:        { isUnknown: (cv) => cv.armHand.neuroSigns.state === "unknown",
                                 set: (cv, val) => { cv.armHand.objectiveNeuroSigns = (val === "true" || val === true); } },
  lhermittePositive:          { isUnknown: (cv) => cv.armHand.lhermitte.state === "unknown",
                                 set: (cv, val) => { cv.armHand.lhermittePositive = (val === "true" || val === true); } },
  priorEpisodeCount:          { isUnknown: (cv) => !cv.history.priorEpisodeCount,
                                 set: (cv, val) => { cv.history.priorEpisodeCount = String(val); } },
};

const RED_FLAG_CATEGORIES = new Set([
  "myelopathyConcern", "vbiConcern", "instabilityConcern", "otherSeriousPathologyConcern",
]);

/**
 * Merge Pass 2 (AI note-reading) findings into a Pass 1 (structured
 * field) variable object. Pure function -- never mutates the input.
 * Additive-only: Pass 1 checkbox answers always win.
 *
 * @param {object} cv - output of extractCervicalVariablesStructured()
 * @param {Array}  aiFindings - the `findings` array from
 *   api/extractCervicalNoteVariables.js: [{variable, value, sourceQuote, confidence}]
 * @returns {{ merged: object, aiFilledFields: string[], pendingRedFlagReview: Array }}
 */
function mergeCervicalVariables(cv, aiFindings) {
  const merged = JSON.parse(JSON.stringify(cv));
  const aiFilledFields = [];
  const pendingRedFlagReview = [];

  (Array.isArray(aiFindings) ? aiFindings : []).forEach((f) => {
    if (!f || !f.variable) return;

    if (RED_FLAG_CATEGORIES.has(f.variable)) {
      pendingRedFlagReview.push(f);
      return;
    }

    const field = AI_MERGEABLE_FIELD_MAP[f.variable];
    if (!field) return;

    if (!field.isUnknown(merged)) return;

    field.set(merged, f.value);
    aiFilledFields.push(f.variable);
  });

  return { merged, aiFilledFields, pendingRedFlagReview };
}

export { extractCervicalVariablesStructured, mergeCervicalVariables };
