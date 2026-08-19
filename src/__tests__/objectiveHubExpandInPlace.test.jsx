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

    // 2026-08-19: "Shoulder (L)" now legitimately appears twice -- once as
    // this section's own heading, and again in the "Suggest probable
    // objective assessment" engine's subtitle (SubjectiveModule mounted in
    // resultsOnly mode, see below) -- so this can no longer assert a single
    // match.
    expect(screen.getAllByText("Shoulder (L)").length).toBeGreaterThan(0);
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

  it("shows a Suggest probable objective assessment button that runs the real clinical interpretation engine", async () => {
    // 2026-08-19: this button used to just open a read-only "documented
    // fields" summary. That was a placeholder -- the real engine (the
    // same runEngineV6 clinical reasoning that used to live in the old
    // Subjective form's own "Suggest probable objective assessment" ->
    // "Interpretation" flow) is now reused here via SubjectiveModule's
    // `resultsOnly` mode,
    // per the user's request to move that capability from Subjective to
    // Objective (its actual home -- it suggests which objective tests to
    // prioritize). Clicking through should show the same "What you've
    // documented" pre-flight summary, then actually run analysis and
    // render an interpretation, not just navigate away to Subjective.
    const navTo = vi.fn();
    const data = { cx_selected_regions: JSON.stringify(["Shoulder (L)"]), cc_main: "Right shoulder pain on overhead reaching" };
    render(<ObjectiveHub data={data} set={vi.fn()} navTo={navTo} PC={PC} />);

    fireEvent.click(screen.getByText(/Suggest probable objective assessment/));
    await screen.findByText(/What you've documented/i);
    expect(screen.getByText(/Right shoulder pain on overhead reaching/)).toBeInTheDocument();
    expect(navTo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(/🧠 Run analysis/));
    // Interpretation rendered inline, right here on Objective -- real
    // differential-matching content (Phase 0.5), not just a summary, and
    // it even picked up "overhead" from the free-text complaint above.
    // No navigation away, and no leftover "Assessment" (field-entry) tab
    // since resultsOnly hides it.
    await screen.findByText(/Phase 0\.5.*Shoulder Condition Matches/);
    expect(screen.getAllByText(/overhead activity aggravates/i).length).toBeGreaterThan(0);
    expect(navTo).not.toHaveBeenCalled();
    expect(screen.queryByText("📝 Assessment")).not.toBeInTheDocument();
  });
});
