import { runReasoning } from "../reasoningEngine/index";
import { stableStringify } from "../reasoningEngine/determinism";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const emptyObjective = (): ObjectiveFindings => ({
  rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
});

const subacromialCase = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "shoulder", chiefComplaint: "shoulder pain reaching overhead", overheadAggravation: true, onsetInsidious: true },
  o: {
    rom: [{ movement: "Abduction", activeROM: 150, passiveROM: 170, normalROM: 180 }],
    mmt: [{ muscle: "Supraspinatus (abduction)", grade: 4, painOnResist: true }],
    specialTests: { hawkins: true, neer: true, painful_arc: true, empty_can: true },
    palpation: { tenderStructures: ["greater tuberosity"] },
    functional: { movements: [] },
    imaging: { performed: false },
  },
});

const frozenCase = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "shoulder", chiefComplaint: "stiff painful shoulder", progressiveStiffness: true, onsetInsidious: true, nightPain: true },
  o: {
    rom: [
      { movement: "External rotation", activeROM: 30, passiveROM: 40, normalROM: 90, endFeel: "capsular" },
      { movement: "Abduction", activeROM: 90, passiveROM: 100, normalROM: 180 },
      { movement: "Internal rotation", activeROM: 50, passiveROM: 55, normalROM: 70 },
    ],
    mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
  },
});

describe("Stage 5 provisional diagnosis engine (shoulder)", () => {
  it("ranks Subacromial pain syndrome top for a classic impingement cluster", () => {
    const { s, o } = subacromialCase();
    const r = runReasoning(s, o, "shoulder");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/Subacromial/);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(50);
  });

  it("ranks Adhesive capsulitis top when a capsular pattern is present", () => {
    const { s, o } = frozenCase();
    const r = runReasoning(s, o, "shoulder");
    expect(r.differentials[0].name).toMatch(/Adhesive capsulitis/);
  });

  it("produces TWO independent scores per candidate", () => {
    const { s, o } = subacromialCase();
    const top = runReasoning(s, o, "shoulder").differentials[0];
    expect(typeof top.diagnosticMatchScore).toBe("number");
    expect(typeof top.evidenceConfidence).toBe("number");
    // a good match can still carry reduced confidence when exams are missing
    expect(top.evidenceConfidence).toBeLessThanOrEqual(100);
  });

  it("gates required findings — Adhesive capsulitis scores ~0 without a capsular pattern", () => {
    const { s, o } = subacromialCase(); // no capsular pattern
    const r = runReasoning(s, o, "shoulder");
    const adhesive = r.differentials.find((d) => d.name.includes("Adhesive"));
    expect(adhesive!.diagnosticMatchScore).toBeLessThan(20);
  });

  it("returns full explainability for the top differential", () => {
    const { s, o } = subacromialCase();
    const top = runReasoning(s, o, "shoulder").differentials[0];
    expect(top.supportingFindings.length).toBeGreaterThan(0);
    expect(Array.isArray(top.missingFindings)).toBe(true);
    expect(Array.isArray(top.whyConfidenceReduced)).toBe(true);
    expect(top.source).toBeTruthy();
    expect(top.whySuggested).toBeTruthy();
  });

  it("is deterministic — identical input yields byte-identical output", () => {
    const { s, o } = subacromialCase();
    const a = stableStringify(runReasoning(s, o, "shoulder"));
    const b = stableStringify(runReasoning(s, o, "shoulder"));
    expect(a).toBe(b);
  });

  it("halts diagnosis and withholds differentials on a red flag", () => {
    const r = runReasoning({ region: "shoulder", chiefComplaint: "pain", systemicIllness: true }, emptyObjective(), "shoulder");
    expect(r.stopped).toBe(true);
    expect(r.differentials).toHaveLength(0);
    expect(r.redFlag.triggered).toBe(true);
  });
});
