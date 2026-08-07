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

  // Adversarial/malformed-response guard: found via adversarial testing
  // that a truthy-but-non-array value here (e.g. the AI or a bad response
  // returning a string instead of an array for one of these 8 fields)
  // crashed the whole function with "x.join is not a function" --
  // ?.length alone doesn't protect against this since strings have
  // .length too. Normalized once, here, into safe local arrays so every
  // later reference below (both the updates-building section and the
  // filled/missingInfo sections) is automatically safe -- same principle
  // as the existing Array.isArray(result.flags) / additionalRegions
  // guards just below, applied consistently to the rest of the array
  // fields that previously had none.
  const asArray = (v) => Array.isArray(v) ? v : [];
  const painQuality = asArray(result.painQuality);
  const morningSymptoms = asArray(result.morningSymptoms);
  const nightSymptoms = asArray(result.nightSymptoms);
  const aggMovements = asArray(result.aggMovements);
  const aggActivities = asArray(result.aggActivities);
  const relMovements = asArray(result.relMovements);
  const neuroSymptoms = asArray(result.neuroSymptoms);
  const functionalLimitations = asArray(result.functionalLimitations);

  let reg = result.region || "";
  // Knee and Shoulder are stored per-side (…(L)/(R)); every other region has a
  // single key. Resolve the side from laterality. CRITICAL: this must cover
  // "Bilateral"/"Both"/unspecified, not just Left/Right — otherwise a plain
  // "Knee"/"Shoulder" region never matches REGION_PREFIX_MAP, pfx falls to null,
  // and EVERY region-specific extracted field (aggravating, location, pattern,
  // radiation, night/morning, relieving, red flags) is silently dropped — only
  // the shared cc_/dem_ fields survive. Found via a bilateral-knee intake where
  // the review showed 11 extracted fields but Run-Analysis saw almost none.
  if (reg === "Shoulder" || reg === "Knee") {
    reg = reg + (result.laterality === "Left" ? " (L)" : " (R)"); // Right/Bilateral/Both/unknown -> (R)
  }
  const pfx = REGION_PREFIX_MAP[reg] || null;

  // Multi-region: /api/parse now also returns additionalRegions[] for
  // narratives describing more than one distinct body area (e.g. neck AND
  // knee). Resolve each the same way the primary region is resolved above,
  // so the caller can select ALL of them (not just the primary) into
  // cx_selected_regions -- otherwise a two-region intake only ever selected
  // one region and Run-Analysis stayed locked for the other.
  const resolveSide = (r, lat) =>
    (r === "Shoulder" || r === "Knee")
      ? r + (lat === "Left" ? " (L)" : " (R)")
      : r;
  const allRegions = [];
  if (reg) allRegions.push(reg);
  if (Array.isArray(result.additionalRegions)) {
    for (const extra of result.additionalRegions) {
      if (!extra) continue;
      const resolved = resolveSide(extra, result.laterality);
      if (resolved && !allRegions.includes(resolved)) allRegions.push(resolved);
    }
  }

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
  if (painQuality.length)
    updates.cc_quality = painQuality.join(SEP);

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

    if (morningSymptoms.length)
      updates[pfx + "_morning"] = morningSymptoms.join(SEP);
    if (nightSymptoms.length)
      updates[pfx + "_night"] = nightSymptoms.join(SEP);

    const allAgg = [...aggMovements, ...aggActivities];
    if (allAgg.length) {
      updates[pfx + "_agg_notes"] = allAgg.join("\n");
      updates[pfx + "_agg_worst"] = allAgg[0];
    }
    if (relMovements.length) {
      updates[pfx + "_rel_notes"] = relMovements.join("\n");
      updates[pfx + "_rel_best"] = relMovements[0];
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
    if (neuroSymptoms.length) {
      updates[neuroField] = neuroSymptoms.join(SEP);
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

    if (functionalLimitations.length)
      updates[pfx + "_fn_notes"] = functionalLimitations.join("\n");
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
  if (painQuality.length) filled.push("Pain quality (" + painQuality.join(", ") + ")");
  if (result.symptomPattern) filled.push("Pain pattern");
  if (result.diurnalPattern) filled.push("24hr pattern");
  if (morningSymptoms.length) filled.push("Morning symptoms");
  if (nightSymptoms.length) filled.push("Night symptoms");
  if (aggMovements.length || aggActivities.length) filled.push("Aggravating factors");
  if (relMovements.length) filled.push("Relieving factors");
  if (result.hasRadiation != null) filled.push("Radiation");
  if (neuroSymptoms.length) filled.push("Neuro symptoms");
  if (result.hasLegNeuro) filled.push("Leg neuro");
  if (result.hasBladderBowelSymptoms != null) filled.push("Bladder/bowel screen");
  if (result.priorEpisodeCount) filled.push("Prior episodes");
  if (result.priorEpisodeOutcome) filled.push("Prior episode outcome");
  if (result.medicalHistory) filled.push("Medical history");
  if (result.medications) filled.push("Medications");
  if (functionalLimitations.length) filled.push("Functional limitations");
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
  if (!result.diurnalPattern && !morningSymptoms.length && !nightSymptoms.length)
    missingInfo.push("Time-of-day pattern (morning/night)");
  if (result.hasRadiation == null) missingInfo.push("Radiation / referred symptoms");
  if (!aggMovements.length && !aggActivities.length)
    missingInfo.push("Aggravating factors");
  if (!relMovements.length) missingInfo.push("Relieving factors");
  if (!painQuality.length) missingInfo.push("Pain quality/character");
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
  // typeof x === "object" is also true for arrays -- guard against the AI
  // (or a malformed response) returning _confidence/_sourceQuotes as an
  // array instead of the expected { fieldName: value } shape. Without
  // Array.isArray() excluded here, an array slips through unnormalized and
  // any downstream `sourceQuotes[fieldName]` lookup silently returns
  // undefined instead of the intended "nothing invented" empty object.
  const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const extractionMeta = {
    narrative: narrativeText || "",
    confidence: isPlainObject(result._confidence) ? result._confidence : {},
    sourceQuotes: isPlainObject(result._sourceQuotes) ? result._sourceQuotes : {},
    missingInfo,
  };

  const redFlagsToReview = Array.isArray(result.flags) ? result.flags.filter(Boolean) : [];
  if (result.hasBladderBowelSymptoms === true)
    redFlagsToReview.push("Patient reports bladder/bowel involvement — screen for cauda equina");

  return {
    updates,
    region: reg || null,
    regions: allRegions,
    filledLabels: filled,
    redFlagsToReview,
    extractionMeta,
  };
}

export { REGION_PREFIX_MAP, mapParseResultToUpdates };
