// orthoThoracicReasoning.js — adapter between the new Ortho Outpatient tool's
// Thoracic Subjective checklist (SUBJECTIVE_REGION_FIELDS.thoracic in
// orthoSubjectiveRegionData.js) and the real Thoracic Phase 0.5 differential
// engine (thoracicReasoningEngine.js), reused here unchanged.
//
// Same design as orthoLumbarReasoning.js / orthoCervicalReasoning.js: a
// straight port of thoracicVariableExtractor.js's Pass 1 reading logic
// against this tool's field ids/data shape (", "-joined multi-select
// instead of "|||"-joined). Pass 2 (AI note-reading) isn't ported, same
// reason as the other two adapters -- this tool's checklist fields ARE the
// structured answer.
import { runThoracicReasoningEngine, evaluateRedFlagOverride } from "./thoracicReasoningEngine.js";

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
 * Reads the Thoracic region checklist (plus the shared Subjective chief
 * complaint/onset/medical-history text) and produces the same canonical
 * variable set extractThoracicVariablesStructured() builds for the old
 * flow, so runThoracicReasoningEngine() can run completely unmodified.
 * @param {object} regionData - data.subjective.regions.thoracic
 * @param {object} subjective - data.subjective (for chiefComplaint/onset/medicalHistory)
 */
export function extractThoracicVariables(regionData, subjective = {}) {
  const rd = regionData || {};

  // Hardcoded null, same as the other two adapters -- this tool's
  // Subjective step doesn't route age/sex into the region checklist data
  // this adapter reads, so age/sex-based conditions can't match either way.
  const demographics = { age: null, sex: null, occupation: null };
  const chiefComplaint = {
    summary: (subjective.chiefComplaint || "").trim() || null,
    onset: (subjective.onset || "").trim() || null,
    duration: (subjective.duration || "").trim() || null,
    nrsNow: null, nrsWorst: null, nrsBest: null,
    quality: [],
  };

  const location = {
    primaryLocation: multicheckState(rd, "location", []),
    radiation: multicheckState(rd, "radiation", ["No radiation — local"]),
  };
  const costovertebralLocation = location.primaryLocation.values.some((v) => v.startsWith("Costovertebral"));
  const interscapularLocation = location.primaryLocation.values.some((v) => v.startsWith("Interscapular"));
  const cardiacLikeRadiation = location.radiation.values.includes(
    "Cardiac-like radiation — left chest / arm (urgent flag)");

  const mechanism = { type: multicheckState(rd, "mechanismType", ["No clear mechanism"]) };
  const insidiousPosturalOnset = mechanism.type.values.includes("Insidious — postural / sustained");
  const ribScreenForMechanism = multicheckState(rd, "ribScreen", ["Not applicable"]);
  const traumaticMechanism = (mechanism.type.state === "unknown" &&
      !ribScreenForMechanism.values.some((v) => v.startsWith("Direct trauma to chest / rib") || v.startsWith("High-impact sport"))) ? "unknown" :
    (mechanism.type.values.some((v) =>
      v.startsWith("Lifting") || v.startsWith("Rotation injury") ||
      v.startsWith("Fall") || v.startsWith("MVA")) ||
     ribScreenForMechanism.values.some((v) => v.startsWith("Direct trauma to chest / rib") || v.startsWith("High-impact sport")));
  const osteoporoticFractureRiskMechanism = mechanism.type.values.includes("Osteoporotic fracture — minimal trauma");
  const postViralCostochondritis = mechanism.type.values.includes("Viral illness — post-viral costochondritis");

  const aggravating = {
    movements: multicheckState(rd, "aggMovements", []),
    postures: multicheckState(rd, "aggPostures", []),
  };
  const rotationAggravates = aggravating.movements.values.includes("Rotation (most thoracic sensitive to)");
  const sideBendingAggravates = aggravating.movements.values.includes("Side bending");
  const extensionAggravates = aggravating.movements.values.includes("Extension");
  const flexionAggravates = aggravating.movements.values.includes("Flexion");
  const ribScreen = multicheckState(rd, "ribScreen", ["Not applicable"]);
  const ribHas = (...needles) => ribScreen.values.some((v) => needles.some((n) => v.startsWith(n)));
  const ribWorseBreathing = ribHas("Worse deep breathing / coughing / laughing", "Point tenderness over specific rib", "Rib spring test positive");
  const coughSneezeLaughAggravates = aggravating.movements.values.some((v) =>
    v === "Coughing" || v === "Sneezing" || v === "Laughing") || ribWorseBreathing;
  const breathingAggravates = aggravating.movements.values.some((v) => v.startsWith("Deep breathing")) || ribWorseBreathing;
  const overheadReachingAggravates = aggravating.movements.values.includes("Reaching overhead");
  const sustainedPostureAggravates = aggravating.postures.values.some((v) =>
    v.startsWith("Prolonged sitting") || v.startsWith("Computer work") ||
    v.startsWith("Driving") || v.startsWith("Backpack"));

  const relieving = { treatments: multicheckState(rd, "relTreatments", []) };
  const manipulationSignificantRelief = relieving.treatments.values.includes("Manipulation — significant relief");
  const breathingExercisesHelp = relieving.treatments.values.includes("Breathing exercises");
  const postureCorrectionHelps = relieving.treatments.values.includes("Postural correction");
  const nsaidEffective = relieving.treatments.values.includes("NSAIDs effective");

  const symptomBehaviour = {
    pattern: multicheckState(rd, "pattern", []),
    irritability: selectState(rd, "irritability"),
  };
  const mechanicalPattern = symptomBehaviour.pattern.values.includes("Mechanical — movement and posture related");
  const constantUnaffectedPattern = symptomBehaviour.pattern.values.includes("Constant — unrelated to movement (red flag)");
  const breathingRelatedPattern = symptomBehaviour.pattern.values.includes("Breathing-related — with respiration");
  const morningStiffness = symptomBehaviour.pattern.values.some((v) =>
    v === "Morning stiffness" || v === "Inflammatory — morning stiffness / eases with movement");
  const inflammatoryPattern = symptomBehaviour.pattern.values.includes("Inflammatory — morning stiffness / eases with movement");

  const rf = multicheckState(rd, "redFlags", ["No red flags"]);
  const rfHas = (...needles) => rf.values.some((v) => needles.some((n) => v.startsWith(n)));
  const redFlags = {
    screen: rf,
    cardiac: rfHas("Cardiac symptoms with pain", "Cardiac history"),
    respiratory: rfHas("Respiratory symptoms") || ribHas("Pneumothorax risk"),
    visceral: rfHas("Abdominal symptoms"),
    oncologic: rfHas("Cancer history", "Unexplained weight loss"),
    infection: rfHas("Fever + thoracic pain"),
    fracture: rfHas("Recent trauma — fracture risk", "Known osteoporosis") ||
      ribHas("Stress fracture", "Osteoporosis + minimal trauma", "Direct trauma to chest / rib"),
    cordCompression: rfHas("Neurological symptoms in legs", "Bilateral leg weakness"),
    generalSerious: rfHas("Constant pain completely unaffected",
      "Progressive worsening", "Age >50 — first episode without cause", "Systemically unwell"),
  };
  const ribDerivedRedFlag = ribHas("Pneumothorax risk", "Stress fracture",
    "Osteoporosis + minimal trauma", "Direct trauma to chest / rib");
  const redFlagScreen = (rf.state === "present" || ribDerivedRedFlag) ? "positive" :
    rf.state === "absent" ? "negative" : "incomplete";

  const functional = {
    adlRestrictions: multicheckState(rd, "fnAdl", ["No limitations"]),
    psfs: str(rd, "fnPsfs") || null,
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
  };
}

// True once the clinician has actually started the Thoracic checklist --
// used to decide whether to show the differential section at all.
export function hasThoracicChecklistData(regionData) {
  return !!regionData && Object.values(regionData).some((v) => String(v || "").trim());
}

export function runThoracicDifferential(regionData, subjective) {
  const tv = extractThoracicVariables(regionData, subjective);
  return runThoracicReasoningEngine(tv);
}

export { evaluateRedFlagOverride };

/* ══════════════════════════════════════════════════════════════════════════
   thoracicTestNav() -- ported from SubjectiveObjective.jsx (the old flow).
   Same id-sharing story as the lumbar/cervical adapters for ROM and Special
   Tests. MMT is the one exception here: the old flow's thoracic MMT
   highlights (mmt_trap_l/mmt_trap_m/mmt_serrant/mmt_rhomb) live under the
   "Shoulder & Scapula" muscle group, but THIS tool's suggestIndividualItems()
   resolves a "thoracic" region's MMT category to "Spine & Core" instead
   (matchRegionKey's lumbar/thoracic/sacrum -> "spine" synonym) -- a
   pre-existing region-key mismatch in this codebase, not something this
   file invents a workaround for. Rather than filtering the MMT list down to
   ids that can never appear in "Spine & Core" (which would just silently
   hide the whole section), "Thoracic MMT" is left unmapped here -- an
   honest gap, same policy as every other genuinely-unimplemented string.

   thoracicConditionItemIds() reduces one matched condition's objectiveTests
   into concrete rom_/st_ prefixed ids, same shape as the lumbar/cervical
   versions (mmt stays an always-empty Set for this region, for the reason
   above).
   ══════════════════════════════════════════════════════════════════════════ */
const THORACIC_ROM_HIGHLIGHTS = ["rom_throtl", "rom_throtr", "rom_thflex", "rom_thext"];

function thoracicTestNav(testStr) {
  const s = String(testStr || "");
  if (/slump test/i.test(s))
    return { nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_slump_test" } };
  if (/cervical rotation lateral flexion|\bcrlf\b/i.test(s))
    return { nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_cervical_rotation_lt" } };
  if (/rib spring|rib springing/i.test(s))
    return { nav: "special", ctx: { specialRegion: "thoracic", highlightTest: "st_rib_spring" } };
  if (/passive scapular approximation/i.test(s))
    return { nav: "special", ctx: { specialRegion: "thoracic", highlightTest: "st_passive_scapular_approx" } };
  if (/forestier|bowstring/i.test(s))
    return { nav: "special", ctx: { specialRegion: "thoracic", highlightTest: "st_forestier_bowstring" } };
  // The old flow's thoracicTestNav() left these five (all thoracic-outlet
  // T04 tests) unmapped, with a comment claiming the app has no dedicated
  // modules for them -- but SPECIAL_TESTS_DATA (sharedClinicalData.js) DOES
  // have all five, filed under "cervical" alongside CRLF above (same file
  // cervicalTestNav() already points to for these exact tests). That
  // comment was stale, not a real gap -- mapped here rather than repeated.
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
  if (/thoracic arom/i.test(s))
    return { nav: "rom", ctx: { romRegion: "Thoracic", romHighlights: THORACIC_ROM_HIGHLIGHTS } };
  if (/observation|posture screen/i.test(s))
    return { nav: "observation", ctx: {} };
  return null;
}

/**
 * Reduces one Phase 0.5 condition's objectiveTests.{required,recommended}
 * strings down to the concrete rom_/st_ prefixed ids they cover, plus
 * whether Observation is one of them.
 * @param {object} condition - one entry from runThoracicDifferential(...).conditions
 */
export function thoracicConditionItemIds(condition) {
  const strings = [...(condition?.objectiveTests?.required || []), ...(condition?.objectiveTests?.recommended || [])];
  const rom = new Set();
  const mmt = new Set(); // see thoracicTestNav()'s comment -- intentionally never populated
  const special = new Set();
  let showObservation = false;
  strings.forEach((s) => {
    const target = thoracicTestNav(s);
    if (!target) return;
    if (target.nav === "rom") (target.ctx.romHighlights || []).forEach((id) => rom.add(id));
    else if (target.nav === "special" && target.ctx.highlightTest) special.add(target.ctx.highlightTest);
    else if (target.nav === "observation") showObservation = true;
  });
  return { rom, mmt, special, showObservation };
}
