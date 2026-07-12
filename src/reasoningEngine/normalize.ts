// normalize.ts — best-effort mapping from the app's single flat `data` record
// into the engine's typed SubjectiveInput + ObjectiveFindings. Mirrors the
// conventions already proven in src/interpretationAdapter.js (isPos helper,
// worse-side-wins MMT, graceful missing fields). Everything not affirmatively
// present maps to false/undefined — never guessed. This is the seam the UI wires
// to; field-name mappings are deliberately centralised here so wiring is a
// data-edit, not an engine change.

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

// Shoulder special-test field-name candidates (checks several conventions so the
// mapping is robust to how the Special Tests module stores each result).
const TEST_FIELDS: Record<string, string[]> = {
  hawkins: ["sh_hawkins", "st_hawkins", "hawkins"],
  neer: ["sh_neer", "st_neer", "neer"],
  painful_arc: ["sh_painful_arc", "st_painful_arc", "painful_arc"],
  empty_can: ["sh_empty_can", "st_empty_can", "empty_can", "jobe"],
  er_lag: ["sh_er_lag", "st_er_lag", "er_lag", "ext_rot_lag"],
  drop_arm: ["sh_drop_arm", "st_drop_arm", "drop_arm"],
  lift_off: ["sh_lift_off", "st_lift_off", "lift_off", "gerber"],
  scarf: ["sh_scarf", "st_scarf", "scarf", "cross_body"],
  obrien: ["sh_obrien", "st_obrien", "obrien", "active_compression"],
  apprehension: ["sh_apprehension", "st_apprehension", "apprehension"],
  relocation: ["sh_relocation", "st_relocation", "relocation"],
  speeds: ["sh_speeds", "st_speeds", "speeds"],
  spurling: ["cx_spurling", "st_spurling", "spurling"],
};

function readTests(data: Data): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [id, fields] of Object.entries(TEST_FIELDS)) {
    const hit = fields.some((f) => isPos(data[f]) || isPos(data[`${f}_left`]) || isPos(data[`${f}_right`]));
    if (hit) out[id] = true;
  }
  return out;
}

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
    overheadAggravation: has(str(data.sh_agg_mov ?? data.sh_agg_act), "overhead", "reach", "lift"),
    progressiveStiffness: has(behaviour, "stiff", "progressive") || has(cc, "stiff"),
    // red-flag sub-signals (shoulder rarely, but keep the screen live)
    traumaHistory: isPos(data.grf_fracture) || has(onset, "major trauma"),
    unableToWeightBear: false,
    unexplainedWeightLoss: isPos(data.grf_cancer),
    nightPainUnrelieved: isPos(data.sh_night_unrelieved),
    systemicIllness: isPos(data.grf_systemic),
    malignancyHistory: isPos(data.grf_cancer),
  };

  // ROM: read shoulder movements if present (field convention <move>_<side>_<mode>).
  const romMoves: { key: string; label: string; normal: number }[] = [
    { key: "sh_flexion", label: "Flexion", normal: 180 },
    { key: "sh_abduction", label: "Abduction", normal: 180 },
    { key: "sh_external_rotation", label: "External rotation", normal: 90 },
    { key: "sh_internal_rotation", label: "Internal rotation", normal: 70 },
  ];
  const rom: RomEntry[] = [];
  for (const m of romMoves) {
    const active = num(data[`${m.key}_arom`] ?? data[`${m.key}_active`]);
    const passive = num(data[`${m.key}_prom`] ?? data[`${m.key}_passive`]);
    if (active == null && passive == null) continue;
    rom.push({
      movement: m.label,
      activeROM: active ?? passive,
      passiveROM: passive ?? active,
      normalROM: m.normal,
      endFeel: str(data[`${m.key}_endfeel`]) || undefined,
    });
  }

  // MMT: worse side wins; painOnResist if flagged.
  const mmtMuscles: { key: string; label: string }[] = [
    { key: "supraspinatus", label: "Supraspinatus (abduction)" },
    { key: "infraspinatus", label: "Infraspinatus (external rotation)" },
    { key: "subscapularis", label: "Subscapularis (internal rotation)" },
  ];
  const mmt: MmtEntry[] = [];
  for (const m of mmtMuscles) {
    const l = num(data[`mmt_${m.key}_L`]);
    const r = num(data[`mmt_${m.key}_R`]);
    const grade = [l, r].filter((g): g is number => g != null).sort((a, b) => a - b)[0];
    if (grade === undefined) continue;
    mmt.push({ muscle: m.label, grade, painOnResist: isPos(data[`mmt_${m.key}_pain`]) });
  }

  let tender: string[] = [];
  try {
    const pins = data.palp_pins ? JSON.parse(str(data.palp_pins)) : [];
    tender = (Array.isArray(pins) ? pins : [])
      .flatMap((p: { structures?: unknown }) => (Array.isArray(p.structures) ? p.structures : String(p.structures ?? "").split(",")))
      .map((s: unknown) => str(s).trim())
      .filter(Boolean);
  } catch {
    tender = [];
  }

  const imagingSummary = str(data.sh_imaging ?? data.imaging_summary);
  const objective: ObjectiveFindings = {
    rom,
    mmt,
    specialTests: readTests(data),
    palpation: { tenderStructures: tender },
    functional: { movements: [] },
    imaging: imagingSummary ? { performed: true, summary: imagingSummary } : { performed: false },
  };

  return { subjective, objective, region: "shoulder" };
}

/** Convenience entry the shoulder UI path calls. */
export function runShoulderReasoningFromData(data: Data): ReasoningResult {
  const { subjective, objective, region } = normalizeFromData(data);
  return runReasoning(subjective, objective, region);
}
