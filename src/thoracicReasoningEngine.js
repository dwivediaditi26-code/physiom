// thoracicReasoningEngine.js
//
// Layer 3 (Reasoning Engine) of the three-layer Thoracic architecture,
// mirroring lumbarReasoningEngine.js / cervicalReasoningEngine.js:
//   Layer 1 (AI Interpreter)  -> aiIntakeParser.js / api/parse.js
//   Layer 2 (Knowledge Base)  -> the condition definitions below, grounded
//                                 in Magee's Orthopedic Physical Assessment,
//                                 Ch.8 "Thoracic (Dorsal) Spine" (pp.566-608)
//   Layer 3 (Reasoning Engine) -> this file
//
// Input: the canonical variable object produced by
// extractThoracicVariablesStructured() (thoracicVariableExtractor.js) --
// NOT raw form data. Output: every T01-T11 condition ranked by an
// UNWEIGHTED, count-based match tier.
//
// Same explicit non-goal as lumbar/cervical: NOT a weighted/scored
// probability engine. Each condition's tier is just:
//   (# supporting checks true) vs (# refuting checks true) vs (# unknown)
// -- transparent and auditable. Every check is commented with its Magee
// source table/section where one exists; checks without a direct table
// reference are marked "approx" (a reasonable proxy given what the
// current tx_* form fields can actually capture, not a literal quote).
//
// NOTABLE DIFFERENCE from Lumbar/Cervical: T09 (Thoracic Myofascial Pain)
// is fully grounded from the start via Magee's own Table 8-8 "Thoracic
// Muscles and Referral of Pain" -- unlike lumbar's L09 or cervical's C10,
// which both started life flagged UNVERIFIED until a dedicated trigger-
// point reference (Travell & Simons) was later uploaded. Thoracic never
// needed that follow-up because Magee's own thoracic chapter already
// covers muscular referred-pain patterns directly.
//
// T11 (Serious Pathology / Red Flag) is NOT scored like the other ten --
// exactly like L11/C11, it's a hard override checked first, grounded in
// Magee's own Table 8-1 "Thoracic Spine and Rib Cage Red Flags" (cardiac,
// respiratory, visceral/GI, renal, cancer, infection, fracture, cord
// compression). Cardiac, respiratory, AND cord-compression categories are
// ALL treated as the highest urgency tier here (unlike lumbar/cervical,
// which only gave ONE category EMERGENCY status) -- Table 8-1 itself lists
// MI, pulmonary embolus, and pneumothorax side-by-side as equally
// immediate-danger presentations, not a single standout category.

// ── Small helpers for reading the extractor's output shape (identical
//    contract to lumbar/cervicalReasoningEngine.js's helpers) ───────────
const present = (field) => field && field.state === "present";
const absent  = (field) => field && field.state === "absent";
const unknown = (field) => !field || field.state === "unknown";

function textIncludes(text, ...needles) {
  const t = String(text || "").toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

// ── T11 red-flag hard override (checked before anything else) ──────────
// Directly from Magee Table 8-1 "Thoracic Spine and Rib Cage Red Flags"
// (p.571) -- cardiac (MI, angina, pericarditis), respiratory (PE,
// pleurisy, pneumothorax, pneumonia), visceral/GI (cholecystitis, peptic
// ulcer), renal (pyelonephritis, nephrolithiasis) -- plus this app's own
// cancer/infection/fracture/cord-compression additions to the same
// single tx_rf screen (see thoracicVariableExtractor.js's file header for
// why this is one combined field rather than four separate ones like
// lumbar/cervical have).
function evaluateRedFlagOverride(tv) {
  const rf = tv.redFlags || {};
  const screen = rf.redFlagScreen;

  if (rf.cardiac || rf.respiratory || rf.cordCompression) {
    const which = [
      rf.cardiac ? "cardiac (possible MI/angina/pericarditis pattern)" : null,
      rf.respiratory ? "respiratory (possible PE/pneumothorax/pneumonia pattern)" : null,
      rf.cordCompression ? "cord compression (bilateral leg weakness/sensory change)" : null,
    ].filter(Boolean).join(" | ");
    return {
      triggered: true,
      urgency: "EMERGENCY",
      reason: "Cardiac, respiratory, and/or cord-compression indicator(s) present: " + which,
      action: "Same-day emergency medical referral. Do not proceed with the routine objective assessment sequence -- these presentations (MI, PE, pneumothorax, spinal cord compression) require immediate medical evaluation, not physiotherapy triage.",
    };
  }
  if (screen === "positive") {
    const which = ["visceral", "oncologic", "infection", "fracture", "generalSerious"]
      .filter((k) => rf[k])
      .join(", ");
    return {
      triggered: true,
      urgency: "URGENT_REFERRAL",
      reason: "Red flag(s) present outside the cardiac/respiratory/cord-compression screen — categories: " + (which || "general serious pathology indicator"),
      action: "Urgent medical/specialist referral before continuing routine physiotherapy assessment.",
    };
  }
  if (screen === "incomplete") {
    return {
      triggered: false,
      urgency: "SCREEN_INCOMPLETE",
      reason: "Red flag screen not fully completed — never asked.",
      action: "Complete the red flag screen before treating results below as reliable.",
    };
  }
  return { triggered: false, urgency: "SCREEN_NEGATIVE", reason: null, action: null };
}

// ── Condition library (T01–T10; T11 is the override above) ─────────────
function stateOf(fn) {
  return (tv) => {
    try { return fn(tv); } catch { return "unknown"; }
  };
}

const CONDITIONS = [
  {
    id: "T01", name: "Thoracic Facet (Zygapophyseal) / Mechanical Dysfunction",
    // Magee p.567-568: capsular pattern "side flexion and rotation
    // equally limited, extension [also limited]." p.570: "Facet
    // syndromes present as stiffness and local pain, which can be
    // referred."
    supporting: [
      { label: "Rotation aggravates (\"most thoracic sensitive to\" — Magee)", check: stateOf((tv) => tv.aggravating.rotationAggravates) },
      { label: "Side bending or extension aggravates (capsular pattern)", check: stateOf((tv) => tv.aggravating.sideBendingAggravates || tv.aggravating.extensionAggravates) },
      { label: "Mechanical pattern (movement/posture related)", check: stateOf((tv) => tv.symptomBehaviour.mechanicalPattern) },
      { label: "Sustained posture aggravates", check: stateOf((tv) => tv.aggravating.sustainedPostureAggravates) },
      { label: "Manipulation gives significant relief", check: stateOf((tv) => tv.relieving.manipulationSignificantRelief) },
    ],
    refuting: [
      { label: "Constant, unaffected-by-movement pattern (points to T11 screen)", check: stateOf((tv) => tv.symptomBehaviour.constantUnaffectedPattern) },
      { label: "Any red flag present", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive") },
      { label: "Cough/sneeze/laugh aggravates strongly (dural tension — points to T02)", check: stateOf((tv) => tv.aggravating.coughSneezeLaughAggravates) },
    ],
    objectiveTests: {
      required: ["Observation (posture, kyphosis)", "Thoracic AROM all planes (note capsular pattern: side flexion + rotation limited more than extension)", "Rib Springing (differentiate from rib dysfunction)", "Neurological screen (expect normal)"],
      recommended: ["PA central + unilateral vertebral pressures", "Functional movement screen"],
    },
  },
  {
    id: "T02", name: "Thoracic Disc Herniation / Nerve Root Pain",
    // Magee p.570: "With thoracic disc lesions... Thoracic root
    // involvement or spondylosis usually causes pain that follows the
    // path of the ribs or a deep, 'through-the-chest' pain." p.572:
    // "Thoracic nerve root pain is often severe and is referred in a
    // sloping band along an intercostal space." p.572: dural pain
    // "accentuated by" coughing/sneezing/straining.
    supporting: [
      { label: "Cough/sneeze/laugh aggravates (dural tension indicator)", check: stateOf((tv) => tv.aggravating.coughSneezeLaughAggravates) },
      { label: "Radiation present, band-like around the chest (approx, from radiation text)", check: stateOf((tv) => present(tv.location.radiation)) },
      { label: "Deep, severe pain quality (approx, from chief complaint quality/onset text)", check: stateOf((tv) => tv.chiefComplaint.quality.some((q) => textIncludes(q, "deep", "severe", "burning")) || textIncludes(tv.chiefComplaint.onset, "deep")) },
    ],
    refuting: [
      { label: "No radiation, local pain only, mechanical pattern", check: stateOf((tv) => absent(tv.location.radiation) && tv.symptomBehaviour.mechanicalPattern) },
      { label: "Any red flag present", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive") },
      { label: "Cardiac-like radiation (points to T11 cardiac screen instead)", check: stateOf((tv) => tv.location.cardiacLikeRadiation === true) },
    ],
    objectiveTests: {
      required: ["Observation", "Thoracic AROM", "First Thoracic Nerve Root Stretch", "Passive Scapular Approximation", "Neurological screen"],
      recommended: ["Slump Test (add trunk rotation for intercostal nerve stress per Butler)"],
    },
  },
  {
    id: "T03", name: "Rib / Costovertebral-Costotransverse Dysfunction",
    // Magee Table 8-5 "Rib Dysfunction" (structural/torsional/
    // respiratory subtypes); Evjenth and Gloeck differentiation
    // maneuver (breath-hold during flexion) to distinguish rib from
    // thoracic-spine-sourced pain (p.585).
    supporting: [
      { label: "Deep breathing (in or out) aggravates", check: stateOf((tv) => tv.aggravating.breathingAggravates) },
      { label: "Cough/sneeze/laugh aggravates (rib/costochondral irritation)", check: stateOf((tv) => tv.aggravating.coughSneezeLaughAggravates) },
      { label: "Post-viral costochondritis history", check: stateOf((tv) => tv.mechanism.postViralCostochondritis) },
      { label: "Costovertebral-pattern location (pain wraps around the chest wall)", check: stateOf((tv) => tv.location.costovertebralLocation) },
      { label: "Traumatic mechanism (direct trauma to rib cage)", check: stateOf((tv) => tv.mechanism.traumaticMechanism) },
    ],
    refuting: [
      { label: "Any red flag present (especially respiratory — must rule out pneumothorax/PE before treating as simple rib dysfunction)", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive") },
      { label: "Constant, unaffected pattern", check: stateOf((tv) => tv.symptomBehaviour.constantUnaffectedPattern) },
    ],
    objectiveTests: {
      required: ["Observation (rib cage symmetry, breathing pattern)", "Rib Springing", "Evjenth and Gloeck breath-hold differentiation test (flex to pain, exhale, re-check range)"],
      recommended: ["Costovertebral expansion measurement (tape at 4th intercostal space; normal 3-7.5cm)", "PA central + unilateral vertebral pressures"],
    },
  },
  {
    id: "T04", name: "Thoracic Outlet Syndrome",
    // Magee p.594: TOS tests boxed as a "key test" category for this
    // chapter (Adson's, Costoclavicular/Military Brace, Cyriax Release,
    // Roos/EAST). CRLF (already implemented in this app under Cervical
    // special tests) is explicitly Magee-described as screening for
    // "first rib elevation restricting cervical rotation/lateral
    // flexion" -- directly relevant to TOS.
    lowConfidence: true,
    supporting: [
      { label: "Reaching overhead aggravates", check: stateOf((tv) => tv.aggravating.overheadReachingAggravates) },
      { label: "Insidious, postural/sustained onset (approx — TOS commonly postural/repetitive-overhead in origin)", check: stateOf((tv) => tv.mechanism.insidiousPosturalOnset) },
      { label: "Interscapular referral (approx — proximal referral pattern overlapping TOS presentations)", check: stateOf((tv) => tv.location.interscapularLocation) },
    ],
    refuting: [
      { label: "Any red flag present", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive") },
      { label: "Cardiac-like radiation (must be differentiated from a cardiac source first)", check: stateOf((tv) => tv.location.cardiacLikeRadiation === true) },
    ],
    objectiveTests: {
      required: ["Observation (posture, first rib position)", "Cervical Rotation Lateral Flexion (CRLF)"],
      recommended: ["Adson's Test", "Costoclavicular (Military Brace) Test", "Roos Test / Elevated Arm Stress Test (EAST)", "Cyriax Release Test"],
    },
    note: "Thinner data coverage than most conditions here -- this app's thoracic intake has no dedicated arm/hand symptom field (unlike the cervical form's cx_arm_* section), so the supporting checks are coarse proxies, not direct captures of the classic TOS symptom picture (arm heaviness/paraesthesia with overhead or sustained postures). Flagged, not hidden, same policy as lumbar L06 / cervical C08.",
  },
  {
    id: "T05", name: "Scheuermann's Disease",
    // Magee p.570 (age 13-16), p.601 (radiographic definition: ≥5°
    // anterior wedging of ≥3 consecutive vertebrae + Schmorl's nodes) --
    // explicitly a radiographic diagnosis, not a special-test one.
    lowConfidence: true,
    supporting: [
      { label: "Adolescent age (13-16 — Magee's own age range for this condition)", check: stateOf((tv) => {
          const age = parseInt(tv.demographics.age, 10);
          return Number.isFinite(age) ? (age >= 13 && age <= 16) : "unknown";
        }) },
      { label: "Insidious, postural onset (no acute trauma)", check: stateOf((tv) => tv.mechanism.insidiousPosturalOnset) },
      { label: "No traumatic mechanism", check: stateOf((tv) => tv.mechanism.traumaticMechanism === false) },
    ],
    refuting: [
      { label: "Any red flag present", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive") },
      { label: "Traumatic mechanism (points to a fracture/acute injury instead)", check: stateOf((tv) => tv.mechanism.traumaticMechanism === true) },
    ],
    objectiveTests: {
      required: ["Observation (postural inspection for a fixed/structural kyphosis — does it correct with active extension?)", "Thoracic AROM (assess flexibility of the kyphotic curve)"],
      recommended: ["Radiographic imaging (≥5° anterior wedging of ≥3 consecutive vertebrae, Schmorl's nodes — Magee p.601)"],
    },
    note: "This is fundamentally a radiographic diagnosis (Magee p.601) -- the subjective/clinical checks here are a coarse screening proxy (age + insidious onset), not a substitute for imaging. Confidence kept low deliberately.",
  },
  {
    id: "T06", name: "Postural Kyphosis (Round Back) / Upper Crossed Pattern",
    // Magee p.574: "round back" as a non-structural, correctable
    // kyphotic presentation, distinct from Scheuermann's fixed
    // structural kyphosis.
    supporting: [
      { label: "Sustained posture aggravates (desk/computer/driving)", check: stateOf((tv) => tv.aggravating.sustainedPostureAggravates) },
      { label: "Mechanical pattern", check: stateOf((tv) => tv.symptomBehaviour.mechanicalPattern) },
      { label: "Postural correction relieves", check: stateOf((tv) => tv.relieving.postureCorrectionHelps) },
      { label: "Insidious, postural onset", check: stateOf((tv) => tv.mechanism.insidiousPosturalOnset) },
    ],
    refuting: [
      { label: "Any red flag present", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive") },
      { label: "Constant, unaffected pattern (a purely postural presentation should vary with posture, not be constant)", check: stateOf((tv) => tv.symptomBehaviour.constantUnaffectedPattern) },
    ],
    objectiveTests: {
      required: ["Observation (postural assessment — is the kyphosis actively correctable? distinguishes from Scheuermann's fixed curve)", "Thoracic AROM"],
      recommended: ["Postural assessment (forward head, upper crossed syndrome)", "Thoracic MMT (lower trapezius, rhomboids, serratus anterior)"],
    },
  },
  {
    id: "T07", name: "Idiopathic Scoliosis",
    // Magee Table 8-3 curve patterns/prognosis; p.582 "skyline view"
    // (Adam's forward bend equivalent) for rib hump detection --
    // fundamentally an observation + imaging diagnosis.
    lowConfidence: true,
    supporting: [
      { label: "Adolescent age + female sex (approx — idiopathic scoliosis' classic demographic per Table 8-3's age/incidence data)", check: stateOf((tv) => {
          const age = parseInt(tv.demographics.age, 10);
          const isAdolescent = Number.isFinite(age) ? (age >= 10 && age <= 18) : "unknown";
          const isFemale = String(tv.demographics.sex || "").toLowerCase().startsWith("f");
          return isAdolescent === "unknown" ? "unknown" : (isAdolescent && isFemale);
        }) },
      { label: "Bilateral paraspinal or asymmetric location description (approx)", check: stateOf((tv) => tv.location.primaryLocation.values.includes("Bilateral paraspinal")) },
    ],
    refuting: [
      { label: "Any red flag present", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive") },
      { label: "Traumatic mechanism (acute injury, not a developmental curve)", check: stateOf((tv) => tv.mechanism.traumaticMechanism === true) },
    ],
    objectiveTests: {
      required: ["Observation (Adam's forward bend / skyline view for rib hump, pelvic obliquity, shoulder height asymmetry)"],
      recommended: ["Scoliometer measurement (>5° = refer)", "Radiographic imaging (Cobb angle, curve classification per Table 8-3)"],
    },
    note: "Primarily an observation + imaging diagnosis (Magee Table 8-3, p.582 skyline view). This app's subjective intake has no dedicated field capturing visible curve/asymmetry, so supporting checks are coarse demographic proxies only -- confidence kept low deliberately, same policy as lumbar L06 / cervical C08/T04.",
  },
  {
    id: "T08", name: "Costochondritis / Tietze Syndrome",
    // Magee Table 8-2 (Musculoskeletal chest pain row: "Costochondritis
    // — sternum and rib margins"); Case study #4 (p.607): "Tietze
    // syndrome versus rib hypomobility."
    supporting: [
      { label: "Post-viral costochondritis history (direct field match)", check: stateOf((tv) => tv.mechanism.postViralCostochondritis) },
      { label: "Deep breathing aggravates", check: stateOf((tv) => tv.aggravating.breathingAggravates) },
      { label: "Cough/sneeze/laugh aggravates", check: stateOf((tv) => tv.aggravating.coughSneezeLaughAggravates) },
      { label: "Anterior/sternal chest wall location", check: stateOf((tv) => tv.location.primaryLocation.values.some((v) => v.startsWith("Anterior chest wall") || v.startsWith("Sternal"))) },
    ],
    refuting: [
      { label: "Cardiac-related red flag present (must be differentiated from a cardiac source — Magee's own explicit differential)", check: stateOf((tv) => tv.redFlags.cardiac === true) },
      { label: "Any other red flag present", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Palpation (costochondral junction tenderness reproduction)", "Observation (localized swelling — visible swelling differentiates Tietze syndrome from simple costochondritis)"],
      recommended: ["Resisted isometric trunk movements (expect non-provocative — helps rule out a contractile/radicular source)"],
    },
    note: "Grounded in Magee Table 8-2 (musculoskeletal chest pain differential) and Case Study 4 (p.607), which explicitly poses Tietze syndrome vs. rib hypomobility as a differential -- the same source that grounds this app's cardiac-differentiation reasoning above.",
  },
  {
    id: "T09", name: "Thoracic Myofascial Pain",
    // Grounded from the start in Magee's own Table 8-8 "Thoracic
    // Muscles and Referral of Pain" (p.596) -- unlike lumbar L09 /
    // cervical C10, which both started as UNVERIFIED placeholders
    // until Travell & Simons was later uploaded. Levator scapulae,
    // latissimus dorsi, rhomboids, trapezius, serratus anterior/
    // posterior, multifidus, and iliocostalis each have a real,
    // book-cited referral pattern in this same chapter.
    supporting: [
      { label: "Interscapular referral (overlaps trapezius/rhomboids referral zone — Table 8-8: 'medial border of scapula')", check: stateOf((tv) => tv.location.interscapularLocation) },
      { label: "Bilateral paraspinal location (overlaps multifidus/iliocostalis referral zone — Table 8-8: 'adjacent to spinal column')", check: stateOf((tv) => tv.location.primaryLocation.values.includes("Bilateral paraspinal")) },
      { label: "Sustained posture aggravates (postural overload of levator scapulae/trapezius/rhomboids)", check: stateOf((tv) => tv.aggravating.sustainedPostureAggravates) },
      { label: "Mechanical pattern", check: stateOf((tv) => tv.symptomBehaviour.mechanicalPattern) },
    ],
    refuting: [
      { label: "Radiation matching a dermatomal/band pattern (points to T02 nerve root instead)", check: stateOf((tv) => present(tv.location.radiation)) },
      { label: "Any red flag present", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Palpation for taut bands/trigger points — trapezius, rhomboids, levator scapulae (Magee Table 8-8: neck-shoulder angle to medial scapula referral)", "Palpation — serratus anterior/posterior, multifidus, iliocostalis (Magee Table 8-8)"],
      recommended: ["Thoracic MMT (assess associated weakness/inhibition — lower trapezius, serratus anterior, rhomboids)"],
    },
    note: "Grounded directly in Magee's own Table 8-8 'Thoracic Muscles and Referral of Pain' (p.596) -- a genuine, book-cited referred-pain-pattern table, not a placeholder. This is the one region where the primary reference itself already covered myofascial referral, so no follow-up source was needed the way Travell & Simons was for lumbar/cervical.",
  },
  {
    id: "T10", name: "Ankylosing Spondylitis / Inflammatory Spondyloarthropathy",
    // Magee Table 8-9 "Differential Diagnosis of Ankylosing Spondylitis
    // and Thoracic Spinal Stenosis" (p.607): morning stiffness, male
    // predominance, special tests "None" (imaging + Forestier's sign
    // are the real differentiators, not an orthopedic special test).
    // Fig 8-11 (p.575): forward head, flattened chest wall, thoracic
    // kyphosis, flattened lumbar lordosis.
    supporting: [
      { label: "Morning stiffness / inflammatory pattern (eases with movement)", check: stateOf((tv) => tv.symptomBehaviour.morningStiffness || tv.symptomBehaviour.inflammatoryPattern) },
      { label: "Male sex (Table 8-9: 'male predominance')", check: stateOf((tv) => String(tv.demographics.sex || "").toLowerCase().startsWith("m") ? true : (tv.demographics.sex ? false : "unknown")) },
      { label: "Insidious onset, no traumatic mechanism", check: stateOf((tv) => tv.mechanism.insidiousPosturalOnset && tv.mechanism.traumaticMechanism === false) },
    ],
    refuting: [
      { label: "Traumatic mechanism (acute injury, not an inflammatory presentation)", check: stateOf((tv) => tv.mechanism.traumaticMechanism === true) },
      { label: "Cord-compression red flag (points to a stenosis/T11 pattern instead — Table 8-9's own differential)", check: stateOf((tv) => tv.redFlags.cordCompression === true) },
      { label: "Any other red flag present", check: stateOf((tv) => tv.redFlags.redFlagScreen === "positive" && !tv.redFlags.cordCompression) },
    ],
    objectiveTests: {
      required: ["Observation (forward head, flattened anterior chest wall, thoracic kyphosis, flattened lumbar lordosis — Magee Fig 8-11)", "Thoracic AROM (expect global/multi-plane restriction, not a single-plane pattern)"],
      recommended: ["Forestier's bowstring sign (ipsilateral paraspinal tightening on side flexion)", "Radiographic imaging ('bamboo spine' — Magee Fig 8-47)"],
    },
    note: "Grounded in Magee Table 8-9 (p.607), which explicitly notes 'Special tests: None' for ankylosing spondylitis itself -- imaging and the morning-stiffness/Forestier's-sign pattern are the real differentiators here, not an orthopedic provocation test.",
  },
  // T11 is intentionally excluded from this array -- see evaluateRedFlagOverride() above.
  // It is not "one more condition to rank," it's a hard override checked first.
];

/**
 * Compute an unweighted, count-based match tier for how many of a
 * condition's supporting/refuting checks are true, false, or unknown.
 * Identical logic to lumbar/cervicalReasoningEngine.js's evaluateCondition().
 */
function evaluateCondition(condition, tv) {
  const supportingResults = condition.supporting.map((c) => ({ label: c.label, result: c.check(tv) }));
  const refutingResults = condition.refuting.map((c) => ({ label: c.label, result: c.check(tv) }));

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
    objectiveTests: condition.objectiveTests,
  };
}

const TIER_ORDER = { "Strong match": 4, "Possible match": 3, "Weak match": 2, "Insufficient data": 1, "Unlikely": 0 };

/**
 * Main entry point. Takes the output of
 * extractThoracicVariablesStructured() (thoracicVariableExtractor.js)
 * and returns:
 *   { redFlagOverride, conditions: [...ranked...] }
 * Identical contract to runLumbarReasoningEngine()/runCervicalReasoningEngine().
 */
function runThoracicReasoningEngine(tv) {
  const redFlagOverride = evaluateRedFlagOverride(tv);
  const conditions = CONDITIONS
    .map((c) => evaluateCondition(c, tv))
    .sort((a, b) => (TIER_ORDER[b.matchTier] - TIER_ORDER[a.matchTier]) || (b.supportingMatched.length - a.supportingMatched.length));

  return { redFlagOverride, conditions };
}

export { runThoracicReasoningEngine, evaluateRedFlagOverride, CONDITIONS };
