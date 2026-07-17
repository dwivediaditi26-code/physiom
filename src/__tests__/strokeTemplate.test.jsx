// strokeTemplate.test.jsx
// Covers the Stroke template checklist (second condition after TBI, built
// by generalizing the checklist into a shared ConditionChecklist component
// rather than duplicating the TBI one), plus the two new scales it needed:
// Brunnstrom Recovery Stages (staged separately per limb since arm/hand/leg
// often recover at different rates) and the Modified Rankin Scale (global
// disability, 0-6, widely used and non-copyrighted).
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StrokeTemplateModule, TBITemplateModule } from "../PhysioNeuro.jsx";
import { SCALES } from "../sharedClinicalData.js";

describe("Brunnstrom Recovery Stages scale", () => {
  it("sums arm, hand, and leg stages", () => {
    const v = { brunnstrom_arm: "4 — IV. Spasticity declining; some movement combinations outside basic synergy are mastered", brunnstrom_hand: "3 — III. Spasticity peaks; voluntary control of movement synergies present, cannot move outside synergy", brunnstrom_leg: "5 — V. Spasticity continues to decline; more complex movement combinations independent of synergy" };
    expect(SCALES.brunnstrom.score(v)).toBe(12);
  });

  it("returns null unless all three segments are staged (partial data isn't a valid combined score)", () => {
    expect(SCALES.brunnstrom.score({ brunnstrom_arm: "3 — III. Spasticity peaks; voluntary control of movement synergies present, cannot move outside synergy" })).toBeNull();
  });

  it("interprets a low average as severe and a high average as near-full recovery", () => {
    expect(SCALES.brunnstrom.interpret(3).label).toContain("Severe");
    expect(SCALES.brunnstrom.interpret(18).label).toContain("Near-full recovery");
  });
});

describe("Modified Rankin Scale", () => {
  it("scores the selected grade directly", () => {
    expect(SCALES.rankin.score({ rankin_grade: "3 — Moderate disability; requires some help, but able to walk unassisted" })).toBe(3);
  });

  it("interprets grade 1 as no significant disability and grade 6 as death", () => {
    expect(SCALES.rankin.interpret(1).label).toBe("No significant disability");
    expect(SCALES.rankin.interpret(6).label).toBe("Death");
  });
});

describe("Stroke template checklist", () => {
  it("shows all 10 steps, all undone, for a blank patient", () => {
    render(<StrokeTemplateModule data={{}} navTo={vi.fn()} />);
    expect(screen.getByText("0 of 10 sections have data")).toBeInTheDocument();
    expect(screen.getByText(/1\. Red flags/)).toBeInTheDocument();
    expect(screen.getByText(/2\. NIHSS severity/)).toBeInTheDocument();
    expect(screen.getByText(/5\. Brunnstrom recovery stages/)).toBeInTheDocument();
    expect(screen.getByText(/9\. Modified Rankin Scale/)).toBeInTheDocument();
  });

  it("marks Brunnstrom done once at least one segment is staged", () => {
    render(<StrokeTemplateModule data={{ brunnstrom_arm: "3 — III. Spasticity peaks; voluntary control of movement synergies present, cannot move outside synergy" }} navTo={vi.fn()} />);
    expect(screen.getByText("1 of 10 sections have data")).toBeInTheDocument();
  });

  it("clicking NIHSS opens Outcome Measures directly into that scale", () => {
    const navTo = vi.fn();
    render(<StrokeTemplateModule data={{}} navTo={navTo} />);
    fireEvent.click(screen.getByText(/2\. NIHSS severity/));
    expect(navTo).toHaveBeenCalledWith("outcome", { fromTemplate: { id: "stroke", label: "Stroke" }, scaleId: "nihss" });
  });

  it("clicking Modified Rankin Scale opens Outcome Measures directly into that scale", () => {
    const navTo = vi.fn();
    render(<StrokeTemplateModule data={{}} navTo={navTo} />);
    fireEvent.click(screen.getByText(/9\. Modified Rankin Scale/));
    expect(navTo).toHaveBeenCalledWith("outcome", { fromTemplate: { id: "stroke", label: "Stroke" }, scaleId: "rankin" });
  });

  it("clicking the red flag step reuses the same evolving-consciousness-change flag TBI uses (no duplicate flag was created)", () => {
    const navTo = vi.fn();
    render(<StrokeTemplateModule data={{}} navTo={navTo} />);
    fireEvent.click(screen.getByText(/1\. Red flags/));
    expect(navTo).toHaveBeenCalledWith("neuro", { fromTemplate: { id: "stroke", label: "Stroke" }, neuroHighlight: "nrf_loc_change" });
  });

  it("TBI template still works unchanged after the shared-component refactor", () => {
    render(<TBITemplateModule data={{}} navTo={vi.fn()} />);
    expect(screen.getByText("TBI template")).toBeInTheDocument();
    expect(screen.getByText("0 of 10 sections have data")).toBeInTheDocument();
  });
});
