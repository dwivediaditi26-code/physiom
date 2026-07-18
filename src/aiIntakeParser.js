// aiIntakeParser.js
// Shared mapping logic between an /api/parse result (AI-extracted
// clinical narrative) and the real patient data fields. Extracted from
// SubjectiveObjective.jsx's original applyAiResult() so this exact same,
// already-tested field mapping can be reused by the AI Assistant chat
// too, rather than growing a second, easily-drifting copy of it.
//
// Deliberately pure: takes a parse result + existing data, returns what
// SHOULD change -- it never calls set() and never touches component
// state. Callers decide what UI to show and when to actually apply it.
//
// Fixes a real gap found while extracting this: the /api/parse system
// prompt (api/parse.js) already asks the AI to return a "flags" array of
// red-flag phrases it noticed in the narrative, but the original
// applyAiResult() never read result.flags at all -- red flags the AI
// spotted were silently discarded. Now surfaced as redFlagsToReview so
// callers can prompt the clinician to actually screen them, rather than
// auto-marking anything positive/negative (that stays a clinical
// judgement call, same principle as everywhere else red flags are
// handled in this app).

const REGION_PREFIX_MAP = {
  "Cervical spine":"cx","Lumbar / SI":"lx","Thoracic spine":"tx",
  "Shoulder (L)":"shl","Shoulder (R)":"shr",
  "Knee (L)":"knl","Knee (R)":"knr",
  "Hip / Groin":"hp","Ankle / Foot":"af","Elbow/Wrist/Hand":"ew",
};

function mapParseResultToUpdates(result, existingData = {}, narrativeText = "") {
  const updates = {};
  const SEP = "|||";

  let reg = result.region || "";
  if (result.laterality === "Left"  && reg === "Shoulder") reg = "Shoulder (L)";
  if (result.laterality === "Right" && reg === "Shoulder") reg = "Shoulder (R)";
  if (result.laterality === "Left"  && reg === "Knee")     reg = "Knee (L)";
  if (result.laterality === "Right" && reg === "Knee")     reg = "Knee (R)";
  const pfx = REGION_PREFIX_MAP[reg] || null;

  // ── Demographics ─────────────────────────────────────────────────
  if (result.age)        updates.dem_age = String(result.age);
  if (result.sex)        updates.dem_sex = result.sex;
  if (result.occupation) updates.dem_occupation = result.occupation;

  // ── Chief Complaint ───────────────────────────────────────────────
  // cc_main is the actual free-text "Chief complaint" field a clinician
  // fills in manually (see AppModules.jsx's intake form) -- it's also
  // what buildRealtimeSOAP's opening Subjective line reads
  // (`${name} presents with: "${cc}"`) and what the interpretation
  // engine scans for red-flag keywords like "saddle"/"cauda". Found
  // missing while reviewing a real result: a narrative describing a
  // distal radius fracture with the cast just removed produced a SOAP
  // note that never mentioned "fracture" at all, because none of the
  // AI's other structured fields (onset category, duration, pain
  // quality) carry that specific diagnosis detail -- only a genuine
  // one-line summary does. /api/parse now asks for that summary
  // explicitly as chiefComplaint; mapped here to the real field it
  // needs to land in.
  if (result.chiefComplaint) updates.cc_main = result.chiefComplaint;
  if (result.onset)    updates.cc_onset    = result.onset;
  if (result.duration) updates.cc_duration = result.duration;
  if (result.nrsNow   != null) updates.cc_vas_now   = String(Math.round(result.nrsNow));
  if (result.nrsWorst != null) updates.cc_vas_worst = String(Math.round(result.nrsWorst));
  if (result.nrsBest  != null) updates.cc_vas_best  = String(Math.round(result.nrsBest));
  if (result.painQuality?.length)
    updates.cc_quality = result.painQuality.join(SEP);

  // Medical history, medications, prior episodes, goals -- global
  // (not region-prefixed). These map onto fields the rest of the app
  // already reads (pmh_notes/hx_episodes/hx_resolve/goal_main), not
  // new fields nothing downstream sees. pmh_conditions/med_current are
  // deliberately NOT written here: both are fixed-enum multichecks (36
  // and 29 options respectively) and forcing free-text AI output into
  // an exact enum match is a real hallucination/mismatch risk --
  // pmh_notes is the existing free-text companion field for exactly
  // this, already read into the SOAP as "Clinician note (PMH)".
  const pmhParts = [];
  if (result.medicalHistory) pmhParts.push(result.medicalHistory);
  if (result.medications) pmhParts.push("Medications: " + result.medications);
  if (pmhParts.length) updates.pmh_notes = pmhParts.join(". ");
  if (result.priorEpisodeCount) updates.hx_episodes = result.priorEpisodeCount;
  if (result.priorEpisodeOutcome) updates.hx_resolve = result.priorEpisodeOutcome;
  if (result.patientGoals) updates.goal_main = result.patientGoals;
  // goal_concern is the real field for "what worries you most?" -- distinct
  // from goal_main (what they want to achieve). Both are free text, no
  // enum-mismatch risk.
  if (result.patientConcern) updates.goal_concern = result.patientConcern;
  // goal_belief is the existing "What do YOU think is causing it?" field --
  // the patient's own causal theory, recorded as their belief, never
  // auto-treated as a confirmed mechanism or diagnosis.
  if (result.patientBelief) updates.goal_belief = result.patientBelief;
  // hx_notes is the existing free-text "History Notes" field
  // ("Patterns across episodes, what works vs doesn't"), the right home
  // for a treatment tried during the CURRENT episode -- distinct from
  // hx_episodes/hx_resolve, which are about a SEPARATE past episode.
  if (result.priorTreatmentTried) updates.hx_notes = result.priorTreatmentTried;

  // ── Region-prefixed fields ─────────────────────────────────────────
  if (pfx) {
    // {pfx}_moi_notes is the existing free-text "Mechanism Notes" field,
    // already read by name in buildRealtimeSOAP/SOAPNoteModule's region
    // notes card. The right home for hedged/uncertain mechanism detail
    // (onsetContext) that shouldn't be forced into cc_onset's confident
    // fixed-enum options.
    if (result.onsetContext)
      updates[pfx + "_moi_notes"] = result.onsetContext;
    // {pfx}_loc_notes is the existing free-text "Location Notes" field
    // ("Specific location details... patient description") -- the right
    // home for the patient's own layman location wording, distinct from
    // the coarse 10-option "region" enum.
    if (result.locationDescription)
      updates[pfx + "_loc_notes"] = result.locationDescription;

    if (result.symptomPattern)
      updates[pfx + "_pattern"] = result.symptomPattern;
    if (result.diurnalPattern)
      updates[pfx + "_24hr"] = result.diurnalPattern;

    if (result.morningSymptoms?.length)
      updates[pfx + "_morning"] = result.morningSymptoms.join(SEP);
    if (result.nightSymptoms?.length)
      updates[pfx + "_night"] = result.nightSymptoms.join(SEP);

    const allAgg = [...(result.aggMovements||[]), ...(result.aggActivities||[])];
    if (allAgg.length) {
      updates[pfx + "_agg_notes"] = allAgg.join("\n");
      updates[pfx + "_agg_worst"] = allAgg[0];
    }
    if (result.relMovements?.length) {
      updates[pfx + "_rel_notes"] = result.relMovements.join("\n");
      updates[pfx + "_rel_best"] = result.relMovements[0];
    }

    // {pfx}_radiation is the real field both buildRealtimeSOAP's Radiation
    // line and the interpretation engine read (confirmed: _allRad scans
    // data[px + "_radiation"] || data[px + "_loc_radiation"]). Previously
    // wrote the positive case to {pfx}_rad_notes -- a name nothing in the
    // app actually reads -- so any narrative describing radiation (leg
    // symptoms, claudication, sciatica, referred arm pain) silently never
    // reached the SOAP note or the differential engine, despite showing
    // up correctly in the "fields written" summary console output.
    if (result.hasRadiation === false)
      updates[pfx + "_radiation"] = "No radiation — local only";
    else if (result.hasRadiation) {
      if (result.radiationArea)
        updates[pfx + "_radiation"] = result.radiationArea + (result.radiationSide ? " (" + result.radiationSide + ")" : "");
    }

    const neuroField = pfx === "cx" ? "cx_arm_neuro"
      : pfx === "lx" ? "lx_neuro_quality"
      : pfx + "_neuro";
    if (result.neuroSymptoms?.length) {
      updates[neuroField] = result.neuroSymptoms.join(SEP);
    }
    if (result.hasLegNeuro && pfx === "lx")
      updates["lx_neuro_present"] = result.hasLegNeuro;

    // Bladder/bowel is a cauda equina red-flag screen. Deliberately
    // never auto-writes any red-flag/clinician-verdict field (lx_rf_cauda,
    // s_red5, etc.) -- same principle as flags/redFlagsToReview below,
    // that stays a clinical judgement call. Recorded as plain
    // informational text next to any neuro symptoms captured, so a
    // genuine denied negative is visible in the SOAP note too, not just
    // a positive.
    if (result.hasBladderBowelSymptoms === true) {
      const note = "Reports bladder/bowel involvement — see red flags";
      updates[neuroField] = updates[neuroField] ? updates[neuroField] + SEP + note : note;
    } else if (result.hasBladderBowelSymptoms === false) {
      const note = "No bladder/bowel symptoms";
      updates[neuroField] = updates[neuroField] ? updates[neuroField] + SEP + note : note;
    }

    if (result.functionalLimitations?.length)
      updates[pfx + "_fn_notes"] = result.functionalLimitations.join("\n");
  }

  // ── Filled-field labels, for a human-readable summary ───────────────
  const filled = [];
  if (result.chiefComplaint) filled.push("Chief complaint");
  if (result.age) filled.push("Age");
  if (result.sex) filled.push("Sex");
  if (result.occupation) filled.push("Occupation");
  if (result.onset) filled.push("Onset");
  if (result.duration) filled.push("Duration");
  if (result.nrsNow != null) filled.push("NRS now");
  if (result.nrsWorst != null) filled.push("NRS worst");
  if (result.nrsBest != null) filled.push("NRS best");
  if (result.painQuality?.length) filled.push("Pain quality (" + result.painQuality.join(", ") + ")");
  if (result.symptomPattern) filled.push("Pain pattern");
  if (result.diurnalPattern) filled.push("24hr pattern");
  if (result.morningSymptoms?.length) filled.push("Morning symptoms");
  if (result.nightSymptoms?.length) filled.push("Night symptoms");
  if (result.aggMovements?.length || result.aggActivities?.length) filled.push("Aggravating factors");
  if (result.relMovements?.length) filled.push("Relieving factors");
  if (result.hasRadiation != null) filled.push("Radiation");
  if (result.neuroSymptoms?.length) filled.push("Neuro symptoms");
  if (result.hasLegNeuro) filled.push("Leg neuro");
  if (result.hasBladderBowelSymptoms != null) filled.push("Bladder/bowel screen");
  if (result.priorEpisodeCount) filled.push("Prior episodes");
  if (result.priorEpisodeOutcome) filled.push("Prior episode outcome");
  if (result.medicalHistory) filled.push("Medical history");
  if (result.medications) filled.push("Medications");
  if (result.functionalLimitations?.length) filled.push("Functional limitations");
  if (result.patientGoals) filled.push("Patient goals");
  if (result.patientConcern) filled.push("Patient's main concern/fear");
  if (result.onsetContext) filled.push("Mechanism detail (uncertain)");
  if (result.priorTreatmentTried) filled.push("Prior treatment tried (current episode)");
  if (result.patientBelief) filled.push("Patient's own belief about cause");
  if (result.locationDescription) filled.push("Location detail (patient's words)");
  if (reg) filled.push("Region: " + reg);

  // ── Missing-information checklist ───────────────────────────────────
  // Computed deterministically from what's actually still empty, not
  // asked of the AI -- asking an LLM to self-report what it's missing
  // is itself a hallucination risk (it could claim something is present
  // when it isn't, or invent a plausible-sounding gap). Checking the
  // real, already-extracted result is the only reliable way to build
  // this list.
  const missingInfo = [];
  if (result.nrsNow == null && result.nrsWorst == null && result.nrsBest == null)
    missingInfo.push("Pain scale (0-10)");
  if (!result.occupation) missingInfo.push("Occupation");
  if (!result.symptomPattern) missingInfo.push("Symptom pattern (constant vs intermittent)");
  if (!result.diurnalPattern && !result.morningSymptoms?.length && !result.nightSymptoms?.length)
    missingInfo.push("Time-of-day pattern (morning/night)");
  if (result.hasRadiation == null) missingInfo.push("Radiation / referred symptoms");
  if (!result.aggMovements?.length && !result.aggActivities?.length)
    missingInfo.push("Aggravating factors");
  if (!result.relMovements?.length) missingInfo.push("Relieving factors");
  if (!result.painQuality?.length) missingInfo.push("Pain quality/character");
  if (result.hasBladderBowelSymptoms == null) missingInfo.push("Bladder/bowel screen (red flag)");
  if (!result.patientGoals) missingInfo.push("Patient's own goals");
  if (!result.patientConcern) missingInfo.push("Patient's main concern/fear");

  // ── Extraction audit trail ──────────────────────────────────────────
  // Per-field confidence and the exact quote supporting it, straight
  // from the AI's own self-reported values (never invented here) --
  // plus the verbatim original narrative, so a clinician can always
  // compare what was extracted against exactly what was said. This is
  // deliberately NOT written into updates as if it were a real form
  // field -- callers store it as one separate field
  // (ai_extraction_audit) so every existing field the rest of the app
  // reads (cc_main, dem_age, etc.) keeps storing a plain value exactly
  // as before, and nothing downstream (SOAP, interpretation engine,
  // Patient Profile) has to change or risk breaking.
  const extractionMeta = {
    narrative: narrativeText || "",
    confidence: (result._confidence && typeof result._confidence === "object") ? result._confidence : {},
    sourceQuotes: (result._sourceQuotes && typeof result._sourceQuotes === "object") ? result._sourceQuotes : {},
    missingInfo,
  };

  const redFlagsToReview = Array.isArray(result.flags) ? result.flags.filter(Boolean) : [];
  if (result.hasBladderBowelSymptoms === true)
    redFlagsToReview.push("Patient reports bladder/bowel involvement — screen for cauda equina");

  return {
    updates,
    region: reg || null,
    filledLabels: filled,
    redFlagsToReview,
    extractionMeta,
  };
}

export { REGION_PREFIX_MAP, mapParseResultToUpdates };
