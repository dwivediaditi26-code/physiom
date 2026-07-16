// normalize.ts — maps the app's single flat `data` record into the engine's
// typed SubjectiveInput + ObjectiveFindings. Field ids below are the REAL ids
// the app writes (verified against sharedClinicalData.js + the live modules):
//   Special tests:  data["st_<id>"]         = full option string (contains "Positive …")
//   ROM:            data["rom_<id>[_L|_R]_arom" | "_prom"]  (bilateral -> _L/_R)
//   MMT:            data["mmt_<mmt_id>_L" | "_R"]           (id already carries mmt_ prefix)
//   Myotomes:       data["myo_c5_left" | "_right"]         (abnormal if grade not "5…")
//   Dermatomes:     data["n_c5_left" | "_right"]           (abnormal if not "Normal")
//   Reflexes:       data["n_ref_bicep_left" | "_right"]    (abnormal if diminished/brisk/absent)
// Nothing is fabricated: absent = false/undefined. This is the single seam to
// adjust if a field id ever changes.

import type { SubjectiveInput, ObjectiveFindings, ReasoningResult, RomEntry, MmtEntry } from "./types";
import { runReasoning } from "./index";

type Data = Record<string, unknown>;

const str = (v: unknown): string => (v == null ? "" : String(v));
const isPos = (v: unknown): boolean => {
  const s = str(v).toLowerCase();
  return s.includes("positive") || s.includes("+ve") || s === "true" || s === "yes";
};
const num = (v: unknown): number | null => {
  const n = parseFloat(str(v).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? null : n;
};
const has = (v: unknown, ...keys: string[]): boolean => {
  const s = str(v).toLowerCase();
  return keys.some((k) => s.includes(k.toLowerCase()));
};
// Many multicheck red-flag/screening fields have NO literal "positive" option --
// they list specific concerning findings as checkboxes and use one dedicated
// negative option (e.g. "No cancer history", "No VBI signs"). isPos() (which
// looks for the literal word "positive"/"yes"/"true") never matches these, so
// treat "anything selected other than the stated negative option" as present.
const selected = (v: unknown, negativeSubstring: string): boolean => {
  const s = str(v);
  return s !== "" && !has(s, negativeSubstring);
};
// Combines the coarse "Previous imaging" checklist (hx_imaging) with the free-text
// findings field (hx_imaging_detail) -- the only real imaging fields in the app;
// sh_imaging/cx_imaging/lx_imaging/imaging_summary do not exist.
const readImaging = (data: Data): { performed: boolean; summary?: string } => {
  const checklist = str(data.hx_imaging);
  const detail = str(data.hx_imaging_detail);
  const performed = selected(checklist, "none") || detail !== "";
  if (!performed) return { performed: false };
  return { performed: true, summary: [checklist, detail].filter(Boolean).join(" — ") };
};

// Read a ROM movement, choosing the more restricted side when bilateral.
function readRom(data: Data, romId: string, label: string, normal: number, bilateral: boolean): RomEntry | null {
  const sides = bilateral ? ["_L", "_R"] : [""];
  let best: RomEntry | null = null;
  for (const side of sides) {
    const active = num(data[`rom_${romId}${side}_arom`]);
    const passive = num(data[`rom_${romId}${side}_prom`]);
    if (active == null && passive == null) continue;
    const entry: RomEntry = {
      movement: label,
      activeROM: active ?? passive,
      passiveROM: passive ?? active,
      normalROM: normal,
      endFeel: str(data[`rom_${romId}${side}_endfeel`]) || undefined,
    };
    // keep the more restricted (smaller passive) side
    if (!best || (entry.passiveROM ?? 999) < (best.passiveROM ?? 999)) best = entry;
  }
  return best;
}

// Read an MMT grade (worse side wins). id already carries the mmt_ prefix, so the
// stored field is mmt_<id>_L (double mmt_ is correct — matches the live module).
function readMmt(data: Data, mmtId: string, label: string): MmtEntry | null {
  const l = num(data[`mmt_${mmtId}_L`]);
  const r = num(data[`mmt_${mmtId}_R`]);
  const grade = [l, r].filter((g): g is number => g != null).sort((a, b) => a - b)[0];
  if (grade === undefined) return null;
  return { muscle: label, grade, painOnResist: false };
}

function readPalpation(data: Data): string[] {
  try {
    const pins = data.palp_pins ? JSON.parse(str(data.palp_pins)) : [];
    return (Array.isArray(pins) ? pins : [])
      .flatMap((p: { structures?: unknown }) => (Array.isArray(p.structures) ? p.structures : String(p.structures ?? "").split(",")))
      .map((s: unknown) => str(s).trim())
      .filter(Boolean);
  } catch { return []; }
}

// ── Shoulder ──────────────────────────────────────────────────────────────
// NOTE: the app has no dedicated shoulder subjective-behaviour group -- unlike
// cervical (cx_*) and lumbar (lx_*), there is no sh_night/sh_behaviour/sh_agg_*/
// sh_onset/sh_imaging field anywhere in sharedClinicalData.js (verified). Those
// were guessed in an earlier session and silently never matched anything.
// Shoulder behavioural signals are only really captured in the free-text chief
// complaint (cc_main) and the generic cc_quality/cc_onset/grf_* fields today,
// so those are the only sources used below.
export function normalizeFromData(data: Data): { subjective: SubjectiveInput; objective: ObjectiveFindings; region: string } {
  const cc = str(data.cc_main).toLowerCase();
  const quality = str(data.cc_quality).toLowerCase();
  const onset = str(data.cc_onset).toLowerCase();
  const age = num(data.dem_age);

  const subjective: SubjectiveInput = {
    region: "shoulder",
    chiefComplaint: str(data.cc_main),
    ageOver50: age != null && age >= 50,
    nightPain: has(cc, "night"),
    constantPain: has(cc, "constant"),
    easesWithRest: has(cc, "rest", "ease"),
    paresthesia: has(cc, "tingl", "numb", "pins") || has(quality, "tingling", "pins and needles", "numbness"),
    radiationBelowElbow: has(str(data.loc_radiation), "forearm", "hand", "below elbow", "finger"),
    onsetTraumatic: has(onset, "trauma", "fall", "injury", "sudden"),
    onsetInsidious: has(onset, "insidious", "gradual", "no injury"),
    overheadAggravation: has(cc, "overhead", "reach", "lift", "above"),
    progressiveStiffness: has(cc, "stiff", "progressive"),
    traumaHistory: selected(data.grf_fracture, "no fracture indicators") || has(onset, "major trauma"),
    unexplainedWeightLoss: has(str(data.grf_systemic), "unexplained weight loss"),
    systemicIllness: selected(data.grf_systemic, "systemically well"),
    malignancyHistory: selected(data.grf_cancer, "no cancer history"),
  };

  const rom = [
    readRom(data, "sflex", "Flexion", 180, true),
    readRom(data, "sabd", "Abduction", 180, true),
    readRom(data, "ser", "External rotation", 90, true),
    readRom(data, "sir", "Internal rotation", 70, true),
  ].filter((e): e is RomEntry => e != null);

  const mmt = [
    readMmt(data, "mmt_supra", "Supraspinatus (abduction)"),
    readMmt(data, "mmt_infra", "Infraspinatus (external rotation)"),
    readMmt(data, "mmt_subscap", "Subscapularis (internal rotation)"),
  ].filter((e): e is MmtEntry => e != null);

  const specialTests: Record<string, boolean> = {};
  const setT = (key: string, v: boolean) => { if (v) specialTests[key] = true; };
  setT("hawkins", isPos(data.st_hawkins));
  setT("neer", isPos(data.st_neer));
  setT("empty_can", isPos(data.st_empty_can));
  setT("er_lag", isPos(data.st_er_lag));
  setT("drop_arm", has(data.st_er_lag, "massive", "full lag"));
  setT("lift_off", isPos(data.st_lift_off));
  setT("obrien", isPos(data.st_obrien));
  setT("speeds", isPos(data.st_speeds));
  setT("apprehension", isPos(data.st_apprehension));
  setT("relocation", isPos(data.st_relocation));
  setT("scarf", isPos(data.st_cross_arm) || isPos(data.st_acromioclavicular));

  const objective: ObjectiveFindings = {
    rom, mmt, specialTests,
    palpation: { tenderStructures: readPalpation(data) },
    functional: { movements: [] },
    imaging: readImaging(data),
  };
  return { subjective, objective, region: "shoulder" };
}

export function runShoulderReasoningFromData(data: Data): ReasoningResult {
  const { subjective, objective, region } = normalizeFromData(data);
  return runReasoning(subjective, objective, region);
}

// ── Cervical ────────────────────────────────────────────────────────────────
const CERVICAL_MYOTOMES = ["c5", "c6", "c7", "c8"];
const CERVICAL_DERMATOMES = ["n_c5", "n_c6", "n_c7", "n_c8"];
const CERVICAL_REFLEXES = ["n_ref_bicep", "n_ref_brad", "n_ref_tricep"];

const myotomeAbnormal = (v: unknown): boolean => { const s = str(v).trim(); return s !== "" && !s.startsWith("5"); };
const dermatomeAbnormal = (v: unknown): boolean => { const s = str(v).trim(); return s !== "" && !/normal/i.test(s); };
const reflexAbnormal = (v: unknown): boolean => { const s = str(v).trim(); return s !== "" && /absent|diminish|hyper|brisk|clonus|^0|^1\+?|3\+|4\+/i.test(s); };

// NOTE: cx_behaviour, cx_onset, cx_arm_pain, cx_headache, cx_unilateral_headache,
// cx_stiffness, cx_gait, cx_umn, cx_vbi, cx_dizziness, cx_thunderclap and
// cx_paresthesia do NOT exist anywhere in sharedClinicalData.js (verified) --
// guessed in an earlier session and silently dead. Rewired below to the real
// fields: cx_pattern, cx_moi, cx_arm_present, cx_ha_present, cx_ha_location,
// cx_rf_myelopathy, cx_rf_vbi, cx_rf_other, cx_arm_quality.
export function normalizeCervicalFromData(data: Data): { subjective: SubjectiveInput; objective: ObjectiveFindings; region: string } {
  const cc = str(data.cc_main).toLowerCase();
  const pattern = str(data.cx_pattern).toLowerCase();
  const onset = str(data.cc_onset ?? data.cx_moi).toLowerCase();
  const age = num(data.dem_age);
  const radiation = str(data.loc_radiation ?? data.cx_radiation).toLowerCase();
  const armQuality = str(data.cx_arm_quality).toLowerCase();

  const vbiPos = isPos(data.st_vbi) || selected(data.cx_rf_vbi, "no vbi signs") || has(cc, "dizz");
  const hoffmannPos = isPos(data.st_hoffmanns);
  const babinskiPos = isPos(data.st_babinski) || reflexAbnormal(data["n_ref_babinski_left"]) || reflexAbnormal(data["n_ref_babinski_right"]);
  const anyMyotomeWeak = CERVICAL_MYOTOMES.some((m) => myotomeAbnormal(data[`myo_${m}_left`]) || myotomeAbnormal(data[`myo_${m}_right`]));
  const anyReflexChange = CERVICAL_REFLEXES.some((r) => reflexAbnormal(data[`${r}_left`]) || reflexAbnormal(data[`${r}_right`]));
  const anySensoryDeficit = CERVICAL_DERMATOMES.some((d) => dermatomeAbnormal(data[`${d}_left`]) || dermatomeAbnormal(data[`${d}_right`]));
  const myelopathyChecklistPositive = selected(data.cx_rf_myelopathy, "no myelopathy signs");

  const subjective: SubjectiveInput = {
    region: "cervical",
    chiefComplaint: str(data.cc_main),
    ageOver50: age != null && age >= 50,
    nightPain: isPos(data.cx_night) || has(pattern, "night"),
    constantPain: has(pattern, "constant"),
    paresthesia: has(cc, "tingl", "numb", "pins") || has(radiation, "tingl", "numb") || has(armQuality, "tingling", "pins and needles", "numbness") || anySensoryDeficit,
    radiatingArmPain: has(radiation, "arm", "shoulder", "forearm", "hand") || has(str(data.cx_arm_present), "yes —"),
    dermatomalPattern: selected(data.cx_dermatomal, "not dermatomal") || has(radiation, "dermatom") || anySensoryDeficit,
    headacheFromNeck: has(cc, "headache") || has(str(data.cx_ha_present), "yes —"),
    unilateralHeadache: has(str(data.cx_ha_location), "temporal (l)", "temporal (r)", "hemicranial"),
    neckStiffness: has(pattern, "stiff") || has(cc, "stiff"),
    extensionRotationAggravation: has(str(data.cx_agg_mov ?? data.cx_agg_post), "extension", "rotation", "looking up", "overhead"),
    onsetTraumatic: has(onset, "trauma", "whiplash", "rta", "accident", "fall", "sudden"),
    onsetInsidious: has(onset, "insidious", "gradual"),
    gaitDisturbance: has(str(data.cx_rf_myelopathy), "gait disturbance", "unexplained falls"),
    dizzinessVBI: vbiPos,
    // red-flag sub-signals
    myelopathySigns: myelopathyChecklistPositive || hoffmannPos || babinskiPos,
    suddenSevereHeadacheOrNeckPain: has(str(data.cx_rf_vbi), "thunderclap") || has(str(data.cx_rf_other), "thunderclap"),
    vertebrobasilarSigns: vbiPos,
    traumaHistory: selected(data.grf_fracture, "no fracture indicators") || has(onset, "major trauma"),
    unexplainedWeightLoss: has(str(data.grf_systemic), "unexplained weight loss"),
    systemicIllness: selected(data.grf_systemic, "systemically well"),
    malignancyHistory: selected(data.grf_cancer, "no cancer history"),
  };

  const rot = [readRom(data, "crotl", "Rotation", 60, false), readRom(data, "crotr", "Rotation", 60, false)]
    .filter((e): e is RomEntry => e != null)
    .sort((a, b) => (a.passiveROM ?? 999) - (b.passiveROM ?? 999))[0] || null;
  const rom = [readRom(data, "cext", "Extension", 45, false), rot, readRom(data, "cflex", "Flexion", 45, false)]
    .filter((e): e is RomEntry => e != null);

  // Myotome weakness -> MMT entries labelled by level so deriveCervical picks them up.
  const mmt: MmtEntry[] = [];
  for (const m of CERVICAL_MYOTOMES) {
    const l = num(data[`myo_${m}_left`]);
    const r = num(data[`myo_${m}_right`]);
    const grade = [l, r].filter((g): g is number => g != null).sort((a, b) => a - b)[0];
    if (grade === undefined) continue;
    mmt.push({ muscle: `${m.toUpperCase()} myotome`, grade });
  }

  // Rotation < 60° drives the Wainner "cervical rotation to affected side" item.
  const rotationLt60 = !!rot && rot.activeROM != null && rot.activeROM < 60;

  const specialTests: Record<string, boolean> = {};
  const setT = (key: string, v: boolean) => { if (v) specialTests[key] = true; };
  setT("spurling", isPos(data.st_spurling));
  setT("distraction", isPos(data.st_distraction));
  setT("flexion_rotation", isPos(data.st_flex_rot));
  setT("hoffmann", hoffmannPos);
  setT("rotation_lt_60", rotationLt60);
  setT("reflex_change", anyReflexChange);
  setT("sensory_deficit", anySensoryDeficit);
  setT("ultt", isPos(data.st_slump_test)); // no dedicated ULTT test in the app yet

  const objective: ObjectiveFindings = {
    rom, mmt, specialTests,
    palpation: { tenderStructures: readPalpation(data) },
    functional: { movements: [] },
    imaging: readImaging(data),
  };
  return { subjective, objective, region: "cervical" };
}

export function runCervicalReasoningFromData(data: Data): ReasoningResult {
  const { subjective, objective, region } = normalizeCervicalFromData(data);
  return runReasoning(subjective, objective, region);
}

// ── Lumbar ──────────────────────────────────────────────────────────────────
// Myotome/dermatome/reflex ids verified against the live neuro module
// (PhysioNeuro.jsx computes myotome ids as "myo_"+level.replace(/[^a-zA-Z0-9]/g,"_").toLowerCase();
// L3/L4/L5/S1 are single tokens so the slug is unambiguous — myo_l3/_l4/_l5/_s1).
const LUMBAR_MYOTOMES = ["l3", "l4", "l5", "s1"];
const LUMBAR_DERMATOMES = ["n_l2", "n_l3", "n_l4", "n_l5", "n_s1"];
const LUMBAR_REFLEXES = ["n_ref_patella", "n_ref_achilles"];

export function normalizeLumbarFromData(data: Data): { subjective: SubjectiveInput; objective: ObjectiveFindings; region: string } {
  const cc = str(data.cc_main).toLowerCase();
  const behaviour = str(data.lx_pattern).toLowerCase(); // cc_pattern does not exist -- lx_pattern is the real field
  const onset = str(data.lx_moi ?? data.cc_onset).toLowerCase();
  const age = num(data.dem_age);
  const belowKnee = str(data.lx_below_knee).toLowerCase();
  const neuroPresent = str(data.lx_neuro_present).toLowerCase();
  const neuroSigns = str(data.lx_neuro_signs).toLowerCase();
  const neuroQuality = str(data.lx_neuro_quality).toLowerCase();
  const dermatomal = str(data.lx_dermatomal).toLowerCase();
  const claudication = str(data.lx_claudication).toLowerCase();
  const pattern24hr = str(data.lx_24hr).toLowerCase();
  const aggMov = str(data.lx_agg_mov).toLowerCase();
  const aggPost = str(data.lx_agg_post).toLowerCase();
  const moiPosition = str(data.lx_moi_position).toLowerCase();
  const directional = str(data.lx_directional).toLowerCase();
  const loc = str(data.lx_loc).toLowerCase();
  const spondyloScreen = str(data.lx_spondylo_screen).toLowerCase();
  const rfCauda = str(data.lx_rf_cauda).toLowerCase();
  const rfSerious = str(data.lx_rf_serious).toLowerCase();
  const rfFracture = str(data.lx_rf_fracture).toLowerCase();
  const night = str(data.lx_night).toLowerCase();

  const anyMyotomeWeak = LUMBAR_MYOTOMES.some((m) => myotomeAbnormal(data[`myo_${m}_left`]) || myotomeAbnormal(data[`myo_${m}_right`]));
  const anyReflexChange = LUMBAR_REFLEXES.some((r) => reflexAbnormal(data[`${r}_left`]) || reflexAbnormal(data[`${r}_right`]));
  const anySensoryDeficit = LUMBAR_DERMATOMES.some((d) => dermatomeAbnormal(data[`${d}_left`]) || dermatomeAbnormal(data[`${d}_right`]));
  const dermatomalPositive = dermatomal !== "" && !has(dermatomal, "not dermatomal");

  const subjective: SubjectiveInput = {
    region: "lumbar",
    chiefComplaint: str(data.cc_main),
    ageOver50: age != null && age >= 50,
    nightPain: has(night, "wakes", "wake once", "constant night pain", "leg pain at night"),
    nightPainUnrelieved: has(night, "constant night pain") || has(rfSerious, "progressive night pain"),
    constantPain: has(behaviour, "constant"),
    constantUnremittingPain: has(rfSerious, "constant pain"),
    easesWithRest: has(str(data.lx_rel_post), "lying"),
    paresthesia: has(cc, "tingl", "numb", "pins") || has(neuroQuality, "tingling", "pins and needles", "numbness") || anySensoryDeficit,
    dermatomalPattern: dermatomalPositive || anySensoryDeficit,
    legPainBelowKnee: has(belowKnee, "below knee", "extends to foot"),
    bilateralLegSymptoms: has(belowKnee, "bilateral") || has(neuroPresent, "bilateral") || has(dermatomal, "bilateral"),
    flexionAggravation: has(aggMov, "forward bending") || has(moiPosition, "flexed"),
    extensionAggravation: has(aggMov, "backward bending"),
    sittingAggravation: has(aggPost, "sitting"),
    neurogenicClaudication: has(claudication, "neurogenic", "leaning forward") || has(pattern24hr, "neurogenic claudication"),
    centralisesWithExtension: has(directional, "extension preference"),
    centralisesWithFlexion: has(directional, "flexion preference"),
    sacroiliacPainPattern: has(loc, "si joint", "bilateral si joints"),
    youngAthleteExtensionPain: has(spondyloScreen, "young athlete") || has(spondyloScreen, "extension pain"),
    footDropReported: has(neuroSigns, "foot drop"),
    onsetTraumatic: has(onset, "fall", "motor vehicle accident", "trip"),
    onsetInsidious: has(onset, "no clear mechanism", "insidious", "sustained poor posture"),
    traumaHistory: selected(data.grf_fracture, "no fracture indicators") || has(rfFracture, "major high-energy trauma") || has(onset, "fall", "motor vehicle accident"),
    unexplainedWeightLoss: has(str(data.grf_systemic), "unexplained weight loss") || has(rfSerious, "unexplained weight loss"),
    malignancyHistory: selected(data.grf_cancer, "no cancer history") || has(rfSerious, "history of cancer"),
    systemicIllness: selected(data.grf_systemic, "systemically well") || has(rfSerious, "fever", "systemically unwell"),
    fever: has(rfSerious, "fever"),
    // cauda equina red-flag sub-signals (generic fields consumed by redFlags.ts)
    saddleAnesthesia: has(rfCauda, "saddle") || has(dermatomal, "saddle") || has(neuroSigns, "saddle"),
    bladderBowelChange: has(rfCauda, "bladder", "bowel") || has(neuroSigns, "bladder", "bowel"),
    bilateralLegWeakness: has(rfCauda, "bilateral leg weakness") || has(rfCauda, "rapidly progressive bilateral"),
  };

  const rom = [
    readRom(data, "lflex", "Flexion", 60, false),
    readRom(data, "lext", "Extension", 25, false),
    readRom(data, "llfl", "Lateral flexion left", 25, false),
    readRom(data, "llfr", "Lateral flexion right", 25, false),
    readRom(data, "lrotl", "Rotation left", 5, false),
    readRom(data, "lrotr", "Rotation right", 5, false),
  ].filter((e): e is RomEntry => e != null);

  const mmt: MmtEntry[] = [];
  for (const m of LUMBAR_MYOTOMES) {
    const l = num(data[`myo_${m}_left`]);
    const r = num(data[`myo_${m}_right`]);
    const grade = [l, r].filter((g): g is number => g != null).sort((a, b) => a - b)[0];
    if (grade === undefined) continue;
    mmt.push({ muscle: `${m.toUpperCase()} myotome`, grade });
  }

  const specialTests: Record<string, boolean> = {};
  const setT = (key: string, v: boolean) => { if (v) specialTests[key] = true; };
  setT("slr", isPos(data.st_slr_test));
  setT("slump", isPos(data.st_slump_test));
  setT("femoral_stretch", isPos(data.st_femoral_nerve_stretch));
  setT("prone_instab", isPos(data.st_prone_instab));
  setT("stork", isPos(data.st_stork));
  setT("kemp", isPos(data.st_kemp));
  setT("si_distraction", isPos(data.st_si_distraction));
  setT("si_compression", isPos(data.st_si_compression));
  setT("gaenslen", isPos(data.st_gaenslen));
  setT("thigh_thrust", isPos(data.st_thigh_thrust));
  setT("lateral_shift", has(data.st_lateral_shift, "corrects easily", "corrects partially"));
  setT("reflex_change", anyReflexChange);
  setT("sensory_deficit", anySensoryDeficit);
  // (myotome weakness surfaces to findings.ts via the "mmt" entries above,
  // labelled "<LEVEL> myotome" — matching the cervical pattern exactly.)

  const objective: ObjectiveFindings = {
    rom, mmt, specialTests,
    palpation: { tenderStructures: readPalpation(data) },
    functional: { movements: [] },
    imaging: readImaging(data),
  };
  return { subjective, objective, region: "lumbar" };
}

export function runLumbarReasoningFromData(data: Data): ReasoningResult {
  const { subjective, objective, region } = normalizeLumbarFromData(data);
  return runReasoning(subjective, objective, region);
}

// ── Hip ─────────────────────────────────────────────────────────────────────
// Hip subjective fields are NOT side-split -- unlike knee, there is a single
// "Hip / Groin":{prefix:"hp"} module regardless of which side is selected
// (verified: REG_KEY_MAP aliases "Hip/Groin (L)"/"Hip/Groin (R)" onto the same
// underlying hp_ fields). ROM/MMT/special tests use the same generic rom_/mmt_/
// st_ ids as every other region (side handled by the _L/_R ROM suffix and
// worse-side-wins MMT convention already used above).
export function normalizeHipFromData(data: Data): { subjective: SubjectiveInput; objective: ObjectiveFindings; region: string } {
  const age = num(data.dem_age);
  const loc = str(data.hp_loc).toLowerCase();
  const locPattern = str(data.hp_loc_pattern).toLowerCase();
  const cSign = str(data.hp_c_sign).toLowerCase();
  const moi = str(data.hp_moi ?? data.cc_onset).toLowerCase();
  const aggMov = str(data.hp_agg_mov).toLowerCase();
  const aggAct = str(data.hp_agg_act).toLowerCase();
  const pattern = str(data.hp_pattern).toLowerCase();
  const mechanical = str(data.hp_mechanical).toLowerCase();
  const rf = str(data.hp_rf).toLowerCase();
  const hamstringOnset = str(data.hp_hamstring_onset).toLowerCase();
  const piriformis = str(data.hp_piriformis).toLowerCase();
  const meralgia = str(data.hp_meralgia).toLowerCase();

  const subjective: SubjectiveInput = {
    region: "hip",
    chiefComplaint: str(data.cc_main),
    ageOver50: age != null && age >= 50,
    ageBand: age == null ? undefined : age < 40 ? "under40" : age <= 65 ? "40to65" : "over65",
    nightPain: has(pattern, "night pain"),
    constantPain: has(pattern, "constant"),
    onsetTraumatic: has(moi, "fall", "high-speed sport", "kicking mechanism", "lunging mechanism", "twisting"),
    onsetInsidious: has(moi, "insidious onset", "age-related degenerative", "overuse"),
    cSignPositive: has(cSign, "yes —"),
    hipGroinDominantPattern: has(locPattern, "groin-dominant") || has(loc, "groin — anterior", "anterior hip"),
    lateralHipPattern: has(locPattern, "lateral hip") || has(loc, "lateral hip"),
    proximalHamstringPattern: has(locPattern, "ischial tuberosity") || has(loc, "ischial tuberosity") || has(hamstringOnset, "sitting on ischial tuberosity painful"),
    adductorPattern: has(locPattern, "adductor") || has(loc, "adductor"),
    pubicSymphysisPattern: has(locPattern, "pubic symphysis") || has(loc, "pubic symphysis"),
    kickingOrSprintMechanism: has(moi, "kicking mechanism", "lunging mechanism", "high-speed sport"),
    fadirAggravation: has(aggMov, "fadir combined"),
    faberAggravation: has(aggMov, "faber combined"),
    worseLyingOnAffectedSide: has(aggAct, "lying on affected side"),
    ischialSittingPain: has(aggAct, "sitting on hard surface"),
    snappingHipInternal: has(mechanical, "internal snapping"),
    snappingHipExternal: has(mechanical, "external snapping"),
    hipCatchingOrLocking: has(mechanical, "clicking — with pain", "catching sensation", "giving way", "locking — intermittent"),
    hipCrepitusGrinding: has(mechanical, "crepitus"),
    deepButtockPain: has(piriformis, "deep buttock pain", "sciatica-like radiation", "tenderness deep to gluteus"),
    meralgiaPattern: has(meralgia, "lateral thigh burning"),
    hipMorningStiffness: has(pattern, "morning stiffness"),
    avnRiskFactors: has(rf, "avascular necrosis risk"),
    nonMskReferralSuspected: has(rf, "referred pain from abdomen", "gynaecological referral", "testicular"),
    traumaHistory: selected(data.grf_fracture, "no fracture indicators") || has(rf, "suspected fracture", "suspected neck of femur") || has(moi, "fall"),
    unableToWeightBear: has(rf, "cannot weight bear"),
    hotSwollenJoint: has(rf, "acute hot swollen hip joint"),
    unexplainedWeightLoss: has(str(data.grf_systemic), "unexplained weight loss"),
    systemicIllness: selected(data.grf_systemic, "systemically well") || has(rf, "constitutional symptoms"),
    malignancyHistory: selected(data.grf_cancer, "no cancer history") || has(rf, "cancer history"),
    nightPainUnrelieved: has(rf, "constant progressive pain"),
  };

  const rom = [
    readRom(data, "hflex", "Flexion", 120, true),
    readRom(data, "hext", "Extension", 20, true),
    readRom(data, "habd", "Abduction", 45, true),
    readRom(data, "hadd", "Adduction", 30, true),
    readRom(data, "her", "External rotation", 45, true),
    readRom(data, "hir", "Internal rotation", 45, true),
  ].filter((e): e is RomEntry => e != null);

  const mmt = [
    readMmt(data, "mmt_gmax", "Gluteus Maximus (Extension)"),
    readMmt(data, "mmt_gmed", "Gluteus Medius (Abduction)"),
    readMmt(data, "mmt_tfl", "Tensor Fasciae Latae (Flexion/Abduction/IR)"),
    readMmt(data, "mmt_adduc", "Hip Adductors (Adduction)"),
    readMmt(data, "mmt_hamstr", "Hamstrings (Hip Extension/Knee Flexion)"),
  ].filter((e): e is MmtEntry => e != null);

  const specialTests: Record<string, boolean> = {};
  const setT = (key: string, v: boolean) => { if (v) specialTests[key] = true; };
  setT("fadir", has(data.st_fadir_test, "positive — anterior groin"));
  setT("faber_groin", has(data.st_faber_test, "positive — groin"));
  setT("faber_sij", has(data.st_faber_test, "positive — posterior pelvic"));
  setT("hip_scour", isPos(data.st_hip_scour));
  setT("trendelenburg", has(data.st_trendelenburg_test, "positive", "compensatory lurch"));
  setT("thomas", has(data.st_thomas_test, "positive", "combined"));
  setT("ober", isPos(data.st_ober_test));
  setT("piriformis", isPos(data.st_piriformis_test));
  setT("hamstring_90_90", has(data.st_90_90, "mild hamstring tightness", "moderate hamstring tightness", "severe hamstring tightness"));

  const objective: ObjectiveFindings = {
    rom, mmt, specialTests,
    palpation: { tenderStructures: readPalpation(data) },
    functional: { movements: [] },
    imaging: readImaging(data),
  };
  return { subjective, objective, region: "hip" };
}

export function runHipReasoningFromData(data: Data): ReasoningResult {
  const { subjective, objective, region } = normalizeHipFromData(data);
  return runReasoning(subjective, objective, region);
}

// ── Knee ────────────────────────────────────────────────────────────────────
// IMPORTANT: unlike every other region, knee subjective history is NOT a single
// shared module. sharedClinicalData.js defines two independent, NON-symmetric
// modules: "Knee (L)" (prefix "knl") and "Knee (R)" (prefix "knr") -- the right
// side is missing several fields the left has (knl_weightbear, knl_agg_other,
// the whole knl_sport_* section, knl_plc posterolateral-corner screen) and some
// shared concepts use different field-name suffixes (knl_swelling_pattern vs
// knr_swelling_patt). A naive `${prefix}_x` template would silently miss data
// on one side. Every concept below reads BOTH knl_ and knr_ fields and combines
// them into one lowercased string via combo(), so a signal present on either
// side is picked up (same "worse/either side" principle already used for ROM
// and MMT above) -- verified against the real field ids on both sides, not
// assumed symmetric. Special tests and ROM use the generic rom_/st_ ids, which
// are NOT side-split, so they need no such handling.
const combo = (a: unknown, b: unknown): string => `${str(a)} | ${str(b)}`.toLowerCase();

export function normalizeKneeFromData(data: Data): { subjective: SubjectiveInput; objective: ObjectiveFindings; region: string } {
  const age = num(data.dem_age);
  const loc = combo(data.knl_loc, data.knr_loc);
  const moi = combo(data.knl_moi, data.knr_moi);
  const pop = combo(data.knl_pop, data.knr_pop);
  const swelling = combo(data.knl_swelling, data.knr_swelling);
  // NOTE: right-side field is "knr_swelling_patt" (truncated), not "_pattern" -- verified, not a typo.
  const swellingPattern = combo(data.knl_swelling_pattern, data.knr_swelling_patt);
  const givingWay = combo(data.knl_giving_way, data.knr_giving_way);
  const locking = combo(data.knl_locking, data.knr_locking);
  const movie = combo(data.knl_movie, data.knr_movie);
  const descent = combo(data.knl_descent, data.knr_descent);
  const clicking = combo(data.knl_clicking, data.knr_clicking);
  const pattern = combo(data.knl_pattern, data.knr_pattern);
  const pcl = combo(data.knl_pcl, data.knr_pcl);
  const rf = combo(data.knl_rf, data.knr_rf);

  const subjective: SubjectiveInput = {
    region: "knee",
    chiefComplaint: str(data.cc_main),
    ageOver50: age != null && age >= 50,
    ageBand: age == null ? undefined : age < 40 ? "under40" : age <= 65 ? "40to65" : "over65",
    nightPain: has(rf, "night pain progressive", "constant night pain"),
    onsetTraumatic: has(moi, "twisting", "direct blow", "fall onto knee", "jumping", "pivoting", "hyperextension"),
    onsetInsidious: has(moi, "no clear mechanism", "insidious", "overuse"),
    kneeNonContactTwistMechanism: has(moi, "non-contact"),
    kneeAcutePopFelt: has(pop, "yes — clear pop"),
    kneeImmediateHaemarthrosis: has(swelling, "haemarthrosis"),
    kneeGivingWayWithPivot: has(givingWay, "pivot"),
    kneeTrueLocking: has(locking, "true locking"),
    kneeMovieSignPositive: has(movie, "yes —"),
    kneeWorseDescendingStairs: has(descent, "worse going down"),
    // Right-side "direct blow medial / lateral" is a single combined option in
    // the app (verified) -- it cannot be split into valgus vs varus, so only
    // the left-side wording (which IS specific) drives these two flags.
    kneeValgusMechanism: has(str(data.knl_moi).toLowerCase(), "direct blow medial"),
    kneeVarusMechanism: has(str(data.knl_moi).toLowerCase(), "direct blow lateral"),
    kneePclMechanism: has(pcl, "dashboard mechanism", "direct blow to anterior tibia"),
    kneeJointLineMechanical: has(clicking, "click with pain", "painful click", "catching", "grinding", "crepitus", "clunk"),
    kneeDelayedOrRecurrentSwelling: has(swellingPattern, "persistent", "recurrent"),
    kneeAnteriorPainPattern: has(loc, "anterior knee", "patella —"),
    kneePatellarTendonPattern: has(loc, "patellar tendon — inferior pole"),
    kneeMedialJointPain: has(loc, "medial joint line"),
    kneeLateralJointPain: has(loc, "lateral joint line"),
    kneeLateralItbPattern: has(loc, "itb attachment"),
    kneeDiffuseWholeKneePain: has(loc, "whole knee"),
    traumaHistory: selected(data.grf_fracture, "no fracture indicators") || has(moi, "fall onto knee", "direct blow", "jumping") || has(rf, "unable to bear weight", "ottawa"),
    unableToWeightBear: has(rf, "unable to bear weight", "ottawa rules positive"),
    hotSwollenJoint: has(rf, "septic arthritis"),
    irreducibleLocking: has(rf, "irreducible"),
    vascularCompromiseSigns: has(rf, "vascular compromise", "compartment syndrome"),
    unexplainedWeightLoss: has(str(data.grf_systemic), "unexplained weight loss"),
    systemicIllness: selected(data.grf_systemic, "systemically well") || has(rf, "night pain progressive"),
    malignancyHistory: selected(data.grf_cancer, "no cancer history") || has(rf, "cancer history"),
    nightPainUnrelieved: has(rf, "night pain progressive", "constant night pain"),
  };

  const rom = [
    readRom(data, "kflex", "Flexion", 140, true),
    readRom(data, "kext", "Extension", 0, true),
  ].filter((e): e is RomEntry => e != null);

  const mmt = [
    readMmt(data, "mmt_quad", "Quadriceps (Knee Extension)"),
  ].filter((e): e is MmtEntry => e != null);

  const specialTests: Record<string, boolean> = {};
  const setT = (key: string, v: boolean) => { if (v) specialTests[key] = true; };
  setT("lachman", has(data.st_lachmans, "grade 1", "grade 2", "grade 3"));
  setT("anterior_drawer", isPos(data.st_anterior_drawer));
  setT("posterior_drawer", isPos(data.st_posterior_drawer));
  setT("pivot_shift", has(data.st_pivot_shift, "grade 1", "grade 2", "grade 3"));
  setT("valgus_stress", has(data.st_valgus_stress_knee, "grade 1", "grade 2", "grade 3"));
  setT("varus_stress", isPos(data.st_varus_stress_knee));
  setT("mcmurray", isPos(data.st_mcmurray_test));
  setT("apley_compression", has(data.st_apley, "positive — compression", "both positive"));
  setT("thessaly", isPos(data.st_thessaly));
  setT("clarkes", isPos(data.st_clarkes));
  setT("patellar_grind", isPos(data.st_patellar_grind));
  setT("effusion", selected(data.st_effusion, "no effusion"));
  setT("noble", isPos(data.st_noble));
  setT("ober", isPos(data.st_ober_test));

  const objective: ObjectiveFindings = {
    rom, mmt, specialTests,
    palpation: { tenderStructures: readPalpation(data) },
    functional: { movements: [] },
    imaging: readImaging(data),
  };
  return { subjective, objective, region: "knee" };
}

export function runKneeReasoningFromData(data: Data): ReasoningResult {
  const { subjective, objective, region } = normalizeKneeFromData(data);
  return runReasoning(subjective, objective, region);
}

/** Region dispatcher — routes a flat record to the correct region normalizer. */
export function runReasoningFromData(data: Data, region: string): ReasoningResult {
  if (region === "cervical") return runCervicalReasoningFromData(data);
  if (region === "lumbar") return runLumbarReasoningFromData(data);
  if (region === "hip") return runHipReasoningFromData(data);
  if (region === "knee") return runKneeReasoningFromData(data);
  return runShoulderReasoningFromData(data);
}
