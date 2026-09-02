// orthoLumbarReasoning.js — adapter between the new Ortho Outpatient tool's
// Lumbar/SI Subjective checklist (SUBJECTIVE_REGION_FIELDS.lumbarSI in
// orthoSubjectiveRegionData.js) and the real Lumbar Phase 0.5 differential
// engine (lumbarReasoningEngine.js), reused here unchanged.
//
// The old flow stored each multicheck as a "|||"-joined string; this tool's
// SelectField stores multi-select as a ", "-joined string instead (see
// SelectPopover in orthoFieldKit.jsx). Same shape, different separator --
// so this is a straight port of lumbarVariableExtractor.js's Pass 1 reading
// logic against the new tool's field ids/data shape, not a redesign of the
// engine or its variable contract.
import { runLumbarReasoningEngine, evaluateRedFlagOverride } from "./lumbarReasoningEngine.js";

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
function boolFromMulticheck(regionData, key, negativeOptions, positiveMatch) {
  const s = multicheckState(regionData, key, negativeOptions);
  if (s.state === "unknown") return "unknown";
  if (s.state === "absent") return false;
  return positiveMatch ? s.values.some((v) => positiveMatch(v)) : true;
}

/**
 * Reads the Lumbar/SI region checklist (plus the shared Subjective chief
 * complaint/onset/medical-history text) and produces the same canonical
 * variable set extractLumbarVariablesStructured() builds for the old flow,
 * so runLumbarReasoningEngine() can run completely unmodified.
 * @param {object} regionData - data.subjective.regions.lumbarSI
 * @param {object} subjective - data.subjective (for chiefComplaint/onset/medicalHistory)
 */
export function extractLumbarVariables(regionData, subjective = {}) {
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
    dermatomal: multicheckState(rd, "dermatomal", ["Not dermatomal"]),
    belowKnee: selectState(rd, "belowKnee"),
  };
  const belowKneeVal = location.belowKnee.value || "";
  const belowKneePain =
    location.belowKnee.state === "unknown" ? "unknown" :
    belowKneeVal.includes("bilateral") ? "bilateral" :
    belowKneeVal.includes("below knee") || belowKneeVal.includes("extends to foot") ? true :
    belowKneeVal.includes("back pain only") || belowKneeVal.includes("above knee") ? false :
    "unknown";

  const mechanism = {
    type: multicheckState(rd, "mechanismType", ["No clear mechanism — insidious onset", "No identified mechanism"]),
    loadEstimate: selectState(rd, "mechanismLoad"),
    spinePosition: multicheckState(rd, "mechanismPosition", ["Not applicable"]),
    firstSymptomTiming: selectState(rd, "mechanismFirstSymptom"),
    repetitiveExtensionAthleteHistory: (() => {
      const screen = multicheckState(rd, "spondyloScreen", ["Not applicable"]);
      if (screen.state === "unknown") return "unknown";
      if (screen.values.some((v) =>
        v.toLowerCase().includes("repeated extension loading") ||
        v.toLowerCase().includes("young athlete"))) return true;
      if (screen.state === "absent") return false;
      return "unknown";
    })(),
  };
  const spondyloScreen = multicheckState(rd, "spondyloScreen", ["Not applicable"]);
  const acuteLiftingMechanism = boolFromMulticheck(rd, "mechanismType",
    ["No clear mechanism — insidious onset", "No identified mechanism"],
    (v) => v.toLowerCase().includes("lifting"));
  const flexionRotationMechanism = mechanism.spinePosition.values.includes("Flexed + rotated (highest disc risk)");

  const aggravating = {
    postures: multicheckState(rd, "aggPostures", []),
    movements: multicheckState(rd, "aggMovements", []),
    activities: multicheckState(rd, "aggActivities", []),
    other: multicheckState(rd, "aggOther", []),
    worstSingle: null,
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

  const relieving = {
    postures: multicheckState(rd, "relPostures", []),
    movements: multicheckState(rd, "relMovements", []),
    manual: multicheckState(rd, "relManual", []),
    medications: multicheckState(rd, "relMedications", []),
    directionalPreference: selectState(rd, "directionalPreference"),
    bestSingle: null,
  };
  const dirPref = relieving.directionalPreference.value || "";
  const extensionRelieves = relieving.movements.values.includes("Extension — McKenzie press-up / cobra") ||
    dirPref.startsWith("Extension preference");
  const flexionRelieves = relieving.movements.values.includes("Flexion — knee to chest") ||
    dirPref.startsWith("Flexion preference");
  const walkingRelieves = relieving.movements.values.includes("Walking");
  const peripheralizes = dirPref.startsWith("Peripheralises");
  const nsaidVeryEffective = relieving.medications.values.includes("NSAIDs — very effective (inflammatory indicator)");

  const symptomBehaviour = {
    overallPattern: multicheckState(rd, "overallPattern", []),
    morning: selectState(rd, "morning"),
    night: multicheckState(rd, "night", ["No night symptoms"]),
    pattern24hr: selectState(rd, "pattern24hr"),
    trajectory: selectState(rd, "trajectory"),
    irritability: selectState(rd, "irritability"),
  };
  const constantUnremitting = symptomBehaviour.overallPattern.values.includes("Constant — never goes away");
  const morningVal = symptomBehaviour.morning.value || "";
  const morningStiffnessOver60 = morningVal.includes(">1 hour");
  const constantNightPain = symptomBehaviour.night.values.includes("Constant night pain — cannot sleep");

  const neurological = {
    legNeuroPresent: selectState(rd, "neuroPresent"),
    quality: multicheckState(rd, "neuroQuality", ["Not applicable"]),
    signs: multicheckState(rd, "neuroSigns", ["No neurological signs"]),
    claudication: selectState(rd, "claudication"),
    bladderBaseline: selectState(rd, "bladderBaseline"),
  };
  const legNeuroVal = neurological.legNeuroPresent.value || "";
  const hasLegNeuro = neurological.legNeuroPresent.state === "unknown" ? "unknown" :
    legNeuroVal.startsWith("No leg") ? false : true;
  const footDrop = neurological.signs.values.some((v) => v.startsWith("Foot drop"));
  const reflexChanges = neurological.signs.values.some((v) => v.includes("reflex"));
  const claudicationVal = neurological.claudication.value || "";
  const neurogenicClaudication = claudicationVal.includes("neurogenic claudication — stenosis") ||
    claudicationVal.includes("Can walk further uphill");

  const redFlags = {
    cauda: multicheckState(rd, "redFlagsCauda", ["No cauda equina signs"]),
    fracture: multicheckState(rd, "redFlagsFracture", ["No fracture indicators"]),
    inflammatory: multicheckState(rd, "redFlagsInflammatory", ["No inflammatory features"]),
    serious: multicheckState(rd, "redFlagsSerious", ["No other red flags"]),
  };
  const anyState = (...fields) => {
    if (fields.some((f) => f.state === "present")) return "positive";
    if (fields.every((f) => f.state === "absent")) return "negative";
    return "incomplete";
  };
  const redFlagScreen = anyState(redFlags.cauda, redFlags.fracture, redFlags.inflammatory, redFlags.serious);

  const yellowFlags = {
    beliefs: multicheckState(rd, "yellowBeliefs", ["No unhelpful beliefs"]),
    fearAvoidance: selectState(rd, "yellowFear"),
    emotional: multicheckState(rd, "yellowEmotion", ["No emotional / psychological concerns"]),
    work: multicheckState(rd, "yellowWork", ["No work-related yellow flags"]),
    social: multicheckState(rd, "yellowSocial", ["Adequate social support"]),
    startBack: selectState(rd, "yellowStartBack"),
  };
  const concerningCategories = [yellowFlags.beliefs, yellowFlags.emotional, yellowFlags.work, yellowFlags.social]
    .filter((f) => f.state === "present").length;
  const highPsychosocialLoad = concerningCategories >= 2;

  const functional = {
    sittingTolerance: selectState(rd, "sittingTolerance"),
    standingTolerance: selectState(rd, "standingTolerance"),
    walkingTolerance: selectState(rd, "walkingTolerance"),
    adlRestrictions: multicheckState(rd, "adlRestrictions", ["No ADL restrictions"]),
    workImpact: selectState(rd, "workImpact"),
  };

  const history = {
    priorEpisodeCount: str(rd, "priorEpisodes") || null,
    priorEpisodeOutcome: str(rd, "priorEpisodeOutcome") || null,
    medicalHistory: (subjective.medicalHistory || "").trim() || null,
    patientGoals: (subjective.patientGoals || "").trim() || null,
    patientConcern: null,
    patientBelief: null,
  };

  return {
    demographics: { age: null, sex: null, occupation: null },
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
  };
}

// True once the clinician has actually started the Lumbar checklist --
// used to decide whether to show the differential section at all (an
// empty checklist would just report every condition "Insufficient data").
export function hasLumbarChecklistData(regionData) {
  return !!regionData && Object.values(regionData).some((v) => String(v || "").trim());
}

export function runLumbarDifferential(regionData, subjective) {
  const lv = extractLumbarVariables(regionData, subjective);
  return runLumbarReasoningEngine(lv);
}

export { evaluateRedFlagOverride };

/* ══════════════════════════════════════════════════════════════════════════
   lumbarTestNav() -- ported verbatim from SubjectiveObjective.jsx (the old
   flow), which uses it to turn each condition's free-text
   objectiveTests.{required,recommended} strings (e.g. "Lumbar AROM all
   planes", "SLR (expect negative)") into a real module target. That old
   flow's romHighlights/mmtHighlights/highlightTest ids are the SAME
   rom_/mmt_/st_ prefixed ids ROM_DATA, MMT_DATA and SPECIAL_TESTS_DATA use
   here (both pull from the one real sharedClinicalData.js), so this ports
   straight across with no id remapping needed.

   lumbarConditionItemIds() (new, not in the old flow) uses it to turn one
   matched condition into the *set* of item ids that condition's objective
   tests actually cover -- the "Suggested Objective" screen filters its
   Observation/ROM/MMT/Special Tests lists down to this set when a
   condition is selected, instead of always showing the region's entire
   test library regardless of which condition is suspected.
   ══════════════════════════════════════════════════════════════════════════ */
const LUMBAR_ROM_HIGHLIGHTS = ["rom_lflex", "rom_lext", "rom_llfl", "rom_llfr", "rom_lrotl", "rom_lrotr"];
// "mmt_diaphragm" (present in the old flow's own constant) has no matching
// entry in MMT_DATA["Spine & Core"] -- sharedClinicalData.js has no
// diaphragm item under Spine & Core at all -- so it's dropped here rather
// than silently carried forward as a dead id.
const LUMBAR_CORE_MMT_HIGHLIGHTS = ["mmt_multif", "mmt_ta", "mmt_ql", "mmt_oblique"];

// Returns EVERY {nav,ctx} this ONE testStr matches, not just the first.
// 2026-09-02, Aditi: "why all the ROM/MMT/special test is not in this SI
// joint dysfunction" -- L05's required test entry is a single string
// naming a whole cluster of tests at once ("SIJ provocation CLUSTER (not
// a single test): Compression, Distraction, Sacral Thrust, Gaenslen's,
// FABERE/Patrick, Gillet's"), unlike every other condition's one-test-
// per-array-entry strings. The old single-match, early-return version
// below matched only the first rule that hit (in practice just "faber",
// since "FABERE" contains it) and silently dropped every other named test
// in that same string -- so Special Tests for SIJ dysfunction ended up
// showing just FABER + Active SLR instead of the whole cluster.
function lumbarTestMatches(testStr) {
  const s = String(testStr || "");
  const matches = [];

  // The SLR family is mutually exclusive, most-specific-first -- "Active
  // SLR" contains the bare substring "SLR" too, so if this ran as an
  // independent rule below alongside the others it would ALSO match the
  // generic \bslr\b rule and add the unrelated passive/neural SLR test
  // right alongside the active one. Resolved as its own priority chain
  // before the independently-collectible rules run.
  if (/active slr|active straight leg|\baslr\b/i.test(s))
    matches.push({ nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_active_slr" } });
  else if (/crossed slr|\bslr\b/i.test(s))
    matches.push({ nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_slr_test" } });

  const rules = [
    [/slump test/i, { nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_slump_test" } }],
    [/femoral nerve tension test/i, { nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_femoral_nerve_stretch" } }],
    [/quadrant test|kemp'?s test/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_kemp" } }],
    [/stork/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_stork" } }],
    [/faber/i, { nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_faber_test" } }],
    // SIJ provocation cluster (L05) -- these live under Special Tests'
    // "lumbar" region in sharedClinicalData.js (SPECIAL_TESTS_DATA.lumbar)
    // alongside the other lumbar tests, not a separate SIJ region.
    [/gaenslen/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_gaenslen" } }],
    [/\bcompression\b/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_si_compression" } }],
    [/\bdistraction\b/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_si_distraction" } }],
    // No separately-named "Sacral Thrust" test exists in the library --
    // Thigh Thrust provokes the same posterior-SIJ shear and is the
    // closest real match, not a guess at an unrelated test. Gillet's
    // (motion palpation, not provocation) has no equivalent at all here
    // and is intentionally left unmapped rather than mismapped.
    [/sacral thrust|thigh thrust/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_thigh_thrust" } }],
    [/core\/?lumbopelvic motor control|core assessment/i, { nav: "mmt", ctx: { mmtRegion: "Spine & Core", mmtHighlights: LUMBAR_CORE_MMT_HIGHLIGHTS } }],
    [/lumbar arom|repeated movement/i, { nav: "rom", ctx: { romRegion: "Lumbar", romHighlights: LUMBAR_ROM_HIGHLIGHTS } }],
    [/passive lumbar extension/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_passive_lumbar_ext" } }],
    [/pheasant test/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_pheasant" } }],
    [/farfan torsion/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_farfan_torsion" } }],
    [/h and i stability|h & i/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_h_and_i" } }],
    [/bicycle test|van gelderen/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_bicycle_van_gelderen" } }],
    [/stoop test/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_stoop" } }],
    [/lateral shift/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_lateral_shift" } }],
    [/prone instability/i, { nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_prone_instab" } }],
    [/observation|posture screen/i, { nav: "observation", ctx: {} }],
  ];
  rules.forEach(([re, target]) => { if (re.test(s)) matches.push(target); });
  return matches;
}

/**
 * Reduces one Phase 0.5 condition's objectiveTests.{required,recommended}
 * strings down to the concrete rom_/mmt_/st_ prefixed ids they cover, plus
 * whether Observation is one of them.
 * @param {object} condition - one entry from runLumbarDifferential(...).conditions
 */
export function lumbarConditionItemIds(condition) {
  const strings = [...(condition?.objectiveTests?.required || []), ...(condition?.objectiveTests?.recommended || [])];
  const rom = new Set();
  const mmt = new Set();
  const special = new Set();
  let showObservation = false;
  strings.forEach((s) => {
    lumbarTestMatches(s).forEach((target) => {
      if (target.nav === "rom") (target.ctx.romHighlights || []).forEach((id) => rom.add(id));
      else if (target.nav === "mmt") (target.ctx.mmtHighlights || []).forEach((id) => mmt.add(id));
      else if (target.nav === "special" && target.ctx.highlightTest) special.add(target.ctx.highlightTest);
      else if (target.nav === "observation") showObservation = true;
    });
  });
  return { rom, mmt, special, showObservation };
}
