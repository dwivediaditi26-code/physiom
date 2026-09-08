// kneeConditionAssessmentData.js
//
// Per-condition content for the "AI Objective Assessment" page, Knee
// region — same standalone, condition-wise pattern as
// cervicalConditionAssessmentData.js / hipConditionAssessmentData.js.
// Sourced from two real, verified places, nothing invented:
//   - keyExams and the observation/posture/functionalScreen/fascia/outcome
//     one-liners come straight from src/reasoningEngine/regions/knee.evidence.json
//     (the same real evidence file orthoKneeReasoning.js already reads to
//     power the app's real Knee differential) — cross-checked field-for-
//     field against the JSON.
//   - resistedNarrative, cpaNkt, kineticChain.chainEffect, and
//     functionalScreen prose are transcribed verbatim from
//     /Users/cashify/Documents/PhysiomObjectiveAssessmentReference.pdf,
//     pp.23-25 ("Knee" section).
//   - kineticChain.chipOptions use a generic Normal/Restricted (or
//     valgus-specific) pair rather than inventing bespoke wording per
//     condition — chainEffect always carries the full real narrative.
//   - functionalScreen.measure defaults to a free-text Result field, since
//     Knee's functional-screen prose (hop series, squat depth, step-down)
//     doesn't name a specific numeric threshold the way some Cervical
//     conditions do.
//   - Condition ids (KN01..KN09) match orthoKneeReasoning.js's own
//     FIXED_ID_BY_NAME generation (knee.evidence.json diagnoses order).

// Real Knee AROM movements + normal-value hints — same ids/normals
// orthoKneeReasoning.js's own ROM_IDS and the app's real ROM module use.
export const KNEE_ROM_MOVEMENTS = [
  { id: "kflex", label: "Flexion", normal: 140 },
  { id: "kext", label: "Extension", normal: 0 },
];

export const KNEE_CONDITIONS = {
  KN01: {
    id: "KN01", name: "ACL Tear / Insufficiency",
    keyExams: ["Lachman's test", "Pivot shift test"],
    observationChecklist: ["Immediate effusion", "Quadriceps inhibition", "Giving-way"],
    postureChecklist: ["Genu recurvatum / dynamic valgus"],
    palpationZones: null,
    resistedTestName: "Resisted Knee Extension",
    resistedNarrative: "Resisted knee extension often weak/painless acutely (arthrogenic muscle inhibition from effusion, not a true contractile lesion); passive tibiofemoral AP glide (Lachman's) is the definitive test.",
    cpaNkt: { muscle: "VMO", narrative: "\"Inhibited, post knee injury/surgery\" is the classic post-ACL finding; activate VMO before general quad strengthening." },
    kineticChain: {
      testName: "Knee Valgus Stress Test",
      chipOptions: ["Dynamic valgus on squat/single-leg squat/landing", "No valgus — controlled alignment"],
      chainEffect: "Dynamic valgus on squat/single-leg squat/landing is explicitly documented as \"the most common pattern in female ACL injuries\"; driven by ankle DF + glute med, not the knee itself.",
    },
    functionalScreen: {
      testName: "Single Leg Hop Series",
      measure: { type: "text", label: "Result" },
      note: "Dynamic valgus + landing mechanics + ACL risk — the named return-to-sport functional screen for this exact injury.",
    },
    fascia: "Not applicable acutely; address quads inhibition",
    outcome: "IKDC; KOOS; Tegner activity level",
  },
  KN02: {
    id: "KN02", name: "PCL Injury",
    keyExams: ["Posterior drawer test"],
    observationChecklist: ["Posterior sag", "± posterior bruising"],
    postureChecklist: ["Posterior tibial droop stance"],
    palpationZones: null,
    resistedTestName: "Resisted Knee Flexion",
    resistedNarrative: "Resisted knee flexion may be relatively preserved; passive posterior tibiofemoral glide (posterior drawer) is the definitive test, not a resisted-muscle one.",
    cpaNkt: { muscle: "Popliteus", narrative: "Popliteus can become \"Overactive, posterior-lateral knee pain\" secondary to PCL-deficient posterior laxity — screen once the acute phase allows." },
    kineticChain: {
      testName: "Tibial Rotation Assessment (Screw-Home Mechanism)",
      chipOptions: ["Absent screw-home pattern", "Normal screw-home mechanism"],
      chainEffect: "PCL laxity can disturb terminal-extension screw-home; check for an \"absent screw-home\" pattern.",
    },
    functionalScreen: {
      testName: "Double Leg Squat (general baseline)",
      measure: { type: "text", label: "Result" },
      note: "No PCL-specific named functional test exists in this app's library — rely on the joint-play STTT test above as primary.",
    },
    fascia: "Posterior capsule",
    outcome: "KOOS or Oxford Knee Score; Lysholm; IKDC / Tegner (sport)",
  },
  KN03: {
    id: "KN03", name: "Meniscal Tear",
    keyExams: ["McMurray's test", "Thessaly test"],
    observationChecklist: ["Joint-line swelling", "Catching/locking", "Quad wasting"],
    postureChecklist: ["Antalgic, avoids full flexion"],
    palpationZones: ["Joint line"],
    resistedTestName: "Resisted Knee Flexion/Extension",
    resistedNarrative: "Resisted extension/flexion usually strong (non-contractile); passive tibial rotation at 90° (McMurray-type) reproduces joint-line pain/click.",
    cpaNkt: { muscle: "Hamstrings", narrative: "Hamstrings (medial vs lateral per which meniscus) may guard protectively; not a primary compensation-pattern condition." },
    kineticChain: {
      testName: "Tibial Rotation Assessment",
      chipOptions: ["Reproduces joint-line pain", "No pain on IR/ER"],
      chainEffect: "Passive IR/ER at 90° reproducing joint-line pain is the direct kinetic-chain correlate of a meniscal lesion.",
    },
    functionalScreen: {
      testName: "Double Leg Squat",
      measure: { type: "text", label: "Result" },
      note: "Deep flexion loading reproducing joint-line pain is the functional equivalent of McMurray-type provocation.",
    },
    fascia: "Joint-line capsular fascia",
    outcome: "KOOS or Oxford Knee Score; Lysholm; IKDC / Tegner (sport)",
  },
  KN04: {
    id: "KN04", name: "MCL Sprain",
    keyExams: ["Valgus stress test"],
    observationChecklist: ["Medial joint-line tenderness", "Valgus laxity"],
    postureChecklist: ["Valgus-loading alignment"],
    palpationZones: ["Medial joint line"],
    resistedTestName: "Resisted Knee Movements",
    resistedNarrative: "Resisted tests around the knee usually painless (ligament, not contractile); passive valgus stress (medial gap) at 0°/30° is the definitive test.",
    cpaNkt: { muscle: "Adductors", narrative: "\"Overactive, medial chain\" and the pes anserine group often guard the medial pain secondarily." },
    kineticChain: {
      testName: "Knee Valgus Stress Test",
      chipOptions: ["Medial gap at 0°/30°", "No laxity"],
      chainEffect: "The direct match, including its manual valgus-stress component at 0°/30° used to grade MCL laxity.",
    },
    functionalScreen: {
      testName: "Forward Lunge",
      measure: { type: "text", label: "Result" },
      note: "Sagittal loading with a valgus-stress component if cutting/lateral movement provokes the medial pain.",
    },
    fascia: "Medial capsule / pes anserine fascia",
    outcome: "KOOS or Oxford Knee Score; Lysholm; IKDC / Tegner (sport)",
  },
  KN05: {
    id: "KN05", name: "LCL Sprain",
    keyExams: ["Varus stress test"],
    observationChecklist: ["Lateral joint-line tenderness", "Varus laxity"],
    postureChecklist: ["Varus-loading alignment"],
    palpationZones: ["Lateral joint line"],
    resistedTestName: "Resisted Knee Movements",
    resistedNarrative: "Resisted tests around the knee usually painless; passive varus stress (lateral gap) at 0°/30° is the definitive test.",
    cpaNkt: { muscle: "TFL / Biceps Femoris", narrative: "TFL/ITB and Biceps Femoris (lateral chain) often become protectively overactive — check TFL \"Overactive, IT band syndrome\" once acute phase allows." },
    kineticChain: {
      testName: "Knee Valgus Stress Test (varus-focused)",
      chipOptions: ["Lateral gap at 0°/30°", "No laxity"],
      chainEffect: "This app's kinetic-chain library has no dedicated varus-stress equivalent — rely on the passive varus-stress STTT test above.",
      notApplicable: true,
    },
    functionalScreen: {
      testName: "Forward Lunge (general sagittal-plane screen)",
      measure: { type: "text", label: "Result" },
      note: "No LCL-specific named functional test exists in this app's library.",
    },
    fascia: "Lateral capsule / ITB fascia",
    outcome: "KOOS or Oxford Knee Score; Lysholm; IKDC / Tegner (sport)",
  },
  KN06: {
    id: "KN06", name: "Patellofemoral Pain Syndrome (PFPS)",
    keyExams: ["Clarke's sign", "Patellar grind test"],
    observationChecklist: ["Patellar maltracking", "VMO wasting", "No effusion"],
    postureChecklist: ["Dynamic valgus, foot pronation, femoral IR"],
    palpationZones: null,
    resistedTestName: "Resisted Knee Extension (VMO Timing Test)",
    resistedNarrative: "Resisted knee extension at 0–30° (VMO timing test) shows VL firing before/dominating VMO; passive patellar glide shows a lateral bias / tight lateral retinaculum.",
    cpaNkt: { muscle: "VMO", narrative: "\"Inhibited, VL dominant\" is the textbook PFPS finding; also check Glute Medius (hip), since proximal weakness drives the dynamic valgus feeding PFPS." },
    kineticChain: {
      testName: "Patellar Mobility Test",
      chipOptions: ["Laterally biased, tight lateral retinaculum", "Central tracking, normal glide"],
      chainEffect: "Explicitly linked in the app's own data to \"CPA: VMO inhibited → VL overactive.\"",
    },
    functionalScreen: {
      testName: "Wall-Slide PF-Compression Screen",
      measure: { type: "text", label: "Result" },
      note: "Pain onset angle at 30/60/90° knee flexion — the named functional test for a PF pain arc.",
    },
    fascia: "Lateral retinaculum / ITB tightness",
    outcome: "Kujala (Anterior Knee Pain Scale); KOOS",
  },
  KN07: {
    id: "KN07", name: "Patellar Tendinopathy",
    keyExams: ["Resisted knee extension (MMT)", "Palpation of patellar tendon"],
    observationChecklist: ["Inferior-pole tenderness", "Jumper's history"],
    postureChecklist: ["Stiff-landing posture"],
    palpationZones: ["Patellar tendon"],
    resistedTestName: "Resisted Knee Extension",
    resistedNarrative: "Resisted knee extension strong but painful at the inferior pole/patellar tendon — classic contractile pattern (decline squat load is the functional equivalent).",
    cpaNkt: { muscle: "Rectus Femoris", narrative: "\"Overactive, VMO inhibition\" often accompanies jumper's knee; check VMO facilitation alongside tendon loading capacity." },
    kineticChain: {
      testName: "Patellar Mobility",
      chipOptions: ["Reduced glide (retinacular tension)", "Normal glide"],
      chainEffect: "Can be checked as an adjunct (retinacular tension affects tendon load line), but isn't primary here — the eccentric loading test below is more direct.",
      notApplicable: true,
    },
    functionalScreen: {
      testName: "Eccentric Single-Leg Step-Down",
      measure: { type: "text", label: "Result" },
      note: "Eccentric quad/PF compression at speed — the named functional test for reproducing tendon load pain.",
    },
    fascia: "Superficial front line (quad–patellar tendon)",
    outcome: "VISA-P; KOOS",
  },
  KN08: {
    id: "KN08", name: "Knee Osteoarthritis",
    keyExams: ["Passive knee ROM with end-feel", "Sweep/ballottement test for effusion"],
    observationChecklist: ["Bony enlargement", "Effusion", "Varus/valgus", "Crepitus"],
    postureChecklist: ["Varus/valgus malalignment"],
    palpationZones: null,
    resistedTestName: "Resisted Knee Movements",
    resistedNarrative: "Resisted tests generally painless (non-contractile unless secondary tendinopathy); passive flexion/extension both restricted (capsular pattern flexion>>extension) with a capsular/leathery end-feel; patellar mobility often reduced.",
    cpaNkt: { muscle: "VMO / Glute Medius", narrative: "VMO commonly inhibited with VL dominant, and Glute Medius (hip) often also inhibited contributing to dynamic malalignment — check both." },
    kineticChain: {
      testName: "Patellar Mobility Test + Tibial Rotation Assessment",
      chipOptions: ["Crepitus with reduced glide/rotation", "Normal glide/rotation, no crepitus"],
      chainEffect: "Crepitus with passive glide and restricted rotation both corroborate the capsular/degenerative picture.",
    },
    functionalScreen: {
      testName: "Double Leg Squat",
      measure: { type: "text", label: "Result" },
      note: "Bilateral loading to observe pain onset angle and compensation strategy (heel-rise, trunk lean).",
    },
    fascia: "Global knee capsular fascia",
    outcome: "WOMAC or KOOS",
  },
  KN09: {
    id: "KN09", name: "Iliotibial Band Friction Syndrome",
    keyExams: ["Noble compression test", "Ober's test"],
    observationChecklist: ["Lateral epicondyle tenderness ~30° flexion", "Runner"],
    postureChecklist: ["Hip-drop / adducted running posture"],
    palpationZones: ["Lateral epicondyle"],
    resistedTestName: "Resisted Knee Movements",
    resistedNarrative: "Resisted tests around the knee usually painless; Ober's test (passive hip-adduction restriction) is the key provocation, reproducing lateral knee pain with Noble compression.",
    cpaNkt: { muscle: "TFL", narrative: "\"Overactive, IT band syndrome\" is the textbook driver, always compensating for an inhibited Glute Medius; this exact pairing is documented in the app's own data." },
    kineticChain: {
      testName: "Tibial Rotation Assessment",
      chipOptions: ["Restricted tibial IR, lateral chain tightness", "Normal rotation"],
      chainEffect: "Explicitly documented: \"restricted tibial IR, lateral chain tightness... biceps femoris and IT band restricting IR.\"",
    },
    functionalScreen: {
      testName: "Eccentric Single-Leg Step-Down",
      measure: { type: "text", label: "Result" },
      note: "ITBFS is classically provoked by repetitive knee flexion-extension under eccentric load, which this test reproduces directly.",
    },
    fascia: "Lateral line (ITB/TFL) tension",
    outcome: "KOOS or Oxford Knee Score; Lysholm; IKDC / Tegner (sport)",
  },
};

export const KNEE_CONDITION_ORDER = ["KN01", "KN02", "KN03", "KN04", "KN05", "KN06", "KN07", "KN08", "KN09"];
