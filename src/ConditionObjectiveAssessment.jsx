// ConditionObjectiveAssessment.jsx
//
// Standalone, condition-wise Objective Assessment page for the AI Outpatient
// Ortho wizard — a faithful clone of the claude.ai artifact prototypes
// (Cervical/Thoracic/Lumbar/Shoulder/Hip/Knee/Ankle-Foot). NOT a rendering
// of the app's existing ROM/MMT/Special Tests/Cyriax/NKT modules — those
// stay completely untouched; this is new, self-contained UI.
//
// The one thing it reuses from the rest of the app is the front door: which
// condition is ranked top for whichever region was picked in Subjective
// comes from the real Phase 0.5 differential the app already runs. Beyond
// that, every module/chip/field is this page's own state, written into its
// own data.conditionAssessment_<region> section via the same useSectionData
// pattern every other wizard step already uses.
//
// Two data schemas coexist here, by design:
//   - "v2" (Cervical/Thoracic/Lumbar/Shoulder): backed by
//     cervicalConditions.json / thoracicConditions.json / lumbarConditions.json
//     / shoulderConditions.json — a clean, uniform, PDF-verbatim data package
//     (physiom-integration-package.md) another session produced and verified.
//     sttt.resisted/passive, cpa.muscles, kineticChain.fields,
//     functionalScreen.fields are all arrays (arbitrary length/shape), and
//     sttt.findings/interpretation are STATIC authored reference text for
//     that diagnosis, not derived from what's tapped. "Doesn't apply" is
//     always {applicable:false, reason}.
//   - "v1" (Hip/Knee/Ankle-Foot): my own earlier, bespoke data files
//     (hip/knee/ankleFootConditionAssessmentData.js), sourced from the same
//     PDF + the app's real evidence.json files, kept as-is — reshaping 33
//     already-verified conditions into v2's shape for no functional gain
//     wasn't worth the risk of introducing transcription errors.
//
// Shoulder has one real wrinkle: its live reasoning engine (shoulderPhase05.js,
// reading shoulder.evidence.json) generates ids SH01..SH10, but
// shoulderConditions.json uses S01..S10. The condition NAMES match 1:1, so
// the "front door" ranking is bridged by normalized name, not id (see
// `matchByName` below) — shoulderPhase05.js itself is untouched.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND, useSectionData, Stepper, Segmented, InfoButton, InfoCard, CLOUDINARY_BASE, SelectField, NumberField, ScaleField } from "./orthoFieldKit.jsx";
import { RESTRICTION_GRADE, spineRegionData, ROM_DATA, MMT_DATA, SPECIAL_TESTS_DATA } from "./orthoClinicalData.js";
import { romRichItem, specialRichItem, mmtRichItem, GradeSelect } from "./orthoRegionAssessments.jsx";
import { kcRichItem, cpaRichItem, fmaRichItem } from "./orthoAdvancedTools.jsx";
import { KC_REGIONS, NKT_REGIONS, FMA_DATA, CYRIAX_REGIONS_DATA } from "./orthoAdvancedLibrary.js";
import { runCervicalDifferential, hasCervicalChecklistData } from "./orthoCervicalReasoning.js";
import { runThoracicDifferential, hasThoracicChecklistData } from "./orthoThoracicReasoning.js";
import { runLumbarDifferential, hasLumbarChecklistData } from "./orthoLumbarReasoning.js";
import { runShoulderDifferential, hasShoulderChecklistData } from "./orthoShoulderReasoning.js";
import { runHipDifferential, hasHipChecklistData } from "./orthoHipReasoning.js";
import { runKneeDifferential, hasKneeChecklistData } from "./orthoKneeReasoning.js";
import { runAnkleFootDifferential, hasAnkleFootChecklistData } from "./orthoAnkleFootReasoning.js";
import { runElbowWristHandDifferential, hasElbowWristHandChecklistData } from "./orthoElbowWristHandReasoning.js";
import cervicalConditionsRaw from "./cervicalConditions.json";
import thoracicConditionsRaw from "./thoracicConditions.json";
import lumbarConditionsRaw from "./lumbarConditions.json";
import shoulderConditionsRaw from "./shoulderConditions.json";
import hipConditionsRaw from "./hipConditions.json";
import kneeConditionsRaw from "./kneeConditions.json";
import ankleFootConditionsRaw from "./ankleFootConditions.json";
import elbowWristHandConditionsRaw from "./elbowWristHandConditions.json";
import { HIP_ROM_MOVEMENTS } from "./hipConditionAssessmentData.js";
import { KNEE_ROM_MOVEMENTS } from "./kneeConditionAssessmentData.js";
import { ANKLE_FOOT_ROM_MOVEMENTS } from "./ankleFootConditionAssessmentData.js";
import { MEASURES, matchMeasureIdForInstrument } from "./orthoOutcomeMeasureData.js";

const HAIRLINE = "#E5E7EB";

// Drop the hard-override red-flag entry (C11/T11/L11) from the tappable
// condition set — same treatment as before, that condition is handled by
// the live red-flag banner (from the real reasoning engine), not a module
// card. Shoulder has no red-flag entry in its evidence model.
function loadConditions(raw, excludeId) {
  const order = Object.keys(raw).filter((id) => id !== excludeId);
  return { conditions: raw, order };
}
const { conditions: CERVICAL_CONDITIONS, order: CERVICAL_CONDITION_ORDER } = loadConditions(cervicalConditionsRaw, "C11");
const { conditions: THORACIC_CONDITIONS, order: THORACIC_CONDITION_ORDER } = loadConditions(thoracicConditionsRaw, "T11");
const { conditions: LUMBAR_CONDITIONS, order: LUMBAR_CONDITION_ORDER } = loadConditions(lumbarConditionsRaw, "L11");
const { conditions: SHOULDER_CONDITIONS, order: SHOULDER_CONDITION_ORDER } = loadConditions(shoulderConditionsRaw, null);
const { conditions: HIP_CONDITIONS, order: HIP_CONDITION_ORDER } = loadConditions(hipConditionsRaw, null);
const { conditions: KNEE_CONDITIONS, order: KNEE_CONDITION_ORDER } = loadConditions(kneeConditionsRaw, null);
const { conditions: ANKLE_FOOT_CONDITIONS, order: ANKLE_FOOT_CONDITION_ORDER } = loadConditions(ankleFootConditionsRaw, null);
const { conditions: ELBOW_WRIST_HAND_CONDITIONS, order: ELBOW_WRIST_HAND_CONDITION_ORDER } = loadConditions(elbowWristHandConditionsRaw, null);

// Real AROM movements + normal-value degrees, same sourcing as Hip/Knee/
// Ankle-Foot's (PatientDatabase.jsx's own ROM lookup / the app's real ROM
// module) — not invented.
const CERVICAL_ROM_MOVEMENTS = [
  { id: "flex", label: "Flexion", normal: 80 }, { id: "ext", label: "Extension", normal: 70 },
  { id: "latl", label: "Side Flex Left", normal: 45 }, { id: "latr", label: "Side Flex Right", normal: 45 },
  { id: "rotl", label: "Rotation Left", normal: 80 }, { id: "rotr", label: "Rotation Right", normal: 80 },
];
const THORACIC_ROM_MOVEMENTS = [
  { id: "flex", label: "Flexion", normal: 50 }, { id: "ext", label: "Extension", normal: 25 },
  { id: "rotl", label: "Rotation Left", normal: 35 }, { id: "rotr", label: "Rotation Right", normal: 35 },
];
const LUMBAR_ROM_MOVEMENTS = [
  { id: "flex", label: "Flexion", normal: 60 }, { id: "ext", label: "Extension", normal: 25 },
  { id: "latl", label: "Lateral Flexion Left", normal: 25 }, { id: "latr", label: "Lateral Flexion Right", normal: 25 },
  { id: "rotl", label: "Rotation Left", normal: 30 }, { id: "rotr", label: "Rotation Right", normal: 30 },
];
const SHOULDER_ROM_MOVEMENTS = [
  { id: "flex", label: "Flexion", normal: 180 }, { id: "abd", label: "Abduction", normal: 180 },
  { id: "er", label: "External Rotation", normal: 90 }, { id: "ir", label: "Internal Rotation", normal: 70 },
];
const ELBOW_WRIST_HAND_ROM_MOVEMENTS = [
  { id: "eflex", label: "Elbow Flexion", normal: 145 }, { id: "eext", label: "Elbow Extension", normal: 0 },
  { id: "esup", label: "Supination", normal: 90 }, { id: "epro", label: "Pronation", normal: 90 },
  { id: "wflex", label: "Wrist Flexion", normal: 80 }, { id: "wext", label: "Wrist Extension", normal: 70 },
  { id: "wrad", label: "Radial Deviation", normal: 20 }, { id: "wuln", label: "Ulnar Deviation", normal: 30 },
];

// Real Cloudinary reference photos for ROM/Special Tests already exist,
// keyed by id, in the app's own ROM_DATA/SPECIAL_TESTS_DATA (shared with
// the real ROM/MMT/Special Tests screens in orthoRegionAssessments.jsx --
// see romRichItem/specialRichItem there) -- 2026-09-11, Aditi: "put the
// images of ROM and special test... I have already put images in that
// section." This page's own ROM_MOVEMENTS arrays use their own short ids
// (not always identical to ROM_DATA's), so ROM_ID_TO_DATA_ID bridges them.
// Ankle-Foot and Elbow-Wrist-Hand each combine movements from two
// ROM_DATA buckets ("Ankle"+"Foot", "Elbow"+"Wrist"), so those two map to
// an array of buckets to search rather than a single bucket name.
// Regions/movements with no photo on file just fall back to a plain icon
// tile (InfoButton's own fallbackIcon) -- no fabricated images.
const ROM_DATA_BUCKET = { cervical: "Cervical", thoracic: "Thoracic", lumbar: "Lumbar", shoulder: "Shoulder", hip: "Hip", knee: "Knee", ankleFoot: ["Ankle", "Foot"], elbowWristHand: ["Elbow", "Wrist", "Hand & Fingers"] };
const ROM_ID_TO_DATA_ID = {
  cervical: { flex: "rom_cflex", ext: "rom_cext", latl: "rom_clatl", latr: "rom_clatr", rotl: "rom_crotl", rotr: "rom_crotr" },
  thoracic: { flex: "rom_thflex", ext: "rom_thext", rotl: "rom_throtl", rotr: "rom_throtr" },
  lumbar: { flex: "rom_lflex", ext: "rom_lext", latl: "rom_llfl", latr: "rom_llfr", rotl: "rom_lrotl", rotr: "rom_lrotr" },
  shoulder: { flex: "rom_sflex", abd: "rom_sabd", er: "rom_ser", ir: "rom_sir" },
  hip: { hflex: "rom_hflex", hext: "rom_hext", habd: "rom_habd", hadd: "rom_hadd", her: "rom_her", hir: "rom_hir" },
  knee: { kflex: "rom_kflex", kext: "rom_kext" },
  ankleFoot: { adf: "rom_adf", apf: "rom_apf", ainv: "rom_ainv", aev: "rom_aev" },
  elbowWristHand: { eflex: "rom_eflex", eext: "rom_eext", esup: "rom_esup", epro: "rom_epro", wflex: "rom_wflex", wext: "rom_wext", wrad: "rom_wrad", wuln: "rom_wuln" },
};
function romRichItemFor(regionKey, movementId) {
  const buckets = [].concat(ROM_DATA_BUCKET[regionKey] || []);
  const dataId = ROM_ID_TO_DATA_ID[regionKey]?.[movementId];
  if (!buckets.length || !dataId) return null;
  for (const bucket of buckets) {
    const entry = (ROM_DATA[bucket] || []).find((e) => e.id === dataId);
    if (entry) return romRichItem(entry);
  }
  return null;
}

// Manual Muscle Testing -- no per-condition muscle list exists in the
// condition-library JSON (2026-09-24, Aditi: "put mmt also here"), so this
// reuses the app's own real MMT_DATA (sharedClinicalData.js, same source
// the standalone MmtSection uses) keyed per region, same bucket-mapping
// pattern as ROM_DATA_BUCKET/SPECIAL_TEST_DATA_BUCKET above. Ankle/Foot and
// Elbow/Wrist/Hand again combine two of MMT_DATA's own buckets; Thoracic
// and Lumbar share MMT_DATA's single "Spine & Core" bucket since MMT_DATA
// doesn't split the trunk further than that.
const MMT_DATA_BUCKET = {
  cervical: ["Cervical"], thoracic: ["Spine & Core"], lumbar: ["Spine & Core"],
  shoulder: ["Shoulder & Scapula"], hip: ["Hip & Pelvis"], knee: ["Knee"],
  ankleFoot: ["Ankle & Foot"], elbowWristHand: ["Elbow & Forearm", "Wrist & Hand"],
};
function mmtMusclesFor(regionKey) {
  return (MMT_DATA_BUCKET[regionKey] || []).flatMap((bucket) => MMT_DATA[bucket] || []);
}

// Special Tests photo library has a shared bucket per region, including
// "elbow_wrist" and "ankle_foot" (SPECIAL_TESTS_DATA does cover these --
// 2026-09-11, Aditi: "special test of all region is not present" was a
// bug, not missing data). Matched by normalized test name since the
// condition library's own test names are free text, not ids.
// Some regions' condition libraries also cite a handful of tests that are
// real, photographed entries in the library -- just filed under a
// neighbouring region's bucket, because that's genuinely where the same
// test lives clinically (thoracic outlet tests under "cervical", SIJ/ITB
// provocation tests under "hip"). Listed as a fallback bucket, checked
// after the region's own, rather than duplicating those entries
// (2026-09-12, Aditi: several Special Tests showed no photo even though
// the exact same test already had one under a different region tab).
const SPECIAL_TEST_DATA_BUCKET = {
  cervical: ["cervical"],
  thoracic: ["thoracic", "cervical"],
  lumbar: ["lumbar", "hip"],
  shoulder: ["shoulder", "cervical"],
  hip: ["hip"],
  knee: ["knee", "hip"],
  ankleFoot: ["ankle_foot"],
  elbowWristHand: ["elbow_wrist"],
};
// Raw SPECIAL_TESTS_DATA entry (structure/sensitivity/specificity included)
// for a condition-library test name -- specialRichItemFor below still
// builds the tap-to-open info sheet from it, but the Structure/Sens/Spec
// line (2026-09-24, Aditi, comparing to the real Advanced Assessment's
// Special Tests screen: "I like it... I want that in my AI assessment")
// needs the raw fields directly, not just the sheet-shaped richItem.
function specialTestEntryFor(regionKey, testName) {
  const buckets = SPECIAL_TEST_DATA_BUCKET[regionKey];
  if (!buckets) return null;
  const target = normalizeName(testName);
  for (const bucket of buckets) {
    const entry = (SPECIAL_TESTS_DATA[bucket]?.tests || []).find((t) => normalizeName(t.label) === target);
    if (entry) return entry;
  }
  return null;
}
function specialRichItemFor(regionKey, testName) {
  const entry = specialTestEntryFor(regionKey, testName);
  return entry ? specialRichItem(entry) : null;
}

function normalizeName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Kinetic Chain / CPA-NKT / Functional Screen already have full "how to
// perform" reference content (setup, images/SVGs, meaning of Facilitated/
// Inhibited/Overactive) via KC_REGIONS/NKT_REGIONS/FMA_DATA and their
// existing kcRichItem/cpaRichItem/fmaRichItem builders (orthoAdvancedTools.
// jsx) -- previously only wired into that module's own standalone Kinetic
// Chain/CPA/FMA screens, not here, so the AI Objective path showed just a
// bare test name and chips with no way to see how to actually perform the
// test (2026-09-16, Aditi: "it's not the detailed version that I've already
// in the web as a reference... it should have the how to perform area").
// The condition library's own test names ("Knee Valgus Stress Test") don't
// always match those datasets' labels verbatim ("Knee Valgus Stress Test —
// Kinetic Chain"), so match by substring on normalized text rather than
// requiring an exact match, falling back to null (InfoButton's own
// placeholder icon) when nothing lines up closely enough to trust.
function findByNormalizedLabel(tests, name, key) {
  const target = normalizeName(name);
  if (!target) return null;
  let best = null, bestLen = -1;
  for (const t of tests) {
    const label = normalizeName(t[key]);
    if (!label) continue;
    if (label === target) return t;
    if ((label.includes(target) || target.includes(label)) && label.length > bestLen) {
      best = t; bestLen = label.length;
    }
  }
  return best;
}
const ALL_KC_TESTS = Object.values(KC_REGIONS).flatMap((r) => r.tests || []);
const ALL_NKT_TESTS = Object.values(NKT_REGIONS).flatMap((r) => r.tests || []);
const ALL_FMA_TESTS = Object.values(FMA_DATA).flat();

function kcRichItemFor(testName) {
  const t = findByNormalizedLabel(ALL_KC_TESTS, testName, "label");
  return t ? kcRichItem(t) : null;
}
function nktRichItemFor(muscleName) {
  const t = findByNormalizedLabel(ALL_NKT_TESTS, muscleName, "muscle") || findByNormalizedLabel(ALL_NKT_TESTS, muscleName, "label");
  return t ? cpaRichItem(t) : null;
}
// note (the condition's own line on why this screen matters) goes into the
// info card too, so the how-to/why lives in one place; tests with no match
// in the Functional Movement Screen library still get a card from it.
function functionalRichItem(testName, note) {
  const base = fmaRichItemFor(testName);
  if (!note) return base;
  const noteCard = <InfoCard icon="📝" label="Why it's screened here" tint="amber">{note}</InfoCard>;
  if (!base) return { title: testName, perform: noteCard };
  return { ...base, perform: <>{base.perform}{noteCard}</> };
}
function fmaRichItemFor(testName) {
  const t = findByNormalizedLabel(ALL_FMA_TESTS, testName, "label");
  return t ? fmaRichItem(t) : null;
}

// Maps this screen's own region config keys (config.key) onto
// CYRIAX_REGIONS_DATA's keys, which are split slightly differently
// (elbow/wrist_hand vs. this screen's combined elbowWristHand). Thoracic
// has no dedicated Cyriax catalogue in the source data at all.
const CYRIAX_REGION_KEYS_FOR = {
  cervical: ["cervical"], lumbar: ["lumbar"], shoulder: ["shoulder"],
  hip: ["hip"], knee: ["knee"], ankleFoot: ["ankle_foot"],
  elbowWristHand: ["elbow", "wrist_hand"], thoracic: [],
};
function cyriaxTestsFor(configKey, field) {
  return (CYRIAX_REGION_KEYS_FOR[configKey] || []).flatMap((k) => CYRIAX_REGIONS_DATA[k]?.[field] || []);
}
const STTT_DEFAULT_ENDFEEL = ["Normal/Capsular", "Muscle Spasm", "Empty (No End-Feel)", "Hard (Osteophyte)"];

function idByName(conditions) {
  return Object.fromEntries(Object.values(conditions).map((c) => [normalizeName(c.name), c.id]));
}
// Several live reasoning engines emit their own ids (SH0x, HP0x, KN0x, AK0x/
// FT0x) that don't match the condition-library JSON's ids (S0x, H0x, K0x,
// AF0x) — but the condition NAMES match 1:1 in every case, so each of these
// regions bridges engine id -> library id by normalized name.
const SHOULDER_ID_BY_NAME = idByName(SHOULDER_CONDITIONS);
const HIP_ID_BY_NAME = idByName(HIP_CONDITIONS);
const KNEE_ID_BY_NAME = idByName(KNEE_CONDITIONS);
const ANKLE_FOOT_ID_BY_NAME = idByName(ANKLE_FOOT_CONDITIONS);
// The Elbow/Wrist/Hand engine's own diagnosis names lack the library's
// "(Wrist model)"/"(Hand model)" disambiguation suffix on its two "trigger
// finger" entries — added explicitly since automatic name-matching would
// otherwise miss both.
const ELBOW_WRIST_HAND_ID_BY_NAME = {
  ...idByName(ELBOW_WRIST_HAND_CONDITIONS),
  [normalizeName("Trigger finger / flexor tenosynovitis")]: "W10",
  [normalizeName("Trigger finger / thumb (stenosing flexor tenosynovitis)")]: "H03",
};

function fieldKey(conditionId, module, sub) {
  return `${conditionId}::${module}${sub ? `::${sub}` : ""}`;
}

function cervicalRedFlag(engineResult) {
  const rf = engineResult?.redFlagOverride;
  if (!rf?.triggered) return null;
  return {
    title: rf.urgency === "EMERGENCY" ? "EMERGENCY — Myelopathy / VBI / Fracture Indicators" : "URGENT REFERRAL INDICATED",
    lines: [rf.reason, rf.action].filter(Boolean),
  };
}
function evidenceModelRedFlag(engineResult) {
  const rf = engineResult?.redFlag;
  if (!rf?.triggered) return null;
  return { title: "RED FLAG DETECTED", lines: (rf.flags || []).map((f) => f.message).filter(Boolean) };
}

const REGION_CONFIGS = [
  {
    key: "cervical", label: "Cervical Spine", schema: "v2",
    matchesRegion: (r) => r.id === "cervical",
    hasData: (data) => hasCervicalChecklistData(data.subjective?.regions?.cervical) || !!spineRegionData(data, { id: "cervical" }, "cervical"),
    run: (data) => runCervicalDifferential(spineRegionData(data, { id: "cervical" }, "cervical") || data.subjective?.regions?.cervical, data.subjective),
    conditions: CERVICAL_CONDITIONS, order: CERVICAL_CONDITION_ORDER,
    getRedFlag: cervicalRedFlag,
    suggestedTestsMode: "split",
    romMovements: CERVICAL_ROM_MOVEMENTS, romLabel: "Cervical ROM",
    emptyNote: "Pick Cervical as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "thoracic", label: "Thoracic Spine", schema: "v2",
    matchesRegion: (r) => r.id === "thoracic",
    hasData: (data) => hasThoracicChecklistData(data.subjective?.regions?.thoracic) || !!spineRegionData(data, { id: "thoracic" }, "thoracic"),
    run: (data) => runThoracicDifferential(spineRegionData(data, { id: "thoracic" }, "thoracic") || data.subjective?.regions?.thoracic, data.subjective),
    conditions: THORACIC_CONDITIONS, order: THORACIC_CONDITION_ORDER,
    getRedFlag: cervicalRedFlag,
    suggestedTestsMode: "split",
    romMovements: THORACIC_ROM_MOVEMENTS, romLabel: "Thoracic ROM",
    emptyNote: "Pick Thoracic as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "lumbar", label: "Lumbar / SI", schema: "v2",
    matchesRegion: (r) => ["lumbar", "sacrum", "pelvis"].includes(r.id),
    hasData: (data) => hasLumbarChecklistData(data.subjective?.regions?.lumbarSI) || !!spineRegionData(data, { id: "lumbarSI" }, "lumbarSI"),
    run: (data) => runLumbarDifferential(spineRegionData(data, { id: "lumbarSI" }, "lumbarSI") || data.subjective?.regions?.lumbarSI, data.subjective),
    conditions: LUMBAR_CONDITIONS, order: LUMBAR_CONDITION_ORDER,
    getRedFlag: cervicalRedFlag,
    suggestedTestsMode: "split",
    romMovements: LUMBAR_ROM_MOVEMENTS, romLabel: "Lumbar ROM",
    emptyNote: "Pick Lumbar/SI as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "shoulder", label: "Shoulder", schema: "v2",
    matchesRegion: (r) => ["shoulder", "upperArm"].includes(r.id),
    hasData: (data) => hasShoulderChecklistData(data),
    run: (data) => runShoulderDifferential(data),
    matchByName: true, nameIdMap: SHOULDER_ID_BY_NAME,
    conditions: SHOULDER_CONDITIONS, order: SHOULDER_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: SHOULDER_ROM_MOVEMENTS, romLabel: "Shoulder ROM", romBilateral: true,
    emptyNote: "Pick Shoulder as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "hip", label: "Hip / Groin", schema: "v2",
    matchesRegion: (r) => r.id === "hip",
    hasData: (data) => hasHipChecklistData(data),
    run: (data) => runHipDifferential(data),
    matchByName: true, nameIdMap: HIP_ID_BY_NAME,
    conditions: HIP_CONDITIONS, order: HIP_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: HIP_ROM_MOVEMENTS, romLabel: "Hip ROM", romBilateral: true,
    emptyNote: "Pick Hip as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "knee", label: "Knee", schema: "v2",
    matchesRegion: (r) => r.id === "knee",
    hasData: (data) => hasKneeChecklistData(data),
    run: (data) => runKneeDifferential(data),
    matchByName: true, nameIdMap: KNEE_ID_BY_NAME,
    conditions: KNEE_CONDITIONS, order: KNEE_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: KNEE_ROM_MOVEMENTS, romLabel: "Knee ROM", romBilateral: true,
    emptyNote: "Pick Knee as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "ankleFoot", label: "Ankle / Foot", schema: "v2",
    matchesRegion: (r) => r.id === "ankle" || r.id === "foot",
    hasData: (data) => hasAnkleFootChecklistData(data),
    run: (data) => runAnkleFootDifferential(data),
    matchByName: true, nameIdMap: ANKLE_FOOT_ID_BY_NAME,
    conditions: ANKLE_FOOT_CONDITIONS, order: ANKLE_FOOT_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: ANKLE_FOOT_ROM_MOVEMENTS, romLabel: "Ankle ROM", romBilateral: true,
    emptyNote: "Pick Ankle or Foot as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "elbowWristHand", label: "Elbow / Wrist / Hand", schema: "v2",
    matchesRegion: (r) => ["elbow", "forearm", "wrist", "hand"].includes(r.id),
    hasData: (data) => hasElbowWristHandChecklistData(data),
    run: (data) => runElbowWristHandDifferential(data),
    matchByName: true, nameIdMap: ELBOW_WRIST_HAND_ID_BY_NAME,
    conditions: ELBOW_WRIST_HAND_CONDITIONS, order: ELBOW_WRIST_HAND_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: ELBOW_WRIST_HAND_ROM_MOVEMENTS, romLabel: "Elbow / Wrist ROM", romBilateral: true,
    emptyNote: "Pick Elbow, Forearm, Wrist, or Hand as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
];

// Every region's condition-wise findings live under their own
// data.conditionAssessment_<regionKey> section (see useSectionData below) --
// a single assessment can cover more than one region, so there's no single
// flat data.objectiveAI to read. Without this, the wizard's own Review step
// and the saved Patient Profile summary both read data.objectiveAI, find it
// always empty, and show nothing even though real findings were recorded
// (2026-09-12, Aditi: "whatever we filled in AI assessment is not
// documenting"). OrthoOutpatientAssessment.jsx / SpecialtyPatientProfile.jsx
// call this to build a data.objectiveAI substitute the same way they already
// do for carePlanPlan (data.ortho_care_plan), then register an identity
// formatter for it since the grouping work happens here.
const OBJECTIVE_MODULE_LABELS = {
  observation: "Observation", posture: "Posture", palpation: "Palpation",
  cpaNkt: "CPA — NKT", cpa: "CPA — NKT", rom: "ROM", resisted: "STTT — Resisted Test",
  sttt: "STTT", kineticChain: "Kinetic Chain", functionalScreen: "Functional Screen",
  special: "Special Test", outcome: "Outcome Measure",
};
function objectiveFieldLabel(module, sub) {
  const base = OBJECTIVE_MODULE_LABELS[module] || module;
  if (module === "special") return sub && sub.endsWith("_side") ? `${sub.slice(0, -5)} — side` : sub || base;
  if (module === "outcome") return sub || base;
  if (!sub || ["chips", "state", "mode", "test", "r", "p", "m"].includes(sub)) return base;
  return `${base} — ${sub}`;
}
export function formatConditionObjectiveSection(data) {
  const groups = [];
  REGION_CONFIGS.forEach((cfg) => {
    const state = data?.["conditionAssessment_" + cfg.key];
    if (!state || !Object.keys(state).length) return;
    const byCondition = {};
    Object.entries(state).forEach(([key, val]) => {
      if (!val) return;
      const [conditionId, module, sub] = key.split("::");
      (byCondition[conditionId] ||= []).push({ module, sub, val });
    });
    Object.entries(byCondition).forEach(([conditionId, fields]) => {
      if (!fields.length) return;
      const conditionName = cfg.conditions[conditionId]?.name || conditionId;
      groups.push({
        heading: `${cfg.label} — ${conditionName}`,
        rows: fields.map(({ module, sub, val }) => ({ label: objectiveFieldLabel(module, sub), value: val })),
      });
    });
  });
  return { groups };
}

/* ---------- small building blocks, matching the artifact's flat/hairline/
   purple-only-on-selected visual language ---------- */

// Same percentage-match-card look as the old "Suggested Objective" step's
// ConditionMatchRow (OrthoSuggestObjectiveStep.jsx) — reusing its own
// .obj-match-row/.obj-match-card/.obj-match-pct/.obj-match-name classes
// (defined once in orthoStyles.js, already injected on this page by
// OrthoOutpatientAssessment.jsx) rather than a second, drifting copy of the
// same styling. Percentage is the same real supportingMatched/supportingTotal
// count every region's differential engine already returns — not a new score.
const MATCH_TIER_TONE = { "Strong match": "#16a34a", "Possible match": "#d97706", "Weak match": "#6b7280", "Insufficient data": "#9ca3af", "Unlikely": "#9ca3af" };

function conditionMatchPct(m) {
  if (!m || !m.supportingTotal) return null;
  return Math.round((m.supportingMatched.length / m.supportingTotal) * 100);
}

function ConditionTabs({ conditions, order, matchById, activeId, onSelect }) {
  return (
    <div className="obj-match-row">
      {order.map((id, i) => {
        const c = conditions[id];
        if (!c) return null;
        const m = matchById[id];
        const pct = conditionMatchPct(m);
        const isActive = id === activeId;
        return (
          <button
            key={id}
            type="button"
            className={"obj-match-card obj-match-c" + (i % 6) + (isActive ? " obj-match-card-active" : "")}
            onClick={() => onSelect(id)}
          >
            {pct != null ? (
              <span className="obj-match-pct">{pct}%</span>
            ) : m ? (
              <span className="obj-match-pct" style={{ color: MATCH_TIER_TONE[m.matchTier] }}>{m.matchTier}</span>
            ) : (
              <span className="obj-match-pct" style={{ fontSize: 13 }}>{id}</span>
            )}{" "}
            <span className="obj-match-name">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// Low/Med/High confidence label for a condition's real matchTier (same
// Strong/Possible/Weak/Insufficient/Unlikely value ConditionTabs already
// reads off matchById) -- for HypothesisGrid's tier pill.
function tierLevel(m) {
  if (!m) return null;
  if (m.matchTier === "Strong match") return "high";
  if (m.matchTier === "Possible match") return "med";
  return "low";
}
const TIER_TEXT = { high: "High", med: "Med", low: "Low" };

// Target Hypotheses -- the earlier top-3 PRIMARY/DIFF card grid sat directly
// above this same scrollable ConditionTabs list, and whenever a region had
// 3 or fewer ranked conditions (e.g. Cervical) the two showed the literal
// same 3 conditions twice in a row (2026-09-24, Aditi, on a real device:
// "remove this upper [grid] only three comming... make the 2nd below it
// permanant"). Now just the one always-visible list, no top grid, no
// Customize toggle.
function HypothesisGrid({ conditions, order, matchById, activeId, onSelect }) {
  return (
    <div>
      <div className="obj-hypo-head">
        <span className="obj-hypo-label">Target Hypotheses</span>
      </div>
      <ConditionTabs conditions={conditions} order={order} matchById={matchById} activeId={activeId} onSelect={onSelect} />
    </div>
  );
}

// Header restyled to match the Stitch reference's plain black title + light
// pill finding-count, in place of the old colored-text "Close ↑"/"Open →"
// link (2026-09-24, Aditi: pasted reference vs. app screenshots side by
// side -- "first image is what i want... second is our webapp right now").
// Still collapsible (tapping the header still toggles), just a quiet
// chevron now instead of a text button, so a long module list can still be
// tidied away without the header reading as a nav control.
function ModuleCard({ label, subtitle, count, color, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: `1px solid ${HAIRLINE}`, padding: "14px 2px" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        role="button"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", gap: 10 }}
      >
        <span>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: BRAND.ink, display: "block" }}>
            {label}
          </span>
          {subtitle && <span style={{ fontSize: "0.78rem", color: BRAND.gray, display: "block", marginTop: 2 }}>{subtitle}</span>}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: subtitle ? 2 : 0 }}>
          {count != null && (
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: BRAND.purpleDark, background: BRAND.purpleFaint, padding: "4px 10px", borderRadius: 999 }}>
              {count} Finding{count === 1 ? "" : "s"}
            </span>
          )}
          <i className={"ti ti-chevron-" + (open ? "up" : "down")} style={{ fontSize: 16, color: BRAND.grayLight }} aria-hidden="true"></i>
        </span>
      </div>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

// Subtopics shown as a horizontal, scrollable "piano row" below the
// condition selector — page-by-page assessment instead of every module
// stacked on one long scroll (2026-09-11, approved chat mockup: purple
// gradient bar, active tab pops up as a white card). Posture + Fascia
// still fold into Observation. CPA-NKT and Kinetic Chain used to fold
// into Palpation/Functional too, but got their own pages (2026-09-17,
// Aditi: "put the CPA functional and kinetic seprate in ai") -- each is
// its own clinical module, not a sub-finding of the tab it was sharing.
const SUBTOPICS = [
  { key: "pain", label: "Pain", icon: "ti-mood-sad" },
  { key: "observation", label: "Observation", icon: "ti-eye" },
  { key: "palpation", label: "Palpation", icon: "ti-hand-stop" },
  { key: "rom", label: "ROM", icon: "ti-arrows-maximize" },
  { key: "mmt", label: "MMT", icon: "ti-activity" },
  { key: "special", label: "Special tests", icon: "ti-clipboard-check" },
  { key: "cpa", label: "CPA / NKT", icon: "ti-brain" },
  { key: "kinetic", label: "Kinetic chain", icon: "ti-link" },
  { key: "functional", label: "Functional", icon: "ti-walk" },
  { key: "sttt", label: "STTT / Cyriax", icon: "ti-stethoscope" },
  { key: "outcome", label: "Outcome measures", icon: "ti-chart-line" },
];

// Scrolling the row itself drives selection -- whichever tile's center is
// nearest the track's center becomes active, like a piano-roll/wheel picker
// (2026-09-11: "whoever in the middle will show"). Tapping a tile still
// works and scrolls it to center; both paths converge on the same
// nearest-to-center logic so they never fight each other.
function SubtopicTabs({ active, onSelect, counts }) {
  const scrollRef = React.useRef(null);
  const tileRefs = React.useRef({});
  const settleTimer = React.useRef(null);

  const centerOn = (key, smooth = true) => {
    const el = tileRefs.current[key];
    const track = scrollRef.current;
    if (!el || !track) return;
    const target = el.offsetLeft - (track.clientWidth - el.clientWidth) / 2;
    track.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
  };

  const nearestToCenter = () => {
    const track = scrollRef.current;
    if (!track) return null;
    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    let best = null, bestDist = Infinity;
    for (const s of SUBTOPICS) {
      const el = tileRefs.current[s.key];
      if (!el) continue;
      const tileCenter = el.offsetLeft + el.clientWidth / 2;
      const dist = Math.abs(tileCenter - trackCenter);
      if (dist < bestDist) { bestDist = dist; best = s.key; }
    }
    return best;
  };

  const handleScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const key = nearestToCenter();
      if (key && key !== active) onSelect(key);
    }, 120);
  };

  const handleTap = (key) => {
    onSelect(key);
    centerOn(key);
  };

  const scrollBy = (dx) => scrollRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  // Back/Next buttons and the condition-switch reset change `active` from
  // outside this component -- follow along so the centered tile always
  // matches whichever page is actually showing.
  useEffect(() => { centerOn(active); }, [active]);

  return (
    <div className="obj-subtopic-bar">
      <button type="button" className="obj-subtopic-scroll-btn" aria-label="Scroll left" onClick={() => scrollBy(-90)}>
        <i className="ti ti-chevron-left" aria-hidden="true"></i>
      </button>
      <div className="obj-subtopic-tabs" ref={scrollRef} onScroll={handleScroll}>
        {SUBTOPICS.map((s) => (
          <button
            key={s.key}
            ref={(el) => { tileRefs.current[s.key] = el; }}
            type="button"
            className={"obj-subtopic-tab" + (active === s.key ? " obj-subtopic-tab-active" : "")}
            onClick={() => handleTap(s.key)}
          >
            <i className={"ti " + s.icon} aria-hidden="true"></i>
            <span>{s.label}</span>
            {counts?.[s.key] > 0 && <span className="obj-subtopic-count">{counts[s.key]}</span>}
          </button>
        ))}
      </div>
      <button type="button" className="obj-subtopic-scroll-btn" aria-label="Scroll right" onClick={() => scrollBy(90)}>
        <i className="ti ti-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 8px", borderRadius: 8, fontSize: "0.62rem", fontWeight: 600, cursor: "pointer", outline: "none", whiteSpace: "nowrap",
        border: active ? `1px solid ${BRAND.purple}` : `1px dashed ${HAIRLINE}`,
        background: active ? BRAND.purple : "#fff",
        color: active ? "#fff" : BRAND.ink,
        boxShadow: active ? "0 4px 10px rgba(108,77,255,.24)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function ChipGroup({ options, selected, onToggle, multi = true }) {
  const values = multi ? (selected ? selected.split(", ").filter(Boolean) : []) : selected ? [selected] : [];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => (
        <Chip key={o} active={values.includes(o)} onClick={() => onToggle(o)}>{o}</Chip>
      ))}
    </div>
  );
}

function EmptyNote({ children }) {
  return (
    <div style={{ padding: "10px 12px", border: `1px dashed ${HAIRLINE}`, borderRadius: 8, fontSize: "0.78rem", color: BRAND.grayLight, fontStyle: "italic" }}>
      {children}
    </div>
  );
}

// Purple-accent treatment (2026-09-10, Aditi: picked option A from font
// mockups — "basic black" default and the old flat BRAND.gray were both
// rejected) — field/group labels read as an intentional design choice
// instead of disabled-looking muted text. Shared by every module that
// reuses SubLabel/CategoryLabel: STTT, Kinetic Chain, Functional Screen,
// Outcome Measures, CPA.
const LABEL_ACCENT = "#534AB7";
const LABEL_ACCENT_DARK = "#26215C";

function SubLabel({ children }) {
  return <div style={{ fontSize: "0.8rem", fontWeight: 700, color: LABEL_ACCENT_DARK, letterSpacing: 0.2, marginBottom: 6 }}>{children}</div>;
}

// Small uppercase category label, same treatment as ModuleCard's own
// section headers (e.g. "SPECIAL TESTS") — for a sub-grouping within a
// module (e.g. "Side" vs "Result") rather than a field name.
function CategoryLabel({ children }) {
  return (
    <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: LABEL_ACCENT, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function GreenBox({ title, children }) {
  return (
    <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: BRAND.greenBg, border: `1px solid ${BRAND.green}33` }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: BRAND.green, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}
function PurpleBox({ title, children }) {
  return (
    <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10, background: BRAND.purpleFaint, border: `1px solid ${BRAND.purple}33` }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: BRAND.purpleDark, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: "0.8rem", color: BRAND.purpleDark, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
function BlueBox({ title, children }) {
  return (
    <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#1D4ED8", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: "0.78rem", color: "#1E3A8A", lineHeight: 1.5 }}>✓ {children}</div>
    </div>
  );
}

// Card-list variant of ChipGroup+FindingInterpretations for Observation/
// Posture/Palpation (2026-09-11, per approved chat mockup: "put it in all
// observation posture and palpation of all regions") -- one square icon
// tile per finding (numbered, checkmark badge when selected) instead of a
// pill, with that finding's clinical interpretation expanding directly
// under its own card on tap instead of in a separate list below every
// chip. Same condition.findingInterpretations[category][label] source as
// before -- findings without authored interpretation text just don't show
// a panel, no fabricated content. One representative icon per category
// (not per finding -- the condition library has no per-finding icon
// mapping and inventing one per finding/condition wouldn't be maintainable).
// Mechanical split of the authored interpretation paragraph into
// bullets (2026-09-11: "pointwise, not paragraph"; 2026-09-12: many are
// authored as one long clause-heavy sentence -- "so lengthy" -- so this
// also breaks at em-dash/semicolon clause boundaries, not just sentence
// ends). Reformats the same authored text verbatim, doesn't add, remove,
// or paraphrase any words.
function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+(?=[A-Z(])|\s*[—;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// instruction: standard exam technique -- "how to check for this finding"
// -- always visible under the title. interpretation: what a positive
// finding clinically means -- only revealed once the card is tapped
// (2026-09-12, Aditi: "instruction... how we can see localized guarding...
// clinical interpretation... only shows when we click"). Instruction text
// is drawn from standard orthopedic exam technique (Magee/Hoppenfeld-style
// inspection & palpation method), not per-condition data -- Posture
// findings don't get one since the label itself already states what to
// look for (e.g. "Externally-rotated resting hip"), so a separate
// technique line would just restate it.
// photoId: deterministic Cloudinary public_id ("physiom_findings/<category>/
// <slug>") computed from the finding's own category+label -- same id
// everywhere the finding appears, so once a photo is uploaded from any
// device it's the exact URL every other device/user requests too, with no
// separate database/mapping step (2026-09-12, Aditi: "I click it and it
// uploaded... presented in the main web app... for all the people").
// Uploads go straight to Cloudinary's unsigned endpoint client-side --
// explicitly passing public_id makes Cloudinary honor that exact id
// instead of auto-generating one, which is what keeps the URL predictable.
// Rejects a picked file before it reaches Cloudinary if it isn't a real
// photo -- guards against a rare mobile-browser failure mode where the file
// picker hands back a valid-but-empty stub image (e.g. an iCloud photo
// whose full-res version hadn't finished downloading yet) instead of the
// actual photo. These slots are shared across every user of the app, so a
// stub upload silently overwrites the real photo for everyone, not just
// the uploader (2026-09-25, Aditi: a Neuro info-card photo showed solid
// black after upload -- the stored file turned out to be a genuine, fully
// opaque 1x1px image, not a broken render; same unguarded upload pattern
// as this file's finding/patient photo tiles below).
function isRealPhoto(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img.naturalWidth >= 40 && img.naturalHeight >= 40); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    img.src = url;
  });
}

function FindingCard({ index, icon, label, active, instruction, interpretation, onToggle, photoId }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgVersion, setImgVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const fileInputRef = useRef(null);
  const imgSrc = photoId ? `${CLOUDINARY_BASE}/f_auto,q_auto,w_300,h_300,c_fill/${photoId}${imgVersion ? `?v=${imgVersion}` : ""}` : null;
  const zoomSrc = photoId ? `${CLOUDINARY_BASE}/f_auto,q_auto,w_1200,c_limit/${photoId}${imgVersion ? `?v=${imgVersion}` : ""}` : null;
  const hasPhoto = !!(photoId && imgSrc && !imgFailed);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !photoId) return;
    setUploading(true);
    try {
      if (!(await isRealPhoto(file))) throw new Error("empty-image");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "ml_default");
      fd.append("public_id", photoId);
      const res = await fetch("https://api.cloudinary.com/v1_1/dr15y1pwj/image/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      // The unsigned "ml_default" preset has Overwrite off in Cloudinary's
      // dashboard -- uploading to a public_id that already holds a photo
      // is silently ignored: Cloudinary still answers 200 OK, but
      // `existing: true` means it just handed back the OLD asset's info
      // and stored nothing new (2026-09-25, Aditi: replaced a wrong photo
      // and "its not replacing at all" -- same gap as InfoCard.jsx's
      // isRealPhoto guard above, confirmed by re-POSTing a slot directly
      // and getting the untouched original back). Needs the Overwrite
      // toggle turned on for ml_default in the Cloudinary console to
      // actually fix -- Cloudinary rejects the `overwrite` upload param
      // outright on unsigned requests, so it can't be forced from here.
      const json = await res.json();
      if (json.existing) throw new Error("blocked-overwrite");
      setImgFailed(false);
      setImgVersion(Date.now());
    } catch (err) {
      alert(err?.message === "empty-image"
        ? "That photo didn't come through properly (it looked empty) — please try again."
        : err?.message === "blocked-overwrite"
        ? "This photo slot already has an image and couldn't be replaced right now — please let the app admin know."
        : "Photo upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ borderRadius: 12, border: active ? `1.5px solid ${BRAND.purple}` : `1px solid ${HAIRLINE}`, background: "#fff", overflow: "hidden" }}>
      {/* Zoom viewer -- tapping an already-uploaded photo used to just
          re-open the file picker, with no way to actually see it full-size
          (2026-09-12, Aditi: "clicking the uploaded photo... showing upload
          option not opening zoomed photo"). Now the tile opens this instead,
          and "Replace photo" inside it is the one remaining way to re-upload. */}
      {zoomOpen && hasPhoto && createPortal(
        <div onClick={() => setZoomOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={zoomSrc} alt={label} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "80vh", width: "auto", height: "auto", objectFit: "contain", borderRadius: 8 }} />
          {uploading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-loader-2" style={{ fontSize: 32, color: "#fff" }} aria-hidden="true"></i>
            </div>
          )}
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 10 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
              <i className="ti ti-camera-plus" aria-hidden="true"></i> Replace photo
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setZoomOpen(false); }}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
        </div>,
        document.body
      )}
      <button
        type="button"
        onClick={onToggle}
        style={{ display: "flex", alignItems: "flex-start", gap: 14, textAlign: "left", padding: 14, width: "100%", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        <div
          onClick={photoId ? (e) => { e.stopPropagation(); hasPhoto ? setZoomOpen(true) : fileInputRef.current?.click(); } : undefined}
          style={{ position: "relative", flex: "0 0 auto", width: 84, height: 84, borderRadius: 14, background: active ? BRAND.purpleFaint : "#F6F5FA", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: photoId ? (hasPhoto ? "zoom-in" : "pointer") : "default" }}
        >
          {hasPhoto ? (
            <img src={imgSrc} alt="" onError={() => setImgFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <i className={"ti " + (photoId ? "ti-camera-plus" : icon)} style={{ fontSize: 28, color: active ? BRAND.purpleDark : BRAND.grayLight }} aria-hidden="true"></i>
          )}
          {photoId && (
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          )}
          {uploading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-loader-2" style={{ fontSize: 22, color: BRAND.purple }} aria-hidden="true"></i>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div className="obj-finding-title-row">
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: BRAND.ink }}>{label}</div>
            <span className={"obj-finding-status " + (active ? "obj-finding-status-positive" : "obj-finding-status-unmarked")}>
              {active ? "Positive" : "Unmarked"}
            </span>
          </div>
          {instruction && (
            <div style={{ fontSize: "0.76rem", color: BRAND.grayLight, lineHeight: 1.4, marginTop: 3 }}>{instruction}</div>
          )}
          {active && interpretation && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.76rem", color: BRAND.gray, lineHeight: 1.5 }}>
              {splitSentences(interpretation).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </div>
      </button>
    </div>
  );
}

// Same slug for a given label every time -- this IS the persistence
// mechanism (no database write needed): whoever uploads a photo for
// "Localised guarding" and whoever later views "Localised guarding"
// compute the identical Cloudinary URL.
//
// FIX (2026-09-25, Aditi: "why observation of lumbar showing the cervical
// tautband image that i uploaded here"): the condition library reuses
// identical finding wording across different regions (e.g. "Taut bands/
// trigger points reproducing referred pain" appears in both Cervical and
// Lumbar). With no region in the id, category+label alone collided --
// uploading a photo under one region's occurrence of that wording made it
// appear under every other region using the same wording. regionKey (the
// REGION_CONFIGS key, e.g. "cervical"/"lumbar") is now part of the id, so
// only the same finding within the same region shares a photo. This does
// orphan photos already uploaded under the old, region-less ids -- an
// accepted tradeoff to stop the cross-region mixups.
function slugifyFinding(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function findingPhotoId(regionKey, category, label) {
  return `physiom_findings/${regionKey}/${category}/${slugifyFinding(label)}`;
}

// Compact version of FindingCard's photo tile -- same upload-your-own-photo
// behaviour (Cloudinary unsigned upload keyed to a deterministic public_id,
// tap-to-zoom, tap-to-replace), just sized for an inline row instead of a
// full 96px card tile. Used for ROM movements and Special Tests, which
// previously only had the fixed reference-technique photo (InfoButton
// imageTrigger) with no way for the clinician to attach the patient's own
// photo the way Observation/Posture/Palpation findings already could
// (2026-09-17, Aditi: "same thing... in ROM special test... like you have
// done in AI observation section").
function PatientPhotoTile({ photoId, size = 40 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgVersion, setImgVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const fileInputRef = useRef(null);
  const imgSrc = photoId ? `${CLOUDINARY_BASE}/f_auto,q_auto,w_300,h_300,c_fill/${photoId}${imgVersion ? `?v=${imgVersion}` : ""}` : null;
  const zoomSrc = photoId ? `${CLOUDINARY_BASE}/f_auto,q_auto,w_1200,c_limit/${photoId}${imgVersion ? `?v=${imgVersion}` : ""}` : null;
  const hasPhoto = !!(photoId && imgSrc && !imgFailed);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !photoId) return;
    setUploading(true);
    try {
      if (!(await isRealPhoto(file))) throw new Error("empty-image");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "ml_default");
      fd.append("public_id", photoId);
      const res = await fetch("https://api.cloudinary.com/v1_1/dr15y1pwj/image/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      // The unsigned "ml_default" preset has Overwrite off in Cloudinary's
      // dashboard -- uploading to a public_id that already holds a photo
      // is silently ignored: Cloudinary still answers 200 OK, but
      // `existing: true` means it just handed back the OLD asset's info
      // and stored nothing new (2026-09-25, Aditi: replaced a wrong photo
      // and "its not replacing at all" -- same gap as InfoCard.jsx's
      // isRealPhoto guard above, confirmed by re-POSTing a slot directly
      // and getting the untouched original back). Needs the Overwrite
      // toggle turned on for ml_default in the Cloudinary console to
      // actually fix -- Cloudinary rejects the `overwrite` upload param
      // outright on unsigned requests, so it can't be forced from here.
      const json = await res.json();
      if (json.existing) throw new Error("blocked-overwrite");
      setImgFailed(false);
      setImgVersion(Date.now());
    } catch (err) {
      alert(err?.message === "empty-image"
        ? "That photo didn't come through properly (it looked empty) — please try again."
        : err?.message === "blocked-overwrite"
        ? "This photo slot already has an image and couldn't be replaced right now — please let the app admin know."
        : "Photo upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  if (!photoId) return null;

  return (
    <>
      {zoomOpen && hasPhoto && createPortal(
        <div onClick={() => setZoomOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={zoomSrc} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "80vh", width: "auto", height: "auto", objectFit: "contain", borderRadius: 8 }} />
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 10 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
              <i className="ti ti-camera-plus" aria-hidden="true"></i> Replace photo
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setZoomOpen(false); }}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
        </div>,
        document.body
      )}
      <div
        onClick={(e) => { e.stopPropagation(); hasPhoto ? setZoomOpen(true) : fileInputRef.current?.click(); }}
        title={hasPhoto ? "View patient photo" : "Add patient photo"}
        style={{ position: "relative", flexShrink: 0, width: size, height: size, borderRadius: 10, background: "#F6F5FA", border: `1px solid ${HAIRLINE}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: hasPhoto ? "zoom-in" : "pointer" }}
      >
        {hasPhoto ? (
          <img src={imgSrc} alt="" onError={() => setImgFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <i className="ti ti-camera-plus" style={{ fontSize: Math.round(size * 0.45), color: BRAND.grayLight }} aria-hidden="true"></i>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        {uploading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-loader-2" style={{ fontSize: Math.round(size * 0.4), color: BRAND.purple }} aria-hidden="true"></i>
          </div>
        )}
      </div>
    </>
  );
}

const FINDING_CATEGORY_ICON = { observation: "ti-eye", posture: "ti-walk", palpation: "ti-hand-stop" };

// Standard-technique "how to check" lines for Observation and Palpation
// findings, keyed by the exact finding label used in the condition
// library (185 Observation + 67 Palpation labels across all regions).
// Sourced from standard orthopedic exam method (inspection/palpation
// technique, landmark location), not per-condition or per-patient data --
// same instruction shown wherever that exact label appears. Findings with
// no entry just show no instruction line (no fabricated technique).
const OBSERVATION_HOW_TO = {
  "3rd/4th web-space tenderness": "Palpate the dorsal 3rd/4th metatarsal web space for a tender interdigital mass.",
  "4th/5th tingling": "Screen for tingling in the ring and little finger distribution (ulnar nerve).",
  "A1-pulley nodule": "Palpate the palmar A1 pulley at the base of the finger for a tender nodule.",
  "Acutely held rigid": "Observe whether the patient holds the region completely still, avoiding any movement.",
  "Adductor-origin tenderness": "Palpate the adductor longus origin at the pubic ramus.",
  "Altered breathing on one side": "Observe chest wall expansion bilaterally during deep breathing for asymmetry.",
  "Antalgic head tilt away from side": "Observe resting head position for a tilt away from the painful side.",
  "Antalgic lean": "Observe standing posture for a lean away from the symptomatic side.",
  "Antalgic posture": "Observe overall resting posture for pain-avoidant positioning.",
  "Antecubital tenderness ± gap/retraction (Popeye)": "Palpate the antecubital fossa for tenderness and inspect the arm contour for a retracted 'Popeye' bulge.",
  "Anterior chest tenderness ± swelling at costochondral junction": "Palpate each costochondral junction on the anterior chest wall for tenderness or swelling.",
  "Anterior joint-line swelling": "Inspect and palpate the anterior joint line for visible or palpable swelling.",
  "Anterior joint-line tenderness": "Palpate the anterior joint line directly.",
  "Apex tenderness": "Palpate the apex (tip) of the structure directly for point tenderness.",
  "Apprehension guarding": "Move the joint toward the position that reproduces instability and watch for a guarded, apprehensive reaction.",
  "Arm guarding": "Observe whether the patient holds the arm close to the body, resisting movement.",
  "Band-like sensory change": "Test light touch across the trunk/limb for a band-like area of altered sensation.",
  "Bony enlargement": "Palpate the joint margins for firm, bony (not soft) enlargement.",
  "C-sign grip over groin": "Observe whether the patient cups their hand in a C-shape over the lateral hip/groin when describing their pain.",
  "Catching/locking": "Ask the patient to move the joint through range and observe or feel for a mechanical catch or lock.",
  "Central heel tenderness": "Palpate the central plantar heel pad directly under weight-bearing load.",
  "Crepitus": "Palpate the joint while it moves through range, feeling for grinding or grating.",
  "DIP/PIP nodes": "Palpate the DIP and PIP joints for bony nodules.",
  "Deep buttock tenderness": "Palpate deep in the buttock, between the ischial tuberosity and greater trochanter, with the hip flexed.",
  "Dermatomal signs": "Test light touch/pinprick sensation across the relevant dermatomes, comparing sides.",
  "Diffuse guarding": "Observe for widespread, non-localized muscle guarding rather than a single focal area.",
  "Dinner-fork deformity": "Inspect the wrist from the side for a dorsal step ('dinner-fork') silhouette.",
  "Dorsal 1st-MTP osteophyte": "Palpate the dorsal aspect of the 1st MTP joint for a bony prominence.",
  "Dorsal midfoot swelling/tenderness": "Inspect and palpate the dorsal midfoot over the tarsometatarsal joints.",
  "Dorsal swelling": "Inspect the dorsal surface for visible swelling.",
  "Dorsal-radial swelling": "Inspect the dorsal-radial wrist/hand for localized swelling.",
  "Dropped shoulder": "Observe shoulder height bilaterally in standing for asymmetric drooping.",
  "Effusion": "Inspect and palpate the joint for a fluid effusion, comparing to the opposite side.",
  "Extension-aggravated posture": "Observe whether extending the spine/joint reproduces or worsens symptoms.",
  "FOOSH": "Confirm via history whether the injury was a fall onto an outstretched hand.",
  "Flexed posture": "Observe resting posture for a held flexed position.",
  "Fusiform joint swelling": "Inspect the digit/joint for a smooth, spindle-shaped swelling.",
  "Giving-way": "Ask about or observe episodes of the joint suddenly buckling during activity.",
  "Global loss of active AND passive motion": "Compare active and passive ROM in all planes; a proportional loss in both suggests a capsular pattern.",
  "Global restriction": "Assess ROM in all directions for a generalized, non-directional restriction.",
  "Guarded multi-level stiffness": "Palpate/move each spinal segment to check for stiffness spanning multiple levels rather than one.",
  "Hamstring tightness": "Perform a passive straight-leg raise or 90/90 test and observe end-range restriction.",
  "Head held in rotated/tilted posture": "Observe resting head position for fixed rotation or tilt.",
  "Immediate effusion": "Note whether swelling developed within minutes of injury.",
  "Inferior-pole tenderness": "Palpate the inferior pole of the patella directly.",
  "Instability jog / catch during active movement": "Observe active movement for a visible jog, catch, or shift suggesting instability.",
  "Intrinsic wasting": "Inspect the hand's intrinsic muscles (interossei/thenar/hypothenar) for atrophy, comparing sides.",
  "Ischial tuberosity tenderness": "Palpate the ischial tuberosity with the hip flexed to relax the hamstring origin.",
  "Joint-line swelling": "Inspect and palpate along the joint line for swelling.",
  "Jumper's history": "Confirm via history a sport involving repetitive jumping or landing.",
  "Lateral epicondyle tenderness": "Palpate directly over the lateral epicondyle (ECRB origin) with the elbow relaxed.",
  "Lateral epicondyle tenderness ~30° flexion": "Palpate the lateral epicondyle with the elbow positioned at roughly 30° flexion.",
  "Lateral joint-line tenderness": "Palpate the lateral joint line directly.",
  "Lateral shift": "Observe standing posture from behind for a visible lateral trunk shift.",
  "Lateral swelling/bruising": "Inspect the lateral aspect for visible swelling or bruising.",
  "Localised guarding": "Watch for asymmetric muscle bracing or tension around the painful segment during active movement, compared to the opposite side.",
  "Localised hand/forearm wasting in single nerve distribution": "Inspect the hand/forearm for muscle wasting confined to a single peripheral nerve's distribution.",
  "Localised paraspinal guarding": "Observe or palpate for muscle guarding confined to one paraspinal level rather than diffusely.",
  "Medial calcaneal tenderness": "Palpate the medial calcaneal tubercle, the plantar fascia origin.",
  "Medial epicondyle tenderness": "Palpate directly over the medial epicondyle (flexor-pronator origin).",
  "Medial joint-line tenderness": "Palpate the medial joint line directly.",
  "Medial swelling": "Inspect the medial aspect for visible swelling.",
  "Medial tenderness": "Palpate the medial structure directly for tenderness.",
  "Medial-ankle Tinel": "Percuss over the tarsal tunnel behind the medial malleolus, checking for tingling into the sole.",
  "Morning stiffness posture": "Ask about or observe stiffness on first waking or after rest that eases with movement.",
  "Muscle guarding": "Observe for reflexive muscle bracing limiting willingness to move the area.",
  "Neck-driven guarding": "Observe whether shoulder/arm guarding is triggered or worsened by neck movement.",
  "No effusion": "Inspect and palpate the joint to confirm no fluid swelling is present.",
  "No neuro signs": "Screen reflexes, sensation, and strength to confirm no neurological deficit.",
  "No neurological signs": "Screen reflexes, sensation, and strength to confirm no neurological deficit.",
  "No structural change; fatigue-related ache": "Inspect for structural change; its absence supports an overuse/fatigue rather than structural cause.",
  "No swelling": "Inspect and palpate to confirm no visible or palpable swelling.",
  "PSIS level difference": "Palpate both PSIS landmarks and compare their height in standing.",
  "Painful arc on elevation": "Observe active shoulder elevation for a painful arc, typically 60-120°.",
  "Painful mid-arc": "Observe active range of motion for pain localized to the middle portion of the arc.",
  "Palmar cord/nodule": "Palpate the palm for a firm longitudinal cord or nodule.",
  "Palpable A1-pulley nodule": "Palpate the A1 pulley at the base of the finger for a tender, catching nodule.",
  "Palpable gap": "Palpate along the tendon/muscle for a defect or gap suggesting rupture.",
  "Palpable step deformity": "Palpate the joint/bone contour for a step-off suggesting fracture or dislocation.",
  "Patellar maltracking": "Observe the patella during active knee extension for lateral tracking or tilt.",
  "Pelvic asymmetry": "Observe pelvic landmarks (ASIS/PSIS/iliac crests) bilaterally for height differences.",
  "Plantar callus under metatarsal heads": "Inspect the plantar forefoot for callus formation under the metatarsal heads.",
  "Possible bilateral arm signs": "Screen both upper limbs for neurological signs, not just the symptomatic side.",
  "Possible cord signs": "Screen for upper motor neuron (cord) signs — hyperreflexia, clonus, gait change.",
  "Possible deltoid/bicep wasting": "Inspect the deltoid and biceps for muscle bulk loss, comparing sides.",
  "Possible foot-drop": "Observe gait, or have the patient heel-walk, watching for slapping/dragging of the foot.",
  "Posterior fluctuant swelling over olecranon": "Inspect/palpate the posterior elbow over the olecranon for a soft, fluctuant swelling.",
  "Posterior sag": "With the knee flexed to 90°, view from the side for the tibia sagging posteriorly relative to the femur.",
  "Prominent first rib on palpation": "Palpate above the clavicle in the supraclavicular fossa for a prominent first rib.",
  "Protective stiffness": "Observe for reduced willingness to move through range, protecting the painful area.",
  "Proximal-volar-forearm tenderness": "Palpate the proximal volar forearm, over the flexor-pronator mass.",
  "Quad wasting": "Inspect the thigh (especially VMO) for quadriceps muscle bulk loss, comparing sides.",
  "Quadriceps inhibition": "Observe or test for reduced voluntary quadriceps activation (e.g. a delayed straight-leg raise lag).",
  "Radial-styloid swelling/tenderness": "Inspect and palpate over the radial styloid.",
  "Recurrent swelling": "Ask about or observe a pattern of swelling that recurs with activity.",
  "Reduced arm swing": "Observe gait for diminished arm swing on the affected side.",
  "Reduced extension": "Compare active/passive extension to the unaffected side or normal values.",
  "Reduced stride": "Observe gait for a shortened stride length.",
  "Restricted C1-2 rotation": "Passively rotate the fully flexed cervical spine (isolating C1-2) and compare range side to side.",
  "Retromalleolar swelling/tenderness": "Inspect and palpate the area just behind the malleolus.",
  "Rib hump on forward bend": "Observe the back during forward bending for a rotational rib hump.",
  "Rib-angle tenderness": "Palpate along the posterior rib angles for point tenderness.",
  "Rigid structural kyphosis (adolescent)": "Observe whether a thoracic kyphosis corrects with active extension; a curve that stays rigid suggests a structural cause.",
  "Runner": "Confirm via history that the patient is a runner (relevant activity/loading pattern).",
  "Shoulder/pelvic asymmetry": "Observe shoulder and pelvic landmarks together for combined asymmetry.",
  "Snuffbox swelling/tenderness": "Palpate the anatomical snuffbox with the thumb extended.",
  "Squared thumb base": "Inspect the base of the thumb for a squared, boxy appearance.",
  "Step deformity / swelling over the AC joint": "Inspect and palpate the AC joint for a visible or palpable step/prominence.",
  "Swelling above joint line": "Inspect just proximal to the joint line for swelling.",
  "Swelling/tenderness of 1st MTP": "Inspect and palpate the 1st MTP joint for swelling and tenderness.",
  "Taut bands": "Palpate the muscle belly for a taut, rope-like band.",
  "Tender bicipital groove": "Palpate the bicipital groove with the arm at the side, internally rotated about 10°.",
  "Tender over greater trochanter": "Palpate directly over the greater trochanter with the patient side-lying.",
  "Tenderness ~4cm distal to lateral epicondyle": "Palpate along the extensor mass roughly 4cm distal to the lateral epicondyle.",
  "Tendon thickening/tenderness": "Palpate the tendon along its length for thickening or tenderness, comparing to the unaffected side.",
  "Thenar wasting": "Inspect the thenar eminence for muscle bulk loss, comparing sides.",
  "Tinel medial": "Percuss over the medial nerve trunk (e.g. cubital tunnel) for distal tingling.",
  "Trendelenburg": "Observe single-leg stance for a contralateral pelvic drop.",
  "Trigger points (SCM, upper trapezius, levator scapulae)": "Palpate SCM, upper trapezius, and levator scapulae for tender, taut nodules that reproduce referred pain.",
  "Trigger points (trapezius, rhomboids, levator scapulae)": "Palpate trapezius, rhomboids, and levator scapulae for tender, taut nodules that reproduce referred pain.",
  "Trigger points on palpation": "Palpate the muscle for a taut band with a hypersensitive point reproducing referred pain.",
  "Triphasic colour change (white-blue-red) with cold": "Ask about or observe digit colour change through white, blue, then red phases with cold exposure.",
  "Ulnar-MCP swelling/tenderness": "Inspect and palpate the ulnar side of the thumb MCP joint.",
  "Ulnar-dorsal tenderness ± subluxation": "Palpate the ulnar-dorsal wrist for tenderness and check for subluxation with pronation/supination.",
  "Ulnar-sided swelling": "Inspect the ulnar side of the wrist/hand for visible swelling.",
  "Unilateral muscle guarding": "Observe for muscle bracing confined to one side only.",
  "Unilateral suboccipital tenderness": "Palpate the suboccipital region on each side and compare for one-sided tenderness.",
  "VMO wasting": "Inspect the vastus medialis obliquus (distal-medial thigh) for muscle bulk loss.",
  "Valgus laxity": "Apply a gentle valgus stress at slight flexion and compare end-feel/gapping to the opposite side.",
  "Varus laxity": "Apply a gentle varus stress at slight flexion and compare end-feel/gapping to the opposite side.",
  "Varus/valgus": "Observe standing alignment for varus or valgus deviation at the joint.",
  "Visible muscle spasm": "Observe or palpate the muscle for visible or palpable involuntary spasm.",
  "Visible muscle spasm / guarding on movement": "Observe the muscle during active movement for visible spasm or guarding.",
  "Visible supraspinatus/infraspinatus wasting": "Inspect the posterior/superior scapula for supraspinatus/infraspinatus muscle bulk loss.",
  "Visible/audible snap with movement": "Observe or listen during active movement for a visible or audible snap.",
  "Wide-based gait": "Observe gait for an increased base of support.",
  "antalgic gait": "Observe walking for a pain-avoidant limp, typically a shortened stance phase on the painful side.",
  "antalgic heel-strike": "Observe gait for reduced or altered heel-strike on the painful side.",
  "arm held guarded": "Observe whether the arm is held close to the body, protected from movement.",
  "athlete": "Confirm via history the patient's sport/activity level.",
  "bruising": "Inspect the area for visible bruising.",
  "calf wasting": "Inspect calf circumference/bulk, comparing sides.",
  "catching": "Ask the patient to move through range and observe or feel for a mechanical catch.",
  "catching/locking": "Ask the patient to move the joint through range and observe or feel for a mechanical catch or lock.",
  "clicking": "Move the joint through range and listen/feel for an audible or palpable click.",
  "crepitus": "Palpate the joint while it moves through range, feeling for grinding or grating.",
  "collapsing arch": "Observe the medial longitudinal arch in standing for collapse.",
  "deformity": "Inspect the region for visible structural deformity compared to the normal side.",
  "dermatomal signs": "Test light touch/pinprick sensation across the relevant dermatomes, comparing sides.",
  "dorsiflexion block": "Passively dorsiflex the ankle and note any bony or soft-tissue block to end-range.",
  "drop of the arm": "Have the patient slowly lower the arm from full elevation and watch for a sudden drop.",
  "feeling of giving way": "Ask about or observe episodes of the joint feeling like it will buckle.",
  "gluteal/quad wasting": "Inspect the buttock and thigh for gluteal/quadriceps muscle bulk loss.",
  "intrinsic wasting": "Inspect the hand's intrinsic muscles (interossei/thenar/hypothenar) for atrophy, comparing sides.",
  "jammed history": "Confirm via history an axial-load/jamming mechanism to the digit.",
  "marked guarding": "Observe for pronounced muscle bracing that clearly limits movement.",
  "marked swelling": "Inspect for obvious, significant swelling.",
  "median signs": "Screen the median nerve distribution for sensory/motor signs (thumb, index, middle finger, thenar weakness).",
  "minimal wasting": "Inspect muscle bulk closely for subtle atrophy, comparing sides.",
  "muscle bulk loss": "Inspect and measure limb circumference to compare muscle bulk side to side.",
  "no wasting": "Inspect muscle bulk to confirm no atrophy is present.",
  "often no wasting": "Inspect muscle bulk to confirm no atrophy is present.",
  "pain on squeeze": "Squeeze the structure and note reproduction of pain.",
  "positive Thompson": "Squeeze the calf with the patient prone and note absence of plantarflexion.",
  "positive flick sign": "Ask whether the patient flicks/shakes the wrist for symptom relief.",
  "possible crepitus": "Palpate the joint while it moves through range, feeling for grinding or grating.",
  "possible sulcus sign": "Pull the arm downward with the patient relaxed and observe for a sulcus below the acromion.",
  "reduced DF": "Compare active/passive ankle dorsiflexion to the opposite side.",
  "reduced grip": "Test grip strength with a dynamometer and compare sides.",
  "reduced motion": "Compare active and passive range of motion to the opposite side or normal values.",
  "reduced toe extension": "Compare active great toe extension strength/range to the opposite side.",
  "ring/little-finger flexion contracture": "Inspect the ring/little finger for a fixed flexion posture that doesn't fully passively extend.",
  "splayed toes": "Inspect the forefoot in standing for widened spacing between the toes.",
  "subtle scapular dyskinesis": "Observe the scapula during repeated arm elevation/lowering for abnormal timing or winging.",
  "tender apex": "Palpate the apex (tip) of the structure directly.",
  "tender cuff insertion": "Palpate the rotator cuff insertion just distal to the greater tuberosity.",
  "tenderness": "Palpate the area systematically to localize the point of maximal tenderness.",
  "thin heel pad": "Palpate the plantar heel pad thickness, comparing to the opposite side.",
  "valgus laxity (thrower)": "Apply a gentle valgus stress at 20-30° elbow flexion and compare laxity/end-feel to the opposite side.",
  "± crepitus": "Palpate the joint through range, feeling for grinding or grating.",
  "± loose-body locking": "Ask about or observe episodes of sudden locking suggesting an intra-articular loose body.",
  "± posterior bruising": "Inspect the posterior aspect for bruising.",
  "± sciatic signs": "Screen for sciatic nerve involvement — posterior leg pain, sensory change, or weakness.",
  "± swelling": "Inspect and palpate for swelling.",
  "“too-many-toes”": "Observe the heel from behind in standing — seeing more toes laterally than normal suggests forefoot abduction/flatfoot.",
};

const PALPATION_HOW_TO = {
  "1st CMC joint": "Palpate the base of the thumb where it meets the wrist, just distal to the radial styloid, with axial grind.",
  "1st dorsal compartment": "Palpate over the radial styloid where the APL/EPB tendons cross, thumb tucked into a fist.",
  "A1-pulley nodule / catching on active flexion-extension": "Palpate the palmar base of the affected finger (A1 pulley) while the patient actively flexes/extends the digit.",
  "AC joint": "Palpate the small gap between the distal clavicle and acromion, just medial to the tip of the shoulder.",
  "Achilles tendon — insertional": "Palpate the Achilles insertion onto the calcaneus, at the posterior heel.",
  "Achilles tendon — mid-portion": "Palpate the tendon 2-6cm proximal to its calcaneal insertion.",
  "Adductor origin": "Palpate the adductor longus origin at the pubic ramus with the hip slightly abducted.",
  "Anatomical snuffbox": "Palpate the depression on the radial-dorsal wrist between the EPL and APL/EPB tendons with the thumb extended.",
  "Bicipital groove": "Palpate the groove on the anterior humerus with the arm at the side, internally rotated about 10°.",
  "C0–C1": "Palpate just below the occiput for atlanto-occipital segmental motion/tenderness.",
  "C1–C2": "Palpate lateral to the C2 spinous process for atlanto-axial segmental motion/tenderness.",
  "Central weight-bearing heel pad (vs medial origin)": "Palpate the central plantar heel pad under weight-bearing load, comparing to the medial calcaneal tubercle.",
  "Cervical palpation (site not further specified in library)": "Palpate the cervical paraspinal region generally for tenderness or muscle guarding.",
  "Costochondral Junction Tenderness": "Palpate each costochondral junction along the sternal border for point tenderness.",
  "Cuboid": "Palpate the lateral midfoot, distal to the calcaneus.",
  "DIP (Heberden's) nodes": "Palpate the distal interphalangeal joints for bony enlargement.",
  "Deep segmental stabiliser insufficiency": "Assess deep multifidus/transversus activation via palpation during a low-load contraction test.",
  "ECU tendon": "Palpate the extensor carpi ulnaris tendon on the ulnar-dorsal wrist during resisted wrist extension/ulnar deviation.",
  "Flexor tendon nodule/catching at A1 pulley": "Palpate the A1 pulley at the metacarpal head while the patient flexes/extends the finger.",
  "Fluctuance/temperature assessment": "Palpate for fluid fluctuance and compare skin temperature to the surrounding or contralateral area.",
  "Greater tuberosity": "Palpate just distal to the anterolateral acromion for the greater tuberosity.",
  "Iliocostalis": "Palpate the most lateral paraspinal column, lateral to longissimus.",
  "Ischial tuberosity": "Palpate the ischial tuberosity with the hip flexed to relax the gluteal mass.",
  "Levator Scapulae (Table 8-8)": "Palpate the superomedial angle of the scapula, following the muscle up to the upper cervical transverse processes.",
  "Levator scapulae": "Palpate the superomedial angle of the scapula, following the muscle up to the upper cervical transverse processes.",
  "Localize strained muscle": "Palpate along the muscle belly to localize the point of maximal tenderness/spasm.",
  "Lumbar paraspinal fascial tightness": "Palpate the lumbar paraspinal fascia for tightness or restriction, comparing sides.",
  "Medial calcaneal tubercle / fascia origin": "Palpate the medial calcaneal tubercle, the plantar fascia's origin, with the foot slightly dorsiflexed.",
  "Metatarsal heads / plantar plate": "Palpate each metatarsal head from plantar and dorsal surfaces, applying dorsal stress to check the plantar plate.",
  "Multifidus": "Palpate directly lateral to the spinous processes for multifidus bulk/tenderness.",
  "Myofascial trigger point / taut band network": "Palpate the muscle belly for a taut band and a hypersensitive nodule that reproduces referred pain.",
  "Navicular": "Palpate the medial midfoot, roughly one hand's width anterior to the medial malleolus.",
  "Neural (sciatic) lower-limb tension line": "Palpate along the sciatic nerve course during a neural tension test (e.g. SLR) for reproduction of symptoms.",
  "Neural canal / foraminal narrowing pattern": "Correlate with a foraminal compression maneuver (e.g. Spurling's) rather than direct palpation alone.",
  "Olecranon": "Palpate the tip and surrounding bursa of the olecranon for swelling/tenderness.",
  "PIP (Bouchard's) nodes": "Palpate the proximal interphalangeal joints for bony enlargement.",
  "PSIS": "Palpate the posterior superior iliac spines bilaterally and compare height/position.",
  "Palmar fascia cords/nodules (ring/little finger)": "Palpate the palm over the ring/little finger rays for a firm longitudinal cord or nodule.",
  "Palpable tendon gap": "Palpate along the tendon's expected course for a gap or defect suggesting rupture.",
  "Paraspinal / quadratus lumborum fascial tension": "Palpate the region between the 12th rib and iliac crest for tension/tenderness.",
  "Pars interarticularis / anterior longitudinal ligament": "Palpate the lumbar segments for tenderness over the pars/ALL region; correlate with extension-based provocation.",
  "Patellar tendon": "Palpate from the inferior pole of the patella to the tibial tuberosity.",
  "Peroneal tendon — behind lateral malleolus": "Palpate the peroneal tendons just posterior to the lateral malleolus, with resisted eversion.",
  "Plantar plate / sesamoid": "Palpate the plantar 1st MTP joint and sesamoids with dorsiflexion stress.",
  "Posterior sacroiliac ligament / thoracolumbar fascia": "Palpate just below the PSIS for the long dorsal SI ligament.",
  "Pubic ramus": "Palpate along the superior pubic ramus for tenderness.",
  "Rhomboids": "Palpate between the medial scapular border and spine for tenderness/spasm.",
  "SCM": "Palpate the sternocleidomastoid from mastoid to sternum/clavicle with the head slightly rotated away.",
  "Sacral sulcus — weak inter-rater reliability": "Palpate the sacral sulcus bilaterally for symmetry (note: low inter-examiner reliability).",
  "Scalenes (cross-check vs C02/C08)": "Palpate the scalenes in the posterior triangle of the neck, above the clavicle.",
  "Segmental": "Perform posterior-to-anterior spring palpation at each segment for stiffness/tenderness.",
  "Segmental (C2–C7 facets)": "Palpate each cervical facet column from C2 to C7 for tenderness/hypomobility.",
  "Segmental (facet-level)": "Spring-test each spinal segment individually for restricted or painful motion.",
  "Semispinalis (capitis/cervicis)": "Palpate deep to the upper trapezius, just lateral to midline, for tenderness.",
  "Serratus Ant/Post": "Palpate along the lateral ribcage (serratus anterior) or upper/lower back (serratus posterior) for tenderness/weakness on winging.",
  "Soft tissue": "Palpate the surrounding soft tissue generally for tone, tenderness, and swelling.",
  "Soft tissue (cervical paraspinals)": "Palpate the cervical paraspinal muscles bilaterally for tone/tenderness.",
  "Splenius (capitis/cervicis)": "Palpate beneath the upper trapezius/SCM, deep in the posterolateral neck.",
  "Strained muscle (localize)": "Palpate along the muscle to localize the exact point of strain.",
  "Suboccipital": "Palpate just below the occiput, lateral to midline.",
  "TMT joints": "Palpate the tarsometatarsal joints on the dorsum of the midfoot.",
  "Taut bands/trigger points reproducing referred pain": "Palpate for a taut band; sustained pressure on the nodule should reproduce the patient's referred pain pattern.",
  "Thoracolumbar fascia tightness": "Palpate the thoracolumbar fascia over the lower back for restriction/tightness.",
  "Trapezius": "Palpate upper, middle, and lower trapezius fibers for tone and tenderness.",
  "Ulnar aspect of thumb MCP": "Palpate the ulnar collateral ligament of the thumb MCP joint.",
  "Ulnar-sided wrist": "Palpate the ulnar side of the wrist between the ECU and FCU tendons.",
  "Upper trapezius": "Palpate the upper trapezius from the occiput to the shoulder for tone/trigger points.",
};

function FindingCardList({ category, options, selected, onToggle, interpretations, regionKey }) {
  const values = selected ? selected.split(", ").filter(Boolean) : [];
  const icon = FINDING_CATEGORY_ICON[category] || "ti-eye";
  const howTo = category === "observation" ? OBSERVATION_HOW_TO : category === "palpation" ? PALPATION_HOW_TO : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {options.map((o, i) => (
        <FindingCard
          key={o}
          index={i + 1}
          icon={icon}
          label={o}
          active={values.includes(o)}
          instruction={howTo?.[o]}
          interpretation={interpretations?.[o]?.text}
          photoId={findingPhotoId(regionKey, category, o)}
          onToggle={() => onToggle(o)}
        />
      ))}
    </div>
  );
}

export default function ConditionObjectiveAssessment({ data, setData, selectedRegions, onStartOutcomeMeasure }) {
  const regions = selectedRegions || [];
  // Picking 2+ regions in Subjective used to only ever show the FIRST
  // matching region's condition-wise assessment here -- the rest were
  // simply unreachable on this page (2026-09-12, Aditi: "after selecting
  // 2 or more region its showing only one region"). matchedConfigs keeps
  // every region actually in play; a small tab row below lets the
  // therapist switch between them, each with its own independent
  // data.conditionAssessment_<regionKey> section, same tab pattern
  // ROM/MMT/Special Tests already use for their own region switching.
  const matchedConfigs = useMemo(() => REGION_CONFIGS.filter((cfg) => regions.some(cfg.matchesRegion)), [regions]);
  const [activeConfigKey, setActiveConfigKey] = useState(null);
  const config = matchedConfigs.find((c) => c.key === activeConfigKey) || matchedConfigs[0] || REGION_CONFIGS[0];

  const [state, setField] = useSectionData(data, setData, `conditionAssessment_${config.key}`);
  // Same global data.pain the wizard's own Pain step (PainSection,
  // orthoCommonSections.jsx) reads/writes -- pain isn't condition-specific,
  // so this shares that one record rather than forking a second copy per
  // condition. Body Chart deliberately left out here (2026-09-24, Aditi:
  // "pain only not body chart, only pain tab") -- that stays the wizard's
  // own Pain step's job; this tab is just the character/severity/pattern
  // fields, quick to fill while already looking at a specific condition.
  const [painData, setPain] = useSectionData(data, setData, "pain");
  const [activeId, setActiveId] = useState(null);
  const [activeSubtopic, setActiveSubtopic] = useState("observation");
  // Switching regions should land on that region's own front screen, not
  // whatever condition state the previous region was showing.
  useEffect(() => { setActiveId(null); setActiveSubtopic("observation"); }, [config.key]);
  // Content used to stay hidden behind this tap -- Aditi wants it visible
  // immediately since the ranking is already computed synchronously from
  // Subjective data (engineResult/rankedIds below), so the button is now
  // just a "re-run" affordance that replays the "Analyzing…" beat in place
  // rather than a reveal gate (2026-09-10, Aditi: "motion graphic when we
  // click on it"; 2026-09-13, Aditi: "show it normally even we dont click
  // button").
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  function runSuggestAnalysis() {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 550);
  }

  const regionPicked = regions.some(config.matchesRegion);

  const engineResult = useMemo(() => {
    if (!regionPicked) return null;
    try {
      if (!config.hasData(data)) return null;
      return config.run(data);
    } catch { return null; }
  }, [regionPicked, config, data]);

  // Shoulder bridges SH0x engine ids -> S0x condition-library ids by
  // normalized name (see SHOULDER_ID_BY_NAME above); every other region's
  // engine already emits the same ids the condition library uses.
  const matchById = useMemo(() => {
    if (!engineResult) return {};
    if (!config.matchByName) return Object.fromEntries(engineResult.conditions.map((c) => [c.id, c]));
    const out = {};
    engineResult.conditions.forEach((c) => {
      const realId = config.nameIdMap[normalizeName(c.name)];
      if (realId) out[realId] = c;
    });
    return out;
  }, [engineResult, config]);

  const rankedIds = useMemo(() => {
    if (!engineResult) return [];
    if (!config.matchByName) return engineResult.conditions.filter((c) => c.matchTier !== "Unlikely").map((c) => c.id);
    return Object.entries(matchById).filter(([, m]) => m.matchTier !== "Unlikely").map(([id]) => id);
  }, [engineResult, config, matchById]);

  const order = useMemo(
    () => [...rankedIds, ...config.order.filter((id) => !rankedIds.includes(id))],
    [rankedIds, config]
  );
  const selectedId = activeId || rankedIds[0] || config.order[0];
  const condition = config.conditions[selectedId];

  // Switching condition jumps back to the first subtopic page.
  useEffect(() => { setActiveSubtopic("observation"); }, [selectedId]);

  const redFlag = config.getRedFlag(engineResult);

  const v = (module, sub) => state[fieldKey(selectedId, module, sub)] || "";
  const sv = (module, sub, val) => setField(fieldKey(selectedId, module, sub), val);
  const toggleMulti = (module, sub, option) => {
    const cur = v(module, sub) ? v(module, sub).split(", ").filter(Boolean) : [];
    sv(module, sub, (cur.includes(option) ? cur.filter((x) => x !== option) : [...cur, option]).join(", "));
  };
  const toggleSingle = (module, sub, option) => sv(module, sub, v(module, sub) === option ? "" : option);

  const regionTabs = matchedConfigs.length > 1 && (
    <div className="region-tab-row-wrap">
      <div className="region-tab-row">
        {matchedConfigs.map((cfg) => (
          <button
            type="button"
            key={cfg.key}
            className={"region-tab" + (cfg.key === config.key ? " region-tab-active" : "")}
            onClick={() => setActiveConfigKey(cfg.key)}
          >
            {cfg.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (!regionPicked || !condition) {
    return (
      <div>
        {regionTabs}
        <EmptyNote>{config.emptyNote}</EmptyNote>
      </div>
    );
  }

  const isV1 = config.schema === "v1";
  const matchedCondition = matchById[selectedId];
  const specialTestItems = isV1 ? condition.keyExams : condition.specialTests;
  const rankedCount = rankedIds.length;
  const cyriaxResistedTests = cyriaxTestsFor(config.key, "resistedTests");
  const cyriaxPassiveTests = cyriaxTestsFor(config.key, "passiveROM");
  const hasCyriaxCatalogue = cyriaxResistedTests.length > 0 || cyriaxPassiveTests.length > 0;
  const resistedTests = hasCyriaxCatalogue ? cyriaxResistedTests : (condition.sttt?.resisted || []).map((f, i) => ({ ...f, id: "r" + i }));
  const passiveTests = hasCyriaxCatalogue ? cyriaxPassiveTests : (condition.sttt?.passive || []).map((f, i) => ({ ...f, id: "p" + i }));

  return (
    <div>
      {regionTabs}

      {/* Differential Inference banner -- same gradient-card/Re-analyze
          treatment as the Stitch reference (2026-09-24, Aditi: "make the AI
          page of ortho like this same to same"), replacing the old
          "🧠 Suggest probable objective assessment" button. Still the same
          underlying behaviour: the ranked cards below are always live off
          the current Subjective data (2026-09-13, Aditi: "show it normally
          even we dont click button") -- Re-analyze just replays the
          "Analyzing…" beat as a visual refresh cue, it doesn't reveal
          anything new.
          Not sticky: when this renders inside the AI Objective Assessment
          wizard step, it sat under the same scrolling ancestor as that
          step's own sticky .topbar (journey dots + back button) and, being
          `top: 0` itself, rode straight to the very top of the screen on
          scroll -- landing on top of / interleaved with the topbar instead
          of under it (2026-09-16, Aditi: "the header it's all mixing up
          it's clicking so bad ... everything is vibrating"). Matches the
          single-sticky-header-per-screen pattern already established for
          .topbar/Cardio's header rather than stacking a second one. */}
      <div className="obj-diag-banner">
        <div className="obj-diag-banner-main">
          <span className={"obj-diag-banner-icon" + (isAnalyzing ? " obj-ai-thinking-icon" : "")}>🧠</span>
          <div style={{ minWidth: 0 }}>
            <div className="obj-diag-banner-title-row">
              <span className="obj-diag-banner-title">Differential Inference</span>
              {engineResult && <span className="obj-diag-banner-badge">{isAnalyzing ? "Analyzing…" : "Live Match"}</span>}
            </div>
            <div className="obj-diag-banner-sub">
              {engineResult
                ? `Matches Subjective answers — ${config.label}, ${rankedCount} condition${rankedCount === 1 ? "" : "s"} matched.`
                : `Matches conditions to your Subjective answers — ${config.label}, fill Subjective first.`}
            </div>
          </div>
        </div>
        <button type="button" className="obj-diag-banner-btn" onClick={runSuggestAnalysis} disabled={isAnalyzing}>
          <i className="ti ti-refresh" aria-hidden="true"></i>
          <span>Re-analyze</span>
        </button>
      </div>

      <>
        {redFlag && (
            <div style={{ marginTop: 12, marginBottom: 10, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${BRAND.red}`, background: BRAND.redBg }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: BRAND.red, marginBottom: 3 }}>🚨 {redFlag.title}</div>
              {redFlag.lines.map((l, i) => (
                <div key={i} style={{ fontSize: "0.78rem", color: BRAND.red, marginTop: i === 0 ? 0 : 3 }}>{l}</div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <HypothesisGrid
              conditions={config.conditions}
              order={order}
              matchById={matchById}
              activeId={selectedId}
              onSelect={setActiveId}
            />
          </div>

          {matchedCondition && (
            <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginBottom: 6 }}>
              {matchedCondition.matchTier} · {matchedCondition.supportingMatched.length}/{matchedCondition.supportingTotal} supporting signs from Subjective
            </div>
          )}

          <SubtopicTabs
            active={activeSubtopic}
            onSelect={setActiveSubtopic}
            counts={{
              observation: (isV1 ? condition.observationChecklist : condition.observation)?.length || 0,
              palpation: (isV1 ? condition.palpationZones : condition.palpation)?.length || 0,
            }}
          />
          <div className="obj-subtopic-page">

          {/* "Suggested tests" (Required/Recommended, or Key Exams for v1
              regions) intentionally not rendered here (2026-09-12, Aditi:
              remove it from every AI Objective Assessment page, she'll give
              it its own dedicated place later). The data itself is untouched
              -- still on condition.required/recommended/keyExams (or
              requiredTests/recommendedTests for v1 regions) -- so that future
              view can read it directly, same as this block did. */}

          {activeSubtopic === "pain" && (
            <ModuleCard label="Pain" subtitle="Character, severity & pattern">
              <div style={{ marginBottom: 10 }}>
                <ScaleField label="Current" value={painData.current} onChange={(v) => setPain("current", v)} />
              </div>
              <div className="vitals-grid" style={{ marginBottom: 10 }}>
                <NumberField label="Best (24h)" value={painData.best} onChange={(v) => setPain("best", v)} unit="/10" width="45%" />
                <NumberField label="Worst (24h)" value={painData.worst} onChange={(v) => setPain("worst", v)} unit="/10" width="45%" />
              </div>
              <SelectField label="Character" type="multi" options={["Dull", "Sharp", "Burning", "Throbbing", "Aching", "Shooting", "Stabbing"]} value={painData.character} onChange={(v) => setPain("character", v)} />
              <SelectField label="Pattern" type="single" options={["Constant", "Intermittent", "Activity-related", "Night pain"]} value={painData.pattern} onChange={(v) => setPain("pattern", v)} />
            </ModuleCard>
          )}

          {activeSubtopic === "observation" && <>
          {(() => { const obsOptions = isV1 ? condition.observationChecklist : condition.observation; const pOptions = isV1 ? condition.postureChecklist : condition.posture; return (
          <>
          <ModuleCard label="Observation" subtitle="General findings on visual inspection" count={obsOptions?.length || 0}>
            <FindingCardList category="observation" options={obsOptions} selected={v("observation", "chips")} onToggle={(o) => toggleMulti("observation", "chips", o)} interpretations={condition.findingInterpretations?.observation} regionKey={config.key} />
          </ModuleCard>

          <ModuleCard label="Posture & Structural Alignment" subtitle="Record observed positional adaptations" count={pOptions?.length || 0}>
            <FindingCardList category="posture" options={pOptions} selected={v("posture", "chips")} onToggle={(o) => toggleMulti("posture", "chips", o)} interpretations={condition.findingInterpretations?.posture} regionKey={config.key} />
          </ModuleCard>
          </>
          ); })()}

          {condition.fascia && (
            <ModuleCard label="Fascia" color="#EC4899" defaultOpen={false}>
              <div style={{ fontSize: "0.8rem", color: BRAND.ink, lineHeight: 1.5 }}>{condition.fascia}</div>
            </ModuleCard>
          )}
          </>}

          {activeSubtopic === "palpation" && <>
          {(() => { const palpOptions = isV1 ? condition.palpationZones : condition.palpation; return (
          <ModuleCard label="Palpation" subtitle="Findings on manual palpation" count={palpOptions?.length || 0}>
            {palpOptions?.length > 0 ? (
              <FindingCardList category="palpation" options={palpOptions} selected={v("palpation", "chips")} onToggle={(o) => toggleMulti("palpation", "chips", o)} interpretations={condition.findingInterpretations?.palpation} regionKey={config.key} />
            ) : (
              <EmptyNote>Not specified in condition library.</EmptyNote>
            )}
          </ModuleCard>
          ); })()}
          </>}

          {activeSubtopic === "cpa" && <>
          <ModuleCard label="CPA — NKT" color="#D97706">
            {isV1 ? (
              <>
                {condition.cpaNkt.muscle && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                    <InfoButton imageTrigger fallbackIcon="ti-brain" title={condition.cpaNkt.muscle} richItem={nktRichItemFor(condition.cpaNkt.muscle)} />
                    <SubLabel>{condition.cpaNkt.muscle}</SubLabel>
                  </div>
                )}
                <InfoCard icon="🔎" label="Helps find" tint="violet">{condition.cpaNkt.narrative}</InfoCard>
                <div style={{ marginTop: 10 }}>
                  <ChipGroup options={["Facilitated", "Inhibited", "Overactive"]} selected={v("cpaNkt", "state")} onToggle={(o) => toggleSingle("cpaNkt", "state", o)} multi={false} />
                </div>
              </>
            ) : condition.cpa.applicable === false ? (
              <EmptyNote>{condition.cpa.reason}</EmptyNote>
            ) : (
              <>
                {condition.cpa.muscles.map((m, i) => {
                  const sel = v("cpa", "m" + i);
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <InfoButton imageTrigger fallbackIcon="ti-brain" title={m.name} richItem={nktRichItemFor(m.name)} />
                        <SubLabel>{m.name} — <span style={{ color: BRAND.amber }}>{m.state}</span></SubLabel>
                      </div>
                      <ChipGroup options={["Facilitated", "Inhibited", "Overactive"]} selected={sel} onToggle={(o) => toggleSingle("cpa", "m" + i, o)} multi={false} />
                    </div>
                  );
                })}
                <InfoCard icon="🔎" label="Helps find" tint="violet">{condition.cpa.pattern}</InfoCard>
              </>
            )}
          </ModuleCard>
          </>}

          {activeSubtopic === "rom" && config.romMovements && (
            <ModuleCard label={config.romLabel} color="#059669">
              {/* Same Stepper + "Normal — document" quick-fill + Active/
                  Passive/Resisted mode toggle the app's real Range of
                  Motion step (RomSection/RomMovementCard in
                  orthoRegionAssessments.jsx) already uses — not a
                  lookalike, the actual shared components. Limb-joint
                  regions get L/R columns (config.romBilateral), matching
                  ROM_DATA's own bilateral:true for those joints; spine
                  regions already model Left/Right as separate movement
                  rows (e.g. "Rotation Left"/"Rotation Right"), same as
                  ROM_DATA's bilateral:false there, so stay single-column. */}
              <div style={{ marginBottom: 8 }}>
                <Segmented
                  options={["Active", "Passive", "Resisted"]}
                  value={v("rom", "mode") || "Active"}
                  onChange={(mode) => sv("rom", "mode", mode)}
                />
              </div>
              {config.romBilateral && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 68px 68px", gap: 8, paddingBottom: 6, borderBottom: "1.5px solid #ECE9F7", marginBottom: 2 }}>
                  <span style={{ fontSize: "0.656rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: BRAND.grayLight }}>Movement</span>
                  <span style={{ fontSize: "0.656rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: BRAND.grayLight, textAlign: "center" }}>L</span>
                  <span style={{ fontSize: "0.656rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: BRAND.grayLight, textAlign: "center" }}>R</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {config.romMovements.map((m, i) => {
                  const max = m.normal ? m.normal * 2 : 200;
                  const rowStyle = { borderTop: i === 0 ? "none" : "1px solid #F5F3FB", padding: "9px 0" };

                  const normalStr = m.normal != null ? String(m.normal) : "";

                  if (config.romBilateral) {
                    const rawL = v("rom", m.id + "_left");
                    const rawR = v("rom", m.id + "_right");
                    const valL = rawL || normalStr;
                    const valR = rawR || normalStr;
                    // Grade is judged off what was actually confirmed, not
                    // the suggested-normal default the Stepper shows before
                    // that — otherwise every untouched row would flash "WNL".
                    const gradeL = m.normal && rawL ? RESTRICTION_GRADE(Number(rawL), m.normal) : null;
                    const gradeR = m.normal && rawR ? RESTRICTION_GRADE(Number(rawR), m.normal) : null;
                    return (
                      <div key={m.id} style={rowStyle}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 68px 68px", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <InfoButton imageTrigger size="md" fallbackIcon="ti-arrows-maximize" title={m.label} richItem={romRichItemFor(config.key, m.id)} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: "0.845rem", color: BRAND.ink, letterSpacing: "-0.01em" }}>{m.label}</div>
                              <div style={{ fontSize: "0.656rem", color: BRAND.grayLight, fontWeight: 500 }}>Normal {m.normal}°</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <Stepper value={valL} onChange={(nv) => sv("rom", m.id + "_left", nv)} min={0} max={max} />
                            {gradeL && <span style={{ fontSize: "0.92rem", fontWeight: 800, color: gradeL.color }}>{gradeL.label}</span>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <Stepper value={valR} onChange={(nv) => sv("rom", m.id + "_right", nv)} min={0} max={max} />
                            {gradeR && <span style={{ fontSize: "0.92rem", fontWeight: 800, color: gradeR.color }}>{gradeR.label}</span>}
                          </div>
                        </div>
                        {m.normal != null && (
                          <div style={{ marginTop: 7 }}>
                            <button
                              type="button" className="rom-normal-btn"
                              onClick={() => { sv("rom", m.id + "_left", String(m.normal)); sv("rom", m.id + "_right", String(m.normal)); }}
                            >
                              ✓ Normal — document N={m.normal}°
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  const rawVal = v("rom", m.id);
                  const val = rawVal || normalStr;
                  const grade = m.normal && rawVal ? RESTRICTION_GRADE(Number(rawVal), m.normal) : null;
                  return (
                    <div key={m.id} style={rowStyle}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <InfoButton imageTrigger size="md" fallbackIcon="ti-arrows-maximize" title={m.label} richItem={romRichItemFor(config.key, m.id)} />
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.845rem", color: BRAND.ink, letterSpacing: "-0.01em" }}>{m.label}</span>
                            <span style={{ fontSize: "0.656rem", color: BRAND.grayLight, fontWeight: 500 }}>Normal {m.normal}°</span>
                          </div>
                        </div>
                        <Stepper value={val} onChange={(nv) => sv("rom", m.id, nv)} min={0} max={max} />
                      </div>
                      {grade && (
                        <div style={{ fontSize: "0.92rem", fontWeight: 800, color: grade.color, textAlign: "right", marginTop: 2 }}>{grade.label}</div>
                      )}
                      {m.normal != null && (
                        <div style={{ marginTop: 7 }}>
                          <button type="button" className="rom-normal-btn" onClick={() => sv("rom", m.id, String(m.normal))}>
                            ✓ Normal — document N={m.normal}°
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ModuleCard>
          )}

          {activeSubtopic === "mmt" && (() => { const muscles = mmtMusclesFor(config.key); return (
            <ModuleCard label="MMT" subtitle="Muscle strength grading (0–5)" count={muscles.length}>
              {muscles.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {muscles.map((m, i) => {
                    const valL = v("mmt", m.id + "_left");
                    const valR = v("mmt", m.id + "_right");
                    return (
                      <div key={m.id} style={{ borderTop: i === 0 ? "none" : "1px solid #F5F3FB", padding: "10px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, marginBottom: 8 }}>
                          <InfoButton imageTrigger size="md" fallbackIcon="ti-activity" title={m.muscle} richItem={mmtRichItem(m)} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.845rem", color: BRAND.ink, letterSpacing: "-0.01em" }}>{m.muscle}</div>
                            {(m.nerve || m.root) && (
                              <div style={{ fontSize: "0.656rem", color: BRAND.grayLight, fontWeight: 500 }}>{[m.nerve, m.root].filter(Boolean).join(" · ")}</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 20, paddingLeft: 70 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: BRAND.grayLight }}>L</span>
                            <GradeSelect value={valL} onChange={(nv) => sv("mmt", m.id + "_left", nv)} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: BRAND.grayLight }}>R</span>
                            <GradeSelect value={valR} onChange={(nv) => sv("mmt", m.id + "_right", nv)} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyNote>Not specified in condition library.</EmptyNote>
              )}
            </ModuleCard>
          ); })()}

          {activeSubtopic === "special" && <>
          <ModuleCard label="Special Tests" color="#8B5CF6">
            {specialTestItems && specialTestItems.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {specialTestItems.map((raw, i) => {
                  // Thoracic's specialTests are {name} objects; other v2
                  // regions use plain strings — normalize both.
                  const t = typeof raw === "string" ? raw : raw.name;
                  const testEntry = specialTestEntryFor(config.key, t);
                  return (
                    <div key={t} style={{ borderTop: i === 0 ? "none" : "1px solid #F5F3FB", padding: "10px 0" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <InfoButton imageTrigger fallbackIcon="ti-clipboard-check" title={t} richItem={testEntry ? specialRichItem(testEntry) : null} />
                        <PatientPhotoTile photoId={findingPhotoId(config.key, "special", t)} />
                        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                          <div style={{ fontSize: "0.85rem", color: BRAND.ink, fontWeight: 700, minWidth: 0 }}>{t}</div>
                          {(testEntry?.structure || testEntry?.sensitivity) && (
                            <div style={{ fontSize: "0.68rem", color: BRAND.grayLight, lineHeight: 1.4, marginTop: 2 }}>
                              {testEntry.structure && <>Structure: {testEntry.structure}</>}
                              {testEntry.sensitivity && <> · Sens: {testEntry.sensitivity} · Spec: {testEntry.specificity}</>}
                            </div>
                          )}
                          <div style={{ marginTop: 8 }}>
                            <CategoryLabel>Side</CategoryLabel>
                            <ChipGroup options={["Right", "Left", "Bilateral"]} selected={v("special", t + "_side")} onToggle={(o) => toggleSingle("special", t + "_side", o)} multi={false} />
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <CategoryLabel>Result</CategoryLabel>
                            <ChipGroup options={["Negative", "Positive", "Equivocal"]} selected={v("special", t)} onToggle={(o) => toggleSingle("special", t, o)} multi={false} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyNote>Not specified in condition library.</EmptyNote>
            )}
          </ModuleCard>
          </>}

          {activeSubtopic === "sttt" && <>
          {isV1 ? (
            <ModuleCard label="STTT — Cyriax" color="#0D9488">
              <SubLabel>{condition.resistedNarrative}</SubLabel>
              <div style={{ marginTop: 6 }}>
                <SubLabel>{condition.resistedTestName}</SubLabel>
                <ChipGroup options={RESISTED_TEST_OPTIONS_V1} selected={v("resisted", "test")} onToggle={(o) => toggleSingle("resisted", "test", o)} multi={false} />
              </div>
              {v("resisted", "test") && (
                <GreenBox title="Findings">
                  <div style={{ fontSize: "0.78rem", color: "#166534" }}>✓ {condition.resistedTestName} — {v("resisted", "test")}</div>
                  {interpretSttOption(v("resisted", "test")) && (
                    <div style={{ fontSize: "0.76rem", color: "#166534", marginTop: 4, opacity: 0.85 }}>{interpretSttOption(v("resisted", "test"))}</div>
                  )}
                </GreenBox>
              )}
              <PurpleBox title="Clinical Interpretation">
                {sttOverallInterpretation([v("resisted", "test")], []) || condition.resistedNarrative}
              </PurpleBox>
            </ModuleCard>
          ) : (
            <ModuleCard label="STTT — Cyriax" color="#0D9488">
              {condition.sttt.applicable === false ? (
                <EmptyNote>{condition.sttt.reason}</EmptyNote>
              ) : (
                <>
                  {/* Thoracic's own sttt shape has no resisted/passive/interpretation
                      fields (its STTT/CPA content is extrapolated from general Cyriax
                      principles rather than a dedicated Thoracic catalogue, per its own
                      "caveat" flag) — findings-only for that region, verified against
                      the actual JSON rather than assumed from the schema doc. */}
                  {condition.sttt.caveat && (
                    <div style={{ fontSize: "0.72rem", fontStyle: "italic", color: BRAND.grayLight, marginBottom: 10 }}>
                      Extrapolated from general Cyriax principles — no dedicated catalogue for this region in the source library.
                    </div>
                  )}
                  {condition.sttt.naText && (
                    <div style={{ fontSize: "0.78rem", color: BRAND.red, fontWeight: 600, marginBottom: 10 }}>
                      ⚠ {condition.sttt.naText}
                    </div>
                  )}
                  {resistedTests.length > 0 && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <CategoryLabel>Resisted</CategoryLabel>
                        <div style={{ width: 160, marginBottom: 6 }}>
                          <InfoButton label="How to perform" title="Resisted Tests — How to Perform" text={STTT_RESISTED_HOWTO} />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {resistedTests.map((f) => {
                          const sel = v("sttt", f.id);
                          const line = interpretSttOption(sel);
                          return (
                            <div key={f.id}>
                              <SubLabel>{f.label}</SubLabel>
                              <ChipGroup options={RESISTED_TEST_OPTIONS_V1} selected={sel} onToggle={(o) => toggleSingle("sttt", f.id, o)} multi={false} />
                              {line && <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {line}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {passiveTests.length > 0 && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 16 }}>
                        <CategoryLabel>Passive</CategoryLabel>
                        <div style={{ width: 160, marginBottom: 6 }}>
                          <InfoButton label="How to perform" title="Passive Tests — How to Perform" text={STTT_PASSIVE_HOWTO} />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {passiveTests.map((f) => {
                          const sel = v("sttt", f.id);
                          const line = interpretSttOption(sel);
                          return (
                            <div key={f.id}>
                              <SubLabel>{f.label}</SubLabel>
                              <ChipGroup options={f.endfeel_options || f.options || STTT_DEFAULT_ENDFEEL} selected={sel} onToggle={(o) => toggleSingle("sttt", f.id, o)} multi={false} />
                              {line && <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {line}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {(() => {
                    const resistedSelections = resistedTests.map((f) => v("sttt", f.id));
                    const passiveSelections = passiveTests.map((f) => v("sttt", f.id));
                    const anySelected = [...resistedSelections, ...passiveSelections].some(Boolean);
                    const findingsRows = [
                      ...resistedTests.map((f, i) => resistedSelections[i] && { label: f.label, value: resistedSelections[i] }),
                      ...passiveTests.map((f, i) => passiveSelections[i] && { label: f.label, value: passiveSelections[i] }),
                    ].filter(Boolean);
                    const overall = sttOverallInterpretation(resistedSelections, passiveSelections);
                    return (
                      <>
                        {(anySelected ? findingsRows.length > 0 : (condition.sttt.findings || []).length > 0) && (
                          <GreenBox title="Findings">
                            {anySelected
                              ? findingsRows.map((r, i) => (
                                  <div key={i} style={{ fontSize: "0.78rem", color: "#166534", marginBottom: 3 }}>✓ {r.label} — {r.value}</div>
                                ))
                              : (condition.sttt.findings || []).map((f, i) => (
                                  <div key={i} style={{ fontSize: "0.78rem", color: "#166534", marginBottom: 3 }}>✓ {f}</div>
                                ))}
                          </GreenBox>
                        )}
                        <PurpleBox title="Clinical Interpretation">
                          {anySelected ? (overall || "Select a finding above to see the clinical interpretation.") : condition.sttt.interpretation}
                        </PurpleBox>
                      </>
                    );
                  })()}
                </>
              )}
            </ModuleCard>
          )}
          </>}

          {activeSubtopic === "kinetic" && <>
          {isV1 ? (
            <ModuleCard label="Kinetic Chain" color="#4F46E5" defaultOpen={!condition.kineticChain.notApplicable}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <InfoButton imageTrigger fallbackIcon="ti-link" title={condition.kineticChain.testName} richItem={kcRichItemFor(condition.kineticChain.testName)} />
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: BRAND.ink }}>{condition.kineticChain.testName}</span>
              </div>
              {condition.kineticChain.notApplicable ? (
                <div style={{ fontSize: "0.8rem", color: BRAND.grayLight, lineHeight: 1.5, fontStyle: "italic" }}>{condition.kineticChain.chainEffect}</div>
              ) : (
                <>
                  <ChipGroup options={condition.kineticChain.chipOptions} selected={v("kineticChain", "state")} onToggle={(o) => toggleSingle("kineticChain", "state", o)} multi={false} />
                  {interpretSttOption(v("kineticChain", "state")) && (
                    <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, marginBottom: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("kineticChain", "state"))}</div>
                  )}
                  <InfoCard icon="🔎" label="Helps find" tint="violet">{condition.kineticChain.chainEffect}</InfoCard>
                </>
              )}
            </ModuleCard>
          ) : (
            <ModuleCard label="Kinetic Chain" color="#4F46E5" defaultOpen={condition.kineticChain.applicable !== false}>
              {condition.kineticChain.applicable === false ? (
                <EmptyNote>{condition.kineticChain.reason}</EmptyNote>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <InfoButton imageTrigger fallbackIcon="ti-link" title={condition.kineticChain.name} richItem={kcRichItemFor(condition.kineticChain.name)} />
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: BRAND.ink }}>{condition.kineticChain.name}</span>
                  </div>
                  {condition.kineticChain.fields.map((f, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <SubLabel>{f.label}</SubLabel>
                      <ChipGroup options={f.options} selected={v("kineticChain", "f" + i)} onToggle={(o) => toggleSingle("kineticChain", "f" + i, o)} multi={false} />
                      {interpretSttOption(v("kineticChain", "f" + i)) && (
                        <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("kineticChain", "f" + i))}</div>
                      )}
                    </div>
                  ))}
                  <InfoCard icon="🔎" label="Helps find" tint="violet">{condition.kineticChain.chainEffect}</InfoCard>
                </>
              )}
            </ModuleCard>
          )}
          </>}

          {activeSubtopic === "functional" && <>
          {isV1 ? (
            <ModuleCard label="Functional Screen" color="#16A34A">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <InfoButton imageTrigger fallbackIcon="ti-walk" title={condition.functionalScreen.testName} richItem={functionalRichItem(condition.functionalScreen.testName, condition.functionalScreen.note)} />
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: BRAND.ink }}>{condition.functionalScreen.testName}</span>
              </div>
              {condition.functionalScreen.note && (
                <div style={{ marginBottom: 10 }}>
                  <InfoCard icon="🔎" label="Helps find" tint="violet">{condition.functionalScreen.note}</InfoCard>
                </div>
              )}
              {condition.functionalScreen.measure.type === "number" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: condition.functionalScreen.secondaryChip ? 14 : 0 }}>
                  <span style={{ fontSize: "0.78rem", color: BRAND.gray, flex: 1 }}>{condition.functionalScreen.measure.label}</span>
                  <input
                    type="number" value={v("functionalScreen", "measure")} onChange={(e) => sv("functionalScreen", "measure", e.target.value)}
                    placeholder="—" style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", textAlign: "center", outline: "none" }}
                  />
                  <span style={{ fontSize: "0.75rem", color: BRAND.grayLight }}>{condition.functionalScreen.measure.unit} {condition.functionalScreen.measure.hint}</span>
                </div>
              )}
              {condition.functionalScreen.measure.type === "choice" && (
                <div style={{ marginBottom: condition.functionalScreen.secondaryChip ? 14 : 0 }}>
                  <SubLabel>{condition.functionalScreen.measure.label}</SubLabel>
                  <ChipGroup options={condition.functionalScreen.measure.options} selected={v("functionalScreen", "measure")} onToggle={(o) => toggleSingle("functionalScreen", "measure", o)} multi={false} />
                  {interpretSttOption(v("functionalScreen", "measure")) && (
                    <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("functionalScreen", "measure"))}</div>
                  )}
                </div>
              )}
              {condition.functionalScreen.measure.type === "text" && (
                <input
                  type="text" value={v("functionalScreen", "measure")} onChange={(e) => sv("functionalScreen", "measure", e.target.value)}
                  placeholder={condition.functionalScreen.measure.label}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", outline: "none", marginBottom: condition.functionalScreen.secondaryChip ? 14 : 0 }}
                />
              )}
              {condition.functionalScreen.secondaryChip && (
                <div>
                  <SubLabel>{condition.functionalScreen.secondaryChip.label}</SubLabel>
                  <ChipGroup options={condition.functionalScreen.secondaryChip.options} selected={v("functionalScreen", "secondary")} onToggle={(o) => toggleSingle("functionalScreen", "secondary", o)} multi={false} />
                  {interpretSttOption(v("functionalScreen", "secondary")) && (
                    <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("functionalScreen", "secondary"))}</div>
                  )}
                </div>
              )}
            </ModuleCard>
          ) : (
            <ModuleCard label="Functional Screen" color="#16A34A">
              {condition.functionalScreen.applicable === false ? (
                <EmptyNote>{condition.functionalScreen.reason}</EmptyNote>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <InfoButton imageTrigger fallbackIcon="ti-walk" title={condition.functionalScreen.name} richItem={functionalRichItem(condition.functionalScreen.name, condition.functionalScreen.note)} />
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: BRAND.ink }}>{condition.functionalScreen.name}</span>
                  </div>
                  {condition.functionalScreen.note && (
                    <div style={{ marginBottom: 12 }}>
                      <InfoCard icon="🔎" label="Helps find" tint="violet">{condition.functionalScreen.note}</InfoCard>
                    </div>
                  )}
                  {condition.functionalScreen.fields.map((f, i) => f.type === "number" ? (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                      <span style={{ fontSize: "0.78rem", color: BRAND.gray, flex: 1 }}>{f.label}</span>
                      <input
                        type="number" value={v("functionalScreen", "f" + i)} onChange={(e) => sv("functionalScreen", "f" + i, e.target.value)}
                        placeholder="—" style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", textAlign: "center", outline: "none" }}
                      />
                      <span style={{ fontSize: "0.75rem", color: BRAND.grayLight }}>{f.unit} {f.normal}</span>
                    </div>
                  ) : (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <SubLabel>{f.label}</SubLabel>
                      <ChipGroup options={f.options} selected={v("functionalScreen", "f" + i)} onToggle={(o) => toggleSingle("functionalScreen", "f" + i, o)} multi={false} />
                      {interpretSttOption(v("functionalScreen", "f" + i)) && (
                        <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("functionalScreen", "f" + i))}</div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </ModuleCard>
          )}
          </>}

          {activeSubtopic === "outcome" && <>
          <ModuleCard label="Outcome Measures" color={BRAND.gray}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(isV1 ? condition.outcome.split(";").map((s) => s.trim()).filter(Boolean) : condition.outcomeMeasures).map((instrument) => {
                const measureId = matchMeasureIdForInstrument(instrument);
                const measure = measureId ? MEASURES[measureId] : null;
                const history = measure ? data.outcomeMeasure?.instances?.[measureId]?.history : null;
                const latest = history?.length ? history[history.length - 1] : null;
                const interp = latest ? measure.interpret(latest.score) : null;
                return (
                  <div key={instrument}>
                    <SubLabel>{instrument}</SubLabel>
                    {measure ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {latest ? (
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, background: "#FAFAFB" }}>
                            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: interp?.color || BRAND.ink }}>{latest.score}{measure.unit}</span>
                            {interp && <span style={{ fontSize: "0.72rem", fontWeight: 700, color: interp.color }}>{interp.label}</span>}
                          </div>
                        ) : (
                          <input
                            type="text" value={v("outcome", instrument)} onChange={(e) => sv("outcome", instrument, e.target.value)}
                            placeholder="Enter score / activity" style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", outline: "none" }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => onStartOutcomeMeasure?.(measureId)}
                          style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 8, border: "none", background: BRAND.purple || "#7C3AED", color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          {latest ? "↻ Reassess" : "▶ Fill guided form"}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text" value={v("outcome", instrument)} onChange={(e) => sv("outcome", instrument, e.target.value)}
                        placeholder="Enter score / activity" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", outline: "none" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </ModuleCard>
          </>}

          </div>
        </>
    </div>
  );
}

// v1-only (Hip/Knee/Ankle-Foot's own resisted-test chip vocabulary — same
// Cyriax strong/weak x painful/painless vocabulary CYRIAX_REGIONS_DATA
// already uses elsewhere in the app).
const RESISTED_TEST_OPTIONS_V1 = ["Strong + Painless", "Strong + Painful", "Weak + Painless", "Weak + Painful"];

// One shared "how to perform" per category (Resisted / Passive) instead of
// repeating it for every individual movement direction (2026-09-17, Aditi:
// "as in my webapp it whole for movement have only 4 option it is not
// seperatinly present") -- the Cyriax technique itself doesn't change
// between flexion/extension/side flexion/rotation, only which movement is
// being loaded, so one combined explanation per category covers all of them.
const STTT_RESISTED_HOWTO = "Position the joint in mid-range (neutral, resting position) so only the contractile unit is being tested, not the joint capsule or ligaments. Stabilise proximally, then ask the patient to hold firmly against your resistance in each direction in turn (flexion, extension, side flexion, rotation) while the joint itself stays still — an isometric contraction, no movement should occur. Grade each direction Strong or Weak (force produced) and Painless or Painful (symptom reproduced). Strong + Painless = normal contractile tissue. Weak and/or Painful implicates the muscle/tendon unit being tested in that direction.";
const STTT_PASSIVE_HOWTO = "With the patient fully relaxed, passively move the joint through its full available range in each direction, feeling the quality of resistance at end-range (the end-feel) rather than just the range itself. A normal end-feel (bony, capsular, or soft-tissue approximation depending on the joint/direction) with no pain is negative. Pain before end-range, a muscle-spasm end-feel (sudden, guarded stop with pain), or an abnormal/empty end-feel implicates the inert structures (capsule, ligament, joint surfaces) rather than the contractile unit.";

// The textbook Cyriax reading of the classic Strong/Weak x Painful/Painless
// resisted-test combo — exact per standard selective tension testing
// teaching, used whenever a chip matches one of these four (v1's own
// RESISTED_TEST_OPTIONS_V1, or any v2 condition whose "resisted" options
// happen to use the same wording, e.g. rotator cuff Empty Can). Matched by
// prefix so parenthetical condition-specific suffixes like "Strong +
// Painful (tendinopathy)" still hit.
const CLASSIC_RESISTED_INTERPRETATION = [
  [/^strong\s*\+\s*painless/i, "Normal — no significant lesion of the contractile unit (muscle/tendon) indicated."],
  [/^strong\s*\+\s*painful/i, "Minor lesion of the contractile unit — e.g. tendinopathy or a minor muscle/tendon strain."],
  [/^weak\s*\+\s*painless/i, "Suggests a complete rupture of the muscle/tendon, or a neurological lesion (nerve root or peripheral nerve). Painless weakness is a red flag — correlate with myotome/reflex testing."],
  [/^weak\s*\+\s*painful/i, "Suggests a major partial tear or a more serious lesion of the contractile unit — correlate clinically and consider imaging."],
];

// Generic flag classifier for the enormous free-text option vocabulary
// used across every condition's sttt.resisted/passive options (AC joint's
// "No localized AC pain" vs a myotome's "Weak" vs a ligament test's
// "Excessive range, soft/hypermobile end-feel", etc.) — keyword-matched
// so every STTT chip in the app gets a genuinely reactive interpretation
// instead of the same static per-condition text regardless of selection
// (2026-09-10, Aditi: "whatever we select, it should interpret what it
// should mean, according to the saved knowledge of STT").
function sttFlags(text) {
  const t = (text || "").toLowerCase();
  const has = (re) => re.test(t);
  let pain = null;
  if (has(/\bpainless\b|no\s+[a-z\- ]*pain|no\s+(groin|leg|arm|joint-line|lateral|snap|nodule|change|reproduction)|\bnegative\b|non-?provocative|no reproduction|preserved\/?normal|usually preserved|no true weakness/)) pain = false;
  else if (has(/\bpainful\b|\bpositive\b|reproduc|laxity reproduced|catching|clunk|pain reproduced|tender/)) pain = true;
  let weak = null;
  if (has(/\bweak\b|absent\/severely weak|diminished|altered/)) weak = true;
  else if (has(/\bstrong\b|normal sensation|full active extension/)) weak = false;
  let restricted = null;
  if (has(/restrict|hypomobile|capsular|rigid|bony end-feel|guard/)) restricted = true;
  else if (has(/hypermobile|excessive.*(range|mobility)/)) restricted = false;
  let hypermobile = has(/hypermobile|excessive.*(range|mobility)/) ? true : null;
  return { pain, weak, restricted, hypermobile };
}

// One reactive line per selected chip — checked against the exact Cyriax
// wording first (precise textbook teaching), falling back to the generic
// flag classifier for every other free-text option in the library.
function interpretSttOption(option) {
  if (!option) return null;
  for (const [re, text] of CLASSIC_RESISTED_INTERPRETATION) {
    if (re.test(option.trim())) return text;
  }
  const { pain, weak, restricted, hypermobile } = sttFlags(option);
  const parts = [];
  if (pain === true) parts.push("reproduces symptoms — suggests this structure/movement is a pain source");
  if (pain === false) parts.push("no symptoms reproduced — this structure/movement is less likely the primary pain source");
  if (weak === true) parts.push("reduced strength noted — consider partial/complete tear or neurological involvement");
  if (weak === false) parts.push("strength preserved");
  if (restricted === true) parts.push("restricted/capsular-pattern movement — suggests joint capsule or periarticular involvement");
  if (hypermobile === true) parts.push("excessive range/laxity — consider ligamentous insufficiency or instability");
  if (!parts.length) return null;
  const line = parts.join("; ");
  return line.charAt(0).toUpperCase() + line.slice(1) + ".";
}

// Combined paragraph for the Clinical Interpretation box, synthesizing
// every selected resisted + passive chip instead of a single fixed string
// — same classic-pattern-first, generic-fallback approach as
// interpretSttOption, plus the specific resisted+passive interplay Cyriax
// teaches (painful resisted + painless passive = contractile source;
// painful passive too = inert structure also implicated).
function sttOverallInterpretation(resistedSelections, passiveSelections) {
  const resisted = resistedSelections.filter(Boolean);
  const passive = passiveSelections.filter(Boolean);
  if (!resisted.length && !passive.length) return null;

  const sentences = [];
  const classicHit = resisted.map((o) => CLASSIC_RESISTED_INTERPRETATION.find(([re]) => re.test(o.trim()))).find(Boolean);
  if (classicHit) sentences.push(classicHit[1]);

  resisted.forEach((o) => {
    if (CLASSIC_RESISTED_INTERPRETATION.some(([re]) => re.test(o.trim()))) return; // already covered by classicHit
    const line = interpretSttOption(o);
    if (line) sentences.push(line);
  });

  const passiveFlags = passive.map(sttFlags);
  if (passiveFlags.some((f) => f.pain === true)) {
    sentences.push("Painful passive movement also implicates an inert structure (joint capsule, ligament, or bursa) — or a more significant contractile lesion stretched passively.");
  } else if (passiveFlags.some((f) => f.pain === false) && !classicHit) {
    sentences.push("Passive movement was pain-free, which points away from primary inert-structure involvement at this position.");
  } else {
    passive.forEach((o) => {
      const line = interpretSttOption(o);
      if (line) sentences.push(line);
    });
  }

  return sentences.length ? sentences.join(" ") : null;
}
