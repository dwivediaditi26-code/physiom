import { planExamination, runReasoning, runReasoningFromData, normalizeWristFromData } from "../reasoningEngine/index";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const emptyObj = (): ObjectiveFindings => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } });

const cts = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "hand tingling waking me at night", medianNerveNightSymptoms: true, medianNerveFlickSignRelief: true, paresthesia: true, nightPain: true },
  o: { ...emptyObj(), specialTests: { phalen_positive: true, tinel_wrist_positive: true, cpa_grip_neuro_inhibited: true } },
});

const deQuervains = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "thumb base pain, new mother", wristRadialPainPattern: true, thumbExtensionAbductionAggravation: true, wristDeQuervainNewParentMechanism: true, deQuervainFinkelsteinReportedPattern: true },
  o: { ...emptyObj(), specialTests: { finkelstein_positive: true }, palpation: { tenderStructures: ["radial styloid"] }, mmt: [{ muscle: "Thumb Extensors (EPL/EPB)", grade: 5, painOnResist: true }] },
});

const tfcc = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "ulnar wrist pain after a fall, worse loading through the hand", wristUlnarPainPattern: true, wristCompressionLoadingAggravation: true, wristDirectTraumaMechanism: true, onsetTraumatic: true },
  o: emptyObj(),
});

const scapholunate = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "dorsal wrist pain after a fall onto the hand", wristDorsalPainPattern: true, wristFooshMechanism: true, onsetTraumatic: true },
  o: { ...emptyObj(), specialTests: { watson_positive: true }, palpation: { tenderStructures: ["scaphoid region"] } },
});

const wristOA = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "stiff aching wrist, older patient", ageOver50: true, progressiveStiffness: true },
  o: {
    ...emptyObj(),
    rom: [
      { movement: "Wrist Flexion", activeROM: 40, passiveROM: 40, normalROM: 80 },
      { movement: "Wrist Extension", activeROM: 35, passiveROM: 35, normalROM: 70 },
    ],
    imaging: { performed: true, summary: "XR: wrist osteoarthritis with joint space narrowing" },
  },
});

const distalRadiusFx = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "fell onto outstretched hand, wrist deformed", wristFooshDorsiflexionMechanism: true, wristSuspectedDistalRadiusFracture: true, onsetTraumatic: true },
  o: { ...emptyObj(), imaging: { performed: true, summary: "XR: distal radius fracture, dorsally displaced (Colles)" } },
});

const scaphoidFx = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "fell onto outstretched hand, snuffbox tender", wristFooshDorsiflexionMechanism: true, wristSuspectedScaphoidFracture: true, onsetTraumatic: true },
  o: { ...emptyObj(), palpation: { tenderStructures: ["anatomical snuffbox"] }, imaging: { performed: true, summary: "XR: scaphoid fracture, waist" } },
});

const cmcOA = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "thumb base pain, older patient", thumbCmcPainPattern: true, ageOver50: true, progressiveStiffness: true },
  o: { ...emptyObj(), specialTests: { grind_positive: true }, palpation: { tenderStructures: ["1st CMC joint / thumb base"] } },
});

const ecuTendinopathy = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "gradual ulnar wrist pain, racquet sport player", wristUlnarPainPattern: true, wristRepetitiveGripOveruse: true, onsetInsidious: true },
  o: { ...emptyObj(), mmt: [{ muscle: "Wrist Extensors (ECU)", grade: 3, painOnResist: false }], palpation: { tenderStructures: ["ECU tendon"] } },
});

const triggerFinger = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "wrist", chiefComplaint: "finger catching and locking with repetitive gripping", triggerFingerPattern: true, wristRepetitiveGripOveruse: true, palmPainPattern: true, wristVolarPainPattern: true },
  o: emptyObj(),
});

describe("Wrist region — exam planning (Stage 2)", () => {
  it("always includes a fracture/trauma screen, ROM, and a neurological screen", () => {
    const plan = planExamination({ region: "wrist", chiefComplaint: "wrist pain" }, "wrist");
    expect(plan.recommendations.some((r) => /fracture\/trauma screen/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /active \+ passive wrist rom/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /neurological screen/i.test(r.exam))).toBe(true);
  });
  it("adds a Finkelstein's exam when radial-sided pain is present", () => {
    const plan = planExamination({ region: "wrist", chiefComplaint: "radial wrist pain", wristRadialPainPattern: true }, "wrist");
    expect(plan.recommendations.some((r) => /finkelstein/i.test(r.exam))).toBe(true);
  });
  it("adds a snuffbox/Watson exam when a FOOSH mechanism is present", () => {
    const plan = planExamination({ region: "wrist", chiefComplaint: "fell on hand", wristFooshMechanism: true }, "wrist");
    expect(plan.recommendations.some((r) => /anatomical snuffbox palpation/i.test(r.exam))).toBe(true);
  });
});

describe("Wrist region — diagnosis (Stage 5)", () => {
  it("ranks carpal tunnel syndrome top for classic median nerve night symptoms with positive Phalen's/Tinel's", () => {
    const { s, o } = cts();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/carpal tunnel syndrome/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(50);
  });
  it("ranks De Quervain's tenosynovitis top for a positive Finkelstein's test with radial pain", () => {
    const { s, o } = deQuervains();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/de quervain/i);
  });
  it("scores De Quervain's 0 without a positive Finkelstein's test (required finding)", () => {
    const r = runReasoning({ region: "wrist", chiefComplaint: "wrist pain", wristRadialPainPattern: true }, emptyObj(), "wrist");
    const dx = r.differentials.find((d) => /de quervain/i.test(d.name));
    expect(dx?.diagnosticMatchScore).toBe(0);
  });
  it("ranks TFCC tear top for ulnar-sided pain with compression loading aggravation and trauma", () => {
    const { s, o } = tfcc();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/tfcc tear/i);
  });
  it("ranks scapholunate ligament instability top for a positive Watson's test after a FOOSH", () => {
    const { s, o } = scapholunate();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/scapholunate/i);
  });
  it("scores scapholunate instability 0 without a positive Watson's test (required finding)", () => {
    const r = runReasoning({ region: "wrist", chiefComplaint: "wrist pain", wristFooshMechanism: true }, emptyObj(), "wrist");
    const dx = r.differentials.find((d) => /scapholunate/i.test(d.name));
    expect(dx?.diagnosticMatchScore).toBe(0);
  });
  it("ranks wrist osteoarthritis top for an older patient with restricted flexion/extension and OA on imaging", () => {
    const { s, o } = wristOA();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/wrist osteoarthritis/i);
  });
  it("ranks distal radius fracture top for a FOOSH dorsiflexion mechanism with a suspected-fracture flag and imaging", () => {
    const { s, o } = distalRadiusFx();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/distal radius fracture/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(80);
  });
  it("ranks scaphoid fracture top for a FOOSH dorsiflexion mechanism with snuffbox tenderness and imaging", () => {
    const { s, o } = scaphoidFx();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/scaphoid fracture/i);
  });
  it("ranks 1st CMC osteoarthritis top for thumb base pain with a positive grind test", () => {
    const { s, o } = cmcOA();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/1st cmc osteoarthritis/i);
  });
  it("scores 1st CMC osteoarthritis 0 without a positive grind test (required finding)", () => {
    const r = runReasoning({ region: "wrist", chiefComplaint: "thumb pain", thumbCmcPainPattern: true, ageOver50: true }, emptyObj(), "wrist");
    const dx = r.differentials.find((d) => /1st cmc osteoarthritis/i.test(d.name));
    expect(dx?.diagnosticMatchScore).toBe(0);
  });
  it("ranks ECU tendinopathy/instability top for insidious ulnar pain with repetitive overuse and a tender ECU", () => {
    const { s, o } = ecuTendinopathy();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/ecu tendinopathy/i);
  });
  it("ranks trigger finger top for a catching/locking digit with repetitive gripping", () => {
    const { s, o } = triggerFinger();
    const r = runReasoning(s, o, "wrist");
    expect(r.differentials[0].name).toMatch(/trigger finger/i);
  });
  it("halts and refers on an acute hot swollen joint (septic arthritis screen)", () => {
    const r = runReasoning({ region: "wrist", chiefComplaint: "hot swollen wrist, unwell", hotSwollenJoint: true }, emptyObj(), "wrist");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/septic arthritis/i);
  });
  it("halts and refers on suspected acute compartment syndrome (vascular screen)", () => {
    const r = runReasoning({ region: "wrist", chiefComplaint: "severe forearm pain and swelling after cast removal", vascularCompromiseSigns: true }, emptyObj(), "wrist");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/vascular/i);
  });
  it("recommends urgent referral when a scaphoid fracture is suspected on intake", () => {
    const r = runReasoning({ region: "wrist", chiefComplaint: "fell on hand, snuffbox tender", wristSuspectedScaphoidFracture: true }, emptyObj(), "wrist");
    expect(r.interpretation!.referralRecommendation).toMatch(/urgent imaging referral/i);
  });
  it("recommends urgent referral when a tendon rupture is flagged on intake", () => {
    const r = runReasoning({ region: "wrist", chiefComplaint: "cannot extend fingers after laceration", wristTendonRuptureFlag: true }, emptyObj(), "wrist");
    expect(r.interpretation!.referralRecommendation).toMatch(/tendon rupture/i);
  });
});

describe("Wrist region — normalizer field-mapping (real field ids only)", () => {
  it("maps ew_loc/ew_moi/ew_agg_mov real option text to the correct wrist-filtered subjective flags (not elbow's)", () => {
    const data = {
      cc_main: "wrist pain",
      ew_loc: "Wrist — radial border / anatomical snuffbox",
      ew_moi: "FOOSH — wrist dorsiflexion impact (scaphoid / distal radius)",
      ew_agg_mov: "Thumb extension / abduction (de Quervain's)",
    };
    const { subjective } = normalizeWristFromData(data);
    expect(subjective.wristRadialPainPattern).toBe(true);
    expect(subjective.wristFooshDorsiflexionMechanism).toBe(true);
    expect(subjective.thumbExtensionAbductionAggravation).toBe(true);
    expect(subjective.lateralElbowPainPattern).toBeFalsy();
  });
  it("maps nkt_wrist_ext/nkt_grip real option text to the correct specialTests flags via CPA", () => {
    const data = {
      cc_main: "wrist pain",
      nkt_wrist_ext: "Inhibited — lateral epicondylalgia",
      nkt_grip: "Inhibited — neurological cause",
    };
    const { objective } = normalizeWristFromData(data);
    expect(objective.specialTests.cpa_wrist_extensors_inhibited).toBe(true);
    expect(objective.specialTests.cpa_grip_neuro_inhibited).toBe(true);
    expect(objective.mmt.some((m) => m.muscle.toLowerCase().includes("wrist extensors"))).toBe(true);
  });
  it("runs the engine on a wrist dataset via region detection (real field ids)", () => {
    const r = runReasoningFromData({ cc_main: "wrist pain", ew_loc: "Wrist — dorsal", rom_wflex_L_arom: "70" }, "wrist");
    expect(r.differentials.length).toBeGreaterThan(0);
  });
});
