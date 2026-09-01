// orthoCervicalReasoning.js — adapter between the new Ortho Outpatient tool's
// Cervical Subjective checklist (SUBJECTIVE_REGION_FIELDS.cervical in
// orthoSubjectiveRegionData.js) and the real Cervical Phase 0.5 differential
// engine (cervicalReasoningEngine.js), reused here unchanged.
//
// Same design as orthoLumbarReasoning.js: the old flow stored each multicheck
// as a "|||"-joined string; this tool's SelectField stores multi-select as a
// ", "-joined string instead. Same shape, different separator -- so this is a
// straight port of cervicalVariableExtractor.js's Pass 1 reading logic against
// the new tool's field ids/data shape, not a redesign of the engine or its
// variable contract. Pass 2 (AI note-reading over free-text fields) is
// intentionally not ported, same as orthoLumbarReasoning.js -- this tool's
// checklist fields ARE the structured answer, with no separate free-text
// notes layer to re-read.
import { runCervicalReasoningEngine, evaluateRedFlagOverride } from "./cervicalReasoningEngine.js";

function arr(regionData, key) {
  const x = regionData[key];
  if (!x) return [];
  return String(x).split(", ").filter(Boolean);
}
function str(regionData, key) {
  return String(regionData[key] || "").trim();
}
function multicheckState(regionData, key, negativeOptions) {
  const values = arr(regionData, key);
  if (values.length === 0) return { state: "unknown", values: [] };
  const positives = values.filter((v) => !negativeOptions.includes(v));
  if (positives.length === 0) return { state: "absent", values: [] };
  return { state: "present", values: positives };
}
function selectState(regionData, key) {
  const v = str(regionData, key);
  if (!v) return { state: "unknown", value: null };
  return { state: "answered", value: v };
}

/**
 * Reads the Cervical region checklist (plus the shared Subjective chief
 * complaint/onset/medical-history text) and produces the same canonical
 * variable set extractCervicalVariablesStructured() builds for the old flow,
 * so runCervicalReasoningEngine() can run completely unmodified.
 * @param {object} regionData - data.subjective.regions.cervical
 * @param {object} subjective - data.subjective (for chiefComplaint/onset/medicalHistory)
 */
export function extractCervicalVariables(regionData, subjective = {}) {
  const rd = regionData || {};

  const chiefComplaint = {
    summary: (subjective.chiefComplaint || "").trim() || null,
    onset: (subjective.onset || "").trim() || null,
    duration: (subjective.duration || "").trim() || null,
    nrsNow: null, nrsWorst: null, nrsBest: null,
    quality: [],
  };

  const location = {
    primaryLocation: multicheckState(rd, "location", []),
    radiation: multicheckState(rd, "radiation", ["No radiation — local only"]),
    dermatomal: multicheckState(rd, "dermatomal", ["Not dermatomal / not applicable"]),
  };

  const mechanism = {
    type: multicheckState(rd, "mechanismType", ["No clear mechanism — insidious onset"]),
    wadGrade: selectState(rd, "mechanismWad"),
    lossOfConsciousness: selectState(rd, "mechanismLoc"),
    firstSymptomTiming: selectState(rd, "mechanismFirstSymptom"),
  };
  const whiplashMechanism = mechanism.type.state === "unknown" ? "unknown" :
    mechanism.type.values.some((v) => v.toLowerCase().startsWith("whiplash"));
  const wadVal = mechanism.wadGrade.value || "";
  const wadGradeNum =
    wadVal.startsWith("Grade 0") ? 0 : wadVal.startsWith("Grade I ") ? 1 :
    wadVal.startsWith("Grade II") ? 2 : wadVal.startsWith("Grade III") ? 3 :
    wadVal.startsWith("Grade IV") ? 4 : null;

  const armHand = {
    present: selectState(rd, "armPresent"),
    quality: multicheckState(rd, "armQuality", ["Not applicable"]),
    fingers: multicheckState(rd, "armFingers", ["Not applicable"]),
    neuroSigns: multicheckState(rd, "armNeuro", ["No neurological symptoms"]),
    positionEffect: multicheckState(rd, "armPosition", ["Not applicable"]),
    lhermitte: selectState(rd, "lhermitte"),
  };
  const armPresentVal = armHand.present.value || "";
  const armHandPain =
    armHand.present.state === "unknown" ? "unknown" :
    armPresentVal.startsWith("No arm") ? false :
    armPresentVal.includes("bilateral") ? "bilateral" : true;
  const bilateralArmSigns = armPresentVal.includes("bilateral");
  const objectiveNeuroSigns = armHand.neuroSigns.state === "unknown" ? "unknown" :
    armHand.neuroSigns.values.some((v) =>
      v.startsWith("Objective numbness") || v.startsWith("Wasting"));
  const lhermitteVal = armHand.lhermitte.value || "";
  const lhermittePositive = lhermitteVal.startsWith("Yes");

  const aggravating = {
    movements: multicheckState(rd, "aggMovements", []),
    postures: multicheckState(rd, "aggPostures", []),
    activities: multicheckState(rd, "aggActivities", []),
    other: multicheckState(rd, "aggOther", []),
    worstSingle: str(rd, "aggWorst") || null,
  };
  const flexionAggravates = aggravating.movements.values.includes("Flexion — looking down");
  const extensionAggravates = aggravating.movements.state === "unknown" ? "unknown" :
    aggravating.movements.values.includes("Extension — looking up");
  const rotationAggravates = aggravating.movements.state === "unknown" ? "unknown" :
    aggravating.movements.values.some((v) => v.toLowerCase().startsWith("rotation"));
  const quadrantAggravates = aggravating.movements.state === "unknown" ? "unknown" :
    aggravating.movements.values.some((v) => v.startsWith("Combined extension + rotation"));
  const sustainedPostureAggravates = aggravating.postures.values.some((v) =>
    v.startsWith("Prolonged sitting") || v.startsWith("Computer") || v.startsWith("Looking down") ||
    v.startsWith("Looking up") || v.startsWith("Forward head") || v.startsWith("Slumped"));
  const coughSneezeAggravates = aggravating.other.values.includes("Coughing / sneezing (dural / cord tension)");

  const relieving = {
    movements: multicheckState(rd, "relMovements", []),
    postures: multicheckState(rd, "relPostures", []),
    manual: multicheckState(rd, "relManual", []),
    medications: multicheckState(rd, "relMedications", []),
    bestSingle: str(rd, "relBest") || null,
  };
  const chinTuckRelieves = relieving.movements.values.some((v) =>
    v.startsWith("Chin tuck") || v.startsWith("Cervical retraction"));
  const armOverheadRelievesArmSymptoms = relieving.movements.values.includes(
    "Arm overhead — relieves arm symptoms (shoulder abduction relief sign)");
  const manipulationImmediateRelief = relieving.manual.values.includes("Manipulation — immediate relief");
  const nsaidEffective = relieving.medications.values.includes("NSAIDs — effective");

  const symptomBehaviour = {
    overallPattern: multicheckState(rd, "overallPattern", []),
    morning: multicheckState(rd, "morning", ["No morning symptoms"]),
    night: multicheckState(rd, "night", ["No night symptoms"]),
    pattern24hr: selectState(rd, "pattern24hr"),
    trajectory: selectState(rd, "trajectory"),
    irritability: selectState(rd, "irritability"),
  };
  const constantUnremitting = symptomBehaviour.overallPattern.values.some((v) =>
    v.startsWith("Constant — never goes away"));
  const morningStiffnessOver30 = symptomBehaviour.morning.values.some((v) =>
    v.includes("stays bad all morning (inflammatory flag)") || v.includes("takes 30–60 min"));
  const constantNightPain = symptomBehaviour.night.values.includes("Constant night pain — cannot sleep");
  const rapidlyWorsening = (symptomBehaviour.trajectory.value || "").includes("Rapidly worsening (red flag)");

  const headache = {
    present: selectState(rd, "haPresent"),
    location: multicheckState(rd, "haLocation", ["Not applicable"]),
    quality: multicheckState(rd, "haQuality", ["Not applicable"]),
    triggers: multicheckState(rd, "haTriggers", ["Not applicable"]),
    classification: selectState(rd, "haType"),
    frequency: selectState(rd, "haFrequency"),
  };
  const headacheVal = headache.present.value || "";
  const headachePresent = headache.present.state === "unknown" ? "unknown" : !headacheVal.startsWith("No headache");
  const occipitalHeadache = headache.location.values.includes("Occipital / base of skull (cervicogenic)");
  const headacheTriggeredByNeckMovement = headache.triggers.values.includes(
    "Triggered by neck movement (cervicogenic)");
  const meningismFeature = headache.triggers.values.includes(
    "Preceded by neck stiffness + fever (meningism — urgent)");

  const redFlags = {
    myelopathy: multicheckState(rd, "redFlagsMyelopathy", ["No myelopathy signs"]),
    vbi: multicheckState(rd, "redFlagsVbi", ["No VBI signs"]),
    instability: multicheckState(rd, "redFlagsInstability", ["No instability signs"]),
    other: multicheckState(rd, "redFlagsOther", ["No other red flags"]),
    fracture: multicheckState(rd, "fractureScreen", ["Not applicable"]),
    action: selectState(rd, "rfAction"),
  };
  const anyState = (...fields) => {
    if (fields.some((f) => f.state === "present")) return "positive";
    if (fields.every((f) => f.state === "absent")) return "negative";
    return "incomplete";
  };
  const redFlagScreen = anyState(redFlags.myelopathy, redFlags.vbi, redFlags.instability, redFlags.other, redFlags.fracture);

  const functional = {
    adlRestrictions: multicheckState(rd, "fnAdl", ["No functional limitation"]),
    workImpact: selectState(rd, "fnWork"),
  };

  const history = {
    priorEpisodeCount: null,
    priorEpisodeOutcome: null,
    medicalHistory: (subjective.medicalHistory || "").trim() || null,
    patientGoals: null,
    patientConcern: null,
    patientBelief: null,
  };

  return {
    // Hardcoded null, same as orthoLumbarReasoning.js's extractLumbarVariables
    // -- this tool's Subjective step doesn't route age/sex/occupation into
    // the region checklist data this adapter reads, so age-based conditions
    // (parseInt(cv.demographics.age)) simply can't match one way or the
    // other here, same accepted gap the lumbar port already has.
    demographics: { age: null, sex: null, occupation: null },
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
  };
}

// True once the clinician has actually started the Cervical checklist --
// used to decide whether to show the differential section at all.
export function hasCervicalChecklistData(regionData) {
  return !!regionData && Object.values(regionData).some((v) => String(v || "").trim());
}

export function runCervicalDifferential(regionData, subjective) {
  const cv = extractCervicalVariables(regionData, subjective);
  return runCervicalReasoningEngine(cv);
}

export { evaluateRedFlagOverride };

/* ══════════════════════════════════════════════════════════════════════════
   cervicalTestNav() -- ported verbatim from SubjectiveObjective.jsx (the old
   flow). Same id-sharing story as orthoLumbarReasoning.js's lumbarTestNav:
   the old flow's romHighlights/mmtHighlights/highlightTest ids are the same
   rom_/mmt_/st_ prefixed ids ROM_DATA, MMT_DATA and SPECIAL_TESTS_DATA use
   here, so this ports straight across with no id remapping.

   cervicalConditionItemIds() (new, not in the old flow) turns one matched
   condition into the concrete rom_/mmt_/st_ prefixed ids it covers, plus
   whether Observation is one of them -- same shape as
   orthoLumbarReasoning.js's lumbarConditionItemIds().
   ══════════════════════════════════════════════════════════════════════════ */
const CERVICAL_ROM_HIGHLIGHTS = ["rom_crotl", "rom_crotr", "rom_cflex", "rom_cext", "rom_clatl", "rom_clatr"];
// "mmt_trapU" (present in the old flow's own constant) has no matching
// entry in MMT_DATA["Cervical"] -- the real id there is "mmt_trap_u" (with
// an underscore) -- corrected here rather than silently carried forward.
const CERVICAL_MMT_HIGHLIGHTS = ["mmt_dnf", "mmt_scm", "mmt_trap_u", "mmt_scalenes", "mmt_suboccip"];

function cervicalTestNav(testStr) {
  const s = String(testStr || "");
  if (/tinel'?s sign at wrist/i.test(s))
    return { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_tinel_wrist" } };
  if (/tinel'?s sign at elbow/i.test(s))
    return { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_tinel_elbow" } };
  if (/ultt1/i.test(s))
    return { nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_ultt1" } };
  if (/ultt2/i.test(s))
    return { nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_ultt2" } };
  if (/ultt3/i.test(s))
    return { nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_ultt3" } };
  if (/spurling'?s test/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_spurling" } };
  if (/cervical distraction test/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_distraction" } };
  if (/sharp-?purser test/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_sharp_purser" } };
  if (/alar ligament test/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_alar" } };
  if (/3-part test/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_vbi" } };
  if (/flexion-rotation test|\bfrt\b/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_flex_rot" } };
  if (/jackson'?s compression test/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_jackson" } };
  if (/cervical rotation lateral flexion|\bcrlf\b/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_cervical_rotation_lt" } };
  if (/adson'?s test/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_adson" } };
  if (/costoclavicular|military brace/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_costoclavicular" } };
  if (/roos test|elevated arm stress|\beast\b/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_roos_east" } };
  if (/cyriax release test/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_cyriax_release" } };
  if (/first thoracic nerve root|t1 nerve root stretch/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_t1_nerve_stretch" } };
  if (/cervical arom/i.test(s))
    return { nav: "rom", ctx: { romRegion: "Cervical", romHighlights: CERVICAL_ROM_HIGHLIGHTS } };
  if (/cervical mmt|deep cervical flexor/i.test(s))
    return { nav: "mmt", ctx: { mmtRegion: "Cervical", mmtHighlights: CERVICAL_MMT_HIGHLIGHTS } };
  if (/observation|posture screen/i.test(s))
    return { nav: "observation", ctx: {} };
  return null;
}

/**
 * Reduces one Phase 0.5 condition's objectiveTests.{required,recommended}
 * strings down to the concrete rom_/mmt_/st_ prefixed ids they cover, plus
 * whether Observation is one of them.
 * @param {object} condition - one entry from runCervicalDifferential(...).conditions
 */
export function cervicalConditionItemIds(condition) {
  const strings = [...(condition?.objectiveTests?.required || []), ...(condition?.objectiveTests?.recommended || [])];
  const rom = new Set();
  const mmt = new Set();
  const special = new Set();
  let showObservation = false;
  strings.forEach((s) => {
    const target = cervicalTestNav(s);
    if (!target) return;
    if (target.nav === "rom") (target.ctx.romHighlights || []).forEach((id) => rom.add(id));
    else if (target.nav === "mmt") (target.ctx.mmtHighlights || []).forEach((id) => mmt.add(id));
    else if (target.nav === "special" && target.ctx.highlightTest) special.add(target.ctx.highlightTest);
    else if (target.nav === "observation") showObservation = true;
  });
  return { rom, mmt, special, showObservation };
}
