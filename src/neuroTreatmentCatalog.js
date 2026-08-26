// neuroTreatmentCatalog.js — curated, hand-vetted treatment/evidence
// library for the Neuro IPD "AI Treatment Suggestions" step
// (NeurologicalAssessment.jsx). Deliberately NOT a free-form LLM call:
// every treatment name, dosage, progression, and citation below is
// written and checked by a person, not generated per-request. This is
// the only way to genuinely satisfy "never invent citations/dosage" --
// the app's existing AI calls (api/chat.js, extract*NoteVariables.js)
// are plain Groq completions with no real search tool, so they cannot
// verify a citation is real. The rule engine (deriveNeuroProblems /
// matchNeuroTreatments in NeurologicalAssessment.jsx) only SELECTS from
// this fixed list based on the therapist's own documented findings and
// fills templated sentences with those real values -- it never asks a
// model to generate a treatment, a dosage, or a source.
//
// Every citation here was verified via web search on 2026-08-26 before
// being added (title, authors, journal/publisher, year all checked
// against the real publication). If a claim can't be grounded in one of
// these, the UI must say so rather than inventing something -- see
// LIMITED_EVIDENCE_NOTICE below.

export const LIMITED_EVIDENCE_NOTICE = "Limited or insufficient evidence identified.";
export const NO_DOSAGE_NOTICE = "Specific dosage should be determined by the treating therapist according to patient response and applicable protocol.";
export const REVIEW_PRECAUTIONS_NOTICE = "Review relevant medical precautions before treatment.";

// Reusable, verified source objects (kept once, referenced by id so the
// same exact citation text is never re-typed/re-risked per treatment).
export const EVIDENCE_SOURCES = {
  ahaAsaStrokeRehab: {
    id: "ahaAsaStrokeRehab",
    citation: "Winstein CJ, Stein J, Arena R, et al. Guidelines for Adult Stroke Rehabilitation and Recovery: A Guideline for Healthcare Professionals from the American Heart Association/American Stroke Association. Stroke. 2016;47(6):e98-e169.",
    strength: "High",
    priority: 1, // clinical practice guideline
  },
  niceNg236: {
    id: "niceNg236",
    citation: "National Institute for Health and Care Excellence. Stroke rehabilitation in adults (NG236). NICE; published 18 October 2023.",
    strength: "High",
    priority: 1,
  },
  cochranePollockPhysicalRehab: {
    id: "cochranePollockPhysicalRehab",
    citation: "Pollock A, Baer G, Campbell P, et al. Physical rehabilitation approaches for the recovery of function and mobility following stroke. Cochrane Database of Systematic Reviews. 2014 (updated 2025), CD001920.",
    strength: "Moderate",
    priority: 3, // systematic review
  },
  cochraneFrenchTaskTraining: {
    id: "cochraneFrenchTaskTraining",
    citation: "French B, Thomas LH, Coupe J, et al. Repetitive task training for improving functional ability after stroke. Cochrane Database of Systematic Reviews. 2016, CD006073.",
    strength: "Moderate",
    priority: 3,
  },
  cochraneCorbettaCIMT: {
    id: "cochraneCorbettaCIMT",
    citation: "Corbetta D, Sirtori V, Castellini G, Moja L, Gatti R. Constraint-induced movement therapy for upper extremities in people with stroke. Cochrane Database of Systematic Reviews. 2015, CD004433.",
    strength: "Moderate",
    priority: 3,
  },
  cochraneMehrholzTreadmill: {
    id: "cochraneMehrholzTreadmill",
    citation: "Mehrholz J, Thomas S, Elsner B. Treadmill training and body weight support for walking after stroke. Cochrane Database of Systematic Reviews. 2017, CD002840.",
    strength: "Moderate",
    priority: 3,
  },
};

// Treatment catalog. `triggers` are the exact strings from the
// Clinical Interpretation step's "Key impairments" multi-select
// (IMPAIRMENTS in NeurologicalAssessment.jsx) plus a few derived flags
// the rule engine computes from raw section data (see
// deriveNeuroProblems) that aren't in that list but are just as
// clinically real: "Transfer difficulty" and "Reduced independence".
export const NEURO_TREATMENT_CATALOG = [
  {
    id: "task_specific_functional_training",
    name: "Task-specific functional mobility training",
    triggers: ["Transfer difficulty", "Reduced independence", "Muscle weakness"],
    goal: "Improve independence in bed mobility, transfers and sit-to-stand.",
    how: "Practice the actual functional task (rolling, bridging, sit-to-stand, bed-to-chair transfer) repeatedly in a task-specific, goal-directed manner, at the patient's current level of assistance, rather than isolated strengthening exercises alone.",
    dosage: NO_DOSAGE_NOTICE,
    progression: ["Reduce level of physical assistance", "Increase repetitions per session", "Progress from supported to unsupported surface", "Increase task complexity (e.g. add a turn, uneven surface)"],
    monitor: ["Level of assistance required", "Movement quality/compensation", "Fatigue", "Blood pressure/heart rate response if relevant to medical status"],
    precautionsTemplate: REVIEW_PRECAUTIONS_NOTICE,
    evidence: ["cochranePollockPhysicalRehab", "cochraneFrenchTaskTraining", "ahaAsaStrokeRehab"],
    phaseHint: "functional",
  },
  {
    id: "sit_to_stand_training",
    name: "Task-specific sit-to-stand training",
    triggers: ["Transfer difficulty"],
    goal: "Improve independence and safety during sit-to-stand transfers.",
    how: "Repeated, task-specific practice of the sit-to-stand movement itself, cueing symmetrical weight-bearing and forward trunk lean, graded by seat height and level of assistance.",
    dosage: NO_DOSAGE_NOTICE,
    progression: ["Reduce assistance/hands-on support", "Lower the seat height", "Reduce use of arm push-off", "Add a functional follow-through (e.g. stand-and-reach, stand-and-walk)"],
    monitor: ["Assistance required", "Weight-bearing symmetry", "Balance on standing", "Fatigue"],
    precautionsTemplate: REVIEW_PRECAUTIONS_NOTICE,
    evidence: ["cochraneFrenchTaskTraining", "cochranePollockPhysicalRehab"],
    phaseHint: "early",
  },
  {
    id: "postural_control_training",
    name: "Sitting and standing postural control training",
    triggers: ["Impaired balance"],
    goal: "Improve static and dynamic postural control in sitting and/or standing.",
    how: "Graded postural control activities (weight-shifting, reaching outside base of support, perturbation training) in the position the patient currently tolerates, progressing sitting before standing where standing balance is not yet safe.",
    dosage: NO_DOSAGE_NOTICE,
    progression: ["Reduce base of support", "Progress from supported to unsupported sitting/standing", "Add reaching/dual-task challenge", "Add an unstable or altered-sensory surface"],
    monitor: ["Balance grade/quality", "Fall risk", "Fatigue", "Symptom reproduction (dizziness, nausea)"],
    precautionsTemplate: REVIEW_PRECAUTIONS_NOTICE,
    evidence: ["cochranePollockPhysicalRehab", "ahaAsaStrokeRehab"],
    phaseHint: "early",
  },
  {
    id: "task_specific_gait_training",
    name: "Task-specific gait training",
    triggers: ["Impaired gait", "Reduced independence"],
    goal: "Improve functional walking ability, speed and safety.",
    how: "Overground walking practice targeting the specific gait deviation observed, with the current assistive device/level of assistance, incorporating real environmental demands (turns, doorways, varied surfaces) as tolerated.",
    dosage: NO_DOSAGE_NOTICE,
    progression: ["Reduce assistance/hands-on support", "Reduce reliance on assistive device where appropriate", "Increase walking distance", "Increase environmental challenge (uneven ground, obstacles, dual-task)"],
    monitor: ["Level of assistance required", "Gait pattern/quality", "Walking speed/distance", "Fatigue", "Fall risk"],
    precautionsTemplate: REVIEW_PRECAUTIONS_NOTICE,
    evidence: ["ahaAsaStrokeRehab", "niceNg236", "cochranePollockPhysicalRehab"],
    phaseHint: "functional",
  },
  {
    id: "treadmill_training",
    name: "Treadmill training (with or without body-weight support)",
    triggers: ["Impaired gait"],
    goal: "Improve walking speed and walking capacity in a patient who is already able to walk, at least with support.",
    how: "Treadmill walking practice, using body-weight support/harness if needed for safety, at a speed and support level the patient can sustain with correct gait pattern.",
    dosage: "Evidence associates more frequent sessions (e.g. up to 5x/week) with greater gains in walking speed and endurance, though this was not conclusive — specific frequency/duration should still be set by the treating therapist according to tolerance.",
    progression: ["Increase treadmill speed", "Reduce body-weight support", "Increase session duration", "Progress to overground walking practice"],
    monitor: ["Walking speed", "Gait pattern on the belt", "Fatigue", "Cardiovascular response"],
    precautionsTemplate: "This approach benefits patients who can already walk (with or without assistance) at the start of therapy; evidence does not show the same benefit for patients who cannot yet walk independently. " + REVIEW_PRECAUTIONS_NOTICE,
    evidence: ["cochraneMehrholzTreadmill"],
    phaseHint: "functional",
  },
  {
    id: "upper_limb_task_training",
    name: "Task-specific upper-limb training",
    triggers: ["Muscle weakness", "Impaired coordination"],
    goal: "Improve upper-limb motor function for functional use.",
    how: "Repetitive, goal-directed practice of real functional upper-limb tasks (reaching, grasping, manipulating objects relevant to the patient's own goals) rather than non-specific exercise.",
    dosage: NO_DOSAGE_NOTICE,
    progression: ["Increase repetitions", "Increase object/task complexity", "Reduce compensatory trunk movement", "Progress to bilateral/functional tasks"],
    monitor: ["Movement quality/compensation", "Active range achieved", "Fatigue", "Pain"],
    precautionsTemplate: REVIEW_PRECAUTIONS_NOTICE,
    evidence: ["cochraneFrenchTaskTraining", "cochranePollockPhysicalRehab"],
    phaseHint: "functional",
  },
  {
    id: "cimt",
    name: "Constraint-induced movement therapy (CIMT) / modified CIMT",
    triggers: ["Muscle weakness"],
    goal: "Improve use of the more-affected arm by restraining the less-affected arm during massed practice.",
    how: "Restrain the less-affected upper limb (e.g. mitt) for a structured period while intensively practising functional tasks with the more-affected arm. Requires some active wrist/finger extension in the more-affected hand to be appropriate — confirm eligibility before considering.",
    dosage: NO_DOSAGE_NOTICE,
    progression: ["Increase constraint-wear time as tolerated", "Increase task difficulty during practice sessions", "Reduce hands-on facilitation"],
    monitor: ["Tolerance of the constraint", "Skin integrity of both limbs", "Motor function change", "Fatigue/frustration"],
    precautionsTemplate: "Traditionally requires a minimum of active wrist/finger extension in the more-affected hand to be appropriate — confirm the patient meets local eligibility criteria before considering. " + REVIEW_PRECAUTIONS_NOTICE,
    evidence: ["cochraneCorbettaCIMT"],
    phaseHint: "functional",
  },
  {
    id: "tone_management",
    name: "Tone management (positioning, stretching, task-specific movement)",
    triggers: ["Abnormal tone"],
    goal: "Manage abnormal muscle tone to support function and prevent secondary complications (contracture, pain).",
    how: "Combine regular positioning/splinting as indicated, sustained stretching of at-risk muscle groups, and active task-specific movement through range — active movement is generally preferred over passive stretching alone where the patient can participate.",
    dosage: NO_DOSAGE_NOTICE,
    progression: ["Increase active participation in the movement", "Reduce reliance on splinting/positioning aids where tone allows", "Progress toward functional task practice through the available range"],
    monitor: ["Tone grade (e.g. Modified Ashworth)", "Range of motion", "Pain", "Skin integrity under any splint"],
    precautionsTemplate: REVIEW_PRECAUTIONS_NOTICE,
    evidence: ["ahaAsaStrokeRehab", "niceNg236"],
    phaseHint: "early",
  },
  {
    id: "graded_endurance_reconditioning",
    name: "Graded functional endurance / aerobic reconditioning",
    triggers: ["Reduced endurance"],
    goal: "Improve tolerance for functional activity and reduce fatigue-limited performance.",
    how: "Graded, functionally-relevant aerobic activity (e.g. walking practice, cycle ergometry) dosed to the patient's current tolerance and medical status, increased incrementally rather than by a fixed prescription.",
    dosage: NO_DOSAGE_NOTICE,
    progression: ["Increase duration before increasing intensity", "Increase distance/repetitions", "Reduce rest breaks as tolerated"],
    monitor: ["Perceived exertion", "Heart rate/blood pressure response where relevant", "Symptoms of overexertion", "Functional performance change over sessions"],
    precautionsTemplate: REVIEW_PRECAUTIONS_NOTICE,
    evidence: ["ahaAsaStrokeRehab", "niceNg236"],
    phaseHint: "functional",
  },
  {
    id: "sensory_reeducation",
    name: "Sensory re-education",
    triggers: ["Sensory loss"],
    goal: "Improve awareness and use of impaired sensory modalities during functional activity.",
    how: "Structured sensory discrimination and re-education tasks (e.g. object identification, graded exposure to textures/temperatures) combined with encouraging use of the affected area during functional tasks under visual guidance.",
    dosage: NO_DOSAGE_NOTICE,
    progression: ["Reduce visual compensation as sensation improves", "Increase task complexity", "Introduce functional tasks requiring sensory feedback"],
    monitor: ["Sensory grade on reassessment", "Safety awareness (e.g. of hot/sharp surfaces)", "Skin integrity"],
    precautionsTemplate: "Where protective sensation (pain/temperature) is impaired, educate the patient and carers on injury-prevention precautions. " + REVIEW_PRECAUTIONS_NOTICE,
    evidence: [],
    phaseHint: "early",
  },
];

// Priority ordering when multiple treatments match -- fixed, not
// model-decided. Mirrors the ICF-adjacent clinical convention of
// addressing safety/functional mobility first, then postural control,
// then gait, then impairment-level motor work.
export const PROBLEM_PRIORITY_ORDER = ["Transfer difficulty", "Reduced independence", "Impaired balance", "Impaired gait", "Muscle weakness", "Impaired coordination", "Abnormal tone", "Reduced endurance", "Sensory loss"];

export const REHAB_PHASES = {
  acute: "Acute / Stabilization",
  early: "Early Rehabilitation",
  functional: "Functional Recovery",
  advanced: "Advanced Functional Rehabilitation",
  discharge: "Discharge / Community Reintegration",
};
