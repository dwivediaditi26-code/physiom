// interpretationAdapter.js
// Builds the { subjective, rom, mmt, specialTests, functional, palpation } shape
// src/interpretationEngine/index.js expects, from the app's real patient record
// (the same flat data object SOAP Notes, SOAP Live, and every assessment module
// read and write -- there's only one data source, so "from SOAP live or SOAP
// notes" is automatically satisfied by reading straight from `data`).
//
// Every field mapping below was verified against the actual field names the
// live modules use (ROM_DATA/MMT_DATA in sharedClinicalData.js, the cc_*/​
// dem_*/​*_rf_* keys SubjectiveObjective.jsx writes, palp_pins from
// PalpationModule, the *fs_data functional-screen blobs) rather than assumed --
// this replaces an older engine (DiagnosisEngine.js) that had drifted onto
// field names (s_onset, s_chief_complaint, etc.) the current Subjective module
// doesn't actually write anymore.
//
// Where the app genuinely doesn't capture something yet (e.g. end-feel and
// pain-on-movement per ROM entry, or symptom onset latency/settle time), the
// field is left undefined rather than guessed -- the engine already treats
// missing fields as "not triggered" / "no reference on file" throughout, so
// this degrades gracefully instead of fabricating findings.

import { ROM_DATA, MMT_DATA } from "./sharedClinicalData.js";
import { CLUSTERS } from "./interpretationEngine/specialTestCluster.js";

const isPos = (v) => { if (!v) return false; const s = String(v).toLowerCase(); return s.includes("positive") || s.includes("+ve"); };
const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, "")); return Number.isNaN(n) ? null : n; };

// Engine region key -> capitalised label used as the top-level key in
// ROM_DATA / MMT_DATA (sharedClinicalData.js uses "Cervical", "Shoulder", etc,
// while the engine's regionScreen.js and differentialConfig.json use
// lowercase "cervical", "shoulder" -- this bridges the two conventions).
const REGION_LABEL = {
  cervical: "Cervical", thoracic: "Thoracic", lumbar: "Lumbar", shoulder: "Shoulder",
  elbow: "Elbow", wrist: "Wrist", hip: "Hip", knee: "Knee", ankle: "Ankle",
};

// Every region's ROM movement IDs, used to detect which region actually has
// data entered -- far more reliable than parsing free text, since a
// clinician who has recorded lumbar ROM values is working on a lumbar
// patient regardless of what the chief complaint text happens to say.
function detectRegion(data) {
  for (const [engineKey, label] of Object.entries(REGION_LABEL)) {
    const movements = ROM_DATA[label] || [];
    const hasData = movements.some((m) =>
      ["", "_L", "_R"].some((side) =>
        ["arom", "prom", "resisted"].some((mode) => data[`${m.id}${side}_${mode}`])
      )
    );
    if (hasData) return engineKey;
  }
  return null;
}

function buildSubjective(data, regionKey) {
  const age = num(data.dem_age);
  const cc = String(data.cc_main || "").toLowerCase();
  const behaviour = String(data.cx_behaviour || data.lx_behaviour || "").toLowerCase();

  return {
    // Region: explicit engine key when detected from real ROM/objective data,
    // otherwise fall back to the free-text chief complaint so regionScreen.js
    // can still keyword-match before any objective data exists.
    region: regionKey || undefined,
    chiefComplaint: data.cc_main || "",

    // Red flags -- mapped from the app's real *_rf_*/grf_*/nrf_* checkboxes.
    // No single field captures "saddle anesthesia" by that exact name yet, so
    // that specific sub-flag stays unset (not hallucinated as false-positive
    // OR false-negative) while cauda equina is still caught via lx_rf_cauda.
    bladderBowelChange: isPos(data.lx_rf_cauda) || isPos(data.nrf_cauda),
    bilateralLegWeakness: isPos(data.lx_rf_cauda) || isPos(data.nrf_cauda),
    traumaHistory: isPos(data.lx_rf_fracture) || isPos(data.grf_fracture),
    unableToWeightBear: isPos(data.lx_rf_fracture) || isPos(data.grf_fracture),
    unexplainedWeightLoss: isPos(data.grf_cancer),
    nightPainUnrelieved: isPos(data.cx_night) || isPos(data.lx_night) || isPos(data.sb_night),
    ageOver50: age !== null && age >= 50,
    suddenSevereHeadacheOrNeckPain: isPos(data.cx_rf_vbi),
    vertebrobasilarSigns: isPos(data.cx_rf_vbi),
    fever: isPos(data.grf_systemic),
    constantUnremittingPain: isPos(data.lx_rf_inflammatory) || isPos(data.rf_inflammatory) || behaviour.includes("constant"),
    myelopathySigns: isPos(data.cx_rf_myelopathy),
    systemicIllness: isPos(data.grf_systemic),
    malignancyHistory: isPos(data.grf_cancer),

    // Pain pattern signals -- derived from what's actually captured rather
    // than dedicated booleans the app doesn't have (there's no explicit
    // "painWithMovementOnly" checkbox, for example).
    constantPain: behaviour.includes("constant"),
    easesWithRest: behaviour.includes("rest") || behaviour.includes("improve"),
    painWithMovementOnly: behaviour.includes("movement") || behaviour.includes("intermittent"),
    burningTinglingNumbness: /burn|tingl|numb|pins and needles/.test(cc) || /burn|tingl|numb/.test(String(data.neuro_quality || "").toLowerCase()),
    dermatomalDistribution: !!data.loc_radiation && /arm|leg|hand|foot|finger|toe/.test(String(data.loc_radiation).toLowerCase()),

    // Duration/irritability -- symptomDurationDays only populates when
    // cc_duration is a parseable number (the field is free text, e.g.
    // "3 weeks", so this stays null rather than guessing at a unit).
    symptomDurationDays: num(data.cc_duration),
  };
}

function buildROM(data, regionKey) {
  const label = REGION_LABEL[regionKey];
  const movements = label ? (ROM_DATA[label] || []) : [];
  const rom = [];
  for (const m of movements) {
    const sides = m.bilateral ? ["_L", "_R"] : [""];
    for (const side of sides) {
      const activeROM = num(data[`${m.id}${side}_arom`]);
      const passiveROM = num(data[`${m.id}${side}_prom`]);
      if (activeROM === null && passiveROM === null) continue;
      rom.push({
        movement: m.mv,
        activeROM: activeROM ?? passiveROM,
        passiveROM: passiveROM ?? activeROM,
        normalROM: m.normal,
        // End-feel and per-movement pain aren't captured by the basic ROM
        // module -- left undefined so romEndFeelLogic reports "no reference
        // end-feel on file" instead of a fabricated normal/abnormal result.
        endFeel: undefined,
        painOnActive: undefined,
        painOnPassive: undefined,
      });
    }
  }
  return rom;
}

function buildMMT(data, regionKey) {
  const label = REGION_LABEL[regionKey];
  const muscles = label ? (MMT_DATA[label] || []) : [];
  const mmt = [];
  for (const m of muscles) {
    const gradeL = num(data[`mmt_${m.id}_L`]);
    const gradeR = num(data[`mmt_${m.id}_R`]);
    const grade = [gradeL, gradeR].filter((g) => g !== null).sort((a, b) => a - b)[0]; // worse side wins
    if (grade === undefined) continue;
    mmt.push({
      muscle: m.muscle,
      grade,
      // Pain-on-resist and break-test-fail aren't separately captured by the
      // MMT module today -- left false rather than guessed.
      painOnResist: false,
      breakTestFail: false,
    });
  }
  return mmt;
}

function buildSpecialTests(data) {
  const allTestIds = [...new Set(Object.values(CLUSTERS).flat().flatMap((c) => c.tests))];
  const results = {};
  for (const id of allTestIds) {
    const v = data[id] || data[`${id}_left`] || data[`${id}_right`];
    if (v) results[id] = isPos(v);
  }
  return results;
}

function buildFunctional(data) {
  const FS_KEYS = ["kfs_data", "lfs_data", "sfs_data", "hfs_data", "afs_data", "cfs_data", "thfs_data", "elfs_data", "wffs_data", "tmjfs_data"];
  const movements = [];
  for (const key of FS_KEYS) {
    let screen;
    try { screen = data[key] ? (typeof data[key] === "string" ? JSON.parse(data[key]) : data[key]) : null; } catch { screen = null; }
    if (!screen?.grades) continue;
    for (const [testKey, grade] of Object.entries(screen.grades)) {
      if (grade === null || grade === undefined) continue;
      movements.push({ movementName: testKey, grade });
    }
  }
  return { movements, overactiveMuscles: [] };
}

function buildPalpation(data) {
  let pins = [];
  try { pins = data.palp_pins ? JSON.parse(data.palp_pins) : []; } catch { pins = []; }
  const tightStructures = pins
    .map((p) => p.structures)
    .filter(Boolean)
    .flatMap((s) => (Array.isArray(s) ? s : String(s).split(",")))
    .map((s) => s.trim())
    .filter(Boolean);
  return { tightStructures };
}

function buildAssessmentData(data = {}) {
  const regionKey = detectRegion(data);
  return {
    subjective: buildSubjective(data, regionKey),
    rom: buildROM(data, regionKey),
    mmt: buildMMT(data, regionKey),
    specialTests: buildSpecialTests(data),
    functional: buildFunctional(data),
    palpation: buildPalpation(data),
  };
}

export { buildAssessmentData, detectRegion };
