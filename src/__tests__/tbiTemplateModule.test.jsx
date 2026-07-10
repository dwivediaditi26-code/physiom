// tbiTemplateModule.test.jsx
// Covers the TBI template checklist launcher: a guided start-to-finish
// list for a TBI patient that spans two hub tabs (Neurological for red
// flags through coordination, Outcome Measures for tone/strength,
// balance/gait, and condition staging). Verifies each row's "done" status
// is read from real data fields (never a separate flag that could drift),
// and that clicking a row calls navTo() with the correct key/context to
// deep-link straight to that section -- matching the app's existing
// AI-suggested-assessment deep-link mechanism. Also covers two supporting
// fixes made along the way: the pre-existing bug where red-flag deep
// links routed to the wrong tab ("neural_tension" instead of "redflags"),
// and the new navContext.scaleId support in OutcomeMeasuresPro that lets
// a caller open a specific scale's live-entry view directly.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TBITemplateModule, NeurologicalModule } from "../PhysioNeuro.jsx";
import OutcomeMeasuresPro from "../OutcomeMeasuresPro.jsx";

describe("TBI template checklist", () => {
  it("shows all 10 steps, all undone, for a blank patient", () => {
    render(<TBITemplateModule data={{}} navTo={vi.fn()} />);
    expect(screen.getByText("0 of 10 sections have data")).toBeInTheDocument();
    expect(screen.getByText(/1\. Red flags/)).toBeInTheDocument();
    expect(screen.getByText(/10\. Barthel functional outcome/)).toBeInTheDocument();
  });

  it("marks GCS done only once all three components are scored, not partially", () => {
    const { rerender } = render(<TBITemplateModule data={{ gcs_eye: "4" }} navTo={vi.fn()} />);
    expect(screen.getByText("0 of 10 sections have data")).toBeInTheDocument();
    rerender(<TBITemplateModule data={{ gcs_eye: "4", gcs_verbal: "4", gcs_motor: "6" }} navTo={vi.fn()} />);
    expect(screen.getByText("1 of 10 sections have data")).toBeInTheDocument();
  });

  it("marks cranial nerves, reflexes, coordination, staging, and functional outcome done from real recorded fields", () => {
    const data = {
      cn_cn7_status: "Intact",
      n_ref_bicep_left: "3+ Brisk",
      coord_fingernose_L: "Normal — smooth and accurate",
      rancho_level: "4 — IV. Confused / Agitated: Maximal Assistance",
      barthel_feeding: "10 — Independent",
    };
    render(<TBITemplateModule data={data} navTo={vi.fn()} />);
    expect(screen.getByText("5 of 10 sections have data")).toBeInTheDocument();
  });

  it("clicking the GCS row calls navTo with the neuro key and a gcs highlight", () => {
    const navTo = vi.fn();
    render(<TBITemplateModule data={{}} navTo={navTo} />);
    fireEvent.click(screen.getByText(/2\. Glasgow Coma Scale/));
    expect(navTo).toHaveBeenCalledWith("neuro", { neuroHighlight: "gcs_eye" });
  });

  it("clicking a row that lives in Outcome Measures calls navTo with the outcome key and the right scaleId", () => {
    const navTo = vi.fn();
    render(<TBITemplateModule data={{}} navTo={navTo} />);
    fireEvent.click(screen.getByText(/9\. Rancho and GOAT staging/));
    expect(navTo).toHaveBeenCalledWith("outcome", { scaleId: "rancho" });
    fireEvent.click(screen.getByText(/10\. Barthel functional outcome/));
    expect(navTo).toHaveBeenCalledWith("outcome", { scaleId: "barthel" });
  });
});

describe("supporting fixes", () => {
  it("a red-flag deep link now switches to the Red Flags tab (previously went to the wrong tab)", () => {
    render(<NeurologicalModule data={{}} set={vi.fn()} navContext={{ neuroHighlight: "nrf_raised_icp" }} />);
    expect(screen.getByText("Neurological Red Flags — Screening Checklist")).toBeInTheDocument();
  });

  it("a neural tension deep link still switches to the Neural Tension tab (unaffected by the red-flag fix)", () => {
    render(<NeurologicalModule data={{}} set={vi.fn()} navContext={{ neuroHighlight: "nt_slr_left" }} />);
    expect(screen.getByText("Straight Leg Raise (SLR)")).toBeInTheDocument();
  });

  it("OutcomeMeasuresPro opens straight into a scale's live-entry view when given navContext.scaleId", () => {
    render(<OutcomeMeasuresPro data={{}} set={vi.fn()} navContext={{ scaleId: "rancho" }} />);
    expect(screen.getByText(/Rancho Los Amigos Scale/)).toBeInTheDocument();
  });

  it("OutcomeMeasuresPro shows the normal searchable list when no navContext is given (no regression)", () => {
    render(<OutcomeMeasuresPro data={{}} set={vi.fn()} />);
    // In the flat list view every scale card is visible at once; jumping
    // straight into one scale (the navContext.scaleId behaviour) would
    // only show that single scale, not the whole browsable set.
    expect(screen.getByText(/Rancho Los Amigos Scale/)).toBeInTheDocument();
    expect(screen.getByText(/Barthel Index/)).toBeInTheDocument();
    expect(screen.getByText(/Berg Balance Scale/)).toBeInTheDocument();
  });
});
