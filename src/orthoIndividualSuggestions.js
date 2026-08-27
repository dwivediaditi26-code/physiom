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

// Same default-side logic SpecialTestsSection uses (not exported there).
export function defaultSideFor(regionKey, selectedRegions) {
  const match = (selectedRegions || []).find((r) => r.id === regionKey);
  const s = (match?.side || "").toLowerCase();
  return s === "left" ? "left" : s === "bilateral" ? "bilateral" : "right";
}

export function romWhy(m) {
  return m.pathology || m.redflag || `Establishes available ${m.mv?.toLowerCase() || "movement"} and whether it reproduces the patient's symptoms.`;
}
export function romHow(m) {
  const lines = [];
  if (m.start) lines.push(`Start: ${m.start}`);
  if (m.gonio) lines.push(`Goniometer: ${m.gonio}`);
  if (m.endfeel?.normal) lines.push(`Normal end-feel: ${m.endfeel.normal}`);
  return lines;
}

export function mmtWhy(m) {
  return m.functional || m.chain || `Grades the strength of ${m.muscle} to identify a deficit contributing to the presentation.`;
}
export function mmtHow(m) {
  const lines = [];
  if (m.patient) lines.push(`Patient position: ${m.patient}`);
  if (m.therapist) lines.push(`Therapist/hand placement: ${m.therapist}`);
  if (m.resistance) lines.push(`Resistance: ${m.resistance}`);
  return lines;
}

export function specialWhy(t) {
  const parts = [];
  if (t.structure) parts.push(`Stresses: ${t.structure}`);
  if (t.sensitivity) parts.push(`Sensitivity ${t.sensitivity}, specificity ${t.specificity}`);
  return parts.join(" — ") || "Helps narrow the differential for this region.";
}
export function specialHow(t) {
  const lines = [];
  if (t.how) lines.push(t.how);
  if (t.positive) lines.push(`Positive: ${t.positive}`);
  if (t.negative) lines.push(`Negative: ${t.negative}`);
  return lines;
}

export function obsWhy(f) {
  return `Comparing "${f.label}" to normal alignment helps identify a postural contribution to the patient's presentation.`;
}
export function obsHow() {
  return ["Observe with the patient standing relaxed, undressed enough to see the landmark clearly.", "Compare bilaterally and against normal alignment.", "Select the option that best matches what you see."];
}
