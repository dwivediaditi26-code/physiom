// orthoElbowWristHandReasoning.js — adapter between the new Ortho wizard's
// data shapes and the Elbow + Wrist + Hand reasoning engines in
// reasoningEngine/normalize.ts. Runs all three engines (same as
// genericPhase05.js's FAMILY_ENGINE for "Elbow/Wrist/Hand") and merges.
import { runReasoningFromData } from "./reasoningEngine/index";
import elbowEvidence from "./reasoningEngine/regions/elbow.evidence.json";
import wristEvidence from "./reasoningEngine/regions/wrist.evidence.json";
import handEvidence from "./reasoningEngine/regions/hand.evidence.json";

const ELBOW_ROM_IDS = ["rom_eflex", "rom_eext", "rom_esup", "rom_epro"];
const WRIST_ROM_IDS = ["rom_wflex", "rom_wext", "rom_wrad", "rom_wuln"];
const ELBOW_MMT_IDS = ["mmt_tricep", "mmt_bicep", "mmt_supinator", "mmt_pt"];
const WRIST_MMT_IDS = ["mmt_ecrb", "mmt_fcr", "mmt_fcu"];
const ELBOW_SPECIAL_IDS = [
  "st_cozens", "st_mills", "st_golfers",
  "st_valgus_stress_elbow", "st_tinel_elbow",
];
const WRIST_SPECIAL_IDS = [
  "st_phalen", "st_tinel_wrist", "st_finkelstein",
  "st_watson", "st_grind",
];
const ALL_SPECIAL_IDS = [...ELBOW_SPECIAL_IDS, ...WRIST_SPECIAL_IDS];

const FIXED_ID_BY_NAME = {};
elbowEvidence.diagnoses.forEach((m, i) => { FIXED_ID_BY_NAME[m.name] = `EL${String(i + 1).padStart(2, "0")}`; });
wristEvidence.diagnoses.forEach((m, i) => { FIXED_ID_BY_NAME[m.name] = `WR${String(i + 1).padStart(2, "0")}`; });
handEvidence.diagnoses.forEach((m, i) => { FIXED_ID_BY_NAME[m.name] = `HD${String(i + 1).padStart(2, "0")}`; });

const SUPPORTING_TOTAL_BY_NAME = {};
elbowEvidence.diagnoses.forEach((m) => { SUPPORTING_TOTAL_BY_NAME[m.name] = m.supportingFindings.length; });
wristEvidence.diagnoses.forEach((m) => { SUPPORTING_TOTAL_BY_NAME[m.name] = m.supportingFindings.length; });
handEvidence.diagnoses.forEach((m) => { SUPPORTING_TOTAL_BY_NAME[m.name] = m.supportingFindings.length; });

function specialTestValue(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") return raw.right || raw.left || raw.bilateral || "";
  return "";
}

function joinMulti(v) {
  if (!v) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function buildFlatElbowWristHandData(data) {
  const flat = {};
  const subjective = data.subjective || {};
  const regionData = subjective.regions?.elbowWristHand || {};

  flat.cc_main = subjective.chiefComplaint || "";
  flat.cc_onset = subjective.onset || "";
  flat.dem_age = subjective.age || "";

  flat.ew_loc = joinMulti(regionData.location);
  flat.ew_moi = joinMulti(regionData.mechanism);
  flat.ew_radiation = joinMulti(regionData.radiation);
  flat.ew_agg_mov = joinMulti(regionData.aggravating);
  flat.ew_agg_act = joinMulti(regionData.aggravating);
  flat.ew_pattern = regionData.pattern || "";
  flat.ew_neuro = joinMulti(regionData.neuro);
  flat.ew_rf = joinMulti(regionData.redFlags);
  flat.ew_ucl = "";
  flat.ew_olecranon = "";
  flat.ew_biceps_rupture = "";

  // Elbow ROM
  const elbowRomData = (data.rom && data.rom["Elbow"]) || {};
  ELBOW_ROM_IDS.forEach((id) => {
    const v = elbowRomData[id] || {};
    if (v.left) flat[`${id}_L_arom`] = v.left;
    if (v.right) flat[`${id}_R_arom`] = v.right;
  });

  // Wrist ROM
  const wristRomData = (data.rom && data.rom["Wrist"]) || {};
  WRIST_ROM_IDS.forEach((id) => {
    const v = wristRomData[id] || {};
    if (v.left) flat[`${id}_L_arom`] = v.left;
    if (v.right) flat[`${id}_R_arom`] = v.right;
  });

  // Elbow MMT
  const elbowMmtData = (data.mmt && data.mmt["Elbow & Forearm"]) || {};
  ELBOW_MMT_IDS.forEach((id) => {
    const v = elbowMmtData[id] || {};
    if (v.left) flat[`mmt_${id}_L`] = v.left;
    if (v.right) flat[`mmt_${id}_R`] = v.right;
  });

  // Wrist MMT
  const wristMmtData = (data.mmt && data.mmt["Wrist & Hand"]) || {};
  WRIST_MMT_IDS.forEach((id) => {
    const v = wristMmtData[id] || {};
    if (v.left) flat[`mmt_${id}_L`] = v.left;
    if (v.right) flat[`mmt_${id}_R`] = v.right;
  });

  // Special tests
  const elbowSpecialData = (data.specialTests && data.specialTests["elbow_wrist"]) || {};
  ALL_SPECIAL_IDS.forEach((id) => {
    const val = specialTestValue(elbowSpecialData[id]);
    if (val) flat[id] = val;
  });

  return flat;
}

export function hasElbowWristHandChecklistData(data) {
  const flat = buildFlatElbowWristHandData(data);
  return Object.values(flat).some((v) => String(v || "").trim());
}

function tierOf(d) {
  if (d.excluded) return "Unlikely";
  if (!d.supportingFindings || d.supportingFindings.length === 0) return "Insufficient data";
  if (d.band === "Low") return "Weak match";
  if (d.band === "Moderate") return "Possible match";
  return "Strong match";
}

export function runElbowWristHandDifferential(data) {
  const flat = buildFlatElbowWristHandData(data);
  const elbowResult = runReasoningFromData(flat, "elbow");
  const wristResult = runReasoningFromData(flat, "wrist");
  const handResult = runReasoningFromData(flat, "hand");

  const stopped = elbowResult.stopped || wristResult.stopped || handResult.stopped;
  const redFlag = elbowResult.redFlag || wristResult.redFlag || handResult.redFlag || null;
  const allDifferentials = [
    ...(elbowResult.differentials || []),
    ...(wristResult.differentials || []),
    ...(handResult.differentials || []),
  ];

  const conditions = allDifferentials
    .filter((d) => !d.excluded)
    .map((d, i) => ({
      id: FIXED_ID_BY_NAME[d.name] || `EW${String(i + 1).padStart(2, "0")}`,
      name: d.name,
      matchTier: tierOf(d),
      band: d.band,
      supportingMatched: d.supportingFindings || [],
      supportingTotal: SUPPORTING_TOTAL_BY_NAME[d.name] || 0,
      refutingMatched: d.conflictingFindings || [],
      unknownCount: (d.missingFindings || []).length,
      note: d.whySuggested,
      objectiveTests: { required: d.recommendedAdditional || [], recommended: [] },
      assessmentModules: d.assessmentModules || [],
      score: d.diagnosticMatchScore || 0,
      evidenceConfidence: d.evidenceConfidence,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return { stopped, redFlag, conditions };
}

function elbowWristHandTestMatches(testStr) {
  const s = String(testStr || "");
  const matches = [];
  const rules = [
    [/cozen/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_cozens" } }],
    [/mill/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_mills" } }],
    [/golfer/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_golfers" } }],
    [/valgus stress.*(elbow)/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_valgus_stress_elbow" } }],
    [/tinel.*(elbow|cubital)/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_tinel_elbow" } }],
    [/phalen/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_phalen" } }],
    [/tinel.*(wrist|carpal)/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_tinel_wrist" } }],
    [/finkelstein/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_finkelstein" } }],
    [/watson|scaphoid shift/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_watson" } }],
    [/grind.*(thumb|cmc)/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_grind" } }],
    [/grind test$/i, { nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_grind" } }],
    [/elbow (arom|rom|flexion|extension|supination|pronation)/i, { nav: "rom", ctx: { romRegion: "Elbow", romHighlights: ELBOW_ROM_IDS } }],
    [/elbow rom|end.?feel/i, { nav: "rom", ctx: { romRegion: "Elbow", romHighlights: ELBOW_ROM_IDS } }],
    [/wrist (arom|rom|flexion|extension|deviation)/i, { nav: "rom", ctx: { romRegion: "Wrist", romHighlights: WRIST_ROM_IDS } }],
    [/wrist rom|thumb rom/i, { nav: "rom", ctx: { romRegion: "Wrist", romHighlights: WRIST_ROM_IDS } }],
    [/tricep|bicep|supinator|pronator|resisted (elbow|supination|pronation)/i, { nav: "mmt", ctx: { mmtRegion: "Elbow & Forearm", mmtHighlights: ELBOW_MMT_IDS } }],
    [/wrist extensor|wrist flexor|grip|resisted (wrist|thumb)/i, { nav: "mmt", ctx: { mmtRegion: "Wrist & Hand", mmtHighlights: WRIST_MMT_IDS } }],
    [/observation|posture/i, { nav: "observation", ctx: {} }],
  ];
  rules.forEach(([re, target]) => { if (re.test(s)) matches.push(target); });
  return matches;
}

export function elbowWristHandConditionItemIds(condition) {
  const strings = [...(condition?.objectiveTests?.required || []), ...(condition?.objectiveTests?.recommended || [])];
  const rom = new Set();
  const mmt = new Set();
  const special = new Set();
  let showObservation = false;
  strings.forEach((s) => {
    elbowWristHandTestMatches(s).forEach((target) => {
      if (target.nav === "rom") (target.ctx.romHighlights || []).forEach((id) => rom.add(id));
      else if (target.nav === "mmt") (target.ctx.mmtHighlights || []).forEach((id) => mmt.add(id));
      else if (target.nav === "special" && target.ctx.highlightTest) special.add(target.ctx.highlightTest);
      else if (target.nav === "observation") showObservation = true;
    });
  });
  return { rom, mmt, special, showObservation };
}
