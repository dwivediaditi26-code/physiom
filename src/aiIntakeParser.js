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

function mapParseResultToUpdates(result, existingData = {}) {
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

  // ── Region-prefixed fields ─────────────────────────────────────────
  if (pfx) {
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

    if (result.neuroSymptoms?.length) {
      const neuroField = pfx === "cx" ? "cx_arm_neuro"
        : pfx === "lx" ? "lx_neuro_quality"
        : pfx + "_neuro";
      updates[neuroField] = result.neuroSymptoms.join(SEP);
    }
    if (result.hasLegNeuro && pfx === "lx")
      updates["lx_neuro_present"] = result.hasLegNeuro;
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
  if (reg) filled.push("Region: " + reg);

  return {
    updates,
    region: reg || null,
    filledLabels: filled,
    redFlagsToReview: Array.isArray(result.flags) ? result.flags.filter(Boolean) : [],
  };
}

export { REGION_PREFIX_MAP, mapParseResultToUpdates };
