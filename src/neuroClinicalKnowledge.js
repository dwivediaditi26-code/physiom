// neuroClinicalKnowledge.js — the Neuro clinical knowledge base.
//
// This file is DATA + RULES, deliberately kept out of the UI (2026-09-02,
// Aditi: "build a Clinical Knowledge Base, not hard-code the knowledge
// directly into the UI ... that way you can update the clinical knowledge
// later without redesigning the whole application").
//
// It is a clinical DECISION-SUPPORT layer, not a diagnosis engine. Nothing
// here decides anything for the therapist:
//   - deriveNeuroProblems() only SUGGESTS problems, and only ever from
//     values the therapist actually recorded in the assessment. Every
//     suggestion carries the exact findings that triggered it so the UI can
//     show "why", and the therapist selects/deselects.
//   - buildGoalsForProblem() only SUGGESTS goal templates, pre-filled with
//     the patient's own recorded baseline. Every field stays editable.
//   - Treatments are never auto-prescribed; a problem only declares which
//     library CATEGORIES are clinically relevant, and the therapist picks.
//
// SOURCES. The three reference texts below were used to validate the
// examination vocabulary, impairment categories, outcome measures and the
// intervention categories this file organises. No text is reproduced from
// them -- all wording here is original, and the standard clinical
// terminology used (MMT grades, Modified Ashworth, Berg, FIM-style
// assistance levels, 10MWT) is professional nomenclature, not authored
// prose. `refs` on each problem records which text supports that
// problem/goal/intervention grouping so the knowledge can be audited and
// updated later.

export const REFERENCES = {
  dejong: {
    id: "dejong",
    citation: "Campbell WW. DeJong's The Neurologic Examination. 7th ed. Philadelphia: Lippincott Williams & Wilkins; 2013.",
    useFor: "Examination technique, impairment terminology, localisation",
  },
  umphred: {
    id: "umphred",
    citation: "Umphred DA, Lazaro RT, Roller ML, Burton GU, eds. Umphred's Neurological Rehabilitation. 6th ed. St. Louis: Elsevier Mosby; 2013.",
    useFor: "Neurological rehabilitation management, intervention strategy",
  },
  osullivan: {
    id: "osullivan",
    citation: "O'Sullivan SB, Schmitz TJ, Fulk GD, eds. Physical Rehabilitation. 6th ed. Philadelphia: F.A. Davis; 2014.",
    useFor: "Motor control/motor learning framework, functional training, outcome measures",
  },
};

// Evidence grading used on each problem->treatment grouping.
//   A = supported by clinical practice guideline / systematic review
//   B = supported by the reference texts as established practice
//   C = reasonable practice, weaker or mixed evidence
export const EVIDENCE_LEVELS = { A: "Guideline / systematic review", B: "Established textbook practice", C: "Reasonable practice, limited evidence" };

export const PROBLEM_CATEGORIES = [
  { id: "motor", label: "Motor", icon: "💪" },
  { id: "tone", label: "Tone", icon: "⚡" },
  { id: "sensory", label: "Sensory", icon: "🖐️" },
  { id: "balance", label: "Balance", icon: "⚖️" },
  { id: "gait", label: "Gait", icon: "🚶" },
  { id: "coordination", label: "Coordination", icon: "🎯" },
  { id: "functional", label: "Functional mobility", icon: "🛏️" },
  { id: "adl", label: "ADL", icon: "🧼" },
  { id: "cognition", label: "Cognition / communication", icon: "🧠" },
  { id: "other", label: "Other", icon: "📋" },
];

/* ============================================================
   ASSISTANCE LADDER
   One ordered scale so "reduce assistance by one level" is a real,
   computable goal target instead of free text. Ordered best -> worst;
   the app's Gait and Functional sections use overlapping subsets of
   these exact strings (see NeurologicalAssessment.jsx), so both map
   onto this single ladder.
   ============================================================ */
export const ASSIST_LADDER = [
  "Independent",
  "Supervision",
  "Contact guard",
  "Minimal assist",
  "Moderate assist",
  "Maximal assist",
  "Dependent",
];
const ASSIST_ALIASES = { "Unable to ambulate": "Dependent", "Requires hoist": "Dependent", "Min A": "Minimal assist", "Mod A": "Moderate assist", "Max A": "Maximal assist" };

export function normalizeAssist(level) {
  if (!level) return null;
  const v = ASSIST_ALIASES[level] || level;
  return ASSIST_LADDER.includes(v) ? v : null;
}
// One step toward independence. Returns null when already Independent
// (nothing to progress to) or when the level isn't on the ladder.
export function nextAssistLevel(level, steps = 1) {
  const v = normalizeAssist(level);
  if (!v) return null;
  const i = ASSIST_LADDER.indexOf(v);
  return i <= 0 ? null : ASSIST_LADDER[Math.max(0, i - steps)];
}
// True when `level` means the patient needs hands-on/physical help.
export function needsAssistance(level) {
  const v = normalizeAssist(level);
  return !!v && ASSIST_LADDER.indexOf(v) >= ASSIST_LADDER.indexOf("Contact guard");
}

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// MMT is stored as an object of { muscleKey: "5"|"4"|"3"|"2"|"1"|"0" }.
// Returns the weak entries only, so a suggested problem can cite the
// actual muscles that were graded weak rather than a vague "weakness".
function weakMuscles(mmt, threshold = 4) {
  if (!mmt || typeof mmt !== "object") return [];
  return Object.entries(mmt)
    .map(([k, v]) => ({ muscle: k, grade: num(String(v).replace("+", ".5")), raw: String(v) }))
    .filter((m) => m.grade !== null && m.grade < threshold)
    .sort((a, b) => a.grade - b.grade);
}
const prettyMuscle = (k) => String(k).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ============================================================
   PROBLEM CATALOG
   Each entry:
     detect(d)  -> null, or { findings:[{label,value}], baseline:{...} }
                   `d` is the Neuro assessment's own saved section data
                   (d.motor, d.balance, d.gait, d.functional, ...).
     goals      -> goal templates, each build(baseline) -> a goal object
                   pre-filled from the patient's real recorded values.
     treatmentCategories -> keys into EXERCISE_DB.neurological.categories
                   (sharedClinicalData.js) so "+ Add Treatment" opens
                   already filtered to clinically relevant options.
   ============================================================ */
export const NEURO_PROBLEMS = [
  {
    id: "walking_limitation",
    name: "Reduced walking ability",
    category: "gait",
    refs: ["osullivan", "umphred"],
    evidence: "A",
    treatmentCategories: ["Gait Training", "Balance & Proprioception", "Functional Mobility & Transfers"],
    detect: (d) => {
      const g = d.gait || {};
      const assist = normalizeAssist(g.assistanceLevel);
      const dist = num(g.distance);
      const speed = num(g.gaitSpeed) ?? num(g.tenMWT);
      const impairedPattern = g.pattern && g.pattern !== "Normal" && g.pattern !== "Not tested";
      if (!assist && dist === null && !impairedPattern && speed === null) return null;
      const limited = (assist && assist !== "Independent") || impairedPattern || (speed !== null && speed < 0.8);
      if (!limited) return null;
      const findings = [];
      if (assist) findings.push({ label: "Walking assistance", value: assist });
      if (dist !== null) findings.push({ label: "Walking distance", value: `${dist} m` });
      if (g.device && g.device !== "None") findings.push({ label: "Device", value: g.device });
      if (impairedPattern) findings.push({ label: "Gait pattern", value: g.pattern });
      if (speed !== null) findings.push({ label: "Gait speed", value: `${speed} m/s` });
      return { findings, baseline: { assist, distance: dist, device: g.device, speed } };
    },
    goals: [
      {
        id: "walk_distance", label: "Increase walking distance", term: "short", weeks: 4,
        applies: (b) => b.distance !== null,
        build: (b) => ({ measure: "Walking distance", unit: "m", baseline: `${b.distance} m${b.assist ? ` (${b.assist})` : ""}`, target: `${Math.round(b.distance * 2)} m`, targetValue: Math.round(b.distance * 2), baselineValue: b.distance }),
      },
      {
        id: "walk_assist", label: "Reduce walking assistance", term: "long", weeks: 8,
        applies: (b) => !!nextAssistLevel(b.assist),
        build: (b) => ({ measure: "Walking assistance", unit: "level", baseline: b.assist, target: nextAssistLevel(b.assist), baselineValue: b.assist, targetValue: nextAssistLevel(b.assist) }),
      },
      {
        id: "walk_speed", label: "Improve gait speed", term: "long", weeks: 8,
        applies: (b) => b.speed !== null,
        build: (b) => ({ measure: "Gait speed (10MWT)", unit: "m/s", baseline: `${b.speed} m/s`, target: `${(b.speed + 0.2).toFixed(2)} m/s`, baselineValue: b.speed, targetValue: +(b.speed + 0.2).toFixed(2) }),
      },
    ],
  },
  {
    id: "dynamic_balance",
    name: "Impaired dynamic balance",
    category: "balance",
    refs: ["osullivan", "umphred"],
    evidence: "A",
    treatmentCategories: ["Balance & Proprioception", "Gait Training", "Vestibular Rehabilitation"],
    detect: (d) => {
      const b = d.balance || {};
      const berg = num(b.berg);
      const dyn = b.standDynamic;
      const impaired = (berg !== null && berg < 45) || (dyn && dyn !== "Normal" && dyn !== "Not tested");
      if (!impaired) return null;
      const findings = [];
      if (berg !== null) findings.push({ label: "Berg Balance Scale", value: `${berg}/56` });
      if (dyn) findings.push({ label: "Dynamic standing balance", value: dyn });
      if (b.standStatic) findings.push({ label: "Static standing balance", value: b.standStatic });
      if (b.romberg && b.romberg.startsWith("Positive")) findings.push({ label: "Romberg", value: b.romberg });
      return { findings, baseline: { berg, dynamic: dyn, fallRisk: berg !== null && berg < 45 } };
    },
    goals: [
      {
        id: "berg_target", label: "Improve Berg Balance Scale score", term: "long", weeks: 6,
        applies: (b) => b.berg !== null,
        build: (b) => ({ measure: "Berg Balance Scale", unit: "/56", baseline: `${b.berg}/56`, target: `${Math.min(56, b.berg + 12)}/56`, baselineValue: b.berg, targetValue: Math.min(56, b.berg + 12) }),
      },
      {
        id: "dyn_balance_level", label: "Improve dynamic standing balance", term: "short", weeks: 4,
        applies: () => true,
        build: (b) => ({ measure: "Dynamic standing balance", unit: "level", baseline: b.dynamic || "Impaired", target: "Independent without upper-limb support", baselineValue: b.dynamic, targetValue: "Independent" }),
      },
    ],
  },
  {
    id: "transfer_limitation",
    name: "Transfer / sit-to-stand limitation",
    category: "functional",
    refs: ["osullivan", "umphred"],
    evidence: "A",
    treatmentCategories: ["Functional Mobility & Transfers", "Motor Relearning", "Balance & Proprioception"],
    detect: (d) => {
      const f = d.functional || {};
      const sts = normalizeAssist(f.sitStand);
      const bedChair = normalizeAssist(f.bedChair);
      const worst = [sts, bedChair].filter(Boolean).sort((a, b) => ASSIST_LADDER.indexOf(b) - ASSIST_LADDER.indexOf(a))[0];
      if (!worst || worst === "Independent") return null;
      const findings = [];
      if (sts) findings.push({ label: "Sit-to-stand", value: sts });
      if (bedChair) findings.push({ label: "Bed↔chair transfer", value: bedChair });
      return { findings, baseline: { sitStand: sts, bedChair, worst } };
    },
    goals: [
      {
        id: "sts_assist", label: "Reduce sit-to-stand assistance", term: "short", weeks: 2,
        applies: (b) => !!nextAssistLevel(b.sitStand),
        build: (b) => ({ measure: "Sit-to-stand", unit: "level", baseline: b.sitStand, target: nextAssistLevel(b.sitStand), baselineValue: b.sitStand, targetValue: nextAssistLevel(b.sitStand) }),
      },
      {
        id: "transfer_assist", label: "Reduce transfer assistance", term: "long", weeks: 8,
        applies: (b) => !!nextAssistLevel(b.bedChair),
        build: (b) => ({ measure: "Bed↔chair transfer", unit: "level", baseline: b.bedChair, target: nextAssistLevel(b.bedChair), baselineValue: b.bedChair, targetValue: nextAssistLevel(b.bedChair) }),
      },
    ],
  },
  {
    id: "muscle_weakness",
    name: "Muscle weakness",
    category: "motor",
    refs: ["dejong", "osullivan"],
    evidence: "B",
    treatmentCategories: ["Motor Relearning", "Range of Motion & Spasticity Management", "Functional Mobility & Transfers"],
    detect: (d) => {
      const weak = weakMuscles((d.motor || {}).mmt);
      if (!weak.length) return null;
      const findings = weak.slice(0, 6).map((m) => ({ label: prettyMuscle(m.muscle), value: `MMT ${m.raw}/5` }));
      if (weak.length > 6) findings.push({ label: "Additional", value: `+${weak.length - 6} more graded below 4/5` });
      return { findings, baseline: { weakest: weak[0], count: weak.length, muscles: weak } };
    },
    goals: [
      {
        id: "mmt_grade", label: "Improve muscle strength grade", term: "long", weeks: 8,
        applies: (b) => !!b.weakest,
        build: (b) => ({ measure: `MMT — ${prettyMuscle(b.weakest.muscle)}`, unit: "/5", baseline: `${b.weakest.raw}/5`, target: `${Math.min(5, Math.floor(b.weakest.grade) + 1)}/5`, baselineValue: b.weakest.grade, targetValue: Math.min(5, Math.floor(b.weakest.grade) + 1) }),
      },
      {
        id: "functional_strength", label: "Translate strength into function", term: "short", weeks: 4,
        applies: () => true,
        build: () => ({ measure: "Functional strength task", unit: "reps", baseline: "Baseline to be recorded", target: "Improved repetitions without assistance", baselineValue: null, targetValue: null }),
      },
    ],
  },
  {
    id: "abnormal_tone",
    name: "Abnormal tone / spasticity",
    category: "tone",
    refs: ["dejong", "umphred"],
    evidence: "B",
    treatmentCategories: ["Range of Motion & Spasticity Management", "Motor Relearning"],
    detect: (d) => {
      const t = d.tone || {};
      const mas = t.mas && typeof t.mas === "object" ? Object.entries(t.mas).filter(([, v]) => v && v !== "0") : [];
      const hyper = t.toneType && /spastic|rigid|hyperton/i.test(t.toneType);
      const clonus = t.clonus && t.clonus !== "Absent";
      if (!mas.length && !hyper && !clonus) return null;
      const findings = [];
      if (t.toneType) findings.push({ label: "Tone", value: t.toneType });
      mas.slice(0, 4).forEach(([k, v]) => findings.push({ label: `MAS — ${prettyMuscle(k)}`, value: String(v) }));
      if (clonus) findings.push({ label: "Clonus", value: t.clonus });
      return { findings, baseline: { mas, toneType: t.toneType, clonus: t.clonus } };
    },
    goals: [
      {
        id: "tone_manage", label: "Maintain range and manage tone", term: "short", weeks: 4,
        applies: () => true,
        build: (b) => ({ measure: "Modified Ashworth / passive range", unit: "grade", baseline: b.mas.length ? `MAS ${b.mas[0][1]} — ${prettyMuscle(b.mas[0][0])}` : b.toneType || "Increased tone", target: "No loss of passive range; tone not limiting function", baselineValue: b.mas.length ? b.mas[0][1] : null, targetValue: null }),
      },
    ],
  },
  {
    id: "impaired_coordination",
    name: "Impaired coordination",
    category: "coordination",
    refs: ["dejong", "umphred"],
    evidence: "B",
    treatmentCategories: ["Coordination Training", "Motor Relearning", "Balance & Proprioception"],
    detect: (d) => {
      const c = d.coordination || {};
      const abnormal = [
        ["Finger-to-nose", c.fingerNose],
        ["Heel-to-shin", c.heelShin],
        ["Rapid alternating movements", c.ram],
      ].filter(([, v]) => v && v !== "Normal" && v !== "Not tested");
      if (!abnormal.length) return null;
      return { findings: abnormal.map(([label, value]) => ({ label, value })), baseline: { tests: abnormal } };
    },
    goals: [
      {
        id: "coord_accuracy", label: "Improve limb coordination accuracy", term: "long", weeks: 6,
        applies: () => true,
        build: (b) => ({ measure: b.tests[0][0], unit: "performance", baseline: b.tests[0][1], target: "Performed accurately without decomposition", baselineValue: b.tests[0][1], targetValue: "Normal" }),
      },
    ],
  },
  {
    id: "sensory_loss",
    name: "Sensory impairment",
    category: "sensory",
    refs: ["dejong"],
    evidence: "B",
    treatmentCategories: ["Balance & Proprioception", "Motor Relearning"],
    detect: (d) => {
      const s = d.sensory || {};
      const abnormal = [
        ["Proprioception", s.proprioception],
        ["Light touch", s.lightTouch],
        ["Vibration", s.vibration],
        ["Pinprick", s.pinprick],
      ].filter(([, v]) => v && !/^(normal|intact)/i.test(v) && v !== "Not tested");
      if (!abnormal.length) return null;
      return { findings: abnormal.map(([label, value]) => ({ label, value })), baseline: { tests: abnormal, proprioception: s.proprioception } };
    },
    goals: [
      {
        id: "sensory_compensation", label: "Compensate safely for sensory loss", term: "short", weeks: 4,
        applies: () => true,
        build: (b) => ({ measure: b.tests[0][0], unit: "safety", baseline: b.tests[0][1], target: "Uses compensatory strategy safely in functional tasks", baselineValue: b.tests[0][1], targetValue: null }),
      },
    ],
  },
  {
    id: "bed_mobility",
    name: "Reduced bed mobility",
    category: "functional",
    refs: ["osullivan"],
    evidence: "B",
    treatmentCategories: ["Functional Mobility & Transfers", "Motor Relearning"],
    detect: (d) => {
      const lvl = normalizeAssist((d.functional || {}).bedMobility);
      if (!lvl || lvl === "Independent") return null;
      return { findings: [{ label: "Bed mobility", value: lvl }], baseline: { level: lvl } };
    },
    goals: [
      {
        id: "bed_assist", label: "Reduce bed mobility assistance", term: "short", weeks: 3,
        applies: (b) => !!nextAssistLevel(b.level),
        build: (b) => ({ measure: "Bed mobility", unit: "level", baseline: b.level, target: nextAssistLevel(b.level), baselineValue: b.level, targetValue: nextAssistLevel(b.level) }),
      },
    ],
  },
  {
    id: "adl_dependence",
    name: "Reduced independence in ADL",
    category: "adl",
    refs: ["osullivan", "umphred"],
    evidence: "B",
    treatmentCategories: ["Functional Mobility & Transfers", "Motor Relearning"],
    detect: (d) => {
      const f = d.functional || {};
      const items = [["Dressing", f.dressing], ["Toileting", f.toileting], ["Feeding", f.feeding]]
        .map(([l, v]) => [l, normalizeAssist(v)])
        .filter(([, v]) => v && v !== "Independent");
      const barthel = num(f.barthel);
      if (!items.length && barthel === null) return null;
      if (!items.length && barthel !== null && barthel >= 100) return null;
      const findings = items.map(([label, value]) => ({ label, value }));
      if (barthel !== null) findings.push({ label: "Barthel Index", value: `${barthel}/100` });
      return { findings, baseline: { items, barthel } };
    },
    goals: [
      {
        id: "barthel_target", label: "Improve Barthel Index", term: "long", weeks: 8,
        applies: (b) => b.barthel !== null,
        build: (b) => ({ measure: "Barthel Index", unit: "/100", baseline: `${b.barthel}/100`, target: `${Math.min(100, b.barthel + 20)}/100`, baselineValue: b.barthel, targetValue: Math.min(100, b.barthel + 20) }),
      },
      {
        id: "adl_assist", label: "Reduce assistance in a target ADL", term: "short", weeks: 4,
        applies: (b) => b.items.length > 0 && !!nextAssistLevel(b.items[0][1]),
        build: (b) => ({ measure: b.items[0][0], unit: "level", baseline: b.items[0][1], target: nextAssistLevel(b.items[0][1]), baselineValue: b.items[0][1], targetValue: nextAssistLevel(b.items[0][1]) }),
      },
    ],
  },
  {
    id: "falls_risk",
    name: "Falls risk",
    category: "balance",
    refs: ["osullivan"],
    evidence: "A",
    treatmentCategories: ["Balance & Proprioception", "Gait Training"],
    detect: (d) => {
      const berg = num((d.balance || {}).berg);
      const romberg = (d.balance || {}).romberg;
      const risky = (berg !== null && berg < 45) || (romberg && romberg.startsWith("Positive"));
      if (!risky) return null;
      const findings = [];
      if (berg !== null) findings.push({ label: "Berg Balance Scale", value: `${berg}/56 (below 45 indicates increased falls risk)` });
      if (romberg && romberg.startsWith("Positive")) findings.push({ label: "Romberg", value: romberg });
      return { findings, baseline: { berg } };
    },
    goals: [
      {
        id: "no_falls", label: "No falls during rehabilitation", term: "long", weeks: 8,
        applies: () => true,
        build: () => ({ measure: "Falls", unit: "count", baseline: "At risk", target: "No falls", baselineValue: null, targetValue: 0 }),
      },
    ],
  },
];

/* ============================================================
   RULES ENGINE
   ============================================================ */

// Suggest problems from what the therapist actually recorded. Returns
// [{ ...problem, findings, baseline }] -- never auto-selected, and never
// invented: a problem only appears when its detect() found real values.
export function deriveNeuroProblems(neuroData) {
  const d = neuroData || {};
  const out = [];
  for (const p of NEURO_PROBLEMS) {
    let hit = null;
    try { hit = p.detect(d); } catch { hit = null; }
    if (hit && hit.findings && hit.findings.length) {
      out.push({ id: p.id, name: p.name, category: p.category, refs: p.refs, evidence: p.evidence, treatmentCategories: p.treatmentCategories, findings: hit.findings, baseline: hit.baseline });
    }
  }
  return out;
}

// Instantiate a problem's goal templates against that patient's real
// baseline. `applies()` filters out templates whose measure wasn't
// recorded (e.g. no Berg score => no Berg goal), so the therapist never
// sees a goal pre-filled with a value that doesn't exist.
export function buildGoalsForProblem(problemId, baseline) {
  const p = NEURO_PROBLEMS.find((x) => x.id === problemId);
  if (!p) return [];
  return p.goals
    .filter((g) => { try { return g.applies(baseline || {}); } catch { return false; } })
    .map((g) => {
      let built = {};
      try { built = g.build(baseline || {}) || {}; } catch { built = {}; }
      return { templateId: g.id, label: g.label, term: g.term, weeks: g.weeks, problemId, ...built };
    });
}

export function problemById(id) { return NEURO_PROBLEMS.find((p) => p.id === id) || null; }
export function categoryLabel(id) { return (PROBLEM_CATEGORIES.find((c) => c.id === id) || {}).label || "Other"; }

// Progress for a goal, derived from what actually happened in sessions
// rather than a separately-typed progress note (2026-09-02, Aditi: "no
// separate progress documentation is necessary"). `entries` are
// {sessionNo, date, value} points recorded against this goal's measure.
export function goalProgress(goal, entries) {
  const pts = (entries || []).filter((e) => e && e.value != null);
  const bv = typeof goal.baselineValue === "number" ? goal.baselineValue : null;
  const tv = typeof goal.targetValue === "number" ? goal.targetValue : null;
  const latest = pts.length ? pts[pts.length - 1].value : bv;
  if (bv === null || tv === null || typeof latest !== "number" || tv === bv) {
    return { pct: null, latest, achieved: false };
  }
  const pct = Math.max(0, Math.min(100, Math.round(((latest - bv) / (tv - bv)) * 100)));
  return { pct, latest, achieved: pct >= 100 };
}
