import { runReasoning } from "../reasoningEngine/index";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const subj: SubjectiveInput = { region: "shoulder", chiefComplaint: "shoulder pain", overheadAggravation: true };
const empty = (): ObjectiveFindings => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } });

describe("Stage 4 completeness / validation", () => {
  it("lists critical missing exams when no objective data is entered", () => {
    const r = runReasoning(subj, empty(), "shoulder");
    expect(r.completeness.missingCritical.length).toBe(3);
    expect(r.completeness.evidenceConfidence).toBeLessThan(40);
  });

  it("raises EvidenceConfidence as more domains are examined", () => {
    const partial = runReasoning(subj, empty(), "shoulder").completeness.evidenceConfidence;
    const fuller = runReasoning(subj, {
      rom: [{ movement: "Abduction", activeROM: 150, passiveROM: 170, normalROM: 180 }],
      mmt: [{ muscle: "Supraspinatus (abduction)", grade: 4 }],
      specialTests: { hawkins: true, neer: true },
      palpation: { tenderStructures: ["greater tuberosity"] },
      functional: { movements: [] }, imaging: { performed: false },
    }, "shoulder").completeness.evidenceConfidence;
    expect(fuller).toBeGreaterThan(partial);
  });

  it("flags an internal conflict (drop-arm positive but abduction not weak)", () => {
    const r = runReasoning(subj, {
      rom: [], mmt: [{ muscle: "Supraspinatus (abduction)", grade: 5 }],
      specialTests: { drop_arm: true },
      palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
    }, "shoulder");
    expect(r.completeness.conflicts.some((c) => /drop-arm/i.test(c))).toBe(true);
  });
});
