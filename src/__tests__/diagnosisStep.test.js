import { describe, it, expect } from "vitest";
import { buildOrthoAssessSteps } from "../OrthoOutpatientAssessment.jsx";
import { buildOrthoIPDAssessSteps } from "../OrthoIPDAssessment.jsx";
import { buildOrthoPostOpAssessSteps } from "../OrthoPostOpAssessment.jsx";
import { buildCardioAssessSteps } from "../CardiopulmonaryAssessment.jsx";
import { buildNeuroAssessSteps } from "../NeurologicalAssessment.jsx";

// 2026-10-05, Aditi: medical, physiotherapy and differential diagnosis are a
// separate Diagnosis page right after the clinical assessment page.
const ids = (steps) => steps.map((s) => s.id);
const labelOf = (steps, id) => steps.find((s) => s.id === id)?.label;

describe("Diagnosis step", () => {
  it.each([
    ["Ortho Outpatient", buildOrthoAssessSteps(), "clinicalAssessment"],
    ["Ortho IPD", buildOrthoIPDAssessSteps(), "impression"],
    ["Ortho Post-op", buildOrthoPostOpAssessSteps(), "impression"],
    ["Cardio", buildCardioAssessSteps(), "interpretation"],
    ["Neuro", buildNeuroAssessSteps(), "interpretation"],
  ])("%s: comes right after the clinical page", (_name, steps, clinicalId) => {
    const got = ids(steps);
    expect(got.indexOf(clinicalId)).toBeGreaterThan(-1);
    expect(got.indexOf("diagnosis")).toBe(got.indexOf(clinicalId) + 1);
    expect(labelOf(steps, "diagnosis")).toBe("Diagnosis");
  });
});
