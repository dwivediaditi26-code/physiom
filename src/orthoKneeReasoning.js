// orthoKneeReasoning.js — adapter between the new Ortho wizard's data shapes
// and the Knee reasoning engine in reasoningEngine/normalize.ts.
import { runReasoningFromData } from "./reasoningEngine/index";
import kneeEvidence from "./reasoningEngine/regions/knee.evidence.json";
import { specialTestValue, joinMulti, tierOf } from "./reasoningHelpers.js";

const ROM_IDS = ["rom_kflex", "rom_kext"];
const MMT_IDS = ["mmt_quad"];
const SPECIAL_IDS = [
  "st_lachmans", "st_anterior_drawer", "st_posterior_drawer",
  "st_pivot_shift", "st_valgus_stress_knee", "st_varus_stress_knee",
  "st_mcmurray_test", "st_apley", "st_thessaly",
  "st_clarkes", "st_patellar_grind", "st_effusion",
  "st_noble", "st_ober_test",
];

const FIXED_ID_BY_NAME = {};
kneeEvidence.diagnoses.forEach((m, i) => { FIXED_ID_BY_NAME[m.name] = `KN${String(i + 1).padStart(2, "0")}`; });

const SUPPORTING_TOTAL_BY_NAME = {};
kneeEvidence.diagnoses.forEach((m) => { SUPPORTING_TOTAL_BY_NAME[m.name] = m.supportingFindings.length; });

/* The Knee subjective checklist (orthoSubjectiveRegionData.js, SUBJECTIVE_REGION_FIELDS.knee)
   words its options for the clinician; reasoningEngine/normalize.ts's
   normalizeKneeFromData() searches for its own shorter phrases ("true locking",
   "irreducible", "septic arthritis", "patella —", ...). Before this mapping the
   two never met: "Yes — true mechanical locking" did not contain "true locking",
   and the "Locked knee that won't straighten" / "Hot red severely tender joint"
   red flags never raised the joint-emergency stop. Each rule below appends the
   engine's phrase when the matching checklist option is ticked; the original
   option text is always kept as well. Found by running published case reports
   through the wizard (meniscus tear scored 0 despite true locking). */
const KNEE_ENGINE_PHRASES = {
  location: [
    ["Anterior / diffuse", "anterior knee"],
    ["Around the kneecap", "patella —"],
    ["Below the kneecap (patellar tendon)", "patellar tendon — inferior pole"],
    ["Diffuse", "whole knee"],
  ],
  mechanism: [["Landing from a jump", "jumping"]],
  locking: [["true mechanical locking", "true locking"]],
  redFlags: [
    ["Locked knee that won't straighten", "irreducible locking"],
    ["Hot red severely tender joint", "septic arthritis"],
  ],
};

function withEnginePhrases(value, rules) {
  const text = joinMulti(value);
  if (!text) return "";
  const extra = rules.filter(([option]) => text.includes(option)).map(([, phrase]) => phrase);
  return extra.length ? `${text}, ${extra.join(", ")}` : text;
}

function buildFlatKneeData(data) {
  const flat = {};
  const subjective = data.subjective || {};
  const regionData = subjective.regions?.knee || {};

  flat.cc_main = subjective.chiefComplaint || "";
  flat.cc_onset = subjective.onset || "";
  flat.dem_age = (data.demographics || {}).age || "";

  flat.knl_loc = withEnginePhrases(regionData.location, KNEE_ENGINE_PHRASES.location);
  flat.knr_loc = "";
  flat.knl_moi = withEnginePhrases(regionData.mechanism, KNEE_ENGINE_PHRASES.mechanism);
  flat.knr_moi = "";
  flat.knl_pop = "";
  flat.knr_pop = "";
  // "Immediate marked swelling after injury (possible haemarthrosis)" is a red-flag option in the
  // checklist, but the engine reads haemarthrosis from the swelling field.
  flat.knl_swelling = joinMulti(regionData.redFlags).includes("possible haemarthrosis") ? "haemarthrosis" : "";
  flat.knr_swelling = "";
  flat.knl_swelling_pattern = "";
  flat.knr_swelling_patt = "";
  flat.knl_giving_way = regionData.givingWay || "";
  flat.knr_giving_way = "";
  flat.knl_locking = withEnginePhrases(regionData.locking, KNEE_ENGINE_PHRASES.locking);
  flat.knr_locking = "";
  // Aggravating movements were collected but never passed on.
  const aggravating = joinMulti(regionData.aggravating);
  flat.knl_movie = aggravating.includes("movie sign") ? "yes — prolonged sitting" : "";
  flat.knr_movie = "";
  flat.knl_descent = aggravating.includes("Stairs (down)") ? "worse going down" : "";
  flat.knr_descent = "";
  flat.knl_clicking = "";
  flat.knr_clicking = "";
  flat.knl_pattern = regionData.pattern || "";
  flat.knr_pattern = "";
  flat.knl_pcl = "";
  flat.knr_pcl = "";
  flat.knl_rf = withEnginePhrases(regionData.redFlags, KNEE_ENGINE_PHRASES.redFlags);
  flat.knr_rf = "";
  flat.knl_bursa = joinMulti(regionData.redFlags).includes("Hot red severely tender joint") ? "hot red swollen" : "";
  flat.knr_bursa = "";

  const romData = (data.rom && data.rom["Knee"]) || {};
  ROM_IDS.forEach((id) => {
    const v = romData[id] || {};
    if (v.left) flat[`${id}_L_arom`] = v.left;
    if (v.right) flat[`${id}_R_arom`] = v.right;
  });

  const mmtData = (data.mmt && data.mmt["Knee"]) || {};
  MMT_IDS.forEach((id) => {
    const v = mmtData[id] || {};
    if (v.left) flat[`mmt_${id}_L`] = v.left;
    if (v.right) flat[`mmt_${id}_R`] = v.right;
  });

  const specialData = (data.specialTests && data.specialTests["knee"]) || {};
  SPECIAL_IDS.forEach((id) => {
    const val = specialTestValue(specialData[id]);
    if (val) flat[id] = val;
  });

  return flat;
}

export function hasKneeChecklistData(data) {
  const flat = buildFlatKneeData(data);
  return Object.values(flat).some((v) => String(v || "").trim());
}

export function runKneeDifferential(data) {
  const flat = buildFlatKneeData(data);
  const result = runReasoningFromData(flat, "knee");

  const conditions = (result.differentials || [])
    .filter((d) => !d.excluded)
    .map((d, i) => ({
      id: FIXED_ID_BY_NAME[d.name] || `KN${String(i + 1).padStart(2, "0")}`,
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

function kneeTestMatches(testStr) {
  const s = String(testStr || "");
  const matches = [];
  const rules = [
    [/lachman/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_lachmans" } }],
    [/anterior drawer/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_anterior_drawer" } }],
    [/posterior drawer/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_posterior_drawer" } }],
    [/pivot shift/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_pivot_shift" } }],
    [/valgus stress/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_valgus_stress_knee" } }],
    [/varus stress/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_varus_stress_knee" } }],
    [/mcmurray/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_mcmurray_test" } }],
    [/apley/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_apley" } }],
    [/thessaly/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_thessaly" } }],
    [/clarke/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_clarkes" } }],
    [/patellar grind/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_patellar_grind" } }],
    [/effusion|sweep|ballottement/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_effusion" } }],
    [/noble/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_noble" } }],
    [/ober/i, { nav: "special", ctx: { specialRegion: "knee", highlightTest: "st_ober_test" } }],
    [/knee (arom|rom|flexion|extension)/i, { nav: "rom", ctx: { romRegion: "Knee", romHighlights: ROM_IDS } }],
    [/passive knee rom|end.?feel/i, { nav: "rom", ctx: { romRegion: "Knee", romHighlights: ROM_IDS } }],
    [/quad|knee strength|resisted knee extension/i, { nav: "mmt", ctx: { mmtRegion: "Knee", mmtHighlights: MMT_IDS } }],
    [/observation|gait|posture/i, { nav: "observation", ctx: {} }],
  ];
  rules.forEach(([re, target]) => { if (re.test(s)) matches.push(target); });
  return matches;
}

export function kneeConditionItemIds(condition) {
  const strings = [...(condition?.objectiveTests?.required || []), ...(condition?.objectiveTests?.recommended || [])];
  const rom = new Set();
  const mmt = new Set();
  const special = new Set();
  let showObservation = false;
  strings.forEach((s) => {
    kneeTestMatches(s).forEach((target) => {
      if (target.nav === "rom") (target.ctx.romHighlights || []).forEach((id) => rom.add(id));
      else if (target.nav === "mmt") (target.ctx.mmtHighlights || []).forEach((id) => mmt.add(id));
      else if (target.nav === "special" && target.ctx.highlightTest) special.add(target.ctx.highlightTest);
      else if (target.nav === "observation") showObservation = true;
    });
  });
  return { rom, mmt, special, showObservation };
}
