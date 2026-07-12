import { planExamination } from "../reasoningEngine/index";
import type { SubjectiveInput } from "../reasoningEngine/types";

const base = (over: Partial<SubjectiveInput> = {}): SubjectiveInput => ({
  region: "shoulder", chiefComplaint: "shoulder pain", ...over,
});

describe("Stage 2 exam-planning engine (shoulder)", () => {
  it("always recommends the four core objective exams for a plain case", () => {
    const plan = planExamination(base(), "shoulder");
    expect(plan.referFirst).toBeNull();
    const exams = plan.recommendations.map((r) => r.exam);
    expect(exams).toEqual(expect.arrayContaining([
      "Observation & posture",
      "Active ROM (all planes)",
      "Passive ROM + end-feel",
      "Resisted isometrics / MMT (abduction, ER, IR)",
    ]));
  });

  it("adds the subacromial cluster when overhead aggravation is reported", () => {
    const plan = planExamination(base({ overheadAggravation: true }), "shoulder");
    expect(plan.recommendations.some((r) => r.exam.includes("Subacromial cluster"))).toBe(true);
  });

  it("adds a neuro/cervical screen when paraesthesia is reported", () => {
    const plan = planExamination(base({ paresthesia: true }), "shoulder");
    expect(plan.recommendations.some((r) => r.exam.includes("Neurological screen"))).toBe(true);
  });

  it("forces refer-first (single recommendation) when a red flag is present", () => {
    const plan = planExamination(base({ malignancyHistory: true }), "shoulder");
    expect(plan.referFirst).not.toBeNull();
    expect(plan.recommendations).toHaveLength(1);
    expect(plan.recommendations[0].exam).toMatch(/Refer/i);
  });

  it("sorts recommendations High -> Medium -> Low deterministically", () => {
    const plan = planExamination(base({ overheadAggravation: true }), "shoulder");
    const rank = { High: 3, Medium: 2, Low: 1 } as const;
    for (let i = 1; i < plan.recommendations.length; i++) {
      expect(rank[plan.recommendations[i - 1].priority]).toBeGreaterThanOrEqual(rank[plan.recommendations[i].priority]);
    }
  });
});
