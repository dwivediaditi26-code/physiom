// lumbarReasoningEngine.js
//
// Layer 3 (Reasoning Engine) of the three-layer Lumbar architecture:
//   Layer 1 (AI Interpreter)  -> aiIntakeParser.js / api/parse.js
//   Layer 2 (Knowledge Base)  -> the condition definitions below (was a
//                                 markdown doc; now code, per instruction
//                                 to stop maintaining it as a separate file)
//   Layer 3 (Reasoning Engine) -> this file
//
// Input: the canonical variable object produced by
// extractLumbarVariablesStructured() (lumbarVariableExtractor.js) --
// NOT raw form data. Output: every L01-L11 condition ranked by an
// UNWEIGHTED, count-based match tier.
//
// Explicitly NOT a weighted/scored engine. Per the build order this
// project has followed throughout (variables -> supporting/refuting ->
// red flags -> ONLY THEN weights), weights have deliberately not been
// assigned yet. Each condition's tier is just:
//   (# supporting checks true) vs (# refuting checks true) vs (# unknown)
// -- transparent and auditable, not a false-precision probability
// percentage. Every check function is commented with which part of the
// condition's real-world clinical signature it maps to and how directly
// (some are exact per Magee's text; some are pragmatic approximations
// given what the current form fields can actually capture -- marked
// "approx" where that's the case).
//
// L11 (Serious Pathology / Red Flag) is NOT scored like the other ten --
// per its own design, any single positive red flag is a hard override
// that should dominate the output, not just add to a count. Handled
// separately by hasRedFlagOverride() below, always checked first.

// ── Small helpers for reading the extractor's output shape ─────────────
const present = (field) => field && field.state === "present";
const absent  = (field) => field && field.state === "absent";
const unknown = (field) => !field || field.state === "unknown";
const isTrue  = (v) => v === true;
const isFalse = (v) => v === false;

function textIncludes(text, ...needles) {
  const t = String(text || "").toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

// ── L11 red-flag hard override (checked before anything else) ──────────
// Directly from Magee Table 9-6 (p.566) -- see docs history / prior chat
// for the full source list. A single positive item here should dominate
// the whole output, not be one more condition in a ranked list.
function evaluateRedFlagOverride(lv) {
  const rf = lv.redFlags || {};
  const caudaPositive = present(rf.cauda);
  const anyPositive = rf.redFlagScreen === "positive";
  const screenIncomplete = rf.redFlagScreen === "incomplete";

  if (caudaPositive) {
    return {
      triggered: true,
      urgency: "EMERGENCY",
      reason: "Cauda equina indicator(s) present: " + rf.cauda.values.join(", "),
      action: "Same-day emergency medical referral. Do not proceed with routine objective assessment sequence until cleared.",
    };
  }
  if (anyPositive) {
    const which = ["fracture", "inflammatory", "serious"]
      .filter((k) => present(rf[k]))
      .map((k) => `${k}: ${rf[k].values.join(", ")}`)
      .join(" | ");
    return {
      triggered: true,
      urgency: "URGENT_REFERRAL",
      reason: "Red flag(s) present outside cauda equina screen — " + which,
      action: "Urgent medical/specialist referral before continuing routine physiotherapy assessment.",
    };
  }
  if (screenIncomplete) {
    return {
      triggered: false,
      urgency: "SCREEN_INCOMPLETE",
      reason: "Red flag screen not fully completed — some categories never asked.",
      action: "Complete the red flag screen (cauda equina, fracture, inflammatory, other serious pathology) before treating results below as reliable.",
    };
  }
  return { triggered: false, urgency: "SCREEN_NEGATIVE", reason: null, action: null };
}

// ── Condition library (L01–L11) ─────────────────────────────────────────
// Each check is a small function (lv) => true | false | "unknown".
// "unknown" is returned (not coerced to false) whenever the underlying
// field was never asked, so the engine can report confidence separately
// from the supporting/refuting count -- matching the Unknown-should-
// lower-confidence-not-count-as-evidence principle used throughout this
// project.
function stateOf(fn) {
  return (lv) => {
    try { return fn(lv); } catch { return "unknown"; }
  };
}

const CONDITIONS = [
  {
    id: "L01", name: "Mechanical / Non-Specific Low Back Pain",
    supporting: [
      { label: "No leg pain below knee", check: stateOf((lv) => lv.location.belowKneePain === false) },
      { label: "No dermatomal pattern", check: stateOf((lv) => absent(lv.location.dermatomal) ? true : unknown(lv.location.dermatomal) ? "unknown" : false) },
      { label: "No leg neurological symptoms", check: stateOf((lv) => lv.neurological.hasLegNeuro === false) },
      { label: "Symptoms vary with posture/movement (mechanical behaviour)", check: stateOf((lv) => present(lv.aggravating.postures) || present(lv.aggravating.movements)) },
      { label: "Identifiable directional preference", check: stateOf((lv) => lv.relieving.directionalPreference.state === "answered" && !textIncludes(lv.relieving.directionalPreference.value, "not assessed", "no clear")) },
      // Bug fix: this used to read !!priorEpisodeCount, which treated
      // "First episode" (itself meaning NO prior recurrence) as truthy
      // supporting evidence for a recurrent-mechanical pattern -- the
      // opposite of what it should mean. Now only a real recurrence
      // value counts.
      { label: "Previous similar episodes", check: stateOf((lv) => !!lv.history.priorEpisodeCount && lv.history.priorEpisodeCount !== "First episode") },
      { label: "Gradual or non-specific onset (approx, from onset text)", check: stateOf((lv) => textIncludes(lv.chiefComplaint.onset, "gradual", "insidious", "no clear cause")) },
    ],
    refuting: [
      { label: "Pain below knee or dermatomal", check: stateOf((lv) => lv.location.belowKneePain === true || present(lv.location.dermatomal)) },
      { label: "Positive leg neurological symptoms", check: stateOf((lv) => lv.neurological.hasLegNeuro === true) },
      { label: "Any red flag present", check: stateOf((lv) => lv.redFlags.redFlagScreen === "positive") },
      { label: "Constant, unremitting pain", check: stateOf((lv) => lv.symptomBehaviour.constantUnremitting) },
      { label: "Constant night pain", check: stateOf((lv) => lv.symptomBehaviour.constantNightPain) },
      { label: "Neurogenic claudication pattern (points to L04 instead)", check: stateOf((lv) => lv.neurological.neurogenicClaudication) },
    ],
    objectiveTests: {
      required: ["Observation (posture, gait, muscle guarding)", "Lumbar AROM all planes", "Repeated movement assessment (McKenzie-style)", "Neurological screen (expect normal)", "SLR (expect negative)"],
      recommended: ["Palpation (soft tissue + segmental)", "PA/central PA glides", "Core/lumbopelvic motor control assessment", "Functional movement screen", "ODI / NPRS / fear-avoidance screen"],
    },
  },
  {
    id: "L02", name: "Lumbar Disc Herniation / Radiculopathy",
    supporting: [
      { label: "Pain below knee", check: stateOf((lv) => lv.location.belowKneePain === true) },
      { label: "Dermatomal distribution", check: stateOf((lv) => present(lv.location.dermatomal)) },
      { label: "Leg neurological symptoms present", check: stateOf((lv) => lv.neurological.hasLegNeuro === true) },
      { label: "Cough/sneeze aggravates (discogenic indicator)", check: stateOf((lv) => lv.aggravating.coughSneezeAggravates) },
      { label: "Valsalva (straining) aggravates", check: stateOf((lv) => lv.aggravating.valsalvaAggravates) },
      { label: "Flexion aggravates", check: stateOf((lv) => lv.aggravating.flexionAggravates) },
      { label: "Sitting aggravates", check: stateOf((lv) => lv.aggravating.sittingAggravates) },
      { label: "Extension relieves (McKenzie responder)", check: stateOf((lv) => lv.relieving.extensionRelieves) },
      { label: "Acute lifting mechanism", check: stateOf((lv) => lv.mechanism.acuteLiftingMechanism === true) },
    ],
    refuting: [
      { label: "No leg symptoms, localized pain only", check: stateOf((lv) => lv.location.belowKneePain === false && lv.neurological.hasLegNeuro === false) },
      { label: "Constant, unremitting pain unaffected by movement", check: stateOf((lv) => lv.symptomBehaviour.constantUnremitting) },
      { label: "Any red flag present", check: stateOf((lv) => lv.redFlags.redFlagScreen === "positive") },
      { label: "Morning stiffness >60 min (points to L10 instead)", check: stateOf((lv) => lv.symptomBehaviour.morningStiffnessOver60) },
    ],
    objectiveTests: {
      required: ["Observation", "Lumbar AROM", "Repeated movement assessment", "Neurological screen (myotomes, dermatomes, reflexes)", "SLR", "Slump test"],
      recommended: ["Crossed SLR", "Femoral nerve tension test (if upper lumbar)", "Functional testing (sit-to-stand, gait, squat)", "Core assessment (after irritability considered)"],
    },
  },
  {
    id: "L03", name: "Lumbar Facet (Zygapophyseal) Joint Dysfunction",
    supporting: [
      { label: "Extension aggravates", check: stateOf((lv) => lv.aggravating.extensionAggravates) },
      { label: "Rotation aggravates", check: stateOf((lv) => lv.aggravating.rotationAggravates) },
      { label: "Flexion relieves", check: stateOf((lv) => lv.relieving.flexionRelieves) },
      { label: "No leg symptoms below knee", check: stateOf((lv) => lv.location.belowKneePain === false) },
      { label: "No dermatomal pattern", check: stateOf((lv) => absent(lv.location.dermatomal)) },
      { label: "No leg neurological symptoms", check: stateOf((lv) => lv.neurological.hasLegNeuro === false) },
    ],
    refuting: [
      { label: "Pain below knee or dermatomal (points to L02)", check: stateOf((lv) => lv.location.belowKneePain === true || present(lv.location.dermatomal)) },
      { label: "Flexion aggravates AND extension relieves (opposite pattern)", check: stateOf((lv) => lv.aggravating.flexionAggravates && lv.relieving.extensionRelieves) },
      { label: "Bilateral leg symptoms with walking (points to L04)", check: stateOf((lv) => lv.neurological.neurogenicClaudication) },
      { label: "Any red flag present", check: stateOf((lv) => lv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation", "Lumbar AROM all planes (note restriction pattern)", "Quadrant Test / Kemp's Test", "Neurological screen (expect normal)"],
      recommended: ["PA central + unilateral vertebral pressures", "Passive physiological intervertebral movements", "One-leg standing (stork) lumbar extension test", "X-ray if degenerative changes suspected"],
    },
  },
  {
    id: "L04", name: "Lumbar Spinal Stenosis",
    supporting: [
      { label: "Bilateral leg symptoms", check: stateOf((lv) => textIncludes(lv.neurological.legNeuroPresent.value, "bilateral")) },
      { label: "Neurogenic claudication pattern", check: stateOf((lv) => lv.neurological.neurogenicClaudication) },
      { label: "Walking aggravates (bilateral leg symptoms)", check: stateOf((lv) => lv.aggravating.walkingAggravatesBilateral) },
      { label: "Flexion / leaning-forward relieves", check: stateOf((lv) => lv.relieving.flexionRelieves) },
    ],
    refuting: [
      { label: "Unilateral leg symptoms only (points to L02)", check: stateOf((lv) => lv.neurological.hasLegNeuro === true && textIncludes(lv.neurological.legNeuroPresent.value, "unilateral")) },
      { label: "Extension relieves rather than flexion (opposite of stenosis pattern)", check: stateOf((lv) => lv.relieving.extensionRelieves && !lv.relieving.flexionRelieves) },
      { label: "Any red flag present", check: stateOf((lv) => lv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation (often flexed posture)", "Lumbar AROM (extension likely limited)", "Bilateral neuro screen", "Bilateral SLR"],
      recommended: ["Bicycle Test of van Gelderen", "Stoop Test", "Treadmill Test (1.2mph + preferred speed, up to 15min)", "Pulse check (vascular vs. neurogenic claudication)"],
    },
  },
  {
    id: "L05", name: "Sacroiliac Joint (SIJ) Dysfunction",
    supporting: [
      { label: "Location mentions SI joint / SIJ area (approx, from location text)", check: stateOf((lv) => lv.location.primaryLocation.values.some((v) => textIncludes(v, "si joint", "sacrum", "buttock"))) },
      { label: "No leg symptoms below knee", check: stateOf((lv) => lv.location.belowKneePain === false) },
      { label: "No dermatomal pattern", check: stateOf((lv) => absent(lv.location.dermatomal)) },
    ],
    refuting: [
      { label: "Dermatomal or below-knee leg pain (points to L02)", check: stateOf((lv) => lv.location.belowKneePain === true || present(lv.location.dermatomal)) },
      { label: "Any red flag present", check: stateOf((lv) => lv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation", "SIJ provocation CLUSTER (not a single test): Compression, Distraction, Sacral Thrust, Gaenslen's, FABERE/Patrick, Gillet's", "Active SLR"],
      recommended: ["Palpation (PSIS, sacral sulcus — Magee's own appendix notes weak interrater reliability here, don't over-weight)", "Standing/sitting flexion tests", "ESR/CRP/HLA-B27 referral if inflammatory features co-exist"],
    },
  },
  {
    id: "L06", name: "Lumbar Instability",
    supporting: [
      { label: "Overall pattern includes intermittent/unpredictable triggers (approx proxy for 'catch'/give-way)", check: stateOf((lv) => lv.symptomBehaviour.overallPattern.values.some((v) => textIncludes(v, "intermittent", "unpredictable"))) },
      { label: "Known/imaged spondylolisthesis history (approx, from medical history text)", check: stateOf((lv) => textIncludes(lv.history.medicalHistory, "spondylolisthesis")) },
    ],
    refuting: [
      { label: "Any red flag present", check: stateOf((lv) => lv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation for instability jog during active movement", "Passive Lumbar Extension Test", "H and I Stability Tests"],
      recommended: ["Farfan Torsion Test", "Pheasant Test", "Imaging if structural instability/spondylolisthesis suspected"],
    },
    note: "Weakest data coverage of the ten grounded conditions -- the current form has no dedicated 'catch/give-way/instability jog' field, so supporting checks here are approximations, not direct captures. Flagged, not hidden.",
  },
  {
    id: "L07", name: "Spondylolisthesis / Spondylolysis",
    supporting: [
      { label: "Extension aggravates", check: stateOf((lv) => lv.aggravating.extensionAggravates) },
      { label: "Flexion relieves", check: stateOf((lv) => lv.relieving.flexionRelieves) },
      { label: "No leg pain (back pain only)", check: stateOf((lv) => lv.location.belowKneePain === false) },
      // Higher-specificity check first: a real structured/AI-extracted
      // repetitive-extension-athlete flag (gymnastics, fast bowling,
      // diving, volleyball, weightlifting, etc.) -- Magee's own
      // spondylolysis section describes this as classically an overuse
      // fatigue injury from repeated hyperextension, most often in
      // adolescent athletes. Falls back to the older generic "sport"
      // text search only when that specific flag hasn't been asked/found,
      // so existing behaviour isn't lost for cases already relying on it.
      { label: "Repetitive-extension athlete history", check: stateOf((lv) =>
          lv.mechanism.repetitiveExtensionAthleteHistory === true ? true :
          lv.mechanism.repetitiveExtensionAthleteHistory === false ? false :
          (textIncludes(lv.chiefComplaint.onset, "sport") || lv.mechanism.type.values.some((v) => textIncludes(v, "sport"))) ? true :
          "unknown") },
      // Age is a real, already-reliable field (demographics.age) that
      // was never cross-referenced by L07 at all -- spondylolysis is
      // classically an adolescent/young-athlete presentation.
      { label: "Young age (<25) -- typical spondylolysis/-listhesis age range", check: stateOf((lv) => {
          const age = parseInt(lv.demographics.age, 10);
          return Number.isFinite(age) ? age < 25 : "unknown";
        }) },
    ],
    refuting: [
      { label: "Leg pain dominant with dermatomal features (points to L02)", check: stateOf((lv) => lv.location.belowKneePain === true && present(lv.location.dermatomal)) },
      { label: "Flexion aggravates and extension relieves (opposite pattern)", check: stateOf((lv) => lv.aggravating.flexionAggravates && lv.relieving.extensionRelieves) },
      { label: "Any red flag present", check: stateOf((lv) => lv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation (palpate for step deformity)", "Lumbar AROM (extension likely provocative)", "One-Leg Standing (Stork) Lumbar Extension Test", "Neurological screen"],
      recommended: ["Lumbar x-ray (AP, lateral, oblique)", "SPECT/MRI if x-ray negative but suspicion high", "Meyerding grading once imaging confirms a slip", "Hamstring length"],
    },
  },
  {
    id: "L08", name: "Lumbar Muscle Strain",
    supporting: [
      { label: "Acute onset from a load-based mechanism", check: stateOf((lv) => lv.mechanism.acuteLiftingMechanism === true) },
      { label: "No leg neurological symptoms", check: stateOf((lv) => lv.neurological.hasLegNeuro === false) },
      { label: "No dermatomal pattern", check: stateOf((lv) => absent(lv.location.dermatomal)) },
      { label: "No leg pain below knee", check: stateOf((lv) => lv.location.belowKneePain === false) },
    ],
    refuting: [
      { label: "Any positive neurological finding (points to L02)", check: stateOf((lv) => lv.neurological.hasLegNeuro === true || lv.neurological.footDrop || lv.neurological.reflexChanges) },
      { label: "Insidious onset with no load-based mechanism (points to L01)", check: stateOf((lv) => lv.mechanism.acuteLiftingMechanism === false && textIncludes(lv.chiefComplaint.onset, "gradual", "insidious")) },
      { label: "Any red flag present", check: stateOf((lv) => lv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation (muscle spasm/guarding)", "Lumbar AROM (pain on stretch directions)", "Resisted isometric movements", "Neurological screen (expect fully normal)"],
      recommended: ["Palpation (localize strained muscle)", "SLR (expect negative)", "X-ray only if red flags present (not routinely needed)"],
    },
  },
  {
    id: "L09", name: "Lumbar Myofascial Pain",
    lowConfidence: true,
    supporting: [
      { label: "No leg neurological symptoms (approx — not a real myofascial-specific marker, just an absence check)", check: stateOf((lv) => lv.neurological.hasLegNeuro === false) },
    ],
    refuting: [
      { label: "Any red flag present", check: stateOf((lv) => lv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Palpation for taut bands/trigger points reproducing referred pain (unverified against a real source)"],
      recommended: ["Assessment of postural/movement contributors (unverified against a real source)"],
    },
    note: "UNVERIFIED. None of the three uploaded references (Magee, Kendall, Kisner & Colby) cover myofascial pain/trigger points. This condition's checks are placeholders, not grounded clinical logic -- do not weight or trust its output the same as the other ten.",
  },
  {
    id: "L10", name: "Inflammatory Back Pain (Axial Spondyloarthritis Pattern)",
    supporting: [
      { label: "Marked/prolonged morning stiffness", check: stateOf((lv) => textIncludes(lv.symptomBehaviour.morning.value, ">1 hour", "30–60 min")) },
      { label: "Movement limitation in all planes (approx, from overall pattern text)", check: stateOf((lv) => lv.symptomBehaviour.overallPattern.values.some((v) => textIncludes(v, "constant"))) },
      { label: "Inflammatory red-flag category present", check: stateOf((lv) => present(lv.redFlags.inflammatory)) },
      { label: "NSAIDs very effective", check: stateOf((lv) => lv.relieving.nsaidVeryEffective) },
    ],
    refuting: [
      { label: "No morning stiffness pattern", check: stateOf((lv) => textIncludes(lv.symptomBehaviour.morning.value, "no morning symptoms", "pain free on waking")) },
      { label: "Inflammatory red-flag category explicitly screened negative", check: stateOf((lv) => absent(lv.redFlags.inflammatory)) },
    ],
    objectiveTests: {
      required: ["Observation", "Lumbar AROM all planes (document uniform vs. single-plane restriction)", "Peripheral joint screen"],
      recommended: ["ESR/CRP, HLA-B27 referral", "Ophthalmology screen if iritis suspected", "Skin/GI history follow-up (psoriasis/IBD)", "FABER + posterior SIJ provocation (cross-ref L05)"],
    },
  },
  // L11 is intentionally excluded from this array -- see evaluateRedFlagOverride() above.
  // It is not "one more condition to rank," it's a hard override checked first.
];

/**
 * Compute an unweighted, count-based match tier for how many of a
 * condition's supporting/refuting checks are true, false, or unknown.
 * Deliberately NOT a percentage or probability -- see file header.
 */
function evaluateCondition(condition, lv) {
  const supportingResults = condition.supporting.map((c) => ({ label: c.label, result: c.check(lv) }));
  const refutingResults = condition.refuting.map((c) => ({ label: c.label, result: c.check(lv) }));

  const supportingTrue = supportingResults.filter((r) => r.result === true);
  const refutingTrue = refutingResults.filter((r) => r.result === true);
  const unknownCount =
    supportingResults.filter((r) => r.result === "unknown").length +
    refutingResults.filter((r) => r.result === "unknown").length;

  let matchTier;
  if (refutingTrue.length > 0 && refutingTrue.length >= supportingTrue.length) {
    matchTier = "Unlikely";
  } else if (supportingTrue.length === 0) {
    matchTier = "Insufficient data";
  } else if (supportingTrue.length >= Math.ceil(condition.supporting.length * 0.6)) {
    matchTier = "Strong match";
  } else if (supportingTrue.length >= Math.ceil(condition.supporting.length * 0.3)) {
    matchTier = "Possible match";
  } else {
    matchTier = "Weak match";
  }

  return {
    id: condition.id,
    name: condition.name,
    matchTier,
    lowConfidence: !!condition.lowConfidence,
    note: condition.note || null,
    supportingMatched: supportingTrue.map((r) => r.label),
    refutingMatched: refutingTrue.map((r) => r.label),
    unknownCount,
    totalChecks: condition.supporting.length + condition.refuting.length,
    // Total size of THIS condition's own supporting checklist -- exposed
    // so the sort below can break same-tier ties by proportion satisfied
    // rather than raw count. Fix ported from thoracicReasoningEngine.js,
    // where it was found via realistic-patient testing (a 13yo scoliosis
    // screening case ranked a 2-of-3 = 67% match above a 2-of-2 = 100%
    // match purely because both hit the same raw count). The same class
    // of tie was then confirmed here too via a 20-case sweep: a
    // torticollis/muscle-strain case (C06, 4/4 = 100%) was ranking below
    // facet dysfunction (C03, 4/6 = 67%) on the old raw-count tiebreak.
    supportingTotal: condition.supporting.length,
    objectiveTests: condition.objectiveTests,
  };
}

const TIER_ORDER = { "Strong match": 4, "Possible match": 3, "Weak match": 2, "Insufficient data": 1, "Unlikely": 0 };

/**
 * Main entry point. Takes the output of extractLumbarVariablesStructured()
 * (lumbarVariableExtractor.js) and returns:
 *   { redFlagOverride, conditions: [...ranked...] }
 * If redFlagOverride.triggered is true, callers should surface that
 * prominently and treat `conditions` as secondary information, not the
 * headline result -- matching L11's design as a hard override, not one
 * more differential.
 */
function runLumbarReasoningEngine(lv) {
  const redFlagOverride = evaluateRedFlagOverride(lv);
  const conditions = CONDITIONS
    .map((c) => evaluateCondition(c, lv))
    .sort((a, b) => {
      const tierDiff = TIER_ORDER[b.matchTier] - TIER_ORDER[a.matchTier];
      if (tierDiff !== 0) return tierDiff;
      // Primary same-tier ranking stays raw count -- proportion is ONLY
      // a tiebreaker for conditions tied on raw count (see supportingTotal's
      // comment in evaluateCondition() above). Proportion must never be
      // the primary key, or a tiny checklist (e.g. 1/1) could leapfrog a
      // condition with much more raw matched evidence (e.g. 3/4) purely
      // because its denominator is smaller.
      const countDiff = b.supportingMatched.length - a.supportingMatched.length;
      if (countDiff !== 0) return countDiff;
      const aProp = a.supportingTotal > 0 ? a.supportingMatched.length / a.supportingTotal : 0;
      const bProp = b.supportingTotal > 0 ? b.supportingMatched.length / b.supportingTotal : 0;
      if (bProp !== aProp) return bProp - aProp;
      // Still tied on proportion -- fall back to raw count for full
      // determinism (matches the pre-fix behavior in this last-resort case).
      return b.supportingMatched.length - a.supportingMatched.length;
    });

  return { redFlagOverride, conditions };
}

export { runLumbarReasoningEngine, evaluateRedFlagOverride, CONDITIONS };
