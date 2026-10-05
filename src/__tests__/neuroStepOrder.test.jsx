import { describe, it, expect } from "vitest";
import { buildNeuroAssessSteps } from "../NeurologicalAssessment.jsx";

const ids = (steps) => steps.map((s) => s.id);

describe("Neuro step order", () => {
  it("has Exercise Prescription as the treatment page, then Precautions, then Summary", () => {
    const got = ids(buildNeuroAssessSteps());
    expect(got).not.toContain("carePlanTreatment");
    expect(got).not.toContain("carePlanPlan");
    expect(got).not.toContain("carePlanSessions");
    expect(got).not.toContain("carePlanProgress");
    const tail = got.slice(got.indexOf("interpretation"));
    expect(tail).toEqual(["interpretation", "carePlanProblems", "carePlanGoals", "exercisePrescription", "precautions", "summary"]);
  });
});
