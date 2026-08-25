/* ============================================================
   orthoAiIntake.js — maps a raw /api/parse response onto the new
   Ortho Outpatient wizard's nested per-section data shape
   (data.subjective.*, data.pain.*).

   Deliberately separate from aiIntakeParser.js's
   mapParseResultToUpdates: that one is hardcoded to the OLD flow's
   flat field-name convention (cc_main, cx_selected_regions, ...)
   meant for a single top-level set(updates) call. This wizard uses
   useSectionData's data.<section>.<field> shape instead, so the
   target keys and a few value translations (onset/pattern enums,
   NRS numbers -> strings, etc.) are necessarily different.
   ============================================================ */

const PAIN_CHARACTER_OPTIONS = ["Dull", "Sharp", "Burning", "Throbbing", "Aching", "Shooting", "Stabbing"];

const SYMPTOM_PATTERN_MAP = {
  "Constant — always present, varies in intensity": "Constant",
  "Intermittent — comes and goes": "Intermittent",
  "Mechanical — clearly varies with movement/position/load": "Activity-related",
};

// result = the raw /api/parse response (see api/parse.js for the shape).
// Returns { subjective, pain, flags, missingInfo, confidence, sourceQuotes }
// -- subjective/pain are ready to merge straight into data.subjective /
// data.pain; nothing here is written automatically, the caller always
// shows this for review first.
export function mapParseResultToOrthoUpdates(result = {}) {
  const subjective = {};
  if (result.chiefComplaint) subjective.chiefComplaint = result.chiefComplaint;
  if (result.duration) subjective.duration = result.duration;
  if (result.priorTreatmentTried) subjective.previousTreatment = result.priorTreatmentTried;
  if (result.medicalHistory) subjective.medicalHistory = result.medicalHistory;
  if (result.medications) subjective.medication = result.medications;
  if (Array.isArray(result.functionalLimitations) && result.functionalLimitations.length) {
    subjective.functionalLimitations = result.functionalLimitations.join(", ");
  }
  if (result.patientGoals) subjective.patientGoals = result.patientGoals;

  const pain = {};
  if (result.nrsNow != null) pain.current = String(result.nrsNow);
  if (result.nrsBest != null) pain.best = String(result.nrsBest);
  if (result.nrsWorst != null) pain.worst = String(result.nrsWorst);
  if (Array.isArray(result.painQuality) && result.painQuality.length) {
    // Character is a fixed-option SelectField -- only keep values that
    // match one of its real options so the UI shows recognised chips
    // instead of a value it can't render as selected.
    const matched = result.painQuality.filter((q) => PAIN_CHARACTER_OPTIONS.includes(q));
    if (matched.length) pain.character = matched.join(", ");
  }
  const mappedPattern = SYMPTOM_PATTERN_MAP[result.symptomPattern];
  if (mappedPattern) pain.pattern = mappedPattern;
  else if (Array.isArray(result.nightSymptoms) && result.nightSymptoms.length) pain.pattern = "Night pain";

  return {
    subjective,
    pain,
    flags: result.flags || [],
    missingInfo: [],
    confidence: result._confidence || {},
    sourceQuotes: result._sourceQuotes || {},
  };
}
