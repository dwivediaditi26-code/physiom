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
// Every field /api/parse can return, in the order a physiotherapist reads
// a subjective history, with the label it should carry when shown back.
// Used only for the read-only "as extracted" panel -- the structured
// per-field mapping below is what actually fills the form.
const EXTRACTED_FIELD_LABELS = [
  ["chiefComplaint", "Chief complaint"],
  ["age", "Age"],
  ["sex", "Sex"],
  ["occupation", "Occupation"],
  ["region", "Region"],
  ["additionalRegions", "Other regions"],
  ["laterality", "Side"],
  ["conditionCategory", "Clinical context"],
  ["locationDescription", "Location (patient's words)"],
  ["duration", "Duration"],
  ["onset", "Onset"],
  ["onsetContext", "Onset context"],
  ["nrsNow", "Pain now (NRS)"],
  ["nrsWorst", "Pain at worst (NRS)"],
  ["nrsBest", "Pain at best (NRS)"],
  ["painQuality", "Pain quality"],
  ["symptomPattern", "Symptom pattern"],
  ["diurnalPattern", "24-hour pattern"],
  ["morningSymptoms", "Morning symptoms"],
  ["nightSymptoms", "Night symptoms"],
  ["aggMovements", "Aggravating movements"],
  ["aggActivities", "Aggravating activities"],
  ["relMovements", "Relieving factors"],
  ["hasRadiation", "Radiation"],
  ["radiationArea", "Radiation area"],
  ["radiationSide", "Radiation side"],
  ["neuroSymptoms", "Neurological symptoms"],
  ["hasBladderBowelSymptoms", "Bladder / bowel change"],
  ["priorEpisodeCount", "Previous episodes"],
  ["priorEpisodeOutcome", "Previous episode outcome"],
  ["priorTreatmentTried", "Treatment already tried"],
  ["medicalHistory", "Medical history"],
  ["medications", "Medications"],
  ["functionalLimitations", "Functional limitations"],
  ["patientGoals", "Patient goals"],
  ["patientConcern", "Patient's main concern"],
  ["patientBelief", "Patient's own theory"],
  ["flags", "Red flags mentioned"],
];

export function extractedRows(result = {}) {
  const rows = [];
  EXTRACTED_FIELD_LABELS.forEach(([key, label]) => {
    const v = result[key];
    if (v == null || v === "") return;
    if (Array.isArray(v)) {
      if (!v.length) return;
      rows.push({ key, label, value: v.join(", ") });
      return;
    }
    if (typeof v === "boolean") {
      rows.push({ key, label, value: v ? "Yes" : "No" });
      return;
    }
    rows.push({ key, label, value: String(v) });
  });
  return rows;
}

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

  // Demographics (2026-09-03, Aditi: "the extracted AI subjective
  // assessment is not fully filled in the subjective assessment form") --
  // age/sex/occupation and the affected side were extracted by /api/parse
  // all along and then thrown away here, because this mapper only ever
  // returned subjective+pain. They belong on the wizard's own Demographics
  // step (orthoOutpatientSections.jsx's DemographicsSection reads exactly
  // these keys), so they're returned as their own section for the caller to
  // merge the same way it already merges subjective/pain.
  const demographics = {};
  if (result.age != null && result.age !== "") demographics.age = String(result.age);
  if (["Male", "Female", "Other"].includes(result.sex)) demographics.sex = result.sex;
  if (result.occupation) demographics.occupation = result.occupation;
  if (["Left", "Right", "Bilateral"].includes(result.laterality)) demographics.affectedSide = result.laterality;

  // Red flags -- the narrative's own red-flag mentions written into the
  // Red Flag Screen's free-text notes, never into its structured
  // checklists: those are fixed clinical enums and a wrong tick there is
  // exactly the "incorrect clinical data" this pipeline refuses to guess
  // at. The action field is deliberately left for the clinician too --
  // this only surfaces what was said so the screen opens with the
  // narrative's own flags in front of them instead of blank.
  const redFlagNotes = [];
  const flags = Array.isArray(result.flags) ? result.flags.filter(Boolean) : [];
  if (flags.length) redFlagNotes.push(`From the patient's narrative: ${flags.join("; ")}`);
  if (result.hasBladderBowelSymptoms === true) redFlagNotes.push("Patient reports new bladder/bowel change — screen for cauda equina.");
  const redFlags = redFlagNotes.length ? { grf_notes: redFlagNotes.join(" ") } : {};

  // The regions the narrative itself named (see regionsFromParseResult) --
  // a suggestion for the region picker, which stays fully editable.
  const regions = regionsFromParseResult(result);

  // Everything the extraction produced, kept verbatim as label/value rows
  // so the Subjective step can show the AI's own output exactly as
  // extracted alongside the fields it filled -- nothing extracted is
  // silently dropped just because this wizard has no dedicated field for it.
  const extracted = extractedRows(result);

  return {
    subjective,
    pain,
    demographics,
    redFlags,
    regions,
    extracted,
    flags,
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

/* ============================================================
   REGION RESOLUTION — /api/parse already returns the body area it
   heard ("region" + up to 2 "additionalRegions", from its own fixed
   10-option enum, plus "laterality"). Nothing used to read them here,
   so an AI-assisted session always landed on a completely empty
   region picker even when the narrative said "right shoulder" in the
   first sentence (2026-09-03, Aditi: "I already told about the
   region... when we go to the next page we should be able to see that
   this region is selected"). This maps that enum onto THIS wizard's
   own {id, side} region objects (orthoRegionLibrary.js) so the region
   screen can open pre-ticked -- suggested, never locked: the picker
   is the same one as always, so the therapist adds/removes/changes
   side exactly as before.

   Elbow/Wrist/Hand is one bucket in the parse enum but four separate
   regions here, so that single case looks at the narrative's own
   wording (chief complaint / location description) to pick the right
   one, falling back to Wrist -- the most common of the four in OPD --
   rather than guessing silently at a joint that was never mentioned.
   ============================================================ */
const PARSE_REGION_MAP = {
  "Lumbar / SI": { id: "lumbar", sideless: true },
  "Cervical spine": { id: "cervical", sideless: true },
  "Thoracic spine": { id: "thoracic", sideless: true },
  "Shoulder (L)": { id: "shoulder", side: "Left" },
  "Shoulder (R)": { id: "shoulder", side: "Right" },
  "Knee (L)": { id: "knee", side: "Left" },
  "Knee (R)": { id: "knee", side: "Right" },
  "Hip / Groin": { id: "hip" },
  "Ankle / Foot": { id: "ankle" },
  "Elbow/Wrist/Hand": { id: "__upperLimbDistal" },
};

function distalUpperLimbId(text) {
  const hay = String(text || "").toLowerCase();
  if (/finger|thumb|hand|grip/.test(hay)) return "hand";
  if (/elbow|tennis elbow|golfer/.test(hay)) return "elbow";
  if (/forearm/.test(hay)) return "forearm";
  return "wrist";
}

// laterality is the narrative's own side ("Left"/"Right"/"Bilateral") --
// only applied to a region that actually has sides, and never overriding
// a side already carried by the enum value itself (Shoulder (L), Knee (R)).
export function regionsFromParseResult(result = {}) {
  const names = [result.region, ...(Array.isArray(result.additionalRegions) ? result.additionalRegions : [])].filter(Boolean);
  const laterality = ["Left", "Right", "Bilateral"].includes(result.laterality) ? result.laterality : "";
  const hint = [result.chiefComplaint, result.locationDescription].filter(Boolean).join(" ");
  const out = [];
  names.forEach((name) => {
    const mapped = PARSE_REGION_MAP[name];
    if (!mapped) return;
    const id = mapped.id === "__upperLimbDistal" ? distalUpperLimbId(hint) : mapped.id;
    if (out.some((r) => r.id === id)) return;
    out.push({ id, side: mapped.sideless ? "" : mapped.side || laterality || "" });
  });
  return out;
}

/* ============================================================
   OLD PATIENT DATA — every prior record on this patient that can
   seed a new Subjective, as a real selectable list (2026-09-03,
   Aditi: "when I click on select from old patient data it is not
   giving me the list of old patient data to select from"). Before
   this, the one "Load existing Subjective" button imported the
   old-flow fields blindly with no list, no preview, and no way to
   pick a different (e.g. more recent) record.

   Sources, newest first:
     - each saved Ortho assessment snapshot on this patient
       (data.ortho_outpatient_assessment / _ipd_ / _postop_, the same
       JSON-stringified snapshots SpecialtyPatientProfile.jsx reads)
     - the old-flow Subjective Assessment (cc_main/cc_onset/... flat
       fields), when it has anything in it
   Each record carries its own ready-to-apply { subjective, pain }
   payload plus preview rows, so the picker never has to know how any
   one source is shaped.
   ============================================================ */
const SNAPSHOT_SOURCES = [
  { key: "ortho_outpatient_assessment", label: "Outpatient / Musculoskeletal assessment", icon: "🚶" },
  { key: "ortho_ipd_assessment", label: "IPD assessment", icon: "🏥" },
  { key: "ortho_postop_assessment", label: "Post-operative Rehab assessment", icon: "🛏️" },
];

const SUBJECTIVE_PREVIEW_LABELS = {
  chiefComplaint: "Chief complaint",
  onset: "Onset",
  duration: "Duration",
  previousTreatment: "Previous treatment",
  medicalHistory: "Medical history",
  medication: "Medication",
  functionalLimitations: "Functional limitations",
  patientGoals: "Patient goals",
};

function previewRows(subjective = {}, pain = {}) {
  const rows = Object.entries(SUBJECTIVE_PREVIEW_LABELS)
    .filter(([k]) => String(subjective[k] || "").trim())
    .map(([k, label]) => ({ label, value: String(subjective[k]) }));
  if (pain.current) rows.push({ label: "Pain (NRS now)", value: String(pain.current) });
  return rows;
}

function formatSavedAt(raw) {
  if (!raw) return "";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function listOldPatientRecords(patientData) {
  if (!patientData) return [];
  const records = [];

  SNAPSHOT_SOURCES.forEach((src) => {
    let parsed = null;
    try { parsed = patientData[src.key] ? JSON.parse(patientData[src.key]) : null; } catch { parsed = null; }
    const subjective = parsed?.data?.subjective || null;
    const pain = parsed?.data?.pain || {};
    if (!subjective) return;
    // Region-specific checklist answers travel with the record too, but
    // only as part of a whole-record import -- never re-keyed onto a
    // different region (same reason the old-flow import below stays
    // limited to the shared, unambiguous fields).
    const flat = Object.fromEntries(Object.entries(subjective).filter(([k, v]) => k !== "regions" && !k.startsWith("__") && typeof v === "string" && v.trim()));
    if (!Object.keys(flat).length && !Object.keys(pain).length) return;
    const savedAt = formatSavedAt(parsed?.savedAt || parsed?.date || parsed?.updatedAt);
    records.push({
      id: src.key,
      icon: src.icon,
      label: src.label,
      sublabel: [savedAt && `Saved ${savedAt}`, parsed?.regions, parsed?.condition].filter(Boolean).join(" · "),
      subjective: flat,
      pain: typeof pain === "object" ? pain : {},
      regionChecklist: subjective.regions && typeof subjective.regions === "object" ? subjective.regions : null,
      // The case-level region selection this assessment was run with --
      // saved verbatim by each pathway's saveAssessment, so importing an
      // old record can pre-tick the same regions instead of asking again.
      caseRegions: Array.isArray(parsed?.selectedRegions) ? parsed.selectedRegions : [],
      rows: previewRows(flat, pain),
    });
  });

  if (hasOldSubjectiveData(patientData)) {
    const { subjective } = importOldSubjectiveData(patientData);
    records.push({
      id: "old_flow_subjective",
      icon: "📋",
      label: "Subjective Assessment (earlier flow)",
      sublabel: "Chief complaint, history, medication and goals already on file",
      subjective,
      pain: {},
      regionChecklist: null,
      caseRegions: [],
      rows: previewRows(subjective),
    });
  }

  return records.filter((r) => r.rows.length > 0);
}

// The { subjective, pain } payload for one record from listOldPatientRecords
// -- same shape mapParseResultToOrthoUpdates returns, so both paths merge
// through the exact same caller-side code.
export function updatesFromOldRecord(record) {
  if (!record) return { subjective: {}, pain: {}, regions: [] };
  const subjective = { ...record.subjective };
  if (record.regionChecklist) subjective.regions = record.regionChecklist;
  return { subjective, pain: { ...record.pain }, regions: record.caseRegions || [] };
}
