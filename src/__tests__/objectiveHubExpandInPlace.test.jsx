// objectiveHubExpandInPlace.test.jsx
// ObjectiveHub (Objective step of the new Ortho assessment flow): shows an
// empty state until a body region is picked in Subjective, then shows ROM/
// MMT for that region -- expanding in place using the real ROMModule/
// MMTModule, scoped via the same REGION_NAV mapping the app already had
// (previously unused for rendering), not a fabricated region list.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { default: ObjectiveHub } = await import("../ObjectiveHub.jsx");

const PC = { accent:"#7c3aed", a2:"#9333ea", surface:"#fff", border:"#E0E0E2", text:"#0D0D0D", muted:"#6B6B6B", s2:"#f5f0fb" };

describe("ObjectiveHub", () => {
  it("shows an empty state with a link back to Subjective when no region is selected", () => {
    const navTo = vi.fn();
    render(<ObjectiveHub data={{}} set={vi.fn()} navTo={navTo} PC={PC} />);
    expect(screen.getByText(/No body region selected yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Go to Subjective/i));
    expect(navTo).toHaveBeenCalledWith("subjective");
  });

  it("shows ROM and MMT cards for a selected region, expanding the real modules in place", async () => {
    const navTo = vi.fn();
    const data = { cx_selected_regions: JSON.stringify(["Shoulder (L)"]) };
    render(<ObjectiveHub data={data} set={vi.fn()} navTo={navTo} PC={PC} />);

    expect(screen.getByText("Shoulder (L)")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Range of Motion/));
    // ROMModule's own mode-toggle button -- proves the real module rendered
    // inline, scoped to the Shoulder region via REGION_NAV's romRegion ctx.
    await screen.findByText("Active ROM");
    expect(navTo).not.toHaveBeenCalled();
  });

  it("shows a Clinical Observation card (general, not region-scoped) that expands the real ObservationModule in place", async () => {
    const navTo = vi.fn();
    const data = { cx_selected_regions: JSON.stringify(["Shoulder (L)"]) };
    render(<ObjectiveHub data={data} set={vi.fn()} navTo={navTo} PC={PC} />);

    fireEvent.click(screen.getByText(/Clinical Observation/));
    // ObservationModule's own section header -- proves the real module
    // (already used standalone via the sidebar) rendered inline here too.
    // Longer timeout: ClinicalModules.jsx (where ObservationModule lives)
    // is a large chunk and the lazy import needs more than the default
    // 1000ms to resolve in the test environment.
    await screen.findByText(/General Observation/i, {}, { timeout: 5000 });
    expect(navTo).not.toHaveBeenCalled();
  });

  it("shows a Suggest probable objective assessment button that opens the same 'What you've documented' summary as Subjective", async () => {
    // 2026-08-18: this button used to (wrongly) open ProbableDiagnosis --
    // it now opens the shared DocumentedSummaryModal (buildDocumentedSummary
    // / DocumentedSummaryModal, exported from SubjectiveObjective.jsx), the
    // exact same read-only summary of filled Subjective data that
    // Subjective's own "Suggest probable objective assessment" button shows.
    const navTo = vi.fn();
    const data = { cx_selected_regions: JSON.stringify(["Shoulder (L)"]), cc_main: "Right shoulder pain on overhead reaching" };
    render(<ObjectiveHub data={data} set={vi.fn()} navTo={navTo} PC={PC} />);

    fireEvent.click(screen.getByText(/Suggest probable objective assessment/));
    await screen.findByText(/What you've documented/i);
    expect(screen.getByText(/Right shoulder pain on overhead reaching/)).toBeInTheDocument();
    expect(navTo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Edit in Subjective/));
    expect(navTo).toHaveBeenCalledWith("subjective");
  });
});
