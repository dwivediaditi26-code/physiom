// cervicalConditionAssessmentData.js
//
// Per-condition content for the new "AI Objective Assessment" page
// (CervicalConditionObjectiveAssessment.jsx) — a standalone, condition-wise
// clone of the claude.ai artifact prototype, not a rendering of the app's
// existing ROM/MMT/Special Tests/Cyriax/NKT modules.
//
// Every field below is transcribed verbatim from real sources, nothing
// invented:
//   - requiredTests/recommendedTests, and the observation/posture/fma/
//     fascia/outcome one-liners, match cervicalReasoningEngine.js's own
//     CONDITIONS array exactly (that engine already powers the app's real
//     Phase 0.5 differential — this is the same content, just also split
//     into tappable chips for observationChecklist/postureChecklist).
//   - resistedTests/passiveROM narrative, cpaNkt, kineticChain, and
//     functionalScreen prose are transcribed verbatim from
//     /Users/cashify/Documents/PhysiomObjectiveAssessmentReference.pdf,
//     pp.4-9 ("Cervical Spine" section) — the same reference document you
//     pointed me to.
//   - kineticChain.chipOptions and functionalScreen.measure/secondaryChip
//     are STRUCTURED versions of that same verbatim prose, not new content
//     — e.g. C01's chip pair ("Near-normal"/"Extension-restricted") comes
//     directly from its own chainEffect sentence, and C01's Hold-time/"s"
//     input comes directly from that condition's own "(chin-tuck hold,
//     normal 38–40s)" text. C04's structure (Craniovertebral angle in °,
//     Forward Head Posture Absent/Present, the C1/C2-dominant vs
//     lower-cervical-dominant kinetic-chain chips) was confirmed directly
//     against the live artifact; C03/C05/C10 reuse the identical
//     CVA/FHP or C1-C2/lower-cervical structure because their own prose
//     names the same tests (Postural Screen (CVA+FHP) / Cervical Rotation
//     Mobility). Where a condition's prose doesn't name a specific
//     measurable value (C06/C07's "Cervical AROM Screen", C03's capsular
//     pattern), the measure stays a plain fillable text/choice field
//     rather than a fabricated number.
//   - specialTests/palpationZones are extracted from each condition's own
//     required/recommended test strings above; where neither list names a
//     real special test or a specific palpation zone, this is marked
//     "Not specified in condition library" rather than guessed.
//
// C11 (Serious Pathology / Red Flag) is intentionally not in this map —
// same as cervicalReasoningEngine.js, it's a hard override with no module
// cards, handled separately by the component.

// The six standard cervical AROM movements + normal-value hints — same
// anatomy regardless of condition (CYRIAX_REGIONS_DATA.cervical.activeROM
// in sharedClinicalData.js uses the same six movements/normals), so this is
// one shared list, not duplicated per condition.
export const CERVICAL_ROM_MOVEMENTS = [
  { id: "flex", label: "Flexion", normal: 80 },
  { id: "ext", label: "Extension", normal: 70 },
  { id: "latl", label: "Side Flex Left", normal: 45 },
  { id: "latr", label: "Side Flex Right", normal: 45 },
  { id: "rotl", label: "Rotation Left", normal: 80 },
  { id: "rotr", label: "Rotation Right", normal: 80 },
];

// Generic Cyriax/STTT resisted-test option set — same vocabulary the app's
// own CYRIAX_REGIONS_DATA already uses (strong/weak x painful/painless).
export const RESISTED_TEST_OPTIONS = ["Strong + Painless", "Strong + Painful", "Weak + Painless", "Weak + Painful"];
export const PASSIVE_ROM_OPTIONS = ["Near full", "Restricted"];
export const PASSIVE_PATTERN_OPTIONS = ["Non-capsular", "Capsular"];
export const PASSIVE_PAIN_OPTIONS = ["Only at end-range", "Throughout range", "None"];

// Shared measure shape reused by conditions whose own prose names the same
// two real tests — Postural Screen (CVA + FHP) and Cervical Rotation
// Mobility (C1/C2-dominant vs lower-cervical-dominant) — confirmed against
// the live artifact for C04.
const CVA_FHP_MEASURE = { type: "number", label: "Craniovertebral angle", unit: "°", hint: "<50° = FHP driving fault" };
const FHP_CHIP = { label: "Forward Head Posture", options: ["Absent", "Present"] };
const C1C2_VS_LOWER_CHIPS = ["C1/C2 dominant", "Lower cervical dominant"];

export const CERVICAL_CONDITIONS = {
  C01: {
    id: "C01", name: "Mechanical / Non-Specific Neck Pain",
    requiredTests: ["Observation (posture, head position, guarding)", "Cervical AROM all planes", "Neurological screen (expect normal)", "Palpation (soft tissue + segmental)"],
    recommendedTests: ["PA central + unilateral vertebral pressures", "Postural assessment (FHP, upper crossed)", "Functional movement screen", "Cervical MMT — craniocervical flexion"],
    observationChecklist: ["Localised guarding", "No neurological signs"],
    postureChecklist: ["Upper-crossed / forward-head posture"],
    palpationZones: ["Soft tissue", "Segmental (C2–C7 facets)"],
    specialTests: null,
    resistedNarrative: "Resisted flexion/extension/side-flex/rotation all strong & painless (rules out contractile lesion); active/passive ROM near-full, non-capsular, pain only at end-range.",
    cpaNkt: { muscle: "Deep Neck Flexors (DNF)", narrative: "Classic \"Inhibited → SCM/scalenes overactive → forward head\" pattern." },
    kineticChain: {
      testName: "Cervical Flexion/Extension Mobility",
      chipOptions: ["Near-normal", "Extension-restricted"],
      chainEffect: "Expect near-normal; if extension-restricted, screen for a thoracic-stiffness driver before treating the neck in isolation.",
    },
    functionalScreen: {
      testName: "Deep Neck Flexor Endurance (chin-tuck hold)",
      measure: { type: "number", label: "Hold time", unit: "s", hint: "normal 38–40s" },
      note: "The direct functional correlate of the DNF-inhibition CPA finding above.",
    },
    fascia: "Suboccipital & cervical paraspinal fascial tightness",
    outcome: "Neck Disability Index (NDI); PSFS; NPRS",
  },
  C02: {
    id: "C02", name: "Cervical Radiculopathy (Disc Herniation / Nerve Root Compression)",
    requiredTests: ["Observation", "Cervical AROM", "Neurological screen (myotomes, dermatomes, reflexes)", "Spurling's Test", "Cervical Distraction Test"],
    recommendedTests: ["ULTT1 — Median Nerve", "ULTT2 — Radial Nerve", "ULTT3 — Ulnar Nerve", "Jackson's Compression Test"],
    observationChecklist: ["Antalgic head tilt away from side", "Arm guarding"],
    postureChecklist: ["Forward-head posture loading lower cervical"],
    palpationZones: null,
    specialTests: ["Spurling's Test", "Cervical Distraction Test", "ULTT1 — Median Nerve", "ULTT2 — Radial Nerve", "ULTT3 — Ulnar Nerve", "Jackson's Compression Test"],
    resistedNarrative: "Resisted myotome tests (C5–T1, e.g. wrist ext/biceps) may be weak & painless (root, not contractile); passive quadrant position (ext+rotation+side-flex) reproduces arm symptoms.",
    cpaNkt: { muscle: "Scalenes", narrative: "Overactive scalenes can mimic/aggravate arm symptoms via thoracic-outlet overlap — screen before attributing everything to the root." },
    kineticChain: {
      testName: "Cervical Flexion/Extension Mobility",
      chainEffect: "Not a joint-mobility-driven condition (nerve root compression) — kinetic-chain testing is secondary; focus on the neural provocation below instead.",
      notApplicable: true,
    },
    functionalScreen: {
      testName: "ULNT1 (median nerve, C6/C7 bias)",
      measure: { type: "choice", label: "Result", options: ["Negative", "Positive"] },
      note: "Sensitised by cervical lateral flexion away, eased toward — the direct functional correlate of a cervical radicular pattern.",
    },
    fascia: "Neural (median/ulnar/radial) upper-limb tension line",
    outcome: "Neck Disability Index (NDI); PSFS; NPRS",
  },
  C03: {
    id: "C03", name: "Cervical Facet (Zygapophyseal) Joint Dysfunction",
    requiredTests: ["Observation", "Cervical AROM (capsular pattern: side flex + rotation > extension)", "Neurological screen (expect normal)", "Jackson's Compression Test"],
    recommendedTests: ["PA central + unilateral vertebral pressures", "Palpation (segmental)", "Cervical Rotation Lateral Flexion (CRLF)"],
    observationChecklist: ["Localised guarding", "No neurological signs"],
    postureChecklist: ["Upper-crossed / forward-head posture"],
    palpationZones: ["Segmental (C2–C7 facets)"],
    specialTests: ["Jackson's Compression Test", "Cervical Rotation Lateral Flexion (CRLF)"],
    resistedNarrative: "Resisted tests painless (rules out contractile); passive rotation/side-flex reproduce local pain with a capsular end-feel — capsular pattern here is side-flex + rotation limited more than extension.",
    cpaNkt: { muscle: "Suboccipital muscles / Splenius", narrative: "Overactive posterior cervical muscles guarding the facet." },
    kineticChain: {
      testName: "Cervical Rotation Mobility",
      chipOptions: C1C2_VS_LOWER_CHIPS,
      chainEffect: "Expect the \"lower cervical dominant, FRT normal\" pattern (facet/disc-related, not C1/C2); treat co-existing thoracic stiffness first if present.",
    },
    functionalScreen: {
      testName: "Cervical AROM Screen (6-plane)",
      measure: { type: "choice", label: "Capsular pattern reproduced?", options: ["Yes", "No"] },
      note: "Capsular pattern here is side-flex + rotation limited more than extension.",
    },
    fascia: "Suboccipital & cervical paraspinal fascial tightness",
    outcome: "Neck Disability Index (NDI); PSFS; NPRS",
  },
  C04: {
    id: "C04", name: "Cervicogenic Headache",
    requiredTests: ["Observation (head/neck posture)", "Cervical AROM (esp. upper cervical rotation)", "Flexion-Rotation Test (FRT)", "Palpation (C0-C1, C1-C2, suboccipital)"],
    recommendedTests: ["Cervical Distraction Test", "Postural assessment (FHP)", "Cervical MMT — craniocervical flexion"],
    observationChecklist: ["Unilateral suboccipital tenderness", "Restricted C1-2 rotation"],
    postureChecklist: ["Forward-head posture"],
    palpationZones: ["C0–C1", "C1–C2", "Suboccipital"],
    specialTests: ["Flexion-Rotation Test (FRT)", "Cervical Distraction Test"],
    resistedNarrative: "Passive upper-cervical rotation (Flexion-Rotation Test) reproduces headache; resisted extension may reproduce suboccipital pain.",
    cpaNkt: { muscle: "Suboccipital muscles", narrative: "\"Overactive, DNF compensation\" is the documented pattern: base-of-skull headache with restricted C0–C1." },
    kineticChain: {
      testName: "Cervical Rotation Mobility",
      chipOptions: C1C2_VS_LOWER_CHIPS,
      chainEffect: "\"Restricted, C1/C2 dominant\" is explicitly documented as the most common cause of cervicogenic headache in this app's own library.",
    },
    functionalScreen: {
      testName: "Postural Screen (CVA + FHP)",
      measure: CVA_FHP_MEASURE,
      secondaryChip: FHP_CHIP,
      note: "Cross-check the Cervicogenic Dizziness Screen if lightheadedness co-exists.",
    },
    fascia: "Suboccipital fascial restriction / dural tension",
    outcome: "Neck Disability Index (NDI); PSFS; NPRS",
  },
  C05: {
    id: "C05", name: "Whiplash-Associated Disorder (WAD)",
    requiredTests: ["Observation", "Cervical AROM all planes (guarding/quality)", "Neurological screen", "Sharp-Purser Test", "Alar Ligament Test"],
    recommendedTests: ["Palpation", "VBI / 3-Part Test before manipulation", "Outcome measure (NDI)"],
    observationChecklist: ["Diffuse guarding", "Protective stiffness"],
    postureChecklist: ["Protective forward-head / elevated-shoulder posture"],
    palpationZones: ["General cervical palpation — zone not specified in condition library"],
    specialTests: ["Sharp-Purser Test", "Alar Ligament Test", "VBI / 3-Part Test"],
    resistedNarrative: "Resisted tests globally guarded/weak (acute muscle spasm, not a discrete lesion); passive ROM shows a muscle-spasm end-feel in all directions.",
    cpaNkt: { muscle: "Sternocleidomastoid (SCM)", narrative: "\"Bilateral overactive\" acute anterior-neck guarding pattern." },
    kineticChain: {
      testName: "Cervical Flexion/Extension Mobility",
      chipOptions: ["Globally guarded", "Single-segment / single-plane restriction"],
      chainEffect: "Expect a globally guarded pattern rather than a single-segment or single-plane restriction.",
    },
    functionalScreen: {
      testName: "Postural Screen (CVA + FHP)",
      measure: CVA_FHP_MEASURE,
      secondaryChip: FHP_CHIP,
      note: "At baseline — defer Deep Neck Flexor Endurance testing until acute guarding has settled (the hold test is easily confounded by pain in the acute phase).",
    },
    fascia: "Widespread cervical fascial guarding",
    outcome: "Neck Disability Index (NDI); PSFS; NPRS",
  },
  C06: {
    id: "C06", name: "Acute Cervical Muscle Strain / Torticollis",
    requiredTests: ["Observation (spasm/guarding, deformity)", "Cervical AROM (pain on stretch)", "Palpation (localize strain)", "Neurological screen (expect normal)"],
    recommendedTests: ["Resisted isometric movements", "X-ray only if red flags present"],
    observationChecklist: ["Visible muscle spasm", "Head held in rotated/tilted posture"],
    postureChecklist: ["Antalgic lateral tilt / rotation away from painful side"],
    palpationZones: ["Localize strained muscle (SCM / upper trapezius / levator scapulae)"],
    specialTests: null,
    resistedNarrative: "Resisted test in the direction of strain (e.g. side-flex/rotation) strong but painful — classic Cyriax contractile-lesion pattern.",
    cpaNkt: { muscle: "SCM or Scalenes (whichever is in spasm)", narrative: "\"Overactive\" acute-guarding pattern rather than a chronic MCC-inhibition compensation." },
    kineticChain: {
      testName: "Cervical Rotation/Flex-Ext Mobility",
      chipOptions: ["Direction-specific, guarding-limited", "Fixed joint block"],
      chainEffect: "Expect a direction-specific, guarding-limited restriction that improves as the strain settles, not a fixed joint block.",
    },
    functionalScreen: {
      testName: "Cervical AROM Screen",
      measure: { type: "text", label: "Result" },
      note: "Document the guarded, asymmetric pattern at baseline to track recovery of symmetric range.",
    },
    fascia: "SCM / upper trapezius / levator scapulae fascial tension",
    outcome: "NPRS; PSFS; return-to-activity timeline",
  },
  C07: {
    id: "C07", name: "Cervical Spondylosis with Degenerative Stenosis",
    requiredTests: ["Observation", "Cervical AROM (extension likely limited)", "Bilateral neurological screen", "Spurling's Test"],
    recommendedTests: ["Cervical x-ray", "MRI if red flags/progressive signs", "Gait assessment (myelopathic gait)"],
    observationChecklist: ["Guarded multi-level stiffness", "Possible bilateral arm signs"],
    postureChecklist: ["Reduced cervical lordosis, forward-head posture"],
    palpationZones: null,
    specialTests: ["Spurling's Test"],
    resistedNarrative: "Resisted tests painless; passive extension shows a hard/bony end-feel (osteophyte); active ROM globally reduced across levels.",
    cpaNkt: { muscle: "Upper Trapezius", narrative: "\"Overactive, DNF inhibition\" pattern common in chronic multi-level stiffness." },
    kineticChain: {
      testName: "Cervical Flexion/Extension Mobility",
      chipOptions: ["Extension restricted, hard/bony end-feel", "Near-normal"],
      chainEffect: "Extension likely restricted with a hard/bony end-feel across multiple levels; gait screen for a myelopathic pattern before proceeding (cross-reference the red-flag override).",
    },
    functionalScreen: {
      testName: "Cervical AROM Screen",
      measure: { type: "text", label: "Result" },
      note: "With a bilateral neurological/gait check layered on top given the possible multi-level involvement.",
    },
    fascia: "Multi-segmental cervical paraspinal fascial stiffness",
    outcome: "Neck Disability Index (NDI); PSFS; NPRS",
  },
  C08: {
    id: "C08", name: "Brachial Plexus Lesion / Burner-Stinger Syndrome", lowConfidence: true,
    requiredTests: ["Observation", "Neurological screen (document resolution over time)", "Cervical AROM (expect full, non-provocative)"],
    recommendedTests: ["ULTT1 — Median Nerve", "Spurling's Test (distinguish from radiculopathy)"],
    observationChecklist: ["Arm guarding", "Possible deltoid/bicep wasting"],
    postureChecklist: ["Protective elevated-shoulder posture on affected side"],
    palpationZones: null,
    specialTests: ["ULTT1 — Median Nerve", "Spurling's Test"],
    resistedNarrative: "Resisted myotome tests transiently weak in a plexus (not single-root) distribution post-injury; ULTT more informative than a single resisted test.",
    cpaNkt: { muscle: null, narrative: "Not a classic compensation pattern (acute traction neurapraxia) — track resisted myotome strength recovery over time rather than a muscle-pair test." },
    kineticChain: {
      testName: "Kinetic Chain",
      chainEffect: "Not primarily a joint-mobility condition — the plexus is stretched, not a joint restricted; kinetic-chain testing doesn't apply.",
      notApplicable: true,
    },
    functionalScreen: {
      testName: "ULNT1 (median bias)",
      measure: { type: "choice", label: "Result", options: ["Negative", "Positive"] },
      note: "General plexus-tension screen — won't isolate radial/ulnar components of a broader plexus stretch.",
    },
    fascia: "Brachial plexus neural tension line",
    outcome: "NPRS; PSFS; return-to-sport timeline",
  },
  C09: {
    id: "C09", name: "Peripheral Nerve Entrapment (Distal, Non-Radicular)", lowConfidence: true,
    requiredTests: ["Neurological screen (peripheral nerve vs dermatomal charts)", "ULTT1 — Median Nerve", "ULTT2 — Radial Nerve", "ULTT3 — Ulnar Nerve"],
    recommendedTests: ["Tinel's Sign at Wrist", "Tinel's Sign at Elbow", "Cervical AROM (expect non-provocative)"],
    observationChecklist: ["Localised hand/forearm wasting in single nerve distribution"],
    postureChecklist: ["Sustained wrist/elbow posture aggravating entrapment site"],
    palpationZones: null,
    specialTests: ["ULTT1 — Median Nerve", "ULTT2 — Radial Nerve", "ULTT3 — Ulnar Nerve", "Tinel's Sign at Wrist", "Tinel's Sign at Elbow"],
    resistedNarrative: "Resisted test of the specific entrapped nerve's muscle(s) weak & painless (e.g. resisted pronation for median/pronator teres); Tinel's at the entrapment site.",
    cpaNkt: { muscle: "Pronator Teres (upper-limb)", narrative: "\"Overactive, pronator syndrome\" if median; match the specific muscle to the suspected entrapment site." },
    kineticChain: {
      testName: "Kinetic Chain",
      chainEffect: "Not a joint-mobility condition (distal peripheral nerve entrapment) — kinetic-chain reasoning doesn't add to a site-specific entrapment.",
      notApplicable: true,
    },
    functionalScreen: {
      testName: "ULNT1/2/3 (matched to suspected nerve)",
      measure: { type: "choice", label: "Result", options: ["Negative", "Positive"] },
      note: "This app's Cervical FMA only builds in ULNT1 (median); cross-reference Elbow's ULNT2 for radial.",
    },
    fascia: "Peripheral nerve (median/ulnar/radial) fascial interface",
    outcome: "NPRS; PSFS; grip-strength dynamometry",
  },
  C10: {
    id: "C10", name: "Cervical Myofascial Pain", lowConfidence: true,
    requiredTests: ["Palpation — upper trapezius, SCM, levator scapulae (Travell & Simons)", "Palpation — suboccipital, splenius, semispinalis"],
    recommendedTests: ["Palpation — scalene muscles (cross-check vs C02/C08)", "Reproduction of usual pain on sustained trigger-point palpation"],
    observationChecklist: ["Taut bands", "Trigger points (SCM, upper trapezius, levator scapulae)"],
    postureChecklist: ["Sustained-posture loading pattern"],
    palpationZones: ["Upper trapezius", "SCM", "Levator scapulae", "Suboccipital", "Splenius", "Semispinalis", "Scalene muscles (cross-check vs C02/C08)"],
    specialTests: null,
    resistedNarrative: "Resisted tests reproduce the referred pain pattern without true weakness (trigger-point response, not a structural contractile lesion); passive stretch of the muscle reproduces the referral.",
    cpaNkt: { muscle: "Upper Trapezius / Levator Scapulae / SCM", narrative: "The Travell & Simons muscles here — check facilitation/inhibition and compensatory overactivity of all three." },
    kineticChain: {
      testName: "Cervical Flexion/Extension Mobility",
      chipOptions: ["Secondary restriction (muscle bands)", "True joint block"],
      chainEffect: "May show a SECONDARY restriction from taut posterior muscle bands, not a true joint block — distinguish before mobilising the joint itself.",
    },
    functionalScreen: {
      testName: "Postural Screen (CVA + FHP)",
      measure: CVA_FHP_MEASURE,
      secondaryChip: FHP_CHIP,
      note: "Sustained-posture loading is the documented driver of this trigger-point pattern.",
    },
    fascia: "Myofascial trigger point / taut band network",
    outcome: "NPRS; Pressure Pain Threshold (algometry)",
  },
};

export const CERVICAL_CONDITION_ORDER = ["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10"];
