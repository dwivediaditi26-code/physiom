import { planExamination, runReasoning } from "../reasoningEngine/index";
import { stableStringify, band } from "../reasoningEngine/determinism";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const s: SubjectiveInput = { region: "shoulder", chiefComplaint: "shoulder pain", overheadAggravation: true, paresthesia: true };
const o: ObjectiveFindings = {
  rom: [{ movement: "Abduction", activeROM: 150, passiveROM: 170, normalROM: 180 }],
  mmt: [{ muscle: "Supraspinatus (abduction)", grade: 4, painOnResist: true }],
  specialTests: { hawkins: true, neer: true, painful_arc: true, spurling: true },
  palpation: { tenderStructures: ["greater tuberosity"] }, functional: { movements: [] }, imaging: { performed: false },
};

describe("determinism guarantees", () => {
  it("exam plan is identical across repeated runs", () => {
    expect(stableStringify(planExamination(s, "shoulder"))).toBe(stableStringify(planExamination(s, "shoulder")));
  });
  it("full reasoning is identical across 5 repeated runs", () => {
    const runs = Array.from({ length: 5 }, () => stableStringify(runReasoning(s, o, "shoulder")));
    expect(new Set(runs).size).toBe(1);
  });
  it("confidence bands are stable thresholds", () => {
    expect(band(85)).toBe("High");
    expect(band(55)).toBe("Moderate");
    expect(band(20)).toBe("Low");
  });
});
