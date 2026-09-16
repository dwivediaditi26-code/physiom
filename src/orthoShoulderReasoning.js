// orthoShoulderReasoning.js — adapter between the new Ortho Outpatient
// tool's data shapes (data.rom/data.mmt/data.specialTests/data.subjective)
// and shoulderPhase05.js's runShoulderPhase05(), which itself reads the OLD
// flow's flat field-id record (rom_<id>_L_arom, mmt_<id>_L, st_<id>, ...).
//
// Genuinely different in kind from orthoLumbarReasoning.js/
// orthoCervicalReasoning.js/orthoThoracicReasoning.js: those three run off a
// rich SUBJECTIVE checklist alone, so Possible Matches appears before any
// objective testing starts. Shoulder has no equivalent subjective checklist
// in either flow (verified in reasoningEngine/normalize.ts's own comment --
// no sh_night/sh_behaviour/sh_agg_* fields exist anywhere) -- its
// differential is driven almost entirely by actual ROM/MMT/Special Test
// RESULTS, plus weak signal from free-text chief complaint. So this adapter
// is deliberately LIVE: call it on every render with the full `data` object,
// and Possible Matches sharpens as the therapist fills in items on the same
// screen, rather than being computed once up front.
//
// Fix (2026-09-15, Aditi: shoulder ignored the Subjective checklist while
// Knee/Hip/Ankle/Elbow all read theirs): the comment this replaced was
// written before this wizard's own Shoulder region checklist existed
// (orthoSubjectiveRegionData.js's SUBJECTIVE_REGION_FIELDS.shoulder --
// location/radiation/mechanism/aggravating/relieving/pattern/stiffness/
// irritability/redFlags/function, rendered by RegionSubjectiveTabs on the
// Subjective step). normalizeFromData()'s shoulder reader below is built
// around free-text keyword matching against cc_main/cc_onset plus two old-
// flow-style fields (shl_radiation/shr_radiation, shl_rf/shr_rf) -- rather
// than rewire that tuned matching logic, this adapter now feeds it real
// data the same way: the checklist's own selected option text (which
// already contains the exact keywords normalizeFromData() searches for --
// "overhead", "stiff", "trauma", "night", "cancer history", "down to
// hand", etc.) gets appended into cc_main, and radiation/red-flag answers
// are passed through to shl_radiation/shl_rf directly. Painful-arc (needs
// a literal "60" substring) and a few red-flag sub-signals (septic joint,
// vascular compromise, dislocation) still can't fire from subjective data
// here, since this checklist's option wording doesn't carry those exact
// signals -- real ROM/MMT/Special Test results cover those instead.
import { runShoulderPhase05, shoulderTestNav } from "./shoulderPhase05.js";

function joinMulti(v) {
  if (!v) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

const ROM_IDS = ["rom_sflex", "rom_sabd", "rom_ser", "rom_sir"];
const MMT_IDS = ["mmt_supra", "mmt_infra", "mmt_subscap"];
const SPECIAL_IDS = [
  "st_hawkins", "st_neer", "st_empty_can", "st_er_lag", "st_lift_off",
  "st_obrien", "st_speeds", "st_apprehension", "st_relocation",
  "st_cross_arm", "st_acromioclavicular",
];

function specialTestValue(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") return raw.right || raw.left || raw.bilateral || "";
  return "";
}

/**
 * Flattens this tool's data.rom["Shoulder"]/data.mmt["Shoulder & Scapula"]/
 * data.specialTests["shoulder"]/data.subjective into the flat
 * rom_<id>_L_arom / mmt_<id>_L / st_<id> / cc_main record
 * reasoningEngine/normalize.ts's normalizeFromData() reads.
 * @param {object} data - the full case data object
 */
function buildFlatShoulderData(data) {
  const flat = {};
  const subjective = data.subjective || {};
  const regionData = subjective.regions?.shoulder || {};

  // normalizeFromData() reads cc_main as free text for nightPain/
  // constantPain/easesWithRest/paresthesia/onsetTraumatic/onsetInsidious/
  // overheadAggravation/progressiveStiffness -- appending the checklist's
  // own selected option text (not just the patient's chief-complaint
  // sentence) lets those same keyword checks fire from structured answers
  // too, e.g. "Progressive stiffness in all directions (frozen shoulder
  // pattern)" contains both "progressive" and "stiff".
  const checklistText = [
    joinMulti(regionData.mechanism),
    joinMulti(regionData.aggravating),
    joinMulti(regionData.relieving),
    regionData.pattern || "",
    joinMulti(regionData.stiffness),
  ].filter(Boolean).join(", ");
  flat.cc_main = [subjective.chiefComplaint, checklistText].filter(Boolean).join(". ");
  flat.cc_onset = subjective.onset || "";
  // shl_radiation/shr_radiation and shl_rf/shr_rf are read verbatim as
  // free text by normalizeFromData() (see shRadiation/shRf there) -- both
  // sides get the same joined string since this checklist doesn't ask
  // radiation/red-flags per side.
  flat.shl_radiation = joinMulti(regionData.radiation);
  flat.shr_radiation = flat.shl_radiation;
  flat.shl_rf = joinMulti(regionData.redFlags);
  flat.shr_rf = flat.shl_rf;

  const romData = (data.rom && data.rom["Shoulder"]) || {};
  ROM_IDS.forEach((id) => {
    const v = romData[id] || {};
    if (v.left) flat[`${id}_L_arom`] = v.left;
    if (v.right) flat[`${id}_R_arom`] = v.right;
  });

  const mmtData = (data.mmt && data.mmt["Shoulder & Scapula"]) || {};
  MMT_IDS.forEach((id) => {
    const v = mmtData[id] || {};
    if (v.left) flat[`mmt_${id}_L`] = v.left;
    if (v.right) flat[`mmt_${id}_R`] = v.right;
  });

  const specialData = (data.specialTests && data.specialTests["shoulder"]) || {};
  SPECIAL_IDS.forEach((id) => {
    const val = specialTestValue(specialData[id]);
    if (val) flat[id] = val;
  });

  return flat;
}

// True once there's something for the engine to actually differentiate on --
// a chief complaint, or any Shoulder ROM/MMT/Special Test already answered.
export function hasShoulderChecklistData(data) {
  const flat = buildFlatShoulderData(data);
  return Object.values(flat).some((v) => String(v || "").trim());
}

// Live -- call on every render with the full `data` object (not persisted/
// memoized against a narrower dependency), so Possible Matches sharpens as
// ROM/MMT/Special Test items get answered on the same screen.
export function runShoulderDifferential(data) {
  return runShoulderPhase05(buildFlatShoulderData(data));
}

/**
 * Reduces one Phase 0.5 condition's objectiveTests.{required,recommended}
 * labels (exact strings from shoulderPhase05.js's own catalog) down to the
 * concrete rom_/mmt_/st_ prefixed ids they cover, plus whether Observation
 * is one of them -- same shape as the other three adapters'
 * xConditionItemIds(), but using shoulderTestNav()'s exact label lookup
 * instead of a regex match against free-text test names.
 * @param {object} condition - one entry from runShoulderDifferential(...).conditions
 */
export function shoulderConditionItemIds(condition) {
  const strings = [...(condition?.objectiveTests?.required || []), ...(condition?.objectiveTests?.recommended || [])];
  const rom = new Set();
  const mmt = new Set();
  const special = new Set();
  let showObservation = false;
  strings.forEach((s) => {
    const target = shoulderTestNav(s);
    if (!target) return;
    if (target.nav === "rom") (target.ctx.romHighlights || []).forEach((id) => rom.add(id));
    else if (target.nav === "mmt") (target.ctx.mmtHighlights || []).forEach((id) => mmt.add(id));
    else if (target.nav === "special" && target.ctx.highlightTest) special.add(target.ctx.highlightTest);
    else if (target.nav === "observation") showObservation = true;
  });
  return { rom, mmt, special, showObservation };
}
