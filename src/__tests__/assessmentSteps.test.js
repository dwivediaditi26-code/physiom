import { describe, it, expect } from "vitest";
import { withCarePlanSummaryStep, withoutRemovedCarePlanSteps, REMOVED_CAREPLAN_STEP_IDS } from "../assessmentSteps.js";
import { buildOrthoAssessSteps } from "../OrthoOutpatientAssessment.jsx";
import { buildOrthoIPDAssessSteps } from "../OrthoIPDAssessment.jsx";
import { buildOrthoPostOpAssessSteps } from "../OrthoPostOpAssessment.jsx";

const plan = { id: "carePlanPlan", label: "Care Plan" };
const ids = (steps) => steps.map((s) => s.id);

describe("Care Plan steps in assessments", () => {
  it("removes Care Plan, Sessions and Care Plan Progress from a saved order, keeps the rest", () => {
    expect(REMOVED_CAREPLAN_STEP_IDS).toEqual(["carePlanPlan", "carePlanSessions", "carePlanProgress"]);
    expect(withoutRemovedCarePlanSteps(["pain", "carePlanProblems", "carePlanPlan", "carePlanSessions", "carePlanProgress", "summary"])).toEqual(["pain", "carePlanProblems", "summary"]);
  });

  it("the Summary gets the care plan block right after Treatment", () => {
    const steps = [{ id: "interpretation" }, { id: "carePlanProblems" }, { id: "carePlanGoals" }, { id: "carePlanTreatment" }, { id: "precautions" }, { id: "summary" }];
    expect(ids(withCarePlanSummaryStep(steps, plan))).toEqual(["interpretation", "carePlanProblems", "carePlanGoals", "carePlanTreatment", "carePlanPlan", "precautions", "summary"]);
  });

  it("falls back to just before Summary/Review, and never adds it twice", () => {
    expect(ids(withCarePlanSummaryStep([{ id: "pain" }, { id: "review" }], plan))).toEqual(["pain", "carePlanPlan", "review"]);
    const once = withCarePlanSummaryStep([{ id: "carePlanTreatment" }, { id: "summary" }], plan);
    expect(withCarePlanSummaryStep(once, plan)).toBe(once);
  });

  it("the patient profile's Ortho summaries still show the care plan, without Sessions or Progress", () => {
    for (const build of [buildOrthoAssessSteps, buildOrthoIPDAssessSteps, buildOrthoPostOpAssessSteps]) {
      const got = ids(build());
      expect(got).toContain("carePlanPlan");
      expect(got).toContain("carePlanProblems");
      expect(got).not.toContain("carePlanSessions");
      expect(got).not.toContain("carePlanProgress");
    }
  });
});
