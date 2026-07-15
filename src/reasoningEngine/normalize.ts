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
export function normalizeFromData(data: Data): { subjective: SubjectiveInput; objective: ObjectiveFindings; region: string } {
  const cc = str(data.cc_main).toLowerCase();
  const behaviour = str(data.sh_behaviour ?? data.cx_behaviour ?? data.cc_pattern).toLowerCase();
  const onset = str(data.cc_onset ?? data.sh_onset).toLowerCase();
  const age = num(data.dem_age);

  const subjective: SubjectiveInput = {
    region: "shoulder",
    chiefComplaint: str(data.cc_main),
    ageOver50: age != null && age >= 50,
    nightPain: isPos(data.sh_night) || has(behaviour, "night"),
    constantPain: has(behaviour, "constant"),
    easesWithRest: has(behaviour, "rest", "ease"),
    paresthesia: has(cc, "tingl", "numb", "pins") || isPos(data.sh_paresthesia),
    radiationBelowElbow: has(str(data.loc_radiation), "forearm", "hand", "below elbow", "finger"),
    onsetTraumatic: has(onset, "trauma", "fall", "injury", "sudden"),
    onsetInsidious: has(onset, "insidious", "gradual", "no injury"),
    overheadAggravation: has(str(data.sh_agg_mov ?? data.sh_agg_act ?? data.cc_agg), "overhead", "reach", "lift", "above"),
    progressiveStiffness: has(behaviour, "stiff", "progressive") || has(cc, "stiff"),
    traumaHistory: isPos(data.grf_fracture) || has(onset, "major trauma"),
    unexplainedWeightLoss: isPos(data.grf_cancer),
    systemicIllness: isPos(data.grf_systemic),
    malignancyHistory: isPos(data.grf_cancer),
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

  const imagingSummary = str(data.sh_imaging ?? data.imaging_summary);
  const objective: ObjectiveFindings = {
    rom, mmt, specialTests,
    palpation: { tenderStructures: readPalpation(data) },
    functional: { movements: [] },
    imaging: imagingSummary ? { performed: true, summary: imagingSummary } : { performed: false },
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

export function normalizeCervicalFromData(data: Data): { subjective: SubjectiveInput; objective: ObjectiveFindings; region: string } {
  const cc = str(data.cc_main).toLowerCase();
  const behaviour = str(data.cx_behaviour ?? data.cc_pattern).toLowerCase();
  const onset = str(data.cc_onset ?? data.cx_onset).toLowerCase();
  const age = num(data.dem_age);
  const radiation = str(data.loc_radiation ?? data.cx_radiation).toLowerCase();

  const vbiPos = isPos(data.st_vbi) || isPos(data.cx_vbi) || isPos(data.cx_dizziness) || has(cc, "dizz");
  const hoffmannPos = isPos(data.st_hoffmanns);
  const babinskiPos = isPos(data.st_babinski) || reflexAbnormal(data["n_ref_babinski_left"]) || reflexAbnormal(data["n_ref_babinski_right"]);
  const anyMyotomeWeak = CERVICAL_MYOTOMES.some((m) => myotomeAbnormal(data[`myo_${m}_left`]) || myotomeAbnormal(data[`myo_${m}_right`]));
  const anyReflexChange = CERVICAL_REFLEXES.some((r) => reflexAbnormal(data[`${r}_left`]) || reflexAbnormal(data[`${r}_right`]));
  const anySensoryDeficit = CERVICAL_DERMATOMES.some((d) => dermatomeAbnormal(data[`${d}_left`]) || dermatomeAbnormal(data[`${d}_right`]));

  const subjective: SubjectiveInput = {
    region: "cervical",
    chiefComplaint: str(data.cc_main),
    ageOver50: age != null && age >= 50,
    nightPain: isPos(data.cx_night) || has(behaviour, "night"),
    constantPain: has(behaviour, "constant"),
    paresthesia: has(cc, "tingl", "numb", "pins") || has(radiation, "tingl", "numb") || isPos(data.cx_paresthesia) || anySensoryDeficit,
    radiatingArmPain: has(radiation, "arm", "shoulder", "forearm", "hand") || isPos(data.cx_arm_pain),
    dermatomalPattern: isPos(data.cx_dermatomal) || has(radiation, "dermatom") || anySensoryDeficit,
    headacheFromNeck: has(cc, "headache") || isPos(data.cx_headache),
    unilateralHeadache: isPos(data.cx_unilateral_headache) || has(str(data.cx_headache), "unilateral", "one side", "side-locked"),
    neckStiffness: has(behaviour, "stiff") || has(cc, "stiff") || isPos(data.cx_stiffness),
    extensionRotationAggravation: has(str(data.cx_agg_mov ?? data.cx_agg_post ?? data.cc_agg), "extension", "rotation", "looking up", "overhead"),
    onsetTraumatic: has(onset, "trauma", "whiplash", "rta", "accident", "fall", "sudden"),
    onsetInsidious: has(onset, "insidious", "gradual"),
    gaitDisturbance: isPos(data.cx_gait) || has(str(data.cx_umn), "gait", "unsteady", "balance"),
    dizzinessVBI: vbiPos,
    // red-flag sub-signals
    myelopathySigns: isPos(data.cx_rf_myelopathy) || hoffmannPos || babinskiPos || isPos(data.cx_gait),
    suddenSevereHeadacheOrNeckPain: isPos(data.cx_rf_vbi) || isPos(data.cx_thunderclap),
    vertebrobasilarSigns: isPos(data.cx_rf_vbi) || vbiPos,
    traumaHistory: isPos(data.grf_fracture) || has(onset, "major trauma"),
    unexplainedWeightLoss: isPos(data.grf_cancer),
    systemicIllness: isPos(data.grf_systemic),
    malignancyHistory: isPos(data.grf_cancer),
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
  setT("ultt", isPos(data.st_ultt) || isPos(data.st_slump_test));

  const objective: ObjectiveFindings = {
    rom, mmt, specialTests,
    palpation: { tenderStructures: readPalpation(data) },
    functional: { movements: [] },
    imaging: str(data.cx_imaging) ? { performed: true, summary: str(data.cx_imaging) } : { performed: false },
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
  const behaviour = str(data.lx_pattern ?? data.cc_pattern).toLowerCase();
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
    traumaHistory: isPos(data.grf_fracture) || has(rfFracture, "major high-energy trauma") || has(onset, "fall", "motor vehicle accident"),
    unexplainedWeightLoss: isPos(data.grf_cancer) || has(rfSerious, "unexplained weight loss"),
    malignancyHistory: isPos(data.grf_cancer) || has(rfSerious, "history of cancer"),
    systemicIllness: isPos(data.grf_systemic) || has(rfSerious, "fever", "systemically unwell"),
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

  const imagingSummary = str(data.lx_imaging ?? data.imaging_summary);
  const objective: ObjectiveFindings = {
    rom, mmt, specialTests,
    palpation: { tenderStructures: readPalpation(data) },
    functional: { movements: [] },
    imaging: imagingSummary ? { performed: true, summary: imagingSummary } : { performed: false },
  };
  return { subjective, objective, region: "lumbar" };
}

export function runLumbarReasoningFromData(data: Data): ReasoningResult {
  const { subjective, objective, region } = normalizeLumbarFromData(data);
  return runReasoning(subjective, objective, region);
}

/** Region dispatcher — routes a flat record to the correct region normalizer. */
export function runReasoningFromData(data: Data, region: string): ReasoningResult {
  if (region === "cervical") return runCervicalReasoningFromData(data);
  if (region === "lumbar") return runLumbarReasoningFromData(data);
  return runShoulderReasoningFromData(data);
}
