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
  const asArray = (v) => (Array.isArray(v) ? v : []);
  const painQuality = asArray(result.painQuality);
  const morningSymptoms = asArray(result.morningSymptoms);
  const nightSymptoms = asArray(result.nightSymptoms);
  const aggMovements = asArray(result.aggMovements);
  const aggActivities = asArray(result.aggActivities);
  const relMovements = asArray(result.relMovements);
  const neuroSymptoms = asArray(result.neuroSymptoms);
  const functionalLimitations = asArray(result.functionalLimitations);

  const subjective = {};
  if (result.chiefComplaint) subjective.chiefComplaint = result.chiefComplaint;
  // SelectField (orthoFieldKit.jsx) is a free-text input with a suggestion
  // popover, not a locked enum -- so onset's own fixed option list doesn't
  // block writing the AI's specific mechanism string here, same as this
  // wizard's own "Load from old Subjective Assessment" import already does
  // with the old flow's free-text onset. onsetContext (hedged/uncertain
  // cause) only exists when onset itself is a vague fallback like "Gradual
  // — insidious", so appending it keeps that nuance instead of losing it.
  if (result.onset) subjective.onset = result.onset + (result.onsetContext ? ` — ${result.onsetContext}` : "");
  else if (result.onsetContext) subjective.onset = `Uncertain: ${result.onsetContext}`;
  if (result.duration) subjective.duration = result.duration;

  // "Previous treatment" is the wizard's one field for both treatment
  // already tried this episode AND any distinct prior episode -- the old
  // flow shows these as two separate rows (Previous Episodes / Previous
  // Treatment) but this wizard only has room for one, so combine them.
  const prevTreatmentParts = [];
  if (result.priorTreatmentTried) prevTreatmentParts.push(result.priorTreatmentTried);
  if (result.priorEpisodeCount && result.priorEpisodeCount !== "First episode") {
    prevTreatmentParts.push(`Previous episodes: ${result.priorEpisodeCount}` + (result.priorEpisodeOutcome ? ` (${result.priorEpisodeOutcome})` : ""));
  }
  if (prevTreatmentParts.length) subjective.previousTreatment = prevTreatmentParts.join(". ");

  if (result.medicalHistory) subjective.medicalHistory = result.medicalHistory;
  if (result.medications) subjective.medication = result.medications;

  // Aggravating/relieving factors have no dedicated field in this wizard's
  // top-level Subjective (only inside each region's own checklist, which
  // this mapper deliberately never guesses at -- see the old-flow-import
  // comment on why silently picking the wrong region's field is worse than
  // not filling it). "Functional limitations" is the closest fit already
  // reviewed by the clinician before Apply, since aggravating/relieving
  // factors are exactly what's driving those limitations day to day.
  const functionalParts = [];
  if (functionalLimitations.length) functionalParts.push(functionalLimitations.join(", "));
  const agg = [...aggMovements, ...aggActivities];
  if (agg.length) functionalParts.push(`Aggravated by: ${agg.join(", ")}`);
  if (relMovements.length) functionalParts.push(`Relieved by: ${relMovements.join(", ")}`);
  if (functionalParts.length) subjective.functionalLimitations = functionalParts.join(". ");

  // patientConcern/patientBelief have no dedicated field either -- fold
  // into Patient goals using the same "; Concern:" convention the old
  // flow's own goal_main field already uses for exactly this combination
  // (confirmed on real seed data), so this reads the same way clinicians
  // already expect from the old tool.
  const goalParts = [];
  if (result.patientGoals) goalParts.push(result.patientGoals);
  if (result.patientConcern) goalParts.push(`Concern: ${result.patientConcern}`);
  if (result.patientBelief) goalParts.push(`Patient's belief: ${result.patientBelief}`);
  if (goalParts.length) subjective.patientGoals = goalParts.join("; ");

  const pain = {};
  if (result.nrsNow != null) pain.current = String(result.nrsNow);
  if (result.nrsBest != null) pain.best = String(result.nrsBest);
  if (result.nrsWorst != null) pain.worst = String(result.nrsWorst);
  if (painQuality.length) {
    // Character is a free-text multi SelectField too -- matching against
    // the fixed list first (so ordinary quality words render as
    // recognised chips) and appending anything unmatched (electric shock,
    // tingling, numbness, etc -- real /api/parse options this list
    // doesn't cover) rather than silently dropping it.
    const matched = painQuality.filter((q) => PAIN_CHARACTER_OPTIONS.includes(q));
    const unmatched = painQuality.filter((q) => !PAIN_CHARACTER_OPTIONS.includes(q));
    if (matched.length || unmatched.length) pain.character = [...matched, ...unmatched].join(", ");
  }
  const mappedPattern = SYMPTOM_PATTERN_MAP[result.symptomPattern];
  if (mappedPattern) pain.pattern = mappedPattern;
  else if (nightSymptoms.length) pain.pattern = "Night pain";

  // Location is also a free-text multi field -- the natural home for the
  // patient's own location wording plus radiation, since neither has a
  // dedicated field anywhere else in this wizard's top-level Subjective/Pain.
  const locationParts = [];
  if (result.locationDescription) locationParts.push(result.locationDescription);
  if (result.hasRadiation === false) locationParts.push("No radiation");
  else if (result.hasRadiation && result.radiationArea) {
    locationParts.push(`Radiates: ${result.radiationArea}` + (result.radiationSide ? ` (${result.radiationSide})` : ""));
  }
  if (result.diurnalPattern) locationParts.push(result.diurnalPattern);
  if (morningSymptoms.length) locationParts.push(`Morning: ${morningSymptoms.join(", ")}`);
  if (nightSymptoms.length) locationParts.push(`Night: ${nightSymptoms.join(", ")}`);
  if (neuroSymptoms.length && !(neuroSymptoms.length === 1 && neuroSymptoms[0] === "No neurological symptoms" && locationParts.length === 0)) {
    locationParts.push(`Neuro: ${neuroSymptoms.join(", ")}`);
  }
  if (locationParts.length) pain.location = locationParts.join(" | ");

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
