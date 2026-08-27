/* ============================================================
   cardioTreatmentSuggestions.js — deterministic rule engine that
   turns a completed Cardiopulmonary Assessment's documented
   findings into treatment OPTIONS for therapist review. Same
   philosophy as orthoObjectiveSuggestions.js: no LLM call, every
   suggestion traces to a specific documented finding, phase comes
   from the patient's actual functional status (not hospital day),
   and nothing here is ever auto-prescribed -- the therapist accepts,
   modifies, or skips every option.
   ============================================================ */

const ICU_BED_LEVELS = ["Bed-bound", "Bed mobility", "Sitting"];
const ICU_UP_LEVELS = ["Standing", "Transfer", "Walking"];
const ASSIST_LEVELS_LOW = ["Moderate assistance", "Maximum assistance", "Dependent"];
const ABNORMAL_AUSCULTATION = ["Reduced", "Crackles", "Wheeze", "Rhonchi", "Bronchial"];
const SECRETION_SOUNDS = ["Crackles", "Rhonchi"];

// CardiopulmonaryAssessment.jsx's own SelectField stores multi-select
// values as a single comma-separated string (see its SelectPopover), not
// an array -- normalize here so every caller in this file can treat a
// multi-select field the same way regardless of which shape it arrives in.
export function toArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v) return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function auscultationFindings(row = {}) {
  return Object.values(row).filter((v) => ABNORMAL_AUSCULTATION.includes(v));
}

// Phase is derived from documented functional status, never from
// admission day -- the therapist's findings decide, not the calendar.
function derivePhase({ functional = {}, exercise = {}, setting }) {
  const mobility = functional.mobility;
  const walking = functional.walking;
  const isICU = setting === "icu";

  const bedLevel = isICU ? ICU_BED_LEVELS.includes(mobility) : ["Dependent", "Maximum assistance"].includes(mobility);
  if (bedLevel || walking === "Unable to walk") return { id: "acute", label: "Acute / Stabilization", color: "#16A34A" };

  const upButLimited = isICU ? ICU_UP_LEVELS.includes(mobility) : ASSIST_LEVELS_LOW.includes(mobility) || walking === "Assistance required";
  if (upButLimited) return { id: "functional", label: "Functional Recovery", color: "#2563EB" };

  const hasSymptoms = toArray(exercise.symptoms).some((s) => s !== "No symptoms");
  const poorTolerance = functional.tolerance === "Fair" || functional.tolerance === "Poor";
  if (poorTolerance || hasSymptoms || exercise.recovery === "Delayed recovery" || exercise.recovery === "Persistent symptoms") {
    return { id: "conditioning", label: "Conditioning", color: "#7C3AED" };
  }

  return { id: "discharge", label: "Discharge / Self-management", color: "#6B7280" };
}

/* Returns [{ id, icon, label, goal, why, phase, monitor, precautionsNote,
   evidenceIds }]. Order is suggestion priority; duplicates never added. */
export function suggestCardioTreatment({ functional = {}, exercise = {}, resp = {}, setting } = {}) {
  const out = [];
  const seen = new Set();
  const phase = derivePhase({ functional, exercise, setting });
  const isICU = setting === "icu";

  function add(opt) {
    if (seen.has(opt.id)) return;
    seen.add(opt.id);
    out.push({ ...opt, phase });
  }

  const mobilityLimited = isICU
    ? ICU_BED_LEVELS.includes(functional.mobility) || ICU_UP_LEVELS.includes(functional.mobility)
    : functional.mobility && functional.mobility !== "Independent";
  const walkingLimited = functional.walking && functional.walking !== "Independent";

  if (mobilityLimited || walkingLimited) {
    add({
      id: "progressiveMobility",
      icon: "🚶",
      label: "Progressive Mobility",
      goal: "Improve functional mobility and reduce assistance required.",
      why: `Documented mobility${functional.mobility ? ` (${functional.mobility})` : ""}${functional.walking ? ` and walking (${functional.walking})` : ""} indicates reduced functional independence.`,
      monitor: ["HR", "SpO₂", "Symptoms", "RPE", "Assistance level"],
      precautionsNote: isICU ? "Confirm current lines/drains and activity restrictions before mobilizing." : null,
      evidenceIds: ["ahaAacvpr2024", "mainDenehy"],
    });
  }

  const exerciseSymptomsArr = toArray(exercise.symptoms);
  const hasExerciseSymptoms = exerciseSymptomsArr.some((s) => s !== "No symptoms");
  const poorTolerance = functional.tolerance === "Fair" || functional.tolerance === "Poor";
  if (poorTolerance || hasExerciseSymptoms || exercise.recovery === "Delayed recovery") {
    add({
      id: "activityTolerance",
      icon: "🏃",
      label: "Activity Tolerance / Exercise Training",
      goal: "Improve tolerance to physical activity through graded exposure.",
      why: [
        functional.tolerance && functional.tolerance !== "Good" ? `Activity tolerance documented as ${functional.tolerance}.` : null,
        hasExerciseSymptoms ? `Symptoms reported during activity: ${exerciseSymptomsArr.filter((s) => s !== "No symptoms").join(", ")}.` : null,
        exercise.recovery && exercise.recovery !== "Rapid recovery" ? `Recovery pattern documented as ${exercise.recovery}.` : null,
      ].filter(Boolean).join(" "),
      monitor: ["HR", "BP", "SpO₂", "RPE", "Symptoms", "Recovery time"],
      precautionsNote: hasExerciseSymptoms ? "Stop/reduce activity if the same symptoms recur; do not push through chest discomfort or desaturation." : null,
      evidenceIds: ["ahaAacvpr2024", "aacvpr2025Volume"],
    });
  }

  const abnormalAusc = [...auscultationFindings(resp.auscultation), ...auscultationFindings(resp.percussion)];
  const respPatternAbnormal = resp.pattern && resp.pattern !== "Normal";
  const accessoryUse = resp.accessory === "Moderate" || resp.accessory === "Severe";
  const dyspneaOnActivity = Number(resp.dyspneaActivity) >= 3;

  if (respPatternAbnormal || accessoryUse || dyspneaOnActivity || abnormalAusc.length > 0) {
    add({
      id: "respiratoryIntervention",
      icon: "🫁",
      label: "Respiratory Intervention",
      goal: "Address the documented respiratory finding and support ventilation/oxygenation.",
      why: [
        respPatternAbnormal ? `Breathing pattern documented as ${resp.pattern}.` : null,
        accessoryUse ? `Accessory muscle use: ${resp.accessory}.` : null,
        dyspneaOnActivity ? `Dyspnea on activity rated ${resp.dyspneaActivity}/10 (Borg).` : null,
        abnormalAusc.length ? `Abnormal auscultation/percussion: ${[...new Set(abnormalAusc)].join(", ")}.` : null,
      ].filter(Boolean).join(" "),
      monitor: ["Respiratory rate", "SpO₂", "Work of breathing", "Auscultation"],
      precautionsNote: null,
      evidenceIds: ["whoCardiopulm", "mainDenehy", "pryorPrasad"],
    });
  }

  // Airway clearance is its own option, only when secretions are actually
  // documented -- never bundled automatically into every cardio case.
  const secretionSounds = [...auscultationFindings(resp.auscultation)].filter((s) => SECRETION_SOUNDS.includes(s));
  if (secretionSounds.length > 0) {
    add({
      id: "airwayClearance",
      icon: "💨",
      label: "Airway Clearance",
      goal: "Assist secretion clearance and reduce risk of retained secretions.",
      why: `Auscultation documented ${[...new Set(secretionSounds)].join(", ")}, suggesting retained secretions.`,
      monitor: ["SpO₂", "Auscultation before/after", "Sputum quantity/character"],
      precautionsNote: "Only when clinically indicated by documented secretions — not a default for every cardio patient.",
      evidenceIds: ["pryorPrasad", "mainDenehy"],
    });
  }

  if (out.length === 0) {
    add({
      id: "maintenance",
      icon: "✅",
      label: "Maintain Current Level / Self-Management",
      goal: "Support the patient's current independent function and prepare for discharge.",
      why: "Documented findings show independent mobility, good activity tolerance, and no reported symptoms — no acute treatment priority identified.",
      monitor: ["Symptoms", "Activity tolerance at next review"],
      precautionsNote: null,
      evidenceIds: ["ahaAacvpr2024"],
    });
  }

  return out;
}
