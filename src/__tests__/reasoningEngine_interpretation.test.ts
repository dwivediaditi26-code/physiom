import { runReasoning } from "../reasoningEngine/index";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

describe("Stage 6 clinical interpretation", () => {
  it("recommends orthopaedic/imaging referral when a lag sign is positive", () => {
    const s: SubjectiveInput = { region: "shoulder", chiefComplaint: "shoulder pain after fall", onsetTraumatic: true, traumaHistory: true };
    const o: ObjectiveFindings = {
      rom: [], mmt: [{ muscle: "Infraspinatus (external rotation)", grade: 3 }],
      specialTests: { er_lag: true, drop_arm: true },
      palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
    };
    const r = runReasoning(s, o, "shoulder");
    expect(r.interpretation!.referralRecommendation).toMatch(/orthopaedic|imaging/i);
  });

  it("withholds a diagnostic summary and states referral on a red flag", () => {
    const r = runReasoning({ region: "shoulder", chiefComplaint: "pain", systemicIllness: true },
      { rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } }, "shoulder");
    expect(r.interpretation!.referralRecommendation).toMatch(/Red flag/i);
    expect(r.interpretation!.summary).toMatch(/red-flag/i);
  });

  it("grounds impairments only in findings actually present", () => {
    const s: SubjectiveInput = { region: "shoulder", chiefComplaint: "stiff shoulder", progressiveStiffness: true };
    const o: ObjectiveFindings = {
      rom: [
        { movement: "External rotation", activeROM: 30, passiveROM: 40, normalROM: 90, endFeel: "capsular" },
        { movement: "Abduction", activeROM: 90, passiveROM: 100, normalROM: 180 },
        { movement: "Internal rotation", activeROM: 50, passiveROM: 55, normalROM: 70 },
      ],
      mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
    };
    const r = runReasoning(s, o, "shoulder");
    expect(r.interpretation!.primaryImpairments.some((x) => /capsular/i.test(x))).toBe(true);
  });
});
