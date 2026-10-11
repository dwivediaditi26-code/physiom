// carePlanExerciseAddEdit.test.jsx -- 2026-10-11, Aditi: in Care Plan Treatment the exercise list "is showing add button. And it
// should have second edit button, so we can edit the doses if we want. And add the exercise if we directly add it, and it
// should show the doses below the exercise."
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { OrthoCarePlanStep } from "../OrthoCarePlan.jsx";

function setup() {
  const saved = [];
  const onSave = vi.fn((key, value) => { if (key === "ortho_care_plan") saved.push(value); });
  render(
    <OrthoCarePlanStep
      patientData={{}}
      onSave={onSave}
      selectedRegions={[{ id: "cervical", label: "Cervical" }]}
      condition="general"
      setting="outpatient"
      pain={{ now: 5, worst: 7 }}
      phase="treatment"
    />
  );
  // Treatment types -> All
  fireEvent.click(screen.getByText("All").closest("button"));
  return { saved, onSave, lastPlan: () => saved[saved.length - 1] };
}

describe("Care Plan Treatment: exercise rows", () => {
  it("each exercise has an Add and an Edit button", () => {
    setup();
    expect(screen.getByRole("button", { name: "Add Chin Tucks to plan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit dose of Chin Tucks" })).toBeTruthy();
  });

  it("Add puts the exercise straight on the plan and shows its dose under the exercise", () => {
    const { lastPlan } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Add Chin Tucks to plan" }));
    const plan = lastPlan();
    expect(plan.treatments).toHaveLength(1);
    expect(plan.treatments[0]).toMatchObject({ exerciseId: "cx_chin_tuck", name: "Chin Tucks", goalIds: [] });
    const row = screen.getByRole("button", { name: "Edit dose of Chin Tucks" }).closest(".ct-item");
    expect(within(row).getByText("✓ Added")).toBeTruthy();
    const dose = within(row).getByTestId("dose-under-exercise");
    expect(dose.textContent).toMatch(/\d+ × \d+/);
    // we stayed on the exercise list, not thrown back to the treatment types
    expect(screen.getByRole("button", { name: "Add Cervical Rotation AROM to plan" })).toBeTruthy();
  });

  it("Edit opens the dose page, and Save dose updates the dose shown under the exercise", () => {
    const { lastPlan } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Add Chin Tucks to plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit dose of Chin Tucks" }));
    expect(screen.getByText("Dose")).toBeTruthy();
    const freq = screen.getByPlaceholderText("e.g. 3 × / week");
    fireEvent.change(freq, { target: { value: "Twice a day" } });
    fireEvent.click(screen.getByRole("button", { name: "Save dose" }));
    expect(lastPlan().treatments).toHaveLength(1); // updated in place, not added twice
    expect(lastPlan().treatments[0].freq).toBe("Twice a day");
    const row = screen.getByRole("button", { name: "Edit dose of Chin Tucks" }).closest(".ct-item");
    expect(within(row).getByTestId("dose-under-exercise").textContent).toMatch(/Twice a day/);
  });

  it("Edit before adding opens the dose page first, and Add to plan adds it with the changed dose", () => {
    const { lastPlan } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Edit dose of Chin Tucks" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. 3 × / week"), { target: { value: "Daily x2" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    expect(lastPlan().treatments).toHaveLength(1);
    expect(lastPlan().treatments[0].freq).toBe("Daily x2");
  });
});
