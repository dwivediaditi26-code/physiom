import { planExamination, runReasoning, runReasoningFromData, normalizeCervicalFromData } from "../reasoningEngine/index";
import { stableStringify } from "../reasoningEngine/determinism";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const emptyObj = (): ObjectiveFindings => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } });

const radiculopathy = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "cervical", chiefComplaint: "neck and arm pain", radiatingArmPain: true, dermatomalPattern: true, paresthesia: true },
  o: {
    rom: [], mmt: [{ muscle: "C6 myotome", grade: 3 }],
    specialTests: { spurling: true, distraction: true, ultt: true, rotation_lt_60: true, reflex_change: true, sensory_deficit: true },
    palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
  },
});

const facet = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "cervical", chiefComplaint: "stiff neck", neckStiffness: true, extensionRotationAggravation: true },
  o: {
    rom: [
      { movement: "Extension", activeROM: 35, passiveROM: 40, normalROM: 60 },
      { movement: "Rotation", activeROM: 50, passiveROM: 55, normalROM: 80 },
    ],
    mmt: [], specialTests: {}, palpation: { tenderStructures: ["right facet"] }, functional: { movements: [] }, imaging: { performed: false },
  },
});

const cervicogenic = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "cervical", chiefComplaint: "unilateral headache from neck", headacheFromNeck: true, unilateralHeadache: true },
  o: { rom: [], mmt: [], specialTests: { flexion_rotation: true }, palpation: { tenderStructures: ["suboccipital"] }, functional: { movements: [] }, imaging: { performed: false } },
});

describe("Cervical region — exam planning (Stage 2)", () => {
  it("adds a neuro + Wainner cluster when arm pain radiates", () => {
    const plan = planExamination({ region: "cervical", chiefComplaint: "arm pain", radiatingArmPain: true }, "cervical");
    expect(plan.recommendations.some((r) => r.exam.includes("Wainner"))).toBe(true);
  });
  it("puts a VBI/upper-cervical screen first when dizziness is reported", () => {
    const plan = planExamination({ region: "cervical", chiefComplaint: "neck pain + dizziness", dizzinessVBI: true }, "cervical");
    expect(plan.recommendations.some((r) => /VBI|vascular/i.test(r.exam))).toBe(true);
  });
  it("forces refer-first on a vertebrobasilar red flag", () => {
    const plan = planExamination({ region: "cervical", chiefComplaint: "neck pain", vertebrobasilarSigns: true }, "cervical");
    expect(plan.referFirst).not.toBeNull();
    expect(plan.recommendations[0].exam).toMatch(/Refer/i);
  });
});

describe("Cervical region — diagnosis (Stage 5)", () => {
  it("ranks Cervical radiculopathy top for a Wainner-positive cluster", () => {
    const { s, o } = radiculopathy();
    const r = runReasoning(s, o, "cervical");
    expect(r.differentials[0].name).toMatch(/radiculopathy/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(50);
  });
  it("ranks facet/mechanical neck pain top for extension-rotation provocation without neuro signs", () => {
    const { s, o } = facet();
    const r = runReasoning(s, o, "cervical");
    expect(r.differentials[0].name).toMatch(/facet|mechanical/i);
  });
  it("ranks cervicogenic headache top for a neck-related unilateral headache with positive flexion-rotation", () => {
    const { s, o } = cervicogenic();
    const r = runReasoning(s, o, "cervical");
    expect(r.differentials[0].name).toMatch(/Cervicogenic/i);
  });
  it("halts and refers on myelopathy signs (red flag precedence)", () => {
    const r = runReasoning({ region: "cervical", chiefComplaint: "neck pain, clumsy hands", myelopathySigns: true, gaitDisturbance: true }, emptyObj(), "cervical");
    expect(r.stopped).toBe(true);
    expect(r.differentials).toHaveLength(0);
    expect(r.interpretation!.referralRecommendation).toMatch(/Red flag/i);
  });
  it("is deterministic across repeated runs", () => {
    const { s, o } = radiculopathy();
    expect(stableStringify(runReasoning(s, o, "cervical"))).toBe(stableStringify(runReasoning(s, o, "cervical")));
  });
  it("gates Cervical myelopathy (~0) without a positive Hoffmann when not red-flagged", () => {
    const { s, o } = facet();
    const r = runReasoning(s, o, "cervical");
    const myelo = r.differentials.find((d) => d.name.includes("myelopathy"));
    expect(myelo!.diagnosticMatchScore).toBeLessThan(20);
  });
});

describe("Cervical region — interpretation + normalize", () => {
  it("recommends urgent referral text when UMN sign / gait disturbance present but no subjective red flag flag set", () => {
    const s: SubjectiveInput = { region: "cervical", chiefComplaint: "neck pain" };
    const o: ObjectiveFindings = { rom: [], mmt: [], specialTests: { hoffmann: true }, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } };
    const r = runReasoning(s, o, "cervical");
    expect(r.interpretation!.referralRecommendation).toMatch(/myelopathy/i);
  });
  it("normalizes a flat cervical record and runs via the dispatcher", () => {
    const data = {
      cc_main: "Neck pain radiating to right arm",
      loc_radiation: "right arm and hand",
      cx_spurling: "positive", cx_distraction: "positive", cx_ultt: "positive",
      mmt_c6_L: "5", mmt_c6_R: "3",
    };
    const { subjective, objective, region } = normalizeCervicalFromData(data);
    expect(region).toBe("cervical");
    expect(subjective.radiatingArmPain).toBe(true);
    expect(objective.specialTests.spurling).toBe(true);
    expect(objective.mmt[0].grade).toBe(3);
    const r = runReasoningFromData(data, "cervical");
    expect(r.differentials[0].name).toMatch(/radiculopathy/i);
  });
});
