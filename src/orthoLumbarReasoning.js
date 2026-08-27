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
