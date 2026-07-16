import { planExamination, runReasoning, runReasoningFromData, normalizeElbowFromData } from "../reasoningEngine/index";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const emptyObj = (): ObjectiveFindings => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } });

const lateralEpicondylalgia = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "elbow", chiefComplaint: "outer elbow pain, tennis player", lateralElbowPainPattern: true, elbowRacquetSportMechanism: true, resistedWristExtensionPain: true },
  o: { ...emptyObj(), specialTests: { cozens: true, mills: true }, palpation: { tenderStructures: ["lateral epicondyle"] } },
});

const medialEpicondylalgia = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "elbow", chiefComplaint: "inner elbow pain, golfer", medialElbowPainPattern: true, elbowGolfSwingMechanism: true, resistedWristFlexionPain: true },
  o: { ...emptyObj(), specialTests: { golfers: true }, palpation: { tenderStructures: ["medial epicondyle"] } },
});

const distalBiceps = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "elbow", chiefComplaint: "sudden anterior elbow pain lifting a heavy box", anteriorElbowPainPattern: true },
  o: { ...emptyObj(), mmt: [{ muscle: "Biceps Brachii (Flexion/Supination)", grade: 3, painOnResist: true }], palpation: { tenderStructures: ["biceps tendon"] } },
});

const elbowOA = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "elbow", chiefComplaint: "gradual elbow stiffness, labourer", onsetInsidious: true, ageOver50: true, progressiveStiffness: true },
  o: { ...emptyObj(), rom: [
    { movement: "Extension", activeROM: 15, passiveROM: 15, normalROM: 0 },
    { movement: "Flexion", activeROM: 100, passiveROM: 105, normalROM: 145 },
  ] },
});

const olecranonBursitis = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "elbow", chiefComplaint: "swollen posterior elbow after leaning on it", posteriorElbowPainPattern: true, elbowDirectTraumaOnset: true },
  o: { ...emptyObj(), palpation: { tenderStructures: ["olecranon"] } },
});

const uclSprain = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "elbow", chiefComplaint: "medial elbow pain, pitcher", elbowThrowingMechanism: true, medialElbowPainPattern: true },
  o: { ...emptyObj(), specialTests: { valgus_stress_elbow: true } },
});

const cubitalTunnel = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "elbow", chiefComplaint: "ring and little finger tingling, worse sleeping with elbow bent", ulnarNerveDistributionSymptoms: true, sustainedElbowFlexionAggravation: true },
  o: { ...emptyObj(), specialTests: { tinel_elbow: true }, palpation: { tenderStructures: ["cubital tunnel"] } },
});

const radialTunnel = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "elbow", chiefComplaint: "diffuse lateral forearm pain, dorsum hand tingling", radialNerveDistributionSymptoms: true, lateralElbowPainPattern: true },
  o: { ...emptyObj(), mmt: [{ muscle: "Supinator", grade: 4, painOnResist: true }], palpation: { tenderStructures: ["radial head"] } },
});

const pronatorTeres = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "elbow", chiefComplaint: "proximal forearm pain, repetitive keyboard use", medialElbowPainPattern: true, elbowRepetitiveGripOveruse: true },
  o: { ...emptyObj(), mmt: [{ muscle: "Pronator Teres", grade: 4, painOnResist: true }] },
});

describe("Elbow region — exam planning (Stage 2)", () => {
  it("adds Cozen's/Mill's test when lateral elbow pain pattern is present", () => {
    const plan = planExamination({ region: "elbow", chiefComplaint: "lateral elbow pain", lateralElbowPainPattern: true }, "elbow");
    expect(plan.recommendations.some((r) => /Cozen/i.test(r.exam))).toBe(true);
  });
  it("adds Golfer's elbow test + valgus stress test when medial elbow pain pattern is present", () => {
    const plan = planExamination({ region: "elbow", chiefComplaint: "medial elbow pain", medialElbowPainPattern: true }, "elbow");
    expect(plan.recommendations.some((r) => /Golfer/i.test(r.exam))).toBe(true);
  });
  it("adds valgus stress test when a throwing mechanism is present", () => {
    const plan = planExamination({ region: "elbow", chiefComplaint: "medial elbow pain pitching", elbowThrowingMechanism: true }, "elbow");
    expect(plan.recommendations.some((r) => /valgus stress/i.test(r.exam))).toBe(true);
  });
  it("forces refer-first on a hot swollen joint red flag (septic arthritis screen)", () => {
    const plan = planExamination({ region: "elbow", chiefComplaint: "hot swollen elbow", hotSwollenJoint: true }, "elbow");
    expect(plan.referFirst).not.toBeNull();
    expect(plan.recommendations[0].exam).toMatch(/Refer/i);
  });
});

describe("Elbow region — diagnosis (Stage 5)", () => {
  it("ranks lateral epicondylalgia top for a racquet-sport mechanism + positive Cozen's/Mill's", () => {
    const { s, o } = lateralEpicondylalgia();
    const r = runReasoning(s, o, "elbow");
    expect(r.differentials[0].name).toMatch(/lateral epicondylalgia/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(60);
  });
  it("ranks medial epicondylalgia top for a golf-swing mechanism + positive Golfer's elbow test", () => {
    const { s, o } = medialEpicondylalgia();
    const r = runReasoning(s, o, "elbow");
    expect(r.differentials[0].name).toMatch(/medial epicondylalgia/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(60);
  });
  it("ranks distal biceps tendinopathy/rupture top for anterior elbow pain + painful/weak resisted flexion", () => {
    const { s, o } = distalBiceps();
    const r = runReasoning(s, o, "elbow");
    expect(r.differentials[0].name).toMatch(/biceps/i);
  });
  it("ranks elbow osteoarthritis top for an older, insidious, stiff presentation with extension loss", () => {
    const { s, o } = elbowOA();
    const r = runReasoning(s, o, "elbow");
    expect(r.differentials[0].name).toMatch(/osteoarthritis/i);
  });
  it("ranks olecranon bursitis top for direct trauma + posterior swelling + olecranon tenderness", () => {
    const { s, o } = olecranonBursitis();
    const r = runReasoning(s, o, "elbow");
    expect(r.differentials[0].name).toMatch(/olecranon bursitis/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(80);
  });
  it("ranks UCL sprain top for a throwing mechanism + positive valgus stress test", () => {
    const { s, o } = uclSprain();
    const r = runReasoning(s, o, "elbow");
    expect(r.differentials[0].name).toMatch(/UCL/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(60);
  });
  it("ranks cubital tunnel syndrome top for ulnar symptoms + sustained flexion aggravation + positive Tinel's", () => {
    const { s, o } = cubitalTunnel();
    const r = runReasoning(s, o, "elbow");
    expect(r.differentials[0].name).toMatch(/cubital tunnel/i);
  });
  it("ranks radial tunnel syndrome top for radial nerve symptoms + lateral pain + painful resisted supination", () => {
    const { s, o } = radialTunnel();
    const r = runReasoning(s, o, "elbow");
    expect(r.differentials[0].name).toMatch(/radial tunnel/i);
  });
  it("ranks pronator teres syndrome top for repetitive overuse + medial pain + painful resisted pronation", () => {
    const { s, o } = pronatorTeres();
    const r = runReasoning(s, o, "elbow");
    expect(r.differentials[0].name).toMatch(/pronator teres/i);
  });
  it("halts and refers on a hot swollen joint (septic arthritis screen)", () => {
    const r = runReasoning({ region: "elbow", chiefComplaint: "hot swollen elbow, unwell", hotSwollenJoint: true }, emptyObj(), "elbow");
    expect(r.stopped).toBe(true);
    expect(r.differentials).toHaveLength(0);
  });
  it("halts and refers on vascular compromise / compartment syndrome signs", () => {
    const r = runReasoning({ region: "elbow", chiefComplaint: "severe forearm pain and swelling post-trauma", vascularCompromiseSigns: true }, emptyObj(), "elbow");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/vascular/i);
  });
});

describe("Elbow region — normalizer field-mapping (real field ids only)", () => {
  it("does not fabricate a positive Cozen's/Golfer's/Tinel's finding from negative real option text, and filters out wrist-only ew_loc options", () => {
    const data = {
      cc_main: "elbow pain",
      st_cozens: "Negative",
      st_golfers: "Negative",
      st_tinel_elbow: "Negative",
      ew_loc: "Wrist — dorsal, Thumb CMC joint (base of thumb)",
    };
    const { objective, subjective } = normalizeElbowFromData(data);
    expect(objective.specialTests.cozens).toBeUndefined();
    expect(objective.specialTests.golfers).toBeUndefined();
    expect(objective.specialTests.tinel_elbow).toBeUndefined();
    expect(subjective.lateralElbowPainPattern).toBe(false);
    expect(subjective.medialElbowPainPattern).toBe(false);
  });
  it("detects real ew_/st_/rom_/mmt_ field ids end-to-end through the dispatcher for a lateral epicondylalgia presentation", () => {
    const data = {
      cc_main: "right lateral elbow pain, tennis player",
      ew_loc: "Lateral elbow — lateral epicondyle / extensor origin",
      ew_moi: "Sport — racquet (lateral elbow — tennis elbow)",
      ew_agg_mov: "Wrist extension (resisted)",
      st_cozens: "Positive — lateral epicondyle pain (lateral epicondylalgia)",
      st_mills: "Positive — lateral epicondyle pain (ECRB)",
      rom_eflex_R_arom: "140", rom_eflex_R_prom: "145",
    };
    const r = runReasoningFromData(data, "elbow");
    expect(r.region).toBe("elbow");
    expect(r.differentials[0].name).toMatch(/lateral epicondylalgia/i);
    expect(r.differentials[0].supportingFindings.length).toBeGreaterThan(0);
  });
});
