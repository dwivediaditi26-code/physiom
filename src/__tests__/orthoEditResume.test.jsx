// orthoEditResume.test.jsx
// Regression coverage for: "when we click on edit assessment of patient
// profile it should take us to last page of assessment summary and
// review... not to pathway selection or region selection" -- tapping
// Edit on a patient's saved Ortho assessment must open the wizard already
// on Final Review with the saved data restored, not force the therapist
// back through pathway/region/condition selection for an assessment
// that's already fully answered.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { default: OrthoAssessment } = await import("../OrthoAssessment.jsx");

describe("OrthoAssessment resume (Edit Assessment)", () => {
  it("with no resume prop, starts at the pathway picker as before", () => {
    render(<OrthoAssessment />);
    expect(screen.getByText(/Which pathway is this assessment for/)).toBeTruthy();
  });

  it("with a resume prop, skips straight to Final Review with the saved data restored", async () => {
    const resume = {
      pathway: "outpatient",
      selectedRegions: [{ id: "shoulder", side: "left" }],
      condition: "general",
      customConditionLabel: undefined,
      data: {
        subjective: { chiefComplaint: "DISTINCTIVE_MARKER_12345 shoulder pain" },
      },
    };
    render(<OrthoAssessment resume={resume} onSave={() => {}} />);

    // Never shows the pathway/region/condition pickers.
    expect(screen.queryByText(/Which pathway is this assessment for/)).toBeNull();
    expect(screen.queryByText(/Which region\(s\) are involved/)).toBeNull();
    expect(screen.queryByText(/How do you want to start/)).toBeNull();

    // Lands on Final Review, not step 0 of the pathway's own internal
    // wizard -- the step-circle breadcrumb's own "Final Review" entry is
    // marked active (both the step-circle button and the section heading
    // below it say "Final Review", so this asserts on the active step
    // specifically rather than a plain, possibly-ambiguous text match).
    await screen.findByRole("button", { name: "Final Review" });
    expect(screen.getByRole("button", { name: "Final Review" }).className).toContain("step-active");

    // The saved answer is genuinely restored (initialData wired through),
    // not just a step-index jump into a blank wizard.
    expect(screen.getByText(/DISTINCTIVE_MARKER_12345/)).toBeTruthy();
  });
});
