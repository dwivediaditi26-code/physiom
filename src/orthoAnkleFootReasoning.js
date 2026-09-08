// orthoAnkleFootReasoning.js — adapter between the new Ortho wizard's data
// shapes and the Ankle + Foot reasoning engines in reasoningEngine/normalize.ts.
// Runs BOTH ankle and foot engines (same as genericPhase05.js's FAMILY_ENGINE
// for "Ankle / Foot") and merges results.
import { runReasoningFromData } from "./reasoningEngine/index";
import ankleEvidence from "./reasoningEngine/regions/ankle.evidence.json";
import footEvidence from "./reasoningEngine/regions/foot.evidence.json";

const ROM_IDS = ["rom_adf", "rom_apf", "rom_ainv", "rom_aev"];
const MMT_IDS = ["mmt_ta", "mmt_soleus", "mmt_tp", "mmt_peronls"];
const SPECIAL_IDS = [
  "st_ant_drawer_ankle", "st_talar_tilt", "st_squeeze_ankle",
  "st_thompson_test", "st_navicular_drop", "st_tinel_ankle",
  "st_royal_london", "st_windlass_test",
];

const FIXED_ID_BY_NAME = {};
ankleEvidence.diagnoses.forEach((m, i) => { FIXED_ID_BY_NAME[m.name] = `AK${String(i + 1).padStart(2, "0")}`; });
footEvidence.diagnoses.forEach((m, i) => { FIXED_ID_BY_NAME[m.name] = `FT${String(i + 1).padStart(2, "0")}`; });

const SUPPORTING_TOTAL_BY_NAME = {};
ankleEvidence.diagnoses.forEach((m) => { SUPPORTING_TOTAL_BY_NAME[m.name] = m.supportingFindings.length; });
footEvidence.diagnoses.forEach((m) => { SUPPORTING_TOTAL_BY_NAME[m.name] = m.supportingFindings.length; });

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

function buildFlatAnkleFootData(data) {
  const flat = {};
  const subjective = data.subjective || {};
  const regionData = subjective.regions?.ankleFoot || {};

  flat.cc_main = subjective.chiefComplaint || "";
  flat.cc_onset = subjective.onset || "";
  flat.dem_age = subjective.age || "";

  flat.af_loc = joinMulti(regionData.location);
  flat.af_moi = joinMulti(regionData.mechanism);
  flat.af_radiation = joinMulti(regionData.radiation);
  flat.af_agg_mov = joinMulti(regionData.aggravating);
  flat.af_agg_act = joinMulti(regionData.aggravating);
  flat.af_pattern = regionData.pattern || "";
  flat.af_morning = "";
  flat.af_swelling = regionData.swelling || "";
  flat.af_instability = "";
  flat.af_rf = joinMulti(regionData.redFlags);
  flat.af_moi_pop = "";
  flat.af_moi_weightbear = "";
  flat.af_prev_sprains = "";
  flat.af_calf_onset = "";
  flat.af_shin_pain = "";
  flat.af_lisfranc = "";
  flat.af_peroneal = "";

  const romData = (data.rom && data.rom["Ankle"]) || {};
  ROM_IDS.forEach((id) => {
    const v = romData[id] || {};
    if (v.left) flat[`${id}_L_arom`] = v.left;
    if (v.right) flat[`${id}_R_arom`] = v.right;
  });

  const mmtData = (data.mmt && data.mmt["Ankle & Foot"]) || {};
  MMT_IDS.forEach((id) => {
    const v = mmtData[id] || {};
    if (v.left) flat[`mmt_${id}_L`] = v.left;
    if (v.right) flat[`mmt_${id}_R`] = v.right;
  });

  const specialData = (data.specialTests && data.specialTests["ankle_foot"]) || {};
  SPECIAL_IDS.forEach((id) => {
    const val = specialTestValue(specialData[id]);
    if (val) flat[id] = val;
  });

  return flat;
}

export function hasAnkleFootChecklistData(data) {
  const flat = buildFlatAnkleFootData(data);
  return Object.values(flat).some((v) => String(v || "").trim());
}

function tierOf(d) {
  if (d.excluded) return "Unlikely";
  if (!d.supportingFindings || d.supportingFindings.length === 0) return "Insufficient data";
  if (d.band === "Low") return "Weak match";
  if (d.band === "Moderate") return "Possible match";
  return "Strong match";
}

export function runAnkleFootDifferential(data) {
  const flat = buildFlatAnkleFootData(data);
  const ankleResult = runReasoningFromData(flat, "ankle");
  const footResult = runReasoningFromData(flat, "foot");

  const stopped = ankleResult.stopped || footResult.stopped;
  const redFlag = ankleResult.redFlag || footResult.redFlag || null;
  const allDifferentials = [
    ...(ankleResult.differentials || []),
    ...(footResult.differentials || []),
  ];

  const conditions = allDifferentials
    .filter((d) => !d.excluded)
    .map((d, i) => ({
      id: FIXED_ID_BY_NAME[d.name] || `AF${String(i + 1).padStart(2, "0")}`,
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

function ankleFootTestMatches(testStr) {
  const s = String(testStr || "");
  const matches = [];
  const rules = [
    [/anterior drawer.*(ankle|foot)/i, { nav: "special", ctx: { specialRegion: "ankle_foot", highlightTest: "st_ant_drawer_ankle" } }],
    [/anterior drawer test$/i, { nav: "special", ctx: { specialRegion: "ankle_foot", highlightTest: "st_ant_drawer_ankle" } }],
    [/talar tilt/i, { nav: "special", ctx: { specialRegion: "ankle_foot", highlightTest: "st_talar_tilt" } }],
    [/squeeze/i, { nav: "special", ctx: { specialRegion: "ankle_foot", highlightTest: "st_squeeze_ankle" } }],
    [/thompson|simmond/i, { nav: "special", ctx: { specialRegion: "ankle_foot", highlightTest: "st_thompson_test" } }],
    [/navicular drop/i, { nav: "special", ctx: { specialRegion: "ankle_foot", highlightTest: "st_navicular_drop" } }],
    [/tinel.*(ankle|tarsal)/i, { nav: "special", ctx: { specialRegion: "ankle_foot", highlightTest: "st_tinel_ankle" } }],
    [/royal london/i, { nav: "special", ctx: { specialRegion: "ankle_foot", highlightTest: "st_royal_london" } }],
    [/windlass/i, { nav: "special", ctx: { specialRegion: "ankle_foot", highlightTest: "st_windlass_test" } }],
    [/ankle (arom|rom|dorsiflexion|plantarflexion|inversion|eversion)/i, { nav: "rom", ctx: { romRegion: "Ankle", romHighlights: ROM_IDS } }],
    [/passive rom|end.?feel|dorsiflexion lunge/i, { nav: "rom", ctx: { romRegion: "Ankle", romHighlights: ROM_IDS } }],
    [/calf|tibialis|peroneal|ankle strength|resisted (eversion|inversion)/i, { nav: "mmt", ctx: { mmtRegion: "Ankle & Foot", mmtHighlights: MMT_IDS } }],
    [/heel raise|single.?leg.*raise/i, { nav: "mmt", ctx: { mmtRegion: "Ankle & Foot", mmtHighlights: MMT_IDS } }],
    [/observation|gait|posture/i, { nav: "observation", ctx: {} }],
  ];
  rules.forEach(([re, target]) => { if (re.test(s)) matches.push(target); });
  return matches;
}

export function ankleFootConditionItemIds(condition) {
  const strings = [...(condition?.objectiveTests?.required || []), ...(condition?.objectiveTests?.recommended || [])];
  const rom = new Set();
  const mmt = new Set();
  const special = new Set();
  let showObservation = false;
  strings.forEach((s) => {
    ankleFootTestMatches(s).forEach((target) => {
      if (target.nav === "rom") (target.ctx.romHighlights || []).forEach((id) => rom.add(id));
      else if (target.nav === "mmt") (target.ctx.mmtHighlights || []).forEach((id) => mmt.add(id));
      else if (target.nav === "special" && target.ctx.highlightTest) special.add(target.ctx.highlightTest);
      else if (target.nav === "observation") showObservation = true;
    });
  });
  return { rom, mmt, special, showObservation };
}
