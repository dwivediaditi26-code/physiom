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

// The 7 ids OUTPATIENT_CONDITIONS (OrthoOutpatientAssessment.jsx) already
// understands -- /api/parse's conditionCategory field is constrained to
// exactly these, so no fuzzy matching needed, just a validity check
// against a value that could technically arrive missing/malformed.
const VALID_CONDITION_CATEGORIES = ["arthritis", "softTissue", "spine", "sportsOveruse", "postSurgicalFollowUp", "painFunctional", "other"];

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

  const conditionCategory = VALID_CONDITION_CATEGORIES.includes(result.conditionCategory) ? result.conditionCategory : null;

  return {
    subjective,
    pain,
    flags: result.flags || [],
    missingInfo: [],
    confidence: result._confidence || {},
    sourceQuotes: result._sourceQuotes || {},
    // Only meaningful when it's a real, specific bucket -- "other"/null
    // carries no information the wizard should act on (nothing to
    // re-promote steps for), so the caller only needs to check this is
    // truthy and not "other".
    conditionCategory,
  };
}

// ── Import from the OLD flow's Subjective Assessment for this same patient ──
//
// patientData is the app's single shared per-patient `data` object -- the
// same one SubjectiveAssessmentNew.jsx (the old flow's live Subjective
// screen) reads/writes using flat field ids (cc_main, cc_onset, ..., see
// sharedClinicalData.js). If this patient already has an old-flow
// Subjective Assessment on file, the new tool's AI-intake landing screen
// offers to pull it forward instead of re-typing or re-dictating it.
//
// Deliberately limited to the handful of shared, unambiguous free-text/
// single-value fields (chief complaint, onset, duration, medical history,
// medications, goals) -- NOT the ~100+ region-prefixed structured fields
// (lx_*/cx_*/shl_*/etc). Those use a completely different id scheme per
// region-and-side (e.g. "Shoulder (L)" vs this tool's {id:"shoulder",
// side:"Left"}) with no reliable 1:1 mapping, so guessing at that
// translation risks silently importing the wrong region's data. The
// region-specific checklist (see orthoSubjectiveRegionData.js) still gets
// filled fresh in this tool either way.
const OLD_FLOW_FIELD_MAP = {
  chiefComplaint: "cc_main",
  onset: "cc_onset",
  duration: "cc_duration",
  medicalHistory: "pmh_notes",
  medication: "med_current",
  patientGoals: "goal_main",
};

export function hasOldSubjectiveData(patientData) {
  if (!patientData) return false;
  return Object.values(OLD_FLOW_FIELD_MAP).some((k) => String(patientData[k] || "").trim());
}

export function importOldSubjectiveData(patientData) {
  const subjective = {};
  if (patientData) {
    Object.entries(OLD_FLOW_FIELD_MAP).forEach(([newKey, oldKey]) => {
      // med_current is the old flow's multicheck field ("|||"-joined,
      // see sharedClinicalData.js) -- every other mapped field here is
      // already a plain single string in the old flow too.
      const raw = String(patientData[oldKey] || "").trim();
      const v = oldKey === "med_current" ? raw.split("|||").filter(Boolean).join(", ") : raw;
      if (v) subjective[newKey] = v;
    });
  }
  return { subjective, pain: {} };
}
