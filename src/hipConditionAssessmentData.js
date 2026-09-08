// hipConditionAssessmentData.js
//
// Per-condition content for the "AI Objective Assessment" page, Hip/Groin
// region — same standalone, condition-wise pattern as
// cervicalConditionAssessmentData.js. Sourced from two real, verified
// places, nothing invented:
//   - keyExams and the observation/posture/functionalScreen/fascia/outcome
//     one-liners come straight from src/reasoningEngine/regions/hip.evidence.json
//     (the same real evidence file hip.evidence.json — orthoHipReasoning.js
//     already reads this to power the app's real Hip differential).
//   - resistedNarrative, cpaNkt, kineticChain.chainEffect, and
//     functionalScreen prose are transcribed verbatim from
//     /Users/cashify/Documents/PhysiomObjectiveAssessmentReference.pdf,
//     pp.20-22 ("Hip / Groin" section) — cross-checked against the JSON's
//     own conditionLayers and matching word-for-word.
//   - observationChecklist/postureChecklist are the same conditionLayers
//     one-liners split into tappable chips.
//   - kineticChain.chipOptions use a generic Normal/Restricted pair (or
//     notApplicable when the condition's own text says its kinetic-chain
//     test doesn't isolate this movement) rather than inventing bespoke
//     wording per condition — the chainEffect text carries the full real
//     nuance regardless of which chip is tapped.
//   - functionalScreen.measure defaults to a free-text Result field, since
//     none of Hip's functional-screen prose names a specific numeric
//     threshold the way some Cervical conditions do (e.g. "normal 38–40s").
//   - Condition ids (HP01..HP07) match orthoHipReasoning.js's own
//     FIXED_ID_BY_NAME generation (hip.evidence.json diagnoses order), so
//     the front-door ranking from runHipDifferential() lines up exactly.

// Real Hip AROM movements + normal-value hints — same ids/normals
// orthoHipReasoning.js's own ROM_IDS and the app's real ROM module use
// (sharedClinicalData.js / PatientDatabase.jsx's ROM lookup), not invented.
export const HIP_ROM_MOVEMENTS = [
  { id: "hflex", label: "Flexion", normal: 120 },
  { id: "hext", label: "Extension", normal: 20 },
  { id: "habd", label: "Abduction", normal: 45 },
  { id: "hadd", label: "Adduction", normal: 30 },
  { id: "her", label: "External Rotation", normal: 45 },
  { id: "hir", label: "Internal Rotation", normal: 45 },
];

export const HIP_CONDITIONS = {
  HP01: {
    id: "HP01", name: "Femoroacetabular Impingement (FAI) / Acetabular Labral Tear",
    keyExams: ["FADIR test", "Hip Scour test"],
    observationChecklist: ["C-sign grip over groin", "Antalgic gait"],
    postureChecklist: ["Reduced hip IR posture"],
    palpationZones: null,
    resistedTestName: "Resisted Hip Movements",
    resistedNarrative: "Passive Flexion + overpressure with FADIR (adduction + IR at end-flexion) reproduces groin pain/click — the Cyriax-style passive provocation; resisted tests are usually normal (labral, not contractile).",
    cpaNkt: { muscle: "Iliopsoas / Gluteus Maximus", narrative: "Iliopsoas often overactive/tight anteriorly with Gluteus Maximus inhibited posteriorly — the Hip Extension Firing Order for a glute-dominant pattern." },
    kineticChain: {
      testName: "Hip Internal Rotation Mobility",
      chipOptions: ["Moderately restricted (20–29°)", "Not restricted"],
      chainEffect: "Explicitly documented: \"moderately restricted (20–29°)... FAI... FADIR test likely positive.\"",
    },
    functionalScreen: {
      testName: "Seated Hip Rotation",
      measure: { type: "text", label: "Result" },
      note: "The named functional test for exactly this pattern — FAI + capsular screen.",
    },
    fascia: "Anterior hip capsule / adductor fascia",
    outcome: "iHOT-33; HOOS",
  },
  HP02: {
    id: "HP02", name: "Hip Osteoarthritis",
    keyExams: ["Passive hip ROM with end-feel (capsular pattern)", "Hip Scour test"],
    observationChecklist: ["Reduced stride", "Gluteal/quad wasting", "Antalgic gait"],
    postureChecklist: ["Fixed-flexion / externally-rotated posture"],
    palpationZones: null,
    resistedTestName: "Resisted Hip Movements",
    resistedNarrative: "Passive IR most restricted (capsular pattern IR=Flexion=Abduction) with a hard/bony end-feel; resisted tests generally painless (non-contractile).",
    cpaNkt: { muscle: "Glute Max / Glute Med", narrative: "Glute Max AND Glute Med typically both inhibited from disuse/pain — check the Hip Extension Firing Order (often QL or hamstring-dominant)." },
    kineticChain: {
      testName: "Hip Internal Rotation Mobility",
      chipOptions: ["Severely restricted (<20°)", "Not restricted"],
      chainEffect: "Severely restricted, often <20° with significant asymmetry, matching the capsular-pattern IR loss above.",
    },
    functionalScreen: {
      testName: "Seated Hip Rotation",
      measure: { type: "text", label: "Result" },
      note: "Same test as FAI, but expect bilateral, more severe restriction with a hard/bony end-feel.",
    },
    fascia: "Global hip capsular fascial restriction",
    outcome: "Oxford Hip Score; HOOS; HAGOS (groin); iHOT-33 (young/sport)",
  },
  HP03: {
    id: "HP03", name: "Greater Trochanteric Pain Syndrome (Gluteal Tendinopathy)",
    keyExams: ["Resisted hip abduction (MMT)", "Trendelenburg test", "Ober's test"],
    observationChecklist: ["Tender over greater trochanter", "Trendelenburg"],
    postureChecklist: ["Hip-drop / adducted stance (compensating glute med)"],
    palpationZones: ["Greater trochanter"],
    resistedTestName: "Resisted Hip Abduction",
    resistedNarrative: "Resisted Abduction (glute med/TFL) strong but painful at the trochanter — classic contractile-lesion pattern; passive adduction (Ober-type stretch) also reproduces lateral pain.",
    cpaNkt: { muscle: "Gluteus Medius", narrative: "\"Inhibited, TFL dominant\" is the textbook GTPS driver — confirm via therapy localization: touch TFL, retest glute med." },
    kineticChain: {
      testName: "Hip Abduction Mobility & Stability (Trendelenburg + Ober's)",
      chipOptions: ["Restricted / positive", "Normal / negative"],
      chainEffect: "The direct match for lateral hip pathology, documenting both the mobility restriction and the stability deficit.",
    },
    functionalScreen: {
      testName: "Single Leg Squat + Lateral Step Down",
      measure: { type: "text", label: "Result" },
      note: "Both are the app's named functional tests for this exact pattern — glute med/dynamic valgus (squat) and eccentric glute med (step down).",
    },
    fascia: "Lateral line (ITB/TFL) tension",
    outcome: "VISA-G; Oxford Hip Score",
  },
  HP04: {
    id: "HP04", name: "Proximal Hamstring Tendinopathy",
    keyExams: ["Resisted hip extension / knee flexion (MMT)", "Palpation of ischial tuberosity"],
    observationChecklist: ["Ischial tuberosity tenderness"],
    postureChecklist: ["Posterior pelvic-tilt sitting avoidance"],
    palpationZones: ["Ischial tuberosity"],
    resistedTestName: "Resisted Hip Extension",
    resistedNarrative: "Resisted Hip Extension (knee extended, adding hamstring) strong but painful at the ischium — classic contractile pattern; passive hip flexion with knee extended also reproduces pain.",
    cpaNkt: { muscle: "Gluteus Maximus", narrative: "\"Inhibited, hamstring dominant\" is the classic driver: hamstrings become the primary hip extensor and get overloaded." },
    kineticChain: {
      testName: "Hip Extension Mobility (Thomas Test)",
      chipOptions: ["Restricted (Thomas Test positive)", "Normal (Thomas Test negative)"],
      chainEffect: "Posterior-chain context, but the Prone Hip Extension FMA test below is the more direct diagnostic tool for this condition.",
    },
    functionalScreen: {
      testName: "Prone Hip Extension (glute max firing pattern, Janda)",
      measure: { type: "text", label: "Result" },
      note: "Palpate glute max vs hamstring; hamstring firing first/dominating is the direct functional correlate of this condition.",
    },
    fascia: "Posterior-chain (hamstring–sacrotuberous) fascia",
    outcome: "Oxford Hip Score; HOOS; HAGOS (groin); iHOT-33 (young/sport)",
  },
  HP05: {
    id: "HP05", name: "Adductor-Related Groin Pain (Adductor Strain / Athletic Pubalgia)",
    keyExams: ["Resisted hip adduction (MMT)", "Palpation of adductor origin / pubic ramus"],
    observationChecklist: ["Adductor-origin tenderness", "± swelling"],
    postureChecklist: ["Pelvic instability posture"],
    palpationZones: ["Adductor origin / pubic ramus"],
    resistedTestName: "Resisted Hip Adduction (Squeeze Test)",
    resistedNarrative: "Resisted Adduction strong but painful at the pubic origin (the \"squeeze test\" is this same resisted test); passive abduction (stretch) also reproduces groin pain.",
    cpaNkt: { muscle: "Adductors", narrative: "\"Overactive, medial chain\" typically compensating for an inhibited Glute Max — check the Hip Extension Firing Order." },
    kineticChain: {
      testName: "Kinetic Chain",
      notApplicable: true,
      chainEffect: "No hip kinetic-chain test in this app's library isolates pure adduction (IR/ER/extension/abduction are covered, not adduction specifically) — rely on the resisted/CPA findings above.",
    },
    functionalScreen: {
      testName: "Hip Hinge Pattern / Single Leg Squat",
      measure: { type: "text", label: "Result" },
      note: "A posterior-chain/pelvic-control screen, or Single Leg Squat to surface compensatory patterns during loaded groin activity.",
    },
    fascia: "Adductor / deep-front-line fascia",
    outcome: "HAGOS (groin); Oxford Hip Score",
  },
  HP06: {
    id: "HP06", name: "Piriformis Syndrome / Deep Gluteal Syndrome",
    keyExams: ["Piriformis (FAIR) test"],
    observationChecklist: ["Deep buttock tenderness", "± sciatic signs"],
    postureChecklist: ["Externally-rotated resting hip"],
    palpationZones: ["Deep buttock (piriformis)"],
    resistedTestName: "Resisted Hip External Rotation",
    resistedNarrative: "Resisted ER (piriformis) reproduces deep buttock pain; the FAIR test (passive hip flexion + adduction + IR) is the key provocation.",
    cpaNkt: { muscle: "Piriformis", narrative: "\"Overactive, glute med compensation\" (or glute max) is the exact documented pattern; always check Glute Med/Glute Max facilitation before treating piriformis alone." },
    kineticChain: {
      testName: "Hip External Rotation Mobility",
      chipOptions: ["Restricted, deep buttock pain (piriformis syndrome)", "Not restricted"],
      chainEffect: "Explicitly documented: \"restricted + deep buttock pain (piriformis syndrome)... FAIR test likely positive.\"",
    },
    functionalScreen: {
      testName: "Seated Hip Rotation (IR/ER range screen)",
      measure: { type: "text", label: "Result" },
      note: "Cross-referenced against the FAIR-test finding above.",
    },
    fascia: "Deep gluteal fascial compartment; sciatic neural bias",
    outcome: "Oxford Hip Score; HOOS; HAGOS (groin); iHOT-33 (young/sport)",
  },
  HP07: {
    id: "HP07", name: "Snapping Hip Syndrome (Coxa Saltans, Internal or External)",
    keyExams: ["Dynamic snapping hip test (observe/palpate active flexion-extension)"],
    observationChecklist: ["Visible/audible snap with movement"],
    postureChecklist: ["ITB-tight or hip-flexor-tight posture"],
    palpationZones: null,
    resistedTestName: "Resisted Hip Flexion / Abduction (type-dependent)",
    resistedNarrative: "Resisted hip flexion (internal/iliopsoas type) or resisted abduction (external/ITB type) may reproduce the snap, mostly a dynamic/observational test rather than a static resisted one.",
    cpaNkt: { muscle: "Iliopsoas or TFL", narrative: "Internal type: Iliopsoas overactive/tight. External type: TFL — \"Overactive, IT band syndrome\" pattern; check Glute Med facilitation in both." },
    kineticChain: {
      testName: "Hip Abduction Mobility (external/TFL) or Hip Extension Mobility / Thomas Test (internal/iliopsoas)",
      chipOptions: ["Normal / Not restricted", "Restricted"],
      chainEffect: "Select per the suspected snapping structure — external/TFL type uses Hip Abduction Mobility, internal/iliopsoas type uses Hip Extension Mobility/Thomas Test.",
    },
    functionalScreen: {
      testName: "Single Leg Squat / Hip Hinge Pattern",
      measure: { type: "text", label: "Result" },
      note: "Observing the dynamic snap during a loaded functional movement is more revealing than any static positional test for this condition.",
    },
    fascia: "Lateral line (external) or iliopsoas (internal) fascia",
    outcome: "Oxford Hip Score; HOOS; HAGOS (groin); iHOT-33 (young/sport)",
  },
};

export const HIP_CONDITION_ORDER = ["HP01", "HP02", "HP03", "HP04", "HP05", "HP06", "HP07"];
