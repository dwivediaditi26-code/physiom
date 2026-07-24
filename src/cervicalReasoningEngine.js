// cervicalReasoningEngine.js
//
// Layer 3 (Reasoning Engine) of the three-layer Cervical architecture,
// mirroring lumbarReasoningEngine.js exactly:
//   Layer 1 (AI Interpreter)  -> aiIntakeParser.js / api/parse.js
//   Layer 2 (Knowledge Base)  -> the condition definitions below, grounded
//                                 in Magee's Orthopedic Physical Assessment,
//                                 Ch.3 "Cervical Spine" (pp.163-200)
//   Layer 3 (Reasoning Engine) -> this file
//
// Input: the canonical variable object produced by
// extractCervicalVariablesStructured() (cervicalVariableExtractor.js) --
// NOT raw form data. Output: every C01-C11 condition ranked by an
// UNWEIGHTED, count-based match tier.
//
// Same explicit non-goal as lumbar: NOT a weighted/scored probability
// engine. Each condition's tier is just:
//   (# supporting checks true) vs (# refuting checks true) vs (# unknown)
// -- transparent and auditable. Every check is commented with its Magee
// source table/section where one exists; checks without a direct table
// reference are marked "approx" (a reasonable proxy given what the
// current cx_* form fields can actually capture, not a literal quote).
//
// C11 (Serious Pathology / Red Flag) is NOT scored like the other ten --
// exactly like lumbar's L11, it's a hard override checked first, folding
// in ALL FOUR of Magee Table 3-6's red-flag categories (Fracture/
// Neoplasm/Infection collapsed into "other", Neurologic injury folded
// into myelopathy/instability as appropriate, Cervical myelopathy,
// Upper cervical ligamentous instability, Vertebral artery
// insufficiency, Inflammatory/systemic disease folded into "other") --
// deliberately NOT diluted into a count-based differential the way a
// cord-compression or stroke-risk presentation never should be.

// ── Small helpers for reading the extractor's output shape (identical
//    contract to lumbarReasoningEngine.js's helpers) ────────────────────
const present = (field) => field && field.state === "present";
const absent  = (field) => field && field.state === "absent";
const unknown = (field) => !field || field.state === "unknown";
const isTrue  = (v) => v === true;
const isFalse = (v) => v === false;

function textIncludes(text, ...needles) {
  const t = String(text || "").toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

// ── C11 red-flag hard override (checked before anything else) ──────────
// Directly from Magee Table 3-6 "Warning Signs and Symptoms of Serious
// Cervical Spine Disorders" -- categories: Fracture, Neoplasm, Infection,
// Neurologic injury, Cervical myelopathy, Upper cervical ligamentous
// instability, Vertebral artery insufficiency, Inflammatory/systemic
// disease. The app's own structured red-flag fields already group these
// into four categories (cx_rf_myelopathy, cx_rf_vbi, cx_rf_instability,
// cx_rf_other), read here as redFlags.myelopathy/.vbi/.instability/.other.
//
// Myelopathy and VBI are treated as the highest-urgency tier (progressive
// cord compression / vertebrobasilar stroke risk -- both are the two
// categories Magee's own text singles out as needing same-visit caution,
// e.g. "do not proceed with manipulation/end-range testing"), mirroring
// how lumbar's cauda equina got its own EMERGENCY tier above the other
// red-flag categories rather than being pooled with them.
function evaluateRedFlagOverride(cv) {
  const rf = cv.redFlags || {};
  const myelopathyPositive = present(rf.myelopathy);
  const vbiPositive = present(rf.vbi);
  // Suspected cervical fracture (cx_fracture_screen) is an EMERGENCY-tier
  // stop: manipulation or end-range rotation on an unstable fracture risks
  // catastrophic cord injury. Previously not screened at all (extractor gap).
  const fracturePositive = present(rf.fracture);
  const anyPositive = rf.redFlagScreen === "positive";
  const screenIncomplete = rf.redFlagScreen === "incomplete";

  if (myelopathyPositive || vbiPositive || fracturePositive) {
    const which = [
      myelopathyPositive ? `cervical myelopathy: ${rf.myelopathy.values.join(", ")}` : null,
      vbiPositive ? `vertebrobasilar insufficiency: ${rf.vbi.values.join(", ")}` : null,
      fracturePositive ? `suspected cervical fracture: ${rf.fracture.values.join(", ")}` : null,
    ].filter(Boolean).join(" | ");
    return {
      triggered: true,
      urgency: "EMERGENCY",
      reason: "Cervical myelopathy, vertebrobasilar insufficiency and/or suspected cervical fracture indicator(s) present: " + which,
      action: "Same-day emergency medical referral (immobilise and image if fracture suspected). Do not proceed with cervical manipulation, end-range rotation testing (e.g. VBI test, flexion-rotation test, Spurling's), or the routine objective assessment sequence until cleared.",
    };
  }
  if (anyPositive) {
    const which = ["instability", "other"]
      .filter((k) => present(rf[k]))
      .map((k) => `${k}: ${rf[k].values.join(", ")}`)
      .join(" | ");
    return {
      triggered: true,
      urgency: "URGENT_REFERRAL",
      reason: "Red flag(s) present outside the myelopathy/VBI screen — " + which,
      action: "Urgent medical/specialist referral before continuing routine physiotherapy assessment. Avoid Sharp-Purser and Alar ligament stress testing until instability is explicitly ruled out.",
    };
  }
  if (screenIncomplete) {
    return {
      triggered: false,
      urgency: "SCREEN_INCOMPLETE",
      reason: "Red flag screen not fully completed — some categories never asked.",
      action: "Complete the red flag screen (myelopathy, vertebrobasilar insufficiency, upper cervical instability, other serious pathology) before treating results below as reliable.",
    };
  }
  return { triggered: false, urgency: "SCREEN_NEGATIVE", reason: null, action: null };
}

// ── Condition library (C01–C10; C11 is the override above) ─────────────
function stateOf(fn) {
  return (cv) => {
    try { return fn(cv); } catch { return "unknown"; }
  };
}

const CONDITIONS = [
  {
    id: "C01", name: "Mechanical / Non-Specific Neck Pain",
    supporting: [
      { label: "No arm/hand pain", check: stateOf((cv) => cv.location.armHandPain === false) },
      { label: "No dermatomal pattern", check: stateOf((cv) => absent(cv.location.dermatomal) ? true : unknown(cv.location.dermatomal) ? "unknown" : false) },
      { label: "No objective neurological signs", check: stateOf((cv) => cv.armHand.objectiveNeuroSigns === false) },
      { label: "Symptoms vary with posture/movement (mechanical behaviour)", check: stateOf((cv) => present(cv.aggravating.postures) || present(cv.aggravating.movements)) },
      { label: "Sustained posture aggravates (approx, from movement/posture text)", check: stateOf((cv) => cv.aggravating.sustainedPostureAggravates) },
      // Same bug class this project already fixed once for lumbar L01 --
      // "First episode" itself means NO recurrence, so it must not count
      // as supporting evidence for a recurrent-mechanical pattern.
      { label: "Previous similar episodes", check: stateOf((cv) => !!cv.history.priorEpisodeCount && cv.history.priorEpisodeCount !== "First episode") },
      { label: "Gradual or insidious onset (approx, from onset text)", check: stateOf((cv) => textIncludes(cv.chiefComplaint.onset, "gradual", "insidious", "no clear cause")) },
    ],
    refuting: [
      { label: "Arm/hand pain or dermatomal pattern", check: stateOf((cv) => cv.location.armHandPain === true || cv.location.armHandPain === "bilateral" || present(cv.location.dermatomal)) },
      { label: "Objective neurological signs", check: stateOf((cv) => cv.armHand.objectiveNeuroSigns === true) },
      { label: "Any red flag present", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
      { label: "Constant, unremitting pain", check: stateOf((cv) => cv.symptomBehaviour.constantUnremitting) },
      { label: "Constant night pain", check: stateOf((cv) => cv.symptomBehaviour.constantNightPain) },
      { label: "Whiplash mechanism (points to C05 instead)", check: stateOf((cv) => cv.mechanism.whiplashMechanism === true) },
    ],
    objectiveTests: {
      required: ["Observation (posture, head position, muscle guarding)", "Cervical AROM all planes", "Neurological screen (expect normal)", "Palpation (soft tissue + segmental)"],
      recommended: ["PA central + unilateral vertebral pressures", "Postural assessment (forward head, upper crossed syndrome)", "Functional movement screen", "Cervical MMT (deep cervical flexor test — craniocervical flexion)"],
    },
  },
  {
    id: "C02", name: "Cervical Radiculopathy (Disc Herniation / Nerve Root Compression)",
    // Grounded in Magee Table 3-8 (Differential Diagnosis of Cervical
    // Nerve Root and Brachial Plexus Lesion) and Table 3-11 (Radiculopathy
    // row): dermatomal/myotomal pattern, aggravated by neck movement
    // (esp. extension + rotation toward the involved side = quadrant
    // position, since it closes the intervertebral foramen), often
    // relieved by traction or arm-overhead (Bakody's sign, C4/C5).
    supporting: [
      { label: "Arm/hand pain (unilateral)", check: stateOf((cv) => cv.location.armHandPain === true) },
      { label: "Dermatomal distribution", check: stateOf((cv) => present(cv.location.dermatomal)) },
      { label: "Objective neurological signs (numbness/wasting)", check: stateOf((cv) => cv.armHand.objectiveNeuroSigns === true) },
      { label: "Quadrant position (combined extension + rotation) aggravates -- foraminal closure", check: stateOf((cv) => cv.aggravating.quadrantAggravates) },
      { label: "Extension aggravates", check: stateOf((cv) => cv.aggravating.extensionAggravates) },
      { label: "Cough/sneeze aggravates (dural tension indicator)", check: stateOf((cv) => cv.aggravating.coughSneezeAggravates) },
      { label: "Arm-overhead relieves arm symptoms (Bakody's sign, C4/C5)", check: stateOf((cv) => cv.relieving.armOverheadRelievesArmSymptoms) },
    ],
    refuting: [
      { label: "No arm/hand symptoms, neck pain only", check: stateOf((cv) => cv.location.armHandPain === false) },
      { label: "Bilateral arm signs (points to C11 myelopathy screen instead)", check: stateOf((cv) => cv.location.bilateralArmSigns === true) },
      { label: "Constant, unremitting pain unaffected by movement", check: stateOf((cv) => cv.symptomBehaviour.constantUnremitting) },
      { label: "Any red flag present", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
      { label: "Lhermitte's sign positive (points to C11 myelopathy/cord screen instead)", check: stateOf((cv) => cv.armHand.lhermittePositive === true) },
    ],
    objectiveTests: {
      required: ["Observation", "Cervical AROM", "Neurological screen (myotomes, dermatomes, reflexes)", "Spurling's Test", "Cervical Distraction Test"],
      recommended: ["ULTT1 — Median Nerve", "ULTT2 — Radial Nerve", "ULTT3 — Ulnar Nerve", "Jackson's Compression Test"],
    },
  },
  {
    id: "C03", name: "Cervical Facet (Zygapophyseal) Joint Dysfunction",
    // Fig 3-11 (referred pain patterns by segment) + the general facet
    // capsular pattern Magee gives for the cervical spine: "side flexion
    // and rotation equally limited, extension less limited" -- and
    // localized (non-radicular) pain, unlike C02.
    supporting: [
      { label: "Rotation aggravates", check: stateOf((cv) => cv.aggravating.rotationAggravates) },
      { label: "Extension aggravates (facet loading)", check: stateOf((cv) => cv.aggravating.extensionAggravates) },
      { label: "No arm/hand symptoms", check: stateOf((cv) => cv.location.armHandPain === false) },
      { label: "No dermatomal pattern", check: stateOf((cv) => absent(cv.location.dermatomal)) },
      { label: "No objective neurological signs", check: stateOf((cv) => cv.armHand.objectiveNeuroSigns === false) },
      { label: "Manipulation gives immediate relief (approx, mechanically-responsive joint pattern)", check: stateOf((cv) => cv.relieving.manipulationImmediateRelief) },
    ],
    refuting: [
      { label: "Arm/hand pain or dermatomal (points to C02)", check: stateOf((cv) => cv.location.armHandPain === true || cv.location.armHandPain === "bilateral" || present(cv.location.dermatomal)) },
      { label: "Bilateral arm symptoms with gait/hand-function change (points to C11 myelopathy screen)", check: stateOf((cv) => cv.location.bilateralArmSigns === true) },
      { label: "Any red flag present", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation", "Cervical AROM all planes (note capsular pattern: side flexion + rotation limited more than extension)", "Neurological screen (expect normal)", "Jackson's Compression Test"],
      recommended: ["PA central + unilateral vertebral pressures", "Palpation (segmental)", "Cervical Rotation Lateral Flexion (CRLF)"],
    },
  },
  {
    id: "C04", name: "Cervicogenic Headache",
    // Magee's own "Signs of Headaches Having a Cervical Origin" list:
    // occipital/suboccipital component, triggered by neck movement or
    // sustained posture, abnormal head/neck posture, C0-C1/C1-C2
    // mobility abnormality. Flexion-Rotation Test explicitly described
    // as positive for pain/dysfunction from C1-C2 in cervicogenic
    // headache.
    supporting: [
      { label: "Headache present", check: stateOf((cv) => cv.headache.headachePresent === true) },
      { label: "Occipital / base-of-skull location", check: stateOf((cv) => cv.headache.occipitalHeadache) },
      { label: "Headache triggered by neck movement", check: stateOf((cv) => cv.headache.headacheTriggeredByNeckMovement) },
      { label: "Sustained posture aggravates neck symptoms (approx co-occurring trigger)", check: stateOf((cv) => cv.aggravating.sustainedPostureAggravates) },
      { label: "Chin tuck / cervical retraction relieves", check: stateOf((cv) => cv.relieving.chinTuckRelieves) },
    ],
    refuting: [
      { label: "No headache", check: stateOf((cv) => cv.headache.headachePresent === false) },
      { label: "Meningism feature (neck stiffness + fever) — points to C11 infection screen, not cervicogenic headache", check: stateOf((cv) => cv.headache.meningismFeature) },
      { label: "Any red flag present", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation (head/neck posture)", "Cervical AROM (esp. upper cervical rotation)", "Flexion-Rotation Test (FRT)", "Palpation (C0-C1, C1-C2, suboccipital)"],
      recommended: ["Cervical Distraction Test", "Postural assessment (forward head posture)", "Cervical MMT (deep cervical flexor test — craniocervical flexion)"],
    },
  },
  {
    id: "C05", name: "Whiplash-Associated Disorder (WAD)",
    // Directly grounded in Magee Table 3-7 (Quebec Severity
    // Classification of WAD, Grades 0-4) -- the app's own cx_moi_wad
    // field already implements this grading, read here via wadGradeNum.
    supporting: [
      { label: "Whiplash mechanism (collision/impact)", check: stateOf((cv) => cv.mechanism.whiplashMechanism === true) },
      { label: "Quebec WAD grade recorded (I or higher)", check: stateOf((cv) => Number.isFinite(cv.mechanism.wadGradeNum) && cv.mechanism.wadGradeNum >= 1) },
      { label: "Headache present (common WAD-associated symptom)", check: stateOf((cv) => cv.headache.headachePresent === true) },
      { label: "Sustained posture aggravates", check: stateOf((cv) => cv.aggravating.sustainedPostureAggravates) },
    ],
    refuting: [
      { label: "No clear traumatic/collision mechanism", check: stateOf((cv) => cv.mechanism.whiplashMechanism === false) },
      { label: "WAD Grade 0 (no physical signs)", check: stateOf((cv) => cv.mechanism.wadGradeNum === 0) },
      { label: "Any red flag present (WAD III/IV territory -- neurological signs, points to C11 screen)", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation", "Cervical AROM all planes (note guarding/quality of movement)", "Neurological screen", "Sharp-Purser Test", "Alar Ligament Test"],
      recommended: ["Palpation", "VBI / 3-Part Test before any manipulation is considered", "Outcome measure (Neck Disability Index)"],
    },
    note: "Quebec WAD grading (Table 3-7) already exists as a structured field in this app's own intake form (cx_moi_wad) -- this condition mainly cross-references that existing data rather than adding new capture points.",
  },
  {
    id: "C06", name: "Acute Cervical Muscle Strain / Torticollis",
    supporting: [
      { label: "Acute, sudden onset (approx, from onset text)", check: stateOf((cv) => textIncludes(cv.chiefComplaint.onset, "sudden", "acute", "woke up with")) },
      { label: "No arm/hand neurological symptoms", check: stateOf((cv) => cv.location.armHandPain === false) },
      { label: "No dermatomal pattern", check: stateOf((cv) => absent(cv.location.dermatomal)) },
      { label: "Rotation aggravates (guarding pattern)", check: stateOf((cv) => cv.aggravating.rotationAggravates) },
    ],
    refuting: [
      { label: "Any positive neurological finding (points to C02)", check: stateOf((cv) => cv.location.armHandPain === true || cv.armHand.objectiveNeuroSigns === true) },
      { label: "Insidious onset with no acute trigger (points to C01)", check: stateOf((cv) => textIncludes(cv.chiefComplaint.onset, "gradual", "insidious")) },
      { label: "Any red flag present", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation (muscle spasm/guarding, deformity in torticollis)", "Cervical AROM (pain on stretch directions)", "Palpation (localize strained muscle)", "Neurological screen (expect fully normal)"],
      recommended: ["Resisted isometric movements", "X-ray only if red flags present (not routinely needed)"],
    },
  },
  {
    id: "C07", name: "Cervical Spondylosis with Degenerative Stenosis",
    // Magee Table 3-1 (Differential Diagnosis of Cervical Spondylosis,
    // Spinal Stenosis, and Disc Herniation): older age, insidious onset,
    // often bilateral, extension-provoked, multiple levels, less
    // affected by rest than acute disc herniation.
    supporting: [
      { label: "Older age (approx proxy — Table 3-1 lists spondylosis/stenosis as an older-age presentation vs. disc herniation)", check: stateOf((cv) => {
          const age = parseInt(cv.demographics.age, 10);
          return Number.isFinite(age) ? age >= 50 : "unknown";
        }) },
      { label: "Insidious/gradual onset", check: stateOf((cv) => textIncludes(cv.chiefComplaint.onset, "gradual", "insidious")) },
      { label: "Extension aggravates", check: stateOf((cv) => cv.aggravating.extensionAggravates) },
      { label: "Bilateral arm signs", check: stateOf((cv) => cv.location.bilateralArmSigns === true) },
      { label: "Previous similar episodes / chronic recurrent pattern", check: stateOf((cv) => !!cv.history.priorEpisodeCount && ["4–6 episodes", "More than 6", "Continuous since onset"].includes(cv.history.priorEpisodeCount)) },
    ],
    refuting: [
      { label: "Young age with acute lifting/traumatic mechanism (points to C02/C06 instead)", check: stateOf((cv) => {
          const age = parseInt(cv.demographics.age, 10);
          return Number.isFinite(age) ? age < 35 && cv.mechanism.whiplashMechanism !== true : "unknown";
        }) },
      { label: "Any red flag present (especially myelopathy — bilateral hand clumsiness/gait change should route to C11, not this)", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation", "Cervical AROM (extension likely limited/provocative)", "Bilateral neurological screen", "Spurling's Test"],
      recommended: ["Cervical x-ray (degenerative changes)", "MRI if red flags or progressive signs", "Gait assessment (screen for myelopathic gait before proceeding)"],
    },
  },
  {
    id: "C08", name: "Brachial Plexus Lesion / Burner-Stinger Syndrome",
    // Magee Table 3-8 / 3-11 differential category: transient
    // burning/electric pain into the arm following a traction or
    // compression mechanism (often sport-related, e.g. shoulder forced
    // down while head forced away, or head/neck compressed toward the
    // shoulder), typically resolving faster than a true radiculopathy
    // and not tied to a single cervical movement direction the way a
    // foraminal/facet pattern is.
    lowConfidence: true,
    supporting: [
      { label: "Arm/hand pain present", check: stateOf((cv) => cv.location.armHandPain === true) },
      { label: "Sport/traction-type mechanism (approx, from onset/mechanism text)", check: stateOf((cv) => textIncludes(cv.chiefComplaint.onset, "sport", "tackle", "collision", "fall") || cv.mechanism.type.values.some((v) => textIncludes(v, "sport"))) },
      { label: "No clear single cervical movement direction reproduces it (approx — absence of a dominant quadrant/extension/rotation aggravator)", check: stateOf((cv) => cv.aggravating.quadrantAggravates === false && cv.aggravating.extensionAggravates === false && cv.aggravating.rotationAggravates === false ? true : "unknown") },
    ],
    refuting: [
      { label: "Chronic/insidious onset (points to C02/C07 instead)", check: stateOf((cv) => textIncludes(cv.chiefComplaint.onset, "gradual", "insidious")) },
      { label: "Any red flag present", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Observation", "Neurological screen (myotomes, dermatomes, reflexes — document resolution over time)", "Cervical AROM (expect full, non-provocative)"],
      recommended: ["ULTT1 — Median Nerve", "Spurling's Test (to help distinguish from a true nerve-root lesion)"],
    },
    note: "Thinner data coverage than most conditions here -- the current form has no dedicated traction/compression-mechanism or transient-burning-quality field, so the mechanism and single-direction checks are approximations, not direct captures. Flagged, not hidden, same policy as lumbar L06.",
  },
  {
    id: "C09", name: "Peripheral Nerve Entrapment (Distal, Non-Radicular)",
    // Magee Table 3-11's "Peripheral Nerve" differential row: sensory/
    // motor changes confined to a single peripheral nerve's distribution
    // (not a dermatome/myotome), typically NOT reproduced or aggravated
    // by cervical movement -- the key distinguishing feature from C02.
    // Cross-referenced against C Rex, "Examination of Peripheral Nerves
    // and Brachial Plexus" (Ch.9): names real distal entrapment
    // syndromes that mimic a cervical presentation -- posterior
    // interosseous nerve syndrome / radial tunnel syndrome (radial
    // nerve), pronator syndrome (median nerve), Guyon's canal /
    // hypothenar hammer syndrome (ulnar nerve) -- each confined to a
    // single peripheral nerve's territory, not a dermatome, and each
    // with its own named provocation test distinct from Spurling's/ULTT.
    // Tinel's sign (percussion over the nerve, positive = distal
    // tingling in that nerve's distribution) is the one provocation
    // test common to all three and the one this app has a real,
    // dedicated module for (st_tinel_wrist, st_tinel_elbow).
    lowConfidence: true,
    supporting: [
      { label: "Arm/hand symptoms present but NOT dermatomal", check: stateOf((cv) => (cv.location.armHandPain === true || cv.location.armHandPain === "bilateral") && absent(cv.location.dermatomal)) },
      { label: "No cervical movement clearly aggravates the arm symptoms (approx)", check: stateOf((cv) => cv.aggravating.quadrantAggravates === false && cv.aggravating.extensionAggravates === false ? true : "unknown") },
    ],
    refuting: [
      { label: "Dermatomal pattern present (points to C02)", check: stateOf((cv) => present(cv.location.dermatomal)) },
      { label: "Quadrant or extension position clearly aggravates (points to C02/C03)", check: stateOf((cv) => cv.aggravating.quadrantAggravates === true || cv.aggravating.extensionAggravates === true) },
      { label: "Any red flag present", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Neurological screen (map symptoms against peripheral nerve vs. dermatomal charts)", "ULTT1 — Median Nerve", "ULTT2 — Radial Nerve", "ULTT3 — Ulnar Nerve"],
      recommended: ["Tinel's Sign at Wrist", "Tinel's Sign at Elbow", "Cervical AROM (expect non-provocative, to help rule out C02)"],
    },
    note: "The named distal entrapment syndromes (radial tunnel, pronator syndrome, Guyon's canal, etc.) are grounded in C Rex's Ch.9 'Examination of Peripheral Nerves and Brachial Plexus' -- but this app's checks are still a coarse location-overlap proxy (no dedicated single-nerve-distribution mapping field), so treat the matchTier here as lower-confidence than the better-grounded conditions above.",
  },
  {
    id: "C10", name: "Cervical Myofascial Pain",
    // Grounded in Travell & Simons' published Trigger Point referred-pain
    // -pattern chart (figure-cited quick reference, e.g. [V1Fig6.1],
    // [V1Fig7.1], [V1Fig16.1]) for the head/neck muscle group:
    // - Upper trapezius, sternocleidomastoid (sternal + clavicular
    //   divisions) refer pain into the head/temple/face -- overlaps
    //   common headache presentations.
    // - Splenius capitis, splenius cervicis, semispinalis capitis,
    //   semispinalis cervicis, and the suboccipital muscles all refer
    //   pain into the head (vertex, orbit, occiput) -- the classic
    //   cervicogenic-headache-mimicking muscle group.
    // - Levator scapulae refers into the neck-shoulder angle, a
    //   textbook "stiff neck" presentation often mistaken for facet
    //   pain (C03).
    // - Scaleni (anterior/medius/posterior) refer into the arm/chest --
    //   can mimic radiculopathy (C02) or brachial plexus involvement
    //   (C08); explicitly cross-checked against those below.
    // - Cervical multifidi/rotatores TrP1, deep at C4-C5, is explicitly
    //   noted as the posterior cervical trigger point "most commonly
    //   found" and one that "often leads to entrapment of the greater
    //   occipital nerve" -- a direct mechanistic link to occipital
    //   headache.
    // Standard trigger point diagnostic criteria (taut band, local
    // twitch response, jump sign) are NOT covered in the uploaded
    // chart excerpt (it only covers referred-pain locations per
    // muscle), so this remains a location-overlap proxy, not a
    // replication of a real palpation-based trigger point exam --
    // kept as lowConfidence for that reason, not because the source is
    // unverified any more.
    lowConfidence: true,
    supporting: [
      { label: "Occipital / base-of-skull headache (overlaps suboccipital, splenius capitis, semispinalis capitis referred-pain zones — Travell & Simons)", check: stateOf((cv) => cv.headache.occipitalHeadache) },
      { label: "Headache triggered by neck movement (overlaps SCM / upper trapezius referred-pain zones — Travell & Simons)", check: stateOf((cv) => cv.headache.headacheTriggeredByNeckMovement) },
      { label: "Sustained posture aggravates (approx — consistent with postural overload of trapezius/levator scapulae/SCM, though the referred-pain chart itself doesn't state aggravating factors)", check: stateOf((cv) => cv.aggravating.sustainedPostureAggravates) },
      { label: "No objective neurological signs (trigger point referral doesn't produce a true neuro deficit)", check: stateOf((cv) => cv.armHand.objectiveNeuroSigns === false) },
      { label: "No dermatomal pattern (trigger point referral doesn't follow a dermatome)", check: stateOf((cv) => absent(cv.location.dermatomal)) },
    ],
    refuting: [
      { label: "Objective neurological signs present (points to C02/C11 instead)", check: stateOf((cv) => cv.armHand.objectiveNeuroSigns === true) },
      { label: "Dermatomal pattern present (points to C02)", check: stateOf((cv) => present(cv.location.dermatomal)) },
      { label: "Any red flag present", check: stateOf((cv) => cv.redFlags.redFlagScreen === "positive") },
    ],
    objectiveTests: {
      required: ["Palpation for taut bands/trigger points — upper trapezius, sternocleidomastoid, levator scapulae (Travell & Simons)", "Palpation — suboccipital, splenius capitis/cervicis, semispinalis capitis/cervicis (referred pain to head/vertex/orbit — Travell & Simons)"],
      recommended: ["Palpation — scalene muscles (refer pain into arm/chest; cross-check against C02/C08 before attributing arm symptoms to a nerve root)", "Reproduction of the patient's usual headache/neck pain on sustained trigger-point palpation"],
    },
    note: "Grounded in Travell & Simons' Trigger Point referred-pain-pattern chart -- real, figure-cited muscle-by-muscle referred pain zones, including the specific finding that a cervical multifidi/rotatores trigger point at C4-C5 often causes entrapment of the greater occipital nerve. Standard diagnostic criteria (taut band, local twitch response, jump sign) are not covered in the uploaded excerpt, so this stays a location-overlap-based match rather than a full trigger-point exam replication -- do not weight it identically to the fully-grounded conditions above.",
  },
  // C11 is intentionally excluded from this array -- see evaluateRedFlagOverride() above.
  // It is not "one more condition to rank," it's a hard override checked first.
];

/**
 * Compute an unweighted, count-based match tier for how many of a
 * condition's supporting/refuting checks are true, false, or unknown.
 * Identical logic to lumbarReasoningEngine.js's evaluateCondition().
 */
function evaluateCondition(condition, cv) {
  const supportingResults = condition.supporting.map((c) => ({ label: c.label, result: c.check(cv) }));
  const refutingResults = condition.refuting.map((c) => ({ label: c.label, result: c.check(cv) }));

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
 * Main entry point. Takes the output of
 * extractCervicalVariablesStructured() (cervicalVariableExtractor.js)
 * and returns:
 *   { redFlagOverride, conditions: [...ranked...] }
 * If redFlagOverride.triggered is true, callers should surface that
 * prominently and treat `conditions` as secondary information, not the
 * headline result -- matching C11's design as a hard override, not one
 * more differential. Identical contract to runLumbarReasoningEngine().
 */
function runCervicalReasoningEngine(cv) {
  const redFlagOverride = evaluateRedFlagOverride(cv);
  const conditions = CONDITIONS
    .map((c) => evaluateCondition(c, cv))
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

export { runCervicalReasoningEngine, evaluateRedFlagOverride, CONDITIONS };
