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
   CONDITION PROFILES
   Keyed to NeurologicalAssessment.jsx's own NEURO_TEMPLATES ids, so a
   condition only ever comes from what the therapist actually selected
   at setup (data.meta.condition) -- never guessed from findings. Each
   profile's `precautions` are surfaced as a banner, not a gate: they
   inform the therapist, they don't block anything.
   ============================================================ */
export const CONDITION_PROFILES = {
  stroke: {
    label: "Stroke", refs: ["osullivan", "umphred"],
    precautions: [
      "Screen for unilateral neglect/inattention before gait or balance retraining — it changes fall risk on the neglected side.",
      "Confirm swallow status has cleared before upright endurance work if dysphagia was flagged on chart review.",
      "Hemiplegic shoulder: avoid overhead pulley/traction until scapular control is present — risk of subluxation/pain.",
    ],
  },
  parkinsons: {
    label: "Parkinson's Disease", refs: ["umphred", "osullivan"],
    precautions: [
      "Freezing of gait risk is highest at turns, doorways and dual-task — clear the path and cue rather than physically forcing a stuck step.",
      "Check lying/standing BP before upright/gait work — orthostatic hypotension is common (disease + dopaminergic medication).",
      "Where possible, time sessions relative to medication 'on/off' state; performance can differ markedly between the two.",
    ],
  },
  tbi: {
    label: "Traumatic Brain Injury", refs: ["umphred", "osullivan"],
    precautions: [
      "Grade activity/environmental stimulation to the patient's Rancho Los Amigos level — overstimulation at lower levels can worsen agitation.",
      "Screen for post-traumatic amnesia before relying on the patient to recall instructions between sessions.",
      "Have a de-escalation plan before mobilising a patient with active agitation/behavioural symptoms.",
    ],
  },
  sci: {
    label: "Spinal Cord Injury", refs: ["osullivan", "umphred"],
    precautions: [
      "Autonomic dysreflexia is a medical emergency in lesions at/above T6 — know the trigger checklist (bladder/bowel/skin) before exertional work.",
      "Confirm spinal stability/clearance and any orthosis-wear requirement before out-of-bed mobility.",
      "Check skin over insensate areas before and after every session.",
    ],
  },
  ms: {
    label: "Multiple Sclerosis", refs: ["umphred", "osullivan"],
    precautions: [
      "Uhthoff's phenomenon: heat (including exertion itself) can transiently worsen symptoms — pace intensity and monitor rather than push through.",
      "Fatigue is a primary impairment here, not deconditioning — build rest into the session rather than training through it.",
    ],
  },
  vestibulartemplate: {
    label: "Vestibular Disorder", refs: ["osullivan"],
    precautions: [
      "Confirm BPPV has been ruled in/out (Dix-Hallpike) before starting habituation exercises — repositioning need is treated differently from habituation.",
      "Symptom provocation during gaze-stability/habituation exercise is expected and monitored, not avoided — grade exposure rather than stopping at first symptom.",
    ],
  },
  peripheralneuropathy: {
    label: "Peripheral Neuropathy", refs: ["dejong", "osullivan"],
    precautions: ["Sensory loss changes skin-check and footwear needs — insensate feet need visual skin inspection built into the home programme."],
  },
  neuromusculartemplate: {
    label: "Neuromuscular Disorder", refs: ["osullivan"],
    precautions: ["Monitor respiratory status/cough effectiveness in progressive neuromuscular conditions — exertional limits may be respiratory, not just muscular."],
  },
  general: { label: "General Neurological", refs: [], precautions: [] },
};

/* ============================================================
   SETTING PROFILES
   Keyed to NeurologicalAssessment.jsx's SETTINGS ids. Settings don't add
   new problems -- they change how goals are timed/paced and what
   precautions apply (per O'Sullivan's framing that setting drives
   intensity/timeframe more than it drives the exam itself).
   ============================================================ */
export const SETTING_PROFILES = {
  inpatient: { label: "Inpatient", timeframeScale: 0.5, precautions: ["Re-check medical stability/orders before each session — acute inpatients can change status day to day."] },
  icu: { label: "ICU", timeframeScale: 0.35, precautions: ["Confirm current lines/drains/ventilatory status and clearance to mobilise before every session.", "Favour short, low-intensity bouts with close monitoring over one long session."] },
  postop: { label: "Post-operative", timeframeScale: 0.5, precautions: ["Check surgical weight-bearing/movement precautions for this patient before selecting any treatment.", "Watch the surgical site for signs of wound/hardware stress as activity increases."] },
  outpatient: { label: "Outpatient", timeframeScale: 1, precautions: [] },
  rehab: { label: "Neuro Rehabilitation", timeframeScale: 1, precautions: [] },
};

function scaleWeeks(weeks, scale) {
  if (typeof weeks !== "number") return weeks;
  return Math.max(1, Math.round(weeks * (scale || 1)));
}

export function conditionLabel(id) { return (CONDITION_PROFILES[id] || {}).label || null; }
export function settingLabel(id) { return (SETTING_PROFILES[id] || {}).label || null; }
// Combined precaution list for the banner at the top of the Care Plan --
// condition precautions first (what this diagnosis needs watched), then
// setting precautions (what this level of care needs watched).
export function conditionSettingPrecautions(condition, setting) {
  const c = (CONDITION_PROFILES[condition] || {}).precautions || [];
  const s = (SETTING_PROFILES[setting] || {}).precautions || [];
  return [...c, ...s];
}

/* ============================================================
   CONDITION-SPECIFIC PROBLEMS
   Same shape as NEURO_PROBLEMS, gated by `conditions` (a list of
   NEURO_TEMPLATES ids). Only ever surfaced when the therapist selected
   that condition template at setup (data.meta.condition) -- still just a
   SUGGESTION, never auto-selected. Baselines here stay generic ("to be
   recorded") rather than pulling a number the assessment doesn't
   structurally capture, so nothing is fabricated.
   ============================================================ */
export const CONDITION_PROBLEMS = [
  {
    id: "pd_bradykinesia_rigidity", name: "Bradykinesia / rigidity", category: "motor", conditions: ["parkinsons"],
    refs: ["umphred", "osullivan"], evidence: "B", treatmentCategories: ["Motor Relearning", "Range of Motion & Spasticity Management"],
    detect: () => ({ findings: [{ label: "Condition", value: "Parkinson's disease — bradykinesia/rigidity reduce movement amplitude and speed" }], baseline: {} }),
    goals: [{ id: "pd_amplitude", label: "Increase movement amplitude/speed", term: "short", weeks: 4, applies: () => true, build: () => ({ measure: "Movement amplitude (large-amplitude exercise)", unit: "level", baseline: "Reduced amplitude/speed", target: "Increased amplitude, moving toward independent recall of effort", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "pd_freezing", name: "Freezing of gait", category: "gait", conditions: ["parkinsons"],
    refs: ["umphred", "osullivan"], evidence: "B", treatmentCategories: ["Gait Training", "Balance & Proprioception"],
    detect: () => ({ findings: [{ label: "Condition", value: "Parkinson's disease — screen for freezing at turns/doorways/dual-task" }], baseline: {} }),
    goals: [{ id: "pd_freeze_reduce", label: "Reduce freezing episodes", term: "long", weeks: 8, applies: () => true, build: () => ({ measure: "Freezing episodes per assessed walk", unit: "count", baseline: "Present", target: "Reduced frequency using cueing strategy", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "pd_postural_instability", name: "Postural instability", category: "balance", conditions: ["parkinsons"],
    refs: ["umphred"], evidence: "B", treatmentCategories: ["Balance & Proprioception"],
    detect: () => ({ findings: [{ label: "Condition", value: "Parkinson's disease — postural instability (pull test)" }], baseline: {} }),
    goals: [{ id: "pd_pull_test", label: "Improve postural response to perturbation", term: "long", weeks: 8, applies: () => true, build: () => ({ measure: "Postural response (pull test)", unit: "level", baseline: "Impaired recovery response", target: "Recovers with one step or less", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "stroke_neglect", name: "Unilateral neglect / inattention", category: "cognition", conditions: ["stroke"],
    refs: ["osullivan", "umphred"], evidence: "B", treatmentCategories: ["Motor Relearning"],
    detect: () => ({ findings: [{ label: "Condition", value: "Stroke — screen for neglect/inattention affecting safety on the affected side" }], baseline: {} }),
    goals: [{ id: "neglect_safety", label: "Improve safety awareness of affected side", term: "short", weeks: 4, applies: () => true, build: () => ({ measure: "Neglect/inattention screen", unit: "level", baseline: "Present", target: "Consistently attends to affected side during functional tasks", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "stroke_shoulder", name: "Hemiplegic shoulder at risk (subluxation/pain)", category: "other", conditions: ["stroke"],
    refs: ["osullivan"], evidence: "B", treatmentCategories: ["Range of Motion & Spasticity Management"],
    detect: () => ({ findings: [{ label: "Condition", value: "Stroke — protect the hemiplegic shoulder pending scapular/rotator cuff control" }], baseline: {} }),
    goals: [{ id: "shoulder_protect", label: "Protect shoulder / restore pain-free range", term: "short", weeks: 4, applies: () => true, build: () => ({ measure: "Shoulder pain-free passive range", unit: "level", baseline: "At risk / limited", target: "Full pain-free range maintained", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "sci_autonomic", name: "Autonomic dysreflexia risk", category: "other", conditions: ["sci"],
    refs: ["osullivan", "umphred"], evidence: "A", treatmentCategories: [],
    detect: () => ({ findings: [{ label: "Condition", value: "SCI — lesion at/above T6 carries autonomic dysreflexia risk; know the trigger checklist" }], baseline: {} }),
    goals: [{ id: "no_ad_episode", label: "No autonomic dysreflexia episodes during sessions", term: "long", weeks: 8, applies: () => true, build: () => ({ measure: "Autonomic dysreflexia episodes", unit: "count", baseline: "At risk", target: "No episodes", baselineValue: null, targetValue: 0 }) }],
  },
  {
    id: "sci_skin", name: "Pressure injury risk (insensate skin)", category: "other", conditions: ["sci", "peripheralneuropathy"],
    refs: ["osullivan"], evidence: "A", treatmentCategories: ["Functional Mobility & Transfers"],
    detect: () => ({ findings: [{ label: "Condition", value: "Insensate skin — build pressure-relief/skin-checks into the mobility programme" }], baseline: {} }),
    goals: [{ id: "skin_integrity", label: "Maintain skin integrity", term: "long", weeks: 8, applies: () => true, build: () => ({ measure: "Skin checks", unit: "status", baseline: "At risk", target: "No skin breakdown; pressure relief performed consistently", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "ms_fatigue", name: "Activity-limiting fatigue", category: "other", conditions: ["ms"],
    refs: ["umphred"], evidence: "B", treatmentCategories: ["Motor Relearning"],
    detect: () => ({ findings: [{ label: "Condition", value: "MS — fatigue is a primary impairment; pace intensity and monitor for Uhthoff's phenomenon" }], baseline: {} }),
    goals: [{ id: "fatigue_pacing", label: "Improve activity tolerance with pacing", term: "long", weeks: 8, applies: () => true, build: () => ({ measure: "Activity tolerance (paced)", unit: "level", baseline: "Fatigue-limited", target: "Completes planned session with paced rest, no symptom flare", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "tbi_cognitive_behaviour", name: "Cognitive-behavioural limitation on participation", category: "cognition", conditions: ["tbi"],
    refs: ["umphred", "osullivan"], evidence: "B", treatmentCategories: ["Motor Relearning"],
    detect: () => ({ findings: [{ label: "Condition", value: "TBI — grade stimulation/instruction to Rancho Los Amigos level; monitor agitation" }], baseline: {} }),
    goals: [{ id: "tbi_participation", label: "Improve consistent participation in session tasks", term: "short", weeks: 4, applies: () => true, build: () => ({ measure: "Participation / follow-through", unit: "level", baseline: "Inconsistent", target: "Consistent participation with graded cueing", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "vestibular_symptom", name: "Vestibular symptom provocation (dizziness/nystagmus)", category: "balance", conditions: ["vestibulartemplate"],
    refs: ["osullivan"], evidence: "A", treatmentCategories: ["Vestibular Rehabilitation", "Balance & Proprioception"],
    detect: () => ({ findings: [{ label: "Condition", value: "Vestibular disorder — confirm BPPV status; grade habituation/gaze-stability exposure" }], baseline: {} }),
    goals: [{ id: "vestib_habituation", label: "Reduce symptom provocation with habituation exercise", term: "long", weeks: 6, applies: () => true, build: () => ({ measure: "Symptom provocation (habituation exercise)", unit: "level", baseline: "Marked provocation", target: "Reduced provocation at graded exposure level", baselineValue: null, targetValue: null }) }],
  },
];

/* ============================================================
   RULES ENGINE
   ============================================================ */

// Suggest problems from what the therapist actually recorded. Returns
// [{ ...problem, findings, baseline }] -- never auto-selected, and never
// invented: a generic problem only appears when its detect() found real
// values; a condition-specific problem only appears when the therapist
// selected that condition template (neuroData.meta.condition).
export function deriveNeuroProblems(neuroData) {
  const d = neuroData || {};
  const condition = d.meta?.condition || null;
  const out = [];
  for (const p of NEURO_PROBLEMS) {
    let hit = null;
    try { hit = p.detect(d); } catch { hit = null; }
    if (hit && hit.findings && hit.findings.length) {
      out.push({ id: p.id, name: p.name, category: p.category, refs: p.refs, evidence: p.evidence, treatmentCategories: p.treatmentCategories, findings: hit.findings, baseline: hit.baseline, conditionSpecific: false });
    }
  }
  if (condition) {
    for (const p of CONDITION_PROBLEMS) {
      if (!p.conditions.includes(condition)) continue;
      let hit = null;
      try { hit = p.detect(d); } catch { hit = null; }
      if (hit && hit.findings && hit.findings.length) {
        out.push({ id: p.id, name: p.name, category: p.category, refs: p.refs, evidence: p.evidence, treatmentCategories: p.treatmentCategories, findings: hit.findings, baseline: hit.baseline, conditionSpecific: true });
      }
    }
  }
  return out;
}

// Instantiate a problem's goal templates against that patient's real
// baseline. `applies()` filters out templates whose measure wasn't
// recorded (e.g. no Berg score => no Berg goal), so the therapist never
// sees a goal pre-filled with a value that doesn't exist. `setting`
// (optional) scales the suggested timeframe -- ICU/post-op goals default
// shorter than outpatient/rehab goals for the same problem.
export function buildGoalsForProblem(problemId, baseline, setting) {
  const p = NEURO_PROBLEMS.find((x) => x.id === problemId) || CONDITION_PROBLEMS.find((x) => x.id === problemId);
  if (!p) return [];
  const scale = SETTING_PROFILES[setting]?.timeframeScale ?? 1;
  return p.goals
    .filter((g) => { try { return g.applies(baseline || {}); } catch { return false; } })
    .map((g) => {
      let built = {};
      try { built = g.build(baseline || {}) || {}; } catch { built = {}; }
      return { templateId: g.id, label: g.label, term: g.term, weeks: scaleWeeks(g.weeks, scale), problemId, ...built };
    });
}

export function problemById(id) { return NEURO_PROBLEMS.find((p) => p.id === id) || CONDITION_PROBLEMS.find((p) => p.id === id) || null; }
export function categoryLabel(id) { return (PROBLEM_CATEGORIES.find((c) => c.id === id) || {}).label || "Other"; }

/* ============================================================
   INTERVENTION "BRAIN" — problem -> RANKED specific exercises
   This is the layer that makes the treatment step smart instead of
   just a filtered library. For each problem it names specific exercise
   ids (from EXERCISE_DB.neurological in sharedClinicalData.js) in
   priority order, each with the text section that supports it.

   IMPORTANT (2026-09-03, Aditi: "make a brain ... take references from
   book"): this is a SUGGESTION list, ranked, never auto-applied. The
   therapist still opens each and confirms dose. Manual browse of the
   full library stays available underneath. Exercise ids are kept here
   as strings so this data file has no dependency on the big exercise DB;
   the UI resolves them.

   SOURCING. Page anchors below are from O'Sullivan SB, Schmitz TJ, Fulk
   GD. Physical Rehabilitation. 6th ed. F.A. Davis; 2014 (chapter/section
   start pages read from the text). The Parkinson's intervention ranking
   was grounded in the chapter's intervention section in detail (cueing
   pp.829-833; amplitude/LSVT BIG p.833; PNF/flexibility pp.834-835;
   resistance pp.835-836; functional training/STS pp.836-837). Other
   chapters are cited at their section start page.
   ============================================================ */
export const REF_SECTIONS = {
  motorFunction: "O'Sullivan Ch.10 — Strategies to Improve Motor Function (p.393)",
  locomotor: "O'Sullivan Ch.11 — Locomotor Training (p.444)",
  balance: "O'Sullivan Ch.6 — Examination of Coordination and Balance (p.206)",
  gait: "O'Sullivan Ch.7 — Examination of Gait (p.251)",
  sensory: "O'Sullivan Ch.3 — Examination of Sensory Function (p.87)",
  stroke: "O'Sullivan Ch.15 — Stroke (p.645)",
  ms: "O'Sullivan Ch.16 — Multiple Sclerosis (p.721)",
  pdCueing: "O'Sullivan Ch.18 — Parkinson's Disease, cueing for gait/freezing (pp.829-833)",
  pdAmplitude: "O'Sullivan Ch.18 — Parkinson's Disease, amplitude/LSVT BIG (p.833)",
  pdFlexibility: "O'Sullivan Ch.18 — Parkinson's Disease, flexibility/PNF (pp.834-835)",
  pdBalance: "O'Sullivan Ch.18 — Parkinson's Disease, balance training (p.837)",
  pdFunctional: "O'Sullivan Ch.18 — Parkinson's Disease, functional training (pp.836-837)",
  tbi: "O'Sullivan Ch.19 — Traumatic Brain Injury (p.859)",
  sci: "O'Sullivan Ch.20 — Traumatic Spinal Cord Injury (p.889)",
  vestibular: "Umphred's Neurological Rehabilitation, 6th ed. — vestibular rehabilitation",
};

// problemId -> ordered list of { exId, note, source }. Highest-priority
// / strongest-evidence intervention first.
export const INTERVENTION_MAP = {
  // --- generic impairment problems ---
  walking_limitation: [
    { exId: "neuro_treadmill_bw", note: "Repetitive, task-specific locomotor practice — strongest evidence for gait recovery", source: REF_SECTIONS.locomotor },
    { exId: "neuro_overground", note: "Transfer to real-world walking with the prescribed device", source: REF_SECTIONS.locomotor },
    { exId: "neuro_high_step", note: "Address clearance / foot-drop component of the pattern", source: REF_SECTIONS.gait },
    { exId: "neuro_stair_practice", note: "Progress to stairs/obstacles once level walking is safe", source: REF_SECTIONS.locomotor },
    { exId: "neuro_dual_task", note: "Add cognitive load once steady — carries over to community walking", source: REF_SECTIONS.balance },
  ],
  dynamic_balance: [
    { exId: "neuro_reactive_step", note: "Reactive/perturbation stepping trains fall recovery directly", source: REF_SECTIONS.balance },
    { exId: "neuro_func_reach", note: "Widen limits of stability with dynamic reaching", source: REF_SECTIONS.balance },
    { exId: "neuro_single_leg", note: "Progress unilateral standing control", source: REF_SECTIONS.balance },
    { exId: "neuro_foam_balance", note: "Challenge sensory reweighting on a compliant surface", source: REF_SECTIONS.balance },
    { exId: "neuro_dual_task", note: "Integrate cognitive-motor demand for community balance", source: REF_SECTIONS.balance },
  ],
  transfer_limitation: [
    { exId: "neuro_sts_transfer", note: "Task-specific sit-to-stand practice on real surfaces", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_task_practice", note: "Massed sit-to-stand repetition for motor learning", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_bed_chair_transfer", note: "Train the specific bed↔chair technique used at home", source: REF_SECTIONS.motorFunction },
  ],
  muscle_weakness: [
    { exId: "neuro_task_practice", note: "Strength gains translated into a functional task", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_pnf_d2", note: "Facilitate scapular/shoulder motor control through range", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_reach_grasp", note: "Task-specific UL loading with real objects", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_prom_affected", note: "Maintain range while active control returns", source: REF_SECTIONS.motorFunction },
  ],
  abnormal_tone: [
    { exId: "neuro_pf_stretch", note: "Prolonged stretch is more effective than a brief one for tone", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_positioning", note: "Anti-spasticity positioning schedule", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_prom_affected", note: "Preserve passive range to prevent contracture", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_wrist_stretch", note: "Target distal flexor tone with sustained stretch", source: REF_SECTIONS.motorFunction },
  ],
  impaired_coordination: [
    { exId: "neuro_finger_nose", note: "UL coordination / dysmetria retraining", source: REF_SECTIONS.balance },
    { exId: "neuro_heel_shin", note: "LL coordination retraining", source: REF_SECTIONS.balance },
    { exId: "neuro_ram", note: "Address dysdiadochokinesia", source: REF_SECTIONS.balance },
    { exId: "neuro_rhythmic_stab", note: "Proximal/trunk stability for coordinated movement", source: REF_SECTIONS.balance },
  ],
  sensory_loss: [
    { exId: "neuro_foam_balance", note: "Force sensory reweighting away from lost input", source: REF_SECTIONS.sensory },
    { exId: "neuro_reach_grasp", note: "Sensory-integrated functional task practice", source: REF_SECTIONS.motorFunction },
  ],
  bed_mobility: [
    { exId: "neuro_bed_mobility", note: "Segmental rolling technique training", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_supine_to_sit", note: "Supine-to-sit transition practice", source: REF_SECTIONS.motorFunction },
  ],
  adl_dependence: [
    { exId: "neuro_task_practice", note: "Repetitive functional-task practice", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_sts_transfer", note: "Sit-to-stand underpins most ADLs", source: REF_SECTIONS.motorFunction },
    { exId: "neuro_reach_grasp", note: "UL task practice for self-care", source: REF_SECTIONS.motorFunction },
  ],
  falls_risk: [
    { exId: "neuro_reactive_step", note: "Reactive stepping directly trains fall recovery", source: REF_SECTIONS.balance },
    { exId: "neuro_dual_task", note: "Dual-task training reduces community fall risk", source: REF_SECTIONS.balance },
    { exId: "neuro_func_reach", note: "Extend limits of stability", source: REF_SECTIONS.balance },
    { exId: "neuro_single_leg", note: "Single-leg control for recovery reactions", source: REF_SECTIONS.balance },
  ],
  // --- condition-specific problems ---
  pd_bradykinesia_rigidity: [
    { exId: "neuro_task_practice", note: "Large-amplitude ('BIG') high-intensity practice for bradykinesia", source: REF_SECTIONS.pdAmplitude },
    { exId: "neuro_trunk_mobility", note: "Axial rotation counters rigidity-driven stiffness", source: REF_SECTIONS.pdFlexibility },
    { exId: "neuro_pnf_d2", note: "Bilateral D2 flexion expands chest/shoulder against flexed posture", source: REF_SECTIONS.pdFlexibility },
    { exId: "neuro_positioning", note: "Daily prone/positioning against flexion contracture", source: REF_SECTIONS.pdFlexibility },
  ],
  pd_freezing: [
    { exId: "neuro_dual_task", note: "Cued walking under attentional load; freezing worst at dual-task/turns", source: REF_SECTIONS.pdCueing },
    { exId: "neuro_high_step", note: "'Big step' visual/verbal cued stepping to break freezes", source: REF_SECTIONS.pdCueing },
    { exId: "neuro_overground", note: "Cued overground walking with rhythmic auditory stimulation", source: REF_SECTIONS.pdCueing },
  ],
  pd_postural_instability: [
    { exId: "neuro_reactive_step", note: "Perturbation/reactive stepping for postural responses", source: REF_SECTIONS.pdBalance },
    { exId: "neuro_func_reach", note: "Dynamic reaching to widen limits of stability", source: REF_SECTIONS.pdBalance },
    { exId: "neuro_single_leg", note: "Progress standing balance under varied demands", source: REF_SECTIONS.pdBalance },
  ],
  stroke_neglect: [
    { exId: "neuro_reach_grasp", note: "Task practice oriented into the neglected hemispace", source: REF_SECTIONS.stroke },
    { exId: "neuro_task_practice", note: "Functional tasks cueing attention to the affected side", source: REF_SECTIONS.stroke },
  ],
  stroke_shoulder: [
    { exId: "neuro_prom_affected", note: "Protected passive range to prevent pain/contracture", source: REF_SECTIONS.stroke },
    { exId: "neuro_pnf_d2", note: "Scapular/shoulder facilitation as control returns", source: REF_SECTIONS.stroke },
    { exId: "neuro_positioning", note: "Supportive positioning to reduce subluxation stress", source: REF_SECTIONS.stroke },
  ],
  sci_skin: [
    { exId: "neuro_positioning", note: "Pressure-relief positioning schedule for insensate skin", source: REF_SECTIONS.sci },
    { exId: "neuro_bed_chair_transfer", note: "Transfer technique that protects skin over bony prominences", source: REF_SECTIONS.sci },
  ],
  ms_fatigue: [
    { exId: "neuro_task_practice", note: "Paced task practice with built-in rest (fatigue is primary)", source: REF_SECTIONS.ms },
    { exId: "neuro_overground", note: "Graded walking within fatigue/heat tolerance", source: REF_SECTIONS.ms },
  ],
  tbi_cognitive_behaviour: [
    { exId: "neuro_task_practice", note: "Structured, repetitive tasks graded to Rancho level", source: REF_SECTIONS.tbi },
    { exId: "neuro_dual_task", note: "Add cognitive-motor demand as participation improves", source: REF_SECTIONS.tbi },
  ],
  vestibular_symptom: [
    { exId: "neuro_vor_x1", note: "Gaze-stabilisation (VOR×1) for dynamic visual acuity", source: REF_SECTIONS.vestibular },
    { exId: "neuro_habituation", note: "Graded habituation to provoking positions/movements", source: REF_SECTIONS.vestibular },
    { exId: "neuro_optokinetic", note: "Head movement during gait for gait-gaze integration", source: REF_SECTIONS.vestibular },
    { exId: "neuro_visual_conflict", note: "Balance under visual conflict for sensory reweighting", source: REF_SECTIONS.vestibular },
  ],
};

// Ranked intervention suggestions for a problem. Returns the raw
// {exId, note, source} list in priority order; the UI resolves exId to
// the full exercise. Empty when the problem has no mapped interventions
// (e.g. a precaution-only problem like autonomic dysreflexia risk).
export function recommendInterventions(problemId) {
  return INTERVENTION_MAP[problemId] || [];
}

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
