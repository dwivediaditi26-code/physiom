// cardioClinicalKnowledge.js — the Cardiopulmonary clinical knowledge base.
//
// Mirrors neuroClinicalKnowledge.js / orthoClinicalKnowledge.js: DATA + RULES
// kept out of the UI so the same shared Care Plan component (CarePlanSection
// in NeuroCarePlan.jsx) can drive Cardio too — only the knowledge changes
// (2026-09-04, Aditi: "ui will be same as neuro but main knowledge is
// changed"). Extended to Cardio 2026-09-17 (Aditi: "do the same for the
// cardio ... goals, treatment ... library and session and progress and
// plan").
//
// Cardio has no "condition" template the way Ortho (surgery) / Neuro
// (diagnosis) do — its own two axes are `system` (cardio/resp/combined,
// CardiopulmonaryAssessment.jsx's SYSTEMS) and `setting` (inpatient/icu/
// postop/outpatient/rehab, its SETTINGS). CarePlanSection itself only ever
// reads `data.meta?.condition` for the top banner/chip, so
// CardioCarePlanSection (CardioCarePlan.jsx) aliases `meta.condition` to the
// chosen `system` before handing data to CarePlanSection — everywhere in
// THIS file, "condition" therefore means "system".
//
// SOURCING. Standard cardiopulmonary references, cited (no text reproduced):
//   Hillegass — cardiopulmonary PT examination & practice
//   Frownfelter/Dean — cardiovascular & pulmonary PT, evidence to practice
//   ACSM      — exercise testing/prescription, intensity & stop criteria
//   AACVPR    — cardiac rehabilitation & secondary prevention guidelines
//   GOLD      — COPD classification (mMRC/CAT), pulmonary rehabilitation
import { EXERCISE_DB } from "./sharedClinicalData.js";

export const REFERENCES = {
  hillegass: { id: "hillegass", citation: "Hillegass E. Essentials of Cardiopulmonary Physical Therapy. 4th ed. St. Louis: Elsevier; 2017.", useFor: "Cardiopulmonary examination & treatment planning" },
  frownfelter: { id: "frownfelter", citation: "Frownfelter D, Dean E. Cardiovascular and Pulmonary Physical Therapy: Evidence to Practice. 5th ed. St. Louis: Elsevier Mosby; 2012.", useFor: "Assessment & intervention across cardiopulmonary conditions" },
  acsm: { id: "acsm", citation: "American College of Sports Medicine. ACSM's Guidelines for Exercise Testing and Prescription. 11th ed. Philadelphia: Wolters Kluwer; 2021.", useFor: "Exercise prescription, intensity, stop criteria" },
  aacvpr: { id: "aacvpr", citation: "American Association of Cardiovascular and Pulmonary Rehabilitation. Guidelines for Cardiac Rehabilitation and Secondary Prevention Programs. 6th ed. Champaign, IL: Human Kinetics; 2021.", useFor: "Cardiac rehabilitation phases, risk stratification" },
  gold: { id: "gold", citation: "Global Initiative for Chronic Obstructive Lung Disease. Global Strategy for the Diagnosis, Management, and Prevention of COPD.", useFor: "mMRC/CAT grading, pulmonary rehabilitation" },
};

export const EVIDENCE_LEVELS = { A: "Guideline / systematic review", B: "Established textbook practice", C: "Reasonable practice, limited evidence" };

export const PROBLEM_CATEGORIES = [
  { id: "dyspnea", label: "Dyspnea / breathlessness", icon: "😮‍💨" },
  { id: "exercise", label: "Exercise tolerance / functional capacity", icon: "🚶" },
  { id: "airway", label: "Airway clearance / secretions", icon: "🫁" },
  { id: "gasExchange", label: "Gas exchange / oxygenation", icon: "🩸" },
  { id: "chestWall", label: "Breathing pattern / chest wall", icon: "🌬️" },
  { id: "cardiovascular", label: "Cardiovascular / hemodynamic", icon: "❤️" },
  { id: "edema", label: "Edema / fluid status", icon: "💧" },
  { id: "pain", label: "Pain", icon: "🔥" },
  { id: "mobility", label: "Functional mobility / ADL", icon: "🛏️" },
  { id: "other", label: "Other", icon: "📋" },
];

// Reused for the dose "Assistance" dropdown -- matches Functional Capacity's
// own non-ICU mobility scale (CardiopulmonaryAssessment.jsx) so the wording
// is the same one the assessment already used.
export const ASSIST_LADDER = ["Independent", "Supervision", "Minimal assistance", "Moderate assistance", "Maximum assistance", "Dependent"];

export function categoryLabel(id) { return (PROBLEM_CATEGORIES.find((c) => c.id === id) || {}).label || "Other"; }

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const mmrcGrade = (v) => { const m = /Grade\s*(\d)/i.exec(String(v || "")); return m ? parseInt(m[1], 10) : null; };

/* ============================================================
   PROBLEM CATALOG — derived from what the therapist actually recorded
   (data.subjective / .safety / .vitals / .cardio / .resp / .functional /
   .exercise / .outcomes), same "detect(d) -> findings|null" contract as
   NEURO_PROBLEMS. Never auto-selected.
   ============================================================ */
export const CARDIO_PROBLEMS = [
  {
    id: "dyspnea_exertion", name: "Dyspnea on exertion", category: "dyspnea",
    refs: ["hillegass", "gold"], evidence: "A",
    treatmentCategories: ["Breathing Pattern Retraining"],
    detect: (d) => {
      const resp = d.resp || {}, outcomes = d.outcomes || {};
      const restBorg = num(resp.dyspneaRest), actBorg = num(resp.dyspneaActivity), overallBorg = num(outcomes.borg);
      const mmrc = mmrcGrade(outcomes.mmrc);
      const hit = (actBorg !== null && actBorg >= 3) || (restBorg !== null && restBorg >= 1) || (overallBorg !== null && overallBorg >= 3) || (mmrc !== null && mmrc >= 1);
      if (!hit) return null;
      const findings = [];
      if (restBorg !== null) findings.push({ label: "Borg dyspnea at rest", value: `${restBorg}/10` });
      if (actBorg !== null) findings.push({ label: "Borg dyspnea on activity", value: `${actBorg}/10` });
      if (overallBorg !== null) findings.push({ label: "Overall Borg dyspnea", value: `${overallBorg}/10` });
      if (mmrc !== null) findings.push({ label: "mMRC grade", value: outcomes.mmrc });
      return { findings, baseline: { restBorg, actBorg, overallBorg, mmrc, mmrcRaw: outcomes.mmrc } };
    },
    goals: [
      { id: "dyspnea_borg_activity", label: "Reduce Borg dyspnea on activity", term: "short", weeks: 4, applies: (b) => b.actBorg !== null, build: (b) => ({ measure: "Borg dyspnea (activity)", unit: "/10", baseline: `${b.actBorg}/10`, target: `${Math.max(0, b.actBorg - 2)}/10`, baselineValue: b.actBorg, targetValue: Math.max(0, b.actBorg - 2) }) },
      { id: "dyspnea_mmrc", label: "Improve mMRC dyspnea grade", term: "long", weeks: 8, applies: (b) => b.mmrc !== null && b.mmrc > 0, build: (b) => ({ measure: "mMRC dyspnea grade", unit: "grade", baseline: b.mmrcRaw, target: `Grade ${b.mmrc - 1}`, baselineValue: b.mmrc, targetValue: b.mmrc - 1 }) },
    ],
  },
  {
    id: "reduced_exercise_tolerance", name: "Reduced exercise / functional capacity", category: "exercise",
    refs: ["acsm", "hillegass"], evidence: "A",
    treatmentCategories: ["Phase 2–3 Cardiac Rehab", "Respiratory Strengthening"],
    detect: (d) => {
      const f = d.functional || {}, ex = d.exercise || {}, outcomes = d.outcomes || {};
      const symptoms = asArray(ex.symptoms).filter((s) => s && s !== "No symptoms");
      const poorTolerance = f.tolerance === "Fair" || f.tolerance === "Poor";
      const poorNyha = outcomes.nyha === "II" || outcomes.nyha === "III" || outcomes.nyha === "IV";
      const poorRecovery = ex.recovery === "Delayed recovery" || ex.recovery === "Persistent symptoms";
      if (!poorTolerance && !poorNyha && !poorRecovery && !symptoms.length) return null;
      const distance = num(outcomes.sixMWT) ?? num(ex.distance);
      const findings = [];
      if (f.tolerance) findings.push({ label: "Activity tolerance", value: f.tolerance });
      if (outcomes.nyha) findings.push({ label: "NYHA class", value: outcomes.nyha });
      if (distance !== null) findings.push({ label: "Walk test distance", value: `${distance} m` });
      if (symptoms.length) findings.push({ label: "Symptoms during activity", value: symptoms.join(", ") });
      if (ex.recovery) findings.push({ label: "Recovery pattern", value: ex.recovery });
      return { findings, baseline: { tolerance: f.tolerance, distance } };
    },
    goals: [
      { id: "walk_distance", label: "Increase walk-test distance", term: "long", weeks: 8, applies: (b) => b.distance !== null, build: (b) => { const target = b.distance + Math.max(30, Math.round(b.distance * 0.15)); return { measure: "6-Minute/functional walk distance", unit: "m", baseline: `${b.distance} m`, target: `${target} m`, baselineValue: b.distance, targetValue: target }; } },
      { id: "activity_tolerance", label: "Improve activity tolerance", term: "long", weeks: 6, applies: (b) => !!b.tolerance, build: (b) => ({ measure: "Activity tolerance", unit: "level", baseline: b.tolerance, target: "Good", baselineValue: b.tolerance, targetValue: "Good" }) },
    ],
  },
  {
    id: "airway_clearance", name: "Impaired airway clearance / secretion retention", category: "airway",
    refs: ["frownfelter", "hillegass"], evidence: "B",
    treatmentCategories: ["Respiratory Strengthening"],
    detect: (d) => {
      const sub = d.subjective || {}, resp = d.resp || {};
      const weakCough = sub.cough === "Productive" || sub.cough === "Weak / ineffective";
      const sputum = sub.sputumAmount && sub.sputumAmount !== "None";
      const crackly = Object.values(resp.auscultation || {}).some((v) => v === "Crackles" || v === "Rhonchi");
      if (!weakCough && !sputum && !crackly) return null;
      const findings = [];
      if (sub.cough) findings.push({ label: "Cough", value: sub.cough });
      if (sputum) findings.push({ label: "Sputum", value: [sub.sputumAmount, sub.sputumColour, sub.sputumConsistency].filter(Boolean).join(", ") });
      if (crackly) findings.push({ label: "Auscultation", value: Object.entries(resp.auscultation || {}).filter(([, v]) => v === "Crackles" || v === "Rhonchi").map(([k, v]) => `${k.replace(/__/g, " ")}: ${v}`).join(", ") });
      return { findings, baseline: { cough: sub.cough, sputumAmount: sub.sputumAmount } };
    },
    goals: [
      { id: "secretion_clear", label: "Reduce retained secretions", term: "short", weeks: 3, applies: () => true, build: (b) => ({ measure: "Sputum retention", unit: "level", baseline: b.sputumAmount || "Present", target: "Minimal / cleared with effective cough", baselineValue: null, targetValue: null }) },
      { id: "cough_effectiveness", label: "Improve cough effectiveness", term: "short", weeks: 3, applies: (b) => b.cough === "Weak / ineffective", build: () => ({ measure: "Cough effectiveness", unit: "level", baseline: "Weak / ineffective", target: "Effective, productive cough", baselineValue: null, targetValue: null }) },
    ],
  },
  {
    id: "impaired_gas_exchange", name: "Impaired oxygenation / desaturation risk", category: "gasExchange",
    refs: ["hillegass", "frownfelter"], evidence: "A",
    treatmentCategories: ["Breathing Pattern Retraining"],
    detect: (d) => {
      const vitals = d.vitals || {}, ex = d.exercise || {};
      const restSpo2 = num(vitals.spo2);
      const preSpo2 = num(ex.preSpO2), duringSpo2 = num(ex.duringSpO2);
      const drop = preSpo2 !== null && duringSpo2 !== null ? preSpo2 - duringSpo2 : null;
      const desatSymptom = asArray(ex.symptoms).includes("Desaturation") || ex.stopReason === "Desaturation";
      const lowRest = restSpo2 !== null && restSpo2 < 94;
      const exertionalDrop = (drop !== null && drop >= 4) || desatSymptom;
      if (!lowRest && !exertionalDrop) return null;
      const findings = [];
      if (restSpo2 !== null) findings.push({ label: "Resting SpO₂", value: `${restSpo2}%` });
      if (drop !== null) findings.push({ label: "Exertional SpO₂ drop", value: `${preSpo2}% → ${duringSpo2}%` });
      if (desatSymptom) findings.push({ label: "Desaturation flagged", value: "During exercise testing" });
      return { findings, baseline: { restSpo2, drop } };
    },
    goals: [
      { id: "spo2_rest", label: "Restore resting SpO₂", term: "short", weeks: 3, applies: (b) => b.restSpo2 !== null && b.restSpo2 < 94, build: (b) => ({ measure: "Resting SpO₂", unit: "%", baseline: `${b.restSpo2}%`, target: "≥94% on room air / prescribed O₂", baselineValue: b.restSpo2, targetValue: 94 }) },
      { id: "spo2_exertion", label: "Reduce exertional desaturation", term: "long", weeks: 6, applies: (b) => b.drop !== null, build: (b) => ({ measure: "Exertional SpO₂ drop", unit: "%", baseline: `Drops ${b.drop}% with exertion`, target: "No desaturation >4% with exertion", baselineValue: b.drop, targetValue: 4 }) },
    ],
  },
  {
    id: "breathing_pattern_dysfunction", name: "Breathing pattern dysfunction / reduced chest expansion", category: "chestWall",
    refs: ["hillegass"], evidence: "B",
    treatmentCategories: ["Breathing Pattern Retraining"],
    detect: (d) => {
      const resp = d.resp || {};
      const abnormalPattern = resp.pattern && resp.pattern !== "Normal";
      const abnormalType = resp.patternType === "Upper chest" || resp.patternType === "Paradoxical";
      const reducedExpansion = resp.expansion && resp.expansion !== "Symmetrical";
      const accessoryUse = resp.accessory === "Moderate" || resp.accessory === "Severe";
      if (!abnormalPattern && !abnormalType && !reducedExpansion && !accessoryUse) return null;
      const findings = [];
      if (abnormalPattern) findings.push({ label: "Breathing pattern", value: resp.pattern });
      if (abnormalType) findings.push({ label: "Pattern type", value: resp.patternType });
      if (reducedExpansion) findings.push({ label: "Chest expansion", value: resp.expansion });
      if (accessoryUse) findings.push({ label: "Accessory muscle use", value: resp.accessory });
      return { findings, baseline: { pattern: resp.pattern, expansion: resp.expansion } };
    },
    goals: [
      { id: "breathing_pattern", label: "Restore diaphragmatic breathing pattern", term: "short", weeks: 4, applies: () => true, build: (b) => ({ measure: "Breathing pattern", unit: "level", baseline: b.pattern || "Abnormal", target: "Diaphragmatic pattern, minimal accessory muscle use", baselineValue: null, targetValue: null }) },
      { id: "chest_expansion", label: "Restore symmetrical chest expansion", term: "short", weeks: 4, applies: (b) => !!b.expansion && b.expansion !== "Symmetrical", build: (b) => ({ measure: "Chest expansion", unit: "level", baseline: b.expansion, target: "Symmetrical", baselineValue: null, targetValue: null }) },
    ],
  },
  {
    id: "cardiovascular_instability", name: "Cardiovascular risk / hemodynamic instability", category: "cardiovascular",
    refs: ["aacvpr", "acsm"], evidence: "A",
    treatmentCategories: ["Phase 2–3 Cardiac Rehab"],
    detect: (d) => {
      const v = d.vitals || {}, cardio = d.cardio || {}, ex = d.exercise || {};
      const hr = num(v.hr), bpSys = num(v.bpSys), bpDia = num(v.bpDia);
      const abnormalHr = hr !== null && (hr > 100 || hr < 60);
      const abnormalBp = bpSys !== null && (bpSys >= 140 || bpSys < 90);
      const abnormalRhythm = cardio.rhythm === "Irregular" || cardio.rhythm === "Known arrhythmia";
      const symptoms = asArray(ex.symptoms).filter((s) => ["Chest discomfort", "Palpitations", "Dizziness"].includes(s));
      if (!abnormalHr && !abnormalBp && !abnormalRhythm && !symptoms.length) return null;
      const findings = [];
      if (hr !== null) findings.push({ label: "Resting HR", value: `${hr} bpm` });
      if (bpSys !== null) findings.push({ label: "Resting BP", value: `${bpSys}/${bpDia ?? "—"} mmHg` });
      if (cardio.rhythm) findings.push({ label: "Rhythm", value: cardio.rhythm });
      if (symptoms.length) findings.push({ label: "Exertional symptoms", value: symptoms.join(", ") });
      return { findings, baseline: { hr, bpSys, bpDia, symptoms } };
    },
    goals: [
      { id: "hr_control", label: "Normalize resting heart rate", term: "long", weeks: 6, applies: (b) => b.hr !== null && (b.hr > 100 || b.hr < 60), build: (b) => ({ measure: "Resting heart rate", unit: "bpm", baseline: `${b.hr} bpm`, target: "60–100 bpm, appropriate exertional response", baselineValue: b.hr, targetValue: null }) },
      { id: "bp_control", label: "Normalize blood pressure response", term: "long", weeks: 6, applies: (b) => b.bpSys !== null && (b.bpSys >= 140 || b.bpSys < 90), build: (b) => ({ measure: "Blood pressure", unit: "mmHg", baseline: `${b.bpSys}/${b.bpDia ?? "—"} mmHg`, target: "<140/90 mmHg (or physician target)", baselineValue: b.bpSys, targetValue: null }) },
      { id: "symptom_free_exertion", label: "Exercise without cardiac symptoms", term: "short", weeks: 4, applies: (b) => b.symptoms && b.symptoms.length > 0, build: (b) => ({ measure: "Exertional cardiac symptoms", unit: "status", baseline: b.symptoms.join(", "), target: "Completes prescribed activity symptom-free", baselineValue: null, targetValue: null }) },
    ],
  },
  {
    id: "peripheral_edema", name: "Peripheral edema / fluid overload", category: "edema",
    refs: ["hillegass", "aacvpr"], evidence: "B",
    treatmentCategories: [],
    detect: (d) => {
      const cardio = d.cardio || {};
      if (!cardio.edema || cardio.edema === "None") return null;
      const findings = [{ label: "Edema", value: [cardio.edema, cardio.edemaType, cardio.edemaGrade].filter(Boolean).join(", ") }];
      if (asArray(cardio.edemaLocation).length) findings.push({ label: "Location", value: asArray(cardio.edemaLocation).join(", ") });
      return { findings, baseline: { edema: cardio.edema } };
    },
    goals: [
      { id: "edema_reduce", label: "Reduce peripheral edema", term: "short", weeks: 3, applies: () => true, build: (b) => ({ measure: "Peripheral edema", unit: "level", baseline: b.edema, target: "None / minimal", baselineValue: null, targetValue: null }) },
    ],
  },
  {
    id: "chest_pain_symptom", name: "Chest pain / angina-type symptoms", category: "pain",
    refs: ["aacvpr", "acsm"], evidence: "A",
    treatmentCategories: ["Phase 2–3 Cardiac Rehab"],
    detect: (d) => {
      const safety = d.safety || {}, sub = d.subjective || {}, ex = d.exercise || {};
      const chestFlags = asArray(safety.chest).filter((x) => x && !String(x).startsWith("No "));
      const chiefChest = asArray(sub.chiefComplaint).includes("Chest discomfort");
      const exerciseChest = asArray(ex.symptoms).includes("Chest discomfort");
      if (!chestFlags.length && !chiefChest && !exerciseChest) return null;
      const findings = [];
      if (chestFlags.length) findings.push({ label: "Chest symptoms (screening)", value: chestFlags.join(", ") });
      if (chiefChest) findings.push({ label: "Chief complaint", value: "Chest discomfort" });
      if (exerciseChest) findings.push({ label: "During exertion", value: "Chest discomfort reported" });
      return { findings, baseline: {} };
    },
    goals: [
      { id: "chest_symptom_free", label: "Exercise without chest pain", term: "short", weeks: 4, applies: () => true, build: () => ({ measure: "Chest pain / discomfort with activity", unit: "status", baseline: "Present", target: "Completes activity without chest pain/discomfort", baselineValue: null, targetValue: null }) },
    ],
  },
  {
    id: "functional_mobility_limitation", name: "Reduced functional mobility", category: "mobility",
    refs: ["hillegass", "frownfelter"], evidence: "B",
    treatmentCategories: ["Phase 2–3 Cardiac Rehab"],
    detect: (d) => {
      const f = d.functional || {};
      const limitedMobility = f.mobility && ASSIST_LADDER.includes(f.mobility) && f.mobility !== "Independent";
      const limitedWalking = f.walking && f.walking !== "Independent";
      if (!limitedMobility && !limitedWalking) return null;
      const findings = [];
      if (limitedMobility) findings.push({ label: "Mobility", value: f.mobility });
      if (limitedWalking) findings.push({ label: "Walking", value: f.walking });
      return { findings, baseline: { mobility: f.mobility, walking: f.walking } };
    },
    goals: [
      { id: "mobility_level", label: "Reduce mobility assistance", term: "short", weeks: 3, applies: (b) => !!b.mobility && b.mobility !== "Independent", build: (b) => ({ measure: "Mobility", unit: "level", baseline: b.mobility, target: "Independent", baselineValue: b.mobility, targetValue: "Independent" }) },
      { id: "walking_level", label: "Progress toward independent walking", term: "long", weeks: 6, applies: (b) => !!b.walking && b.walking !== "Independent", build: (b) => ({ measure: "Walking", unit: "level", baseline: b.walking, target: "Independent walking", baselineValue: b.walking, targetValue: "Independent" }) },
    ],
  },
];

/* ============================================================
   SYSTEM-SPECIFIC PROBLEMS ("condition" slot) — gated by the pathway the
   therapist picked at setup (data.meta.system: cardio/resp/combined). Care
   priorities for that system, present even before detailed findings.
   ============================================================ */
export const CONDITION_PROBLEMS = [
  {
    id: "sys_cardiac_prevention", conditions: ["cardio", "combined"], name: "Cardiac risk factor modification & secondary prevention",
    category: "cardiovascular", refs: ["aacvpr"], evidence: "A", treatmentCategories: ["Phase 2–3 Cardiac Rehab"],
    detect: (d) => {
      const rf = asArray((d.chart || {}).riskFactors);
      return { findings: [{ label: "Priority", value: rf.length ? `Address recorded risk factors: ${rf.join(", ")}` : "Address modifiable risk factors (diet, activity, smoking, weight) per rehab guidelines" }], baseline: {} };
    },
    goals: [{ id: "risk_factor_mgmt", label: "Engage in risk-factor modification programme", term: "long", weeks: 8, applies: () => true, build: () => ({ measure: "Risk-factor modification / secondary prevention", unit: "status", baseline: "Not yet established", target: "Actively engaged in structured secondary-prevention plan", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "sys_pulmonary_education", conditions: ["resp", "combined"], name: "Pulmonary self-management education",
    category: "dyspnea", refs: ["gold", "frownfelter"], evidence: "A", treatmentCategories: ["Breathing Pattern Retraining"],
    detect: () => ({ findings: [{ label: "Priority", value: "Independent breathing-strategy and symptom self-management education (pursed-lip, diaphragmatic, energy conservation)" }], baseline: {} }),
    goals: [{ id: "pulm_selfmgmt", label: "Independent in breathing self-management strategies", term: "long", weeks: 6, applies: () => true, build: () => ({ measure: "Breathing self-management", unit: "status", baseline: "Not established", target: "Independently applies pursed-lip/diaphragmatic breathing to manage symptoms", baselineValue: null, targetValue: null }) }],
  },
];

/* ============================================================
   SETTING-SPECIFIC PROBLEMS — gated by the level of care (data.meta.setting:
   inpatient/icu/postop/outpatient/rehab), same role as Ortho/Neuro's own
   setting overlays.
   ============================================================ */
export const SETTING_PROBLEMS = [
  {
    id: "set_inpatient_stability", conditions_unused: true, settings: ["inpatient"], name: "Medical stability for participation",
    category: "other", refs: ["hillegass"], evidence: "B", treatmentCategories: [],
    detect: () => ({ findings: [{ label: "Ward priority", value: "Re-check vitals/medical stability before each session; grade activity to current status" }], baseline: {} }),
    goals: [{ id: "ipd_stable", label: "Safely participate within current medical status", term: "short", weeks: 2, applies: () => true, build: () => ({ measure: "Session participation within medical limits", unit: "status", baseline: "Variable / guarded", target: "Consistent safe participation as status allows", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "set_icu_mobilization", settings: ["icu"], name: "Early mobilization within hemodynamic / ventilatory limits",
    category: "mobility", refs: ["hillegass", "frownfelter"], evidence: "B", treatmentCategories: ["Phase 2–3 Cardiac Rehab"],
    detect: () => ({ findings: [{ label: "ICU priority", value: "Progressive out-of-bed mobilization as soon as medically stable, closely monitored" }], baseline: {} }),
    goals: [{ id: "icu_oob", label: "Progress out-of-bed activity tolerance", term: "short", weeks: 2, applies: () => true, build: () => ({ measure: "Out-of-bed / upright tolerance", unit: "level", baseline: "Bed-bound / minimal tolerance", target: "Tolerates sitting out of bed / supported standing within limits", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "set_icu_complications", settings: ["icu"], name: "Prevent ICU-acquired complications (deconditioning / DVT / VAP)",
    category: "other", refs: ["hillegass"], evidence: "B", treatmentCategories: [],
    detect: () => ({ findings: [{ label: "ICU priority", value: "Positioning, early mobility and secretion clearance to reduce deconditioning/DVT/ventilator-associated pneumonia risk" }], baseline: {} }),
    goals: [{ id: "icu_complic", label: "No avoidable ICU-acquired complication", term: "short", weeks: 2, applies: () => true, build: () => ({ measure: "ICU-acquired complication status", unit: "status", baseline: "At risk", target: "No avoidable deconditioning/DVT/VAP", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "set_postop_precautions", settings: ["postop"], name: "Sternal / surgical precautions & wound protection",
    category: "other", refs: ["aacvpr"], evidence: "B", treatmentCategories: [],
    detect: () => ({ findings: [{ label: "Post-op priority", value: "Respect sternal/surgical precautions (no push/pull/lift beyond limit) and protect the surgical site as activity increases" }], baseline: {} }),
    goals: [{ id: "postop_precaution", label: "Mobilize safely within surgical precautions", term: "short", weeks: 3, applies: () => true, build: () => ({ measure: "Adherence to surgical precautions", unit: "status", baseline: "Precautions in force", target: "Progresses activity without breaching precautions", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "set_postop_pain", settings: ["postop"], name: "Pain-limited activity tolerance",
    category: "pain", refs: ["hillegass"], evidence: "C", treatmentCategories: ["Phase 2–3 Cardiac Rehab"],
    detect: () => ({ findings: [{ label: "Post-op priority", value: "Grade activity to post-operative pain; coordinate timing with analgesia" }], baseline: {} }),
    goals: [{ id: "postop_pain", label: "Increase activity within pain tolerance", term: "short", weeks: 3, applies: () => true, build: () => ({ measure: "Pain-limited activity tolerance", unit: "level", baseline: "Markedly pain-limited", target: "Completes planned activity with acceptable pain", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "set_outpatient_return", settings: ["outpatient"], name: "Return to work / community activity",
    category: "exercise", refs: ["acsm"], evidence: "B", treatmentCategories: ["Phase 2–3 Cardiac Rehab"],
    detect: () => ({ findings: [{ label: "Outpatient priority", value: "Progress toward the patient's target work/community/ADL demands" }], baseline: {} }),
    goals: [{ id: "opd_return", label: "Resume target role / activity", term: "long", weeks: 8, applies: () => true, build: () => ({ measure: "Role / activity", unit: "level", baseline: "Restricted", target: "Resumes target work/community/ADL role", baselineValue: null, targetValue: null }) }],
  },
  {
    id: "set_rehab_programme", settings: ["rehab"], name: "Structured rehabilitation programme completion",
    category: "exercise", refs: ["aacvpr", "gold"], evidence: "A", treatmentCategories: ["Phase 2–3 Cardiac Rehab", "Respiratory Strengthening"],
    detect: () => ({ findings: [{ label: "Rehab priority", value: "Progress through a structured, supervised exercise programme with individualised HR/RPE targets" }], baseline: {} }),
    goals: [{ id: "rehab_complete", label: "Complete prescribed rehabilitation programme", term: "long", weeks: 8, applies: () => true, build: () => ({ measure: "Rehabilitation programme completion", unit: "status", baseline: "Enrolled / early", target: "Completes programme, meets discharge exercise criteria", baselineValue: null, targetValue: null }) }],
  },
];

const SYSTEM_PRECAUTIONS = {
  cardio: ["Monitor HR/BP response and stop for chest pain, marked dyspnea, dizziness or significant arrhythmia.", "Avoid the Valsalva manoeuvre during resistance work."],
  resp: ["Titrate supplemental oxygen per protocol and watch for desaturation during exertion.", "Use pursed-lip/diaphragmatic breathing to manage dyspnea during activity."],
  combined: ["Monitor HR/BP/SpO₂ response and stop for chest pain, marked dyspnea, dizziness, significant arrhythmia or desaturation.", "Titrate supplemental oxygen per protocol; avoid the Valsalva manoeuvre during resistance work."],
};
export const SETTING_PROFILES = {
  inpatient: { label: "Inpatient", timeframeScale: 0.5, precautions: ["Re-check medical stability and vitals before each session — status can change day to day."] },
  icu: { label: "ICU", timeframeScale: 0.35, precautions: ["Confirm current lines/drains/ventilatory settings and medical clearance to mobilise before every session.", "Favour short, low-intensity bouts with continuous monitoring over one long session."] },
  postop: { label: "Post-operative", timeframeScale: 0.5, precautions: ["Respect sternal/surgical precautions (no push/pull/lift beyond the surgeon's limit).", "Monitor the surgical site and vitals closely as activity increases."] },
  outpatient: { label: "Outpatient", timeframeScale: 1, precautions: [] },
  rehab: { label: "Rehabilitation", timeframeScale: 1, precautions: ["Confirm target heart-rate zone / exercise prescription with the supervising physician before progressing intensity."] },
};
const CONDITION_LABELS = { cardio: "Cardiovascular", resp: "Respiratory", combined: "Combined Cardiopulmonary" };

export function conditionLabel(id) { return CONDITION_LABELS[id] || null; }
export function settingLabel(id) { return (SETTING_PROFILES[id] || {}).label || null; }
export function conditionSettingPrecautions(condition, setting) {
  const c = SYSTEM_PRECAUTIONS[condition] || [];
  const s = (SETTING_PROFILES[setting] || {}).precautions || [];
  return [...c, ...s];
}
function scaleWeeks(weeks, scale) { return typeof weeks === "number" ? Math.max(1, Math.round(weeks * (scale || 1))) : weeks; }

/* ============================================================
   RULES ENGINE
   ============================================================ */
export function deriveCardioProblems(cardioData) {
  const d = cardioData || {};
  const system = d.meta?.condition || null; // aliased from meta.system by CardioCarePlanSection
  const setting = d.meta?.setting || null;
  const out = [];
  for (const p of CARDIO_PROBLEMS) {
    let hit = null;
    try { hit = p.detect(d); } catch { hit = null; }
    if (hit && hit.findings && hit.findings.length) {
      out.push({ id: p.id, name: p.name, category: p.category, refs: p.refs, evidence: p.evidence, treatmentCategories: p.treatmentCategories, findings: hit.findings, baseline: hit.baseline, conditionSpecific: false });
    }
  }
  if (system) {
    for (const p of CONDITION_PROBLEMS) {
      if (!p.conditions.includes(system)) continue;
      let hit = null;
      try { hit = p.detect(d); } catch { hit = null; }
      if (hit && hit.findings && hit.findings.length) {
        out.push({ id: p.id, name: p.name, category: p.category, refs: p.refs, evidence: p.evidence, treatmentCategories: p.treatmentCategories, findings: hit.findings, baseline: hit.baseline, conditionSpecific: true });
      }
    }
  }
  if (setting) {
    for (const p of SETTING_PROBLEMS) {
      if (!p.settings.includes(setting)) continue;
      let hit = null;
      try { hit = p.detect(d); } catch { hit = null; }
      if (hit && hit.findings && hit.findings.length) {
        out.push({ id: p.id, name: p.name, category: p.category, refs: p.refs, evidence: p.evidence, treatmentCategories: p.treatmentCategories, findings: hit.findings, baseline: hit.baseline, settingSpecific: true });
      }
    }
  }
  return out;
}

export function buildGoalsForProblem(problemId, baseline, setting) {
  const p = CARDIO_PROBLEMS.find((x) => x.id === problemId) || CONDITION_PROBLEMS.find((x) => x.id === problemId) || SETTING_PROBLEMS.find((x) => x.id === problemId);
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

export function problemById(id) { return CARDIO_PROBLEMS.find((p) => p.id === id) || CONDITION_PROBLEMS.find((p) => p.id === id) || SETTING_PROBLEMS.find((p) => p.id === id) || null; }

/* ============================================================
   INTERVENTION SUGGESTIONS — problem category -> ranked exercises from
   EXERCISE_DB.respiratory + EXERCISE_DB.cardiac (sharedClinicalData.js).
   Simpler catMatch-style ranking (same approach as buildOrthoKnowledge's
   recommendInterventions) rather than a hand-curated per-id map -- a
   SUGGESTION list only; the therapist still opens and confirms dose, and
   manual browse of the full library stays available underneath.
   ============================================================ */
const CATEGORY_MATCH = {
  dyspnea: /breathing/i,
  exercise: /rehab|strength/i,
  airway: /strength/i,
  gasExchange: /breathing/i,
  chestWall: /breathing/i,
  cardiovascular: /rehab/i,
  pain: /rehab/i,
  mobility: /rehab/i,
  other: /rehab|breathing/i,
};
const srcFor = (refs) => (refs || []).map((r) => REFERENCES[r]?.citation.split(".")[0]).filter(Boolean).join("; ");

export function recommendInterventions(problemId) {
  const p = problemById(problemId);
  if (!p) return [];
  const categories = { ...(EXERCISE_DB.respiratory?.categories || {}), ...(EXERCISE_DB.cardiac?.categories || {}) };
  const all = Object.entries(categories).flatMap(([c, list]) => list.map((e) => ({ ...e, _cat: c })));
  const catMatch = CATEGORY_MATCH[p.category] || /rehab|breathing|strength/i;
  const pool = all.filter((e) => catMatch.test(e._cat));
  const source = srcFor(p.refs);
  const rank = (e) => (/(strongest)/i.test(e.evidence || "") ? 0 : /strong/i.test(e.evidence || "") ? 1 : 2);
  return pool.sort((a, b) => rank(a) - rank(b)).slice(0, 5).map((e) => ({ exId: e.id, note: e.target || "", source }));
}

/* ============================================================
   PROGRESS — identical formula to Ortho/Neuro: derived from session
   measures, no separate progress documentation.
   ============================================================ */
export function goalProgress(goal, entries) {
  const pts = (entries || []).filter((e) => e && e.value != null);
  const bv = typeof goal.baselineValue === "number" ? goal.baselineValue : null;
  const tv = typeof goal.targetValue === "number" ? goal.targetValue : null;
  const latest = pts.length ? pts[pts.length - 1].value : bv;
  if (bv === null || tv === null || typeof latest !== "number" || tv === bv) return { pct: null, latest, achieved: false };
  const pct = Math.max(0, Math.min(100, Math.round(((latest - bv) / (tv - bv)) * 100)));
  return { pct, latest, achieved: pct >= 100 };
}

// Packaged for injection into the shared CarePlanSection, same shape
// NEURO_KNOWLEDGE (NeuroCarePlan.jsx) uses.
export const CARDIO_KNOWLEDGE = {
  deriveProblems: deriveCardioProblems,
  buildGoalsForProblem, recommendInterventions, problemById, categoryLabel,
  PROBLEM_CATEGORIES, REFERENCES, ASSIST_LADDER, goalProgress,
  conditionLabel, settingLabel, conditionSettingPrecautions,
  exerciseCategories: { ...(EXERCISE_DB.respiratory?.categories || {}), ...(EXERCISE_DB.cardiac?.categories || {}) },
  // Evidence-Based Protocol picker + saved Clinic Protocols in "Add
  // treatment" (2026-09-21) -- previously ortho-only per the exact comment
  // in orthoClinicalKnowledge.js ("Neuro's Care Plan stays exercise-
  // library-only until Neuro protocols exist"); now that real cardio/
  // pulmonary condition protocols exist (COPD, CHF, post-MI, post-CABG,
  // ...), the same reasoning flips to enabling it here. evidenceProtocolRegions
  // scopes EvidenceProtocolBrowser's dropdown to just this specialty's own
  // EXERCISE_DB regions -- without it, a cardio therapist would see every
  // ortho condition (knee, shoulder, ...) mixed into the same list.
  evidenceProtocols: true,
  evidenceProtocolRegions: ["respiratory", "cardiac"],
  clinicProtocols: true,
};
