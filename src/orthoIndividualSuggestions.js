/* ============================================================
   orthoIndividualSuggestions.js — resolves the case's selected
   region(s) onto the SAME per-region libraries RomSection/
   MmtSection/SpecialTestsSection/GeneralObservationSection read
   (ROM_DATA/MMT_DATA/SPECIAL_TESTS_DATA/allPostureFieldsForRegion),
   producing one suggestion per NAMED item (e.g. "Lachman's Test",
   "Quadriceps", "Knee flexion", "Scapula") instead of one lump
   suggestion per whole category. Every itemId/regionKey emitted
   here is the exact key those sections write to, so an inline
   answer on the Suggested Objective screen and a later visit to
   the full section page are the same field, not a duplicate.
   ============================================================ */
import { ROM_DATA, MMT_DATA, SPECIAL_TESTS_DATA, matchRegionKey } from "./orthoClinicalData.js";
import { allPostureFieldsForRegion } from "./orthoObservationData.js";
import { NKT_REGIONS, NKT_REGION_KEYS, KC_REGIONS, KC_REGION_KEYS, FMA_DATA, FMA_REGION_KEYS, CYRIAX_REGIONS_DATA, CYRIAX_REGION_KEYS } from "./orthoAdvancedLibrary.js";

export function suggestIndividualItems(selectedRegions = []) {
  const rom = [], mmt = [], specialTests = [], observation = [];
  const seenRom = new Set(), seenMmt = new Set(), seenSpecial = new Set(), seenObs = new Set();

  selectedRegions.forEach((region) => {
    const romKey = matchRegionKey(region.id, Object.keys(ROM_DATA));
    if (romKey && !seenRom.has(romKey)) {
      seenRom.add(romKey);
      (ROM_DATA[romKey] || []).forEach((m) => rom.push({ regionKey: romKey, itemId: m.id, label: m.mv, meta: m }));
    }
    const mmtKey = matchRegionKey(region.id, Object.keys(MMT_DATA));
    if (mmtKey && !seenMmt.has(mmtKey)) {
      seenMmt.add(mmtKey);
      (MMT_DATA[mmtKey] || []).forEach((m) => mmt.push({ regionKey: mmtKey, itemId: m.id, label: m.muscle, meta: m }));
    }
    const stKey = matchRegionKey(region.id, Object.keys(SPECIAL_TESTS_DATA));
    if (stKey && !seenSpecial.has(stKey)) {
      seenSpecial.add(stKey);
      (SPECIAL_TESTS_DATA[stKey]?.tests || []).forEach((t) => specialTests.push({ regionKey: stKey, itemId: t.id, label: t.label, meta: t }));
    }
    if (!seenObs.has(region.id)) {
      seenObs.add(region.id);
      allPostureFieldsForRegion(region).forEach((f) => observation.push({ regionKey: region.id, itemId: f.id, label: f.label, meta: f, regionLabel: region }));
    }
  });

  return { rom, mmt, specialTests, observation };
}

// Same region-matching CPA/CpaSection (orthoAdvancedTools.jsx) reads --
// resolves each selected region onto NKT_REGIONS so an inline answer here
// and a later visit to the full CPA page are the exact same
// data.cpa[regionKey][testId] field, not a duplicate.
export function suggestCpaItems(selectedRegions = []) {
  const cpa = [];
  const seen = new Set();
  selectedRegions.forEach((region) => {
    const key = matchRegionKey(region.id, NKT_REGION_KEYS);
    if (key && !seen.has(key)) {
      seen.add(key);
      (NKT_REGIONS[key]?.tests || []).forEach((t) => cpa.push({ regionKey: key, itemId: t.id, label: t.label, meta: t }));
    }
  });
  return cpa;
}
// Same field set as orthoAdvancedTools.jsx's cpaRichItem() -- how to test,
// common compensators, AND treatment (was missing treatment before).
export function cpaWhy(t) {
  return t.compensator ? [`Common compensator if inhibited: ${t.compensator}`] : ["Screens for a facilitated/inhibited motor-control pattern."];
}
export function cpaHow(t) {
  const lines = [];
  if (t.how) lines.push(t.how);
  if (t.treatment) lines.push(`Treatment: ${t.treatment}`);
  return lines;
}

// Same region-matching KineticChainSection reads -- resolves each selected
// region onto KC_REGIONS so an inline answer here and a later visit to the
// full page are the exact same data.kineticChain[regionKey][testId] field.
export function suggestKineticChainItems(selectedRegions = []) {
  const kc = [];
  const seen = new Set();
  selectedRegions.forEach((region) => {
    const key = matchRegionKey(region.id, KC_REGION_KEYS);
    if (key && !seen.has(key)) {
      seen.add(key);
      (KC_REGIONS[key]?.tests || []).forEach((t) => kc.push({ regionKey: key, itemId: t.id, label: t.label, meta: t }));
    }
  });
  return kc;
}
// Same field set as orthoAdvancedTools.jsx's kcRichItem() -- how to
// perform, kinetic chain effect, treatment.
export function kcWhy(t) {
  return t.chainEffect ? [`Kinetic chain effect: ${t.chainEffect}`] : ["Screens this segment of the kinetic chain for a mobility/stability deficit that can drive compensation elsewhere."];
}
export function kcHow(t) {
  const lines = [];
  if (t.how) lines.push(t.how);
  if (t.treatment) lines.push(`Treatment: ${t.treatment}`);
  return lines;
}

// Same region-matching FmaSection reads -- resolves each selected region
// onto FMA_DATA so an inline answer here and a later visit to the full
// page are the exact same data.fma[regionKey][testId + "_grade"] field.
export function suggestFmaItems(selectedRegions = []) {
  const fma = [];
  const seen = new Set();
  selectedRegions.forEach((region) => {
    const key = matchRegionKey(region.id, FMA_REGION_KEYS);
    if (key && !seen.has(key)) {
      seen.add(key);
      (FMA_DATA[key] || []).forEach((t) => fma.push({ regionKey: key, itemId: t.id, label: t.label, meta: t }));
    }
  });
  return fma;
}
// Same field set as orthoAdvancedTools.jsx's fmaRichItem() -- setup and
// procedure, normal pattern.
export function fmaWhy(t) {
  return t.normalDesc ? [`Normal pattern: ${t.normalDesc}`] : ["Screens a fundamental movement pattern for a compensation strategy, not a pass/fail score."];
}
export function fmaHow(t) {
  return t.setup ? [t.setup] : [];
}

// Same region-matching SttSection reads (sectionKey "sttt") -- scoped to
// resistedTests, the actual selective-tension differentiator (isolates the
// contractile unit from inert structures); active/passive ROM and joint
// play stay on the full STTT page as before. Resolves onto
// CYRIAX_REGIONS_DATA so an inline answer here and a later visit to the
// full page are the exact same data.sttt[regionKey][testId + "_result"].
export function suggestSttItems(selectedRegions = []) {
  const stt = [];
  const seen = new Set();
  selectedRegions.forEach((region) => {
    const key = matchRegionKey(region.id, CYRIAX_REGION_KEYS);
    if (key && !seen.has(key)) {
      seen.add(key);
      (CYRIAX_REGIONS_DATA[key]?.resistedTests || []).forEach((t) => stt.push({ regionKey: key, itemId: t.id, label: t.label, meta: t }));
    }
  });
  return stt;
}
export function sttWhy(t) {
  return t.muscle ? [`Isolates the contractile unit: ${t.muscle}`] : ["Resisted (isometric) testing isolates the contractile unit — muscle/tendon — from inert structures."];
}
export function sttHow(t) {
  return t.how ? [t.how] : [];
}

// Same default-side logic SpecialTestsSection uses (not exported there).
export function defaultSideFor(regionKey, selectedRegions) {
  const match = (selectedRegions || []).find((r) => r.id === regionKey);
  const s = (match?.side || "").toLowerCase();
  return s === "left" ? "left" : s === "bilateral" ? "bilateral" : "right";
}

// Same field set/order as orthoRegionAssessments.jsx's romInfoText() /
// romRichItem() (the old flow's single merged (i) sheet for a movement) --
// Why carries the clinical-significance fields, How carries everything a
// therapist needs to actually perform and read the test, so between the
// two nothing that old sheet showed is missing here.
export function romWhy(m) {
  const parts = [];
  if (m.pathology) parts.push(`Pathology correlation: ${m.pathology}`);
  if (m.redflag) parts.push(`⚠ Red flag: ${m.redflag}`);
  if (!parts.length) parts.push(`Establishes available ${m.mv?.toLowerCase() || "movement"} and whether it reproduces the patient's symptoms.`);
  return parts;
}
export function romHow(m) {
  const lines = [];
  if (m.start) lines.push(`Start: ${m.start}`);
  if (m.gonio) lines.push(`Goniometer: ${m.gonio}`);
  if (m.muscles) lines.push(`Prime movers: ${m.muscles}`);
  if (m.endfeel?.normal) lines.push(`Normal end-feel: ${m.endfeel.normal}`);
  if (m.endfeel?.abnormal) lines.push(`Abnormal end-feel: ${m.endfeel.abnormal}`);
  if (m.compensation) lines.push(`Watch for compensation: ${m.compensation}`);
  if (m.capsular) lines.push(`Capsular pattern: ${m.capsular}`);
  if (m.pediatric) lines.push(`Pediatric: ${m.pediatric}`);
  if (m.geriatric) lines.push(`Geriatric: ${m.geriatric}`);
  return lines;
}

// Same field set/order as orthoRegionAssessments.jsx's mmtInfoText() /
// mmtRichItem().
export function mmtWhy(m) {
  const parts = [];
  if (m.functional) parts.push(m.functional);
  if (m.chain) parts.push(m.chain);
  if (!parts.length) parts.push(`Grades the strength of ${m.muscle} to identify a deficit contributing to the presentation.`);
  return parts;
}
export function mmtHow(m) {
  const lines = [];
  if (m.action) lines.push(`Action: ${m.action}`);
  if (m.patient) lines.push(`Patient position: ${m.patient}`);
  if (m.therapist) lines.push(`Therapist / hand placement: ${m.therapist}`);
  if (m.resistance) lines.push(`Resistance: ${m.resistance}`);
  if (m.gravElim) lines.push(`Gravity-eliminated position: ${m.gravElim}`);
  if (m.palpation) lines.push(`Palpation: ${m.palpation}`);
  if (m.nerve || m.root) lines.push(`Nerve / Root: ${m.nerve || "—"} / ${m.root || "—"}`);
  if (m.origin || m.insertion) lines.push(`Origin → Insertion: ${m.origin || "—"} → ${m.insertion || "—"}`);
  if (m.compensation) lines.push(`Compensation: ${m.compensation}`);
  if (m.substitution) lines.push(`Substitution: ${m.substitution}`);
  return lines;
}

// Same field set/order as orthoRegionAssessments.jsx's specialRichItem() --
// how-to-perform + sensitivity/specificity reference + positive/negative
// interpretation, the same three tabs the old (i) sheet showed.
export function specialWhy(t) {
  const parts = [];
  if (t.structure) parts.push(`Stresses: ${t.structure}`);
  if (t.sensitivity || t.specificity) parts.push(`Sensitivity ${t.sensitivity || "—"}, specificity ${t.specificity || "—"}`);
  return parts.join(" — ") || "Helps narrow the differential for this region.";
}
export function specialHow(t) {
  const lines = [];
  if (t.how) lines.push(t.how);
  if (t.negative) lines.push(`Negative: ${t.negative}`);
  if (t.positive) lines.push(`Positive: ${t.positive}`);
  return lines;
}

export function obsWhy(f) {
  return `Comparing "${f.label}" to normal alignment helps identify a postural contribution to the patient's presentation.`;
}
export function obsHow() {
  return ["Observe with the patient standing relaxed, undressed enough to see the landmark clearly.", "Compare bilaterally and against normal alignment.", "Select the option that best matches what you see."];
}
