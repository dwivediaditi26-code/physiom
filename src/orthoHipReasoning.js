// orthoHipReasoning.js — adapter between the new Ortho wizard's data shapes
// and the Hip reasoning engine in reasoningEngine/normalize.ts. Follows the
// same pattern as shoulderPhase05.js: flatten nested wizard data into
// the old flow's flat field format, then pass to the existing engine.
import { runReasoningFromData } from "./reasoningEngine/index";
import hipEvidence from "./reasoningEngine/regions/hip.evidence.json";

const ROM_IDS = ["rom_hflex", "rom_hext", "rom_habd", "rom_hadd", "rom_her", "rom_hir"];
const MMT_IDS = ["mmt_gmax", "mmt_gmed", "mmt_tfl", "mmt_adduc", "mmt_hamstr"];
const SPECIAL_IDS = [
  "st_fadir_test", "st_faber_test", "st_hip_scour",
  "st_trendelenburg_test", "st_thomas_test", "st_ober_test",
  "st_piriformis_test", "st_90_90",
];

const FIXED_ID_BY_NAME = {};
hipEvidence.diagnoses.forEach((m, i) => { FIXED_ID_BY_NAME[m.name] = `HP${String(i + 1).padStart(2, "0")}`; });

const SUPPORTING_TOTAL_BY_NAME = {};
hipEvidence.diagnoses.forEach((m) => { SUPPORTING_TOTAL_BY_NAME[m.name] = m.supportingFindings.length; });

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

function buildFlatHipData(data) {
  const flat = {};
  const subjective = data.subjective || {};
  const regionData = subjective.regions?.hip || {};

  flat.cc_main = subjective.chiefComplaint || "";
  flat.cc_onset = subjective.onset || "";
  flat.dem_age = subjective.age || "";

  flat.hp_loc = joinMulti(regionData.location);
  flat.hp_loc_pattern = regionData.locationPattern || "";
  flat.hp_c_sign = "";
  flat.hp_moi = joinMulti(regionData.mechanism);
  flat.hp_agg_mov = joinMulti(regionData.aggravating);
  flat.hp_agg_act = joinMulti(regionData.aggravating);
  flat.hp_pattern = regionData.pattern || "";
  flat.hp_mechanical = joinMulti(regionData.mechanical);
  flat.hp_rf = joinMulti(regionData.redFlags);
  flat.hp_hamstring_onset = "";
  flat.hp_piriformis = "";
  flat.hp_meralgia = "";

  const romData = (data.rom && data.rom["Hip"]) || {};
  ROM_IDS.forEach((id) => {
    const v = romData[id] || {};
    if (v.left) flat[`${id}_L_arom`] = v.left;
    if (v.right) flat[`${id}_R_arom`] = v.right;
  });

  const mmtData = (data.mmt && data.mmt["Hip & Pelvis"]) || {};
  MMT_IDS.forEach((id) => {
    const v = mmtData[id] || {};
    if (v.left) flat[`mmt_${id}_L`] = v.left;
    if (v.right) flat[`mmt_${id}_R`] = v.right;
  });

  const specialData = (data.specialTests && data.specialTests["hip"]) || {};
  SPECIAL_IDS.forEach((id) => {
    const val = specialTestValue(specialData[id]);
    if (val) flat[id] = val;
  });

  return flat;
}

export function hasHipChecklistData(data) {
  const flat = buildFlatHipData(data);
  return Object.values(flat).some((v) => String(v || "").trim());
}

function tierOf(d) {
  if (d.excluded) return "Unlikely";
  if (!d.supportingFindings || d.supportingFindings.length === 0) return "Insufficient data";
  if (d.band === "Low") return "Weak match";
  if (d.band === "Moderate") return "Possible match";
  return "Strong match";
}

export function runHipDifferential(data) {
  const flat = buildFlatHipData(data);
  const result = runReasoningFromData(flat, "hip");

  const conditions = (result.differentials || [])
    .filter((d) => !d.excluded)
    .map((d, i) => ({
      id: FIXED_ID_BY_NAME[d.name] || `HP${String(i + 1).padStart(2, "0")}`,
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

  return {
    stopped: !!result.stopped,
    redFlag: result.redFlag || null,
    conditions,
  };
}

function hipTestMatches(testStr) {
  const s = String(testStr || "");
  const matches = [];
  const rules = [
    [/fadir/i, { nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_fadir_test" } }],
    [/faber|patrick/i, { nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_faber_test" } }],
    [/scour/i, { nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_hip_scour" } }],
    [/trendelenburg/i, { nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_trendelenburg_test" } }],
    [/thomas/i, { nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_thomas_test" } }],
    [/ober/i, { nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_ober_test" } }],
    [/piriformis|fair/i, { nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_piriformis_test" } }],
    [/hamstring|90.?90/i, { nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_90_90" } }],
    [/hip (arom|rom|flexion|extension|abduction|adduction|rotation)/i, { nav: "rom", ctx: { romRegion: "Hip", romHighlights: ROM_IDS } }],
    [/passive hip rom|capsular pattern|end.?feel/i, { nav: "rom", ctx: { romRegion: "Hip", romHighlights: ROM_IDS } }],
    [/glut|hip strength|hip muscle|abduction.*mmt|mmt.*abduction/i, { nav: "mmt", ctx: { mmtRegion: "Hip & Pelvis", mmtHighlights: MMT_IDS } }],
    [/resisted hip (extension|adduction|flexion)/i, { nav: "mmt", ctx: { mmtRegion: "Hip & Pelvis", mmtHighlights: MMT_IDS } }],
    [/observation|gait|posture/i, { nav: "observation", ctx: {} }],
  ];
  rules.forEach(([re, target]) => { if (re.test(s)) matches.push(target); });
  return matches;
}

export function hipConditionItemIds(condition) {
  const strings = [...(condition?.objectiveTests?.required || []), ...(condition?.objectiveTests?.recommended || [])];
  const rom = new Set();
  const mmt = new Set();
  const special = new Set();
  let showObservation = false;
  strings.forEach((s) => {
    hipTestMatches(s).forEach((target) => {
      if (target.nav === "rom") (target.ctx.romHighlights || []).forEach((id) => rom.add(id));
      else if (target.nav === "mmt") (target.ctx.mmtHighlights || []).forEach((id) => mmt.add(id));
      else if (target.nav === "special" && target.ctx.highlightTest) special.add(target.ctx.highlightTest);
      else if (target.nav === "observation") showObservation = true;
    });
  });
  return { rom, mmt, special, showObservation };
}
