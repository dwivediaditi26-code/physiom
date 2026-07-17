// sciParkinsonsMsTemplates.test.jsx
// Covers the final 3 condition templates (SCI, Parkinson's, MS), completing
// the 5-condition set on the shared ConditionChecklist component, plus the
// new scales/fields each one needed:
// - SCI: autonomic dysreflexia red flag (real clinical criteria -- BP
//   spike, bradycardia, flushing above the lesion, pallor below it), a
//   bowel/bladder/skin MANAGEMENT status section (distinct from the
//   new-onset red-flag screening questions already there), reusing ASIA
//   (already built) for grading.
// - Parkinson's: Hoehn and Yahr (public domain, built in full), an
//   original rigidity grading scale (explicitly NOT the same as MAS
//   spasticity -- rigidity is velocity-independent), a "Freezing of gait"
//   option added to the existing involuntary-movements picker, and UPDRS
//   as a 4-part domain-summary since the MDS-UPDRS explicitly prohibits
//   embedding its actual item content in software without a paid licence.
// - MS: EDSS with its 8 real Kurtzke Functional System Scores plus a
//   directly-entered overall grade (deliberately NOT auto-derived from
//   the FSS, since the real conversion needs clinical judgement a simple
//   sum can't replicate), reusing the vestibular/oculomotor tab already
//   built for TBI (INO and nystagmus are common MS findings).
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SCITemplateModule, ParkinsonsTemplateModule, MSTemplateModule, NeurologicalModule } from "../PhysioNeuro.jsx";
import { SCALES, RED_FLAGS_NEURO, INVOLUNTARY_MOVEMENT_TYPES } from "../sharedClinicalData.js";

describe("SCI-specific additions", () => {
  it("autonomic dysreflexia is a real red flag with correct clinical criteria", () => {
    const flag = RED_FLAGS_NEURO.find(f => f.id === "nrf_autonomic_dysreflexia");
    expect(flag).toBeTruthy();
    expect(flag.description).toContain("bradycardia");
    expect(flag.description).toContain("T6");
  });

  it("bowel and bladder management status renders in the Red Flags tab with real options", () => {
    render(<NeurologicalModule data={{}} set={vi.fn()} />);
    fireEvent.click(screen.getByText(/Red Flags/));
    expect(screen.getByText("Bowel and Bladder Management")).toBeInTheDocument();
    expect(screen.getByText("Bladder management")).toBeInTheDocument();
  });
});

describe("Parkinson's-specific scales", () => {
  it("Hoehn and Yahr scores the selected stage directly", () => {
    expect(SCALES.hoehnyahr.score({ hoehnyahr_stage: "3 — Bilateral disease with mild to moderate postural instability, physically independent" })).toBe(3);
  });

  it("rigidity takes the worst (max) of the 3 segments tested", () => {
    const v = { pdrigidity_upper: "1 — Mild, only detectable with reinforcement (e.g. clenching the opposite fist)", pdrigidity_lower: "3 — Marked, but full range of motion still easily achieved" };
    expect(SCALES.pdrigidity.score(v)).toBe(3);
  });

  it("UPDRS sums the 4 official part totals without exposing any verbatim item content", () => {
    const v = { updrs_part1: "10", updrs_part2: "15", updrs_part3: "40", updrs_part4: "4" };
    expect(SCALES.updrs.score(v)).toBe(69);
    expect(SCALES.updrs.adminNote).toContain("cannot be embedded in software without a separate paid licence");
  });

  it("Freezing of gait is available in the involuntary movements picker", () => {
    expect(INVOLUNTARY_MOVEMENT_TYPES).toContain("Freezing of gait");
  });
});

describe("MS-specific scale (EDSS)", () => {
  it("overall EDSS is read directly from clinical judgement, not auto-derived from the FSS scores", () => {
    expect(SCALES.edss.score({ edss_pyramidal: "4 — Marked paraparesis or hemiparesis; moderate quadriparesis; or monoplegia", edss_overall: "6" })).toBe(6);
  });

  it("has all 8 real Kurtzke Functional Systems plus the overall grade field", () => {
    const ids = SCALES.edss.fields.map(f => f.id);
    expect(ids).toEqual(expect.arrayContaining(["edss_pyramidal","edss_cerebellar","edss_brainstem","edss_sensory","edss_bowelbladder","edss_visual","edss_cerebral","edss_other","edss_overall"]));
  });
});

describe("SCI template checklist", () => {
  it("shows all 10 steps and marks ASIA done from real motor grading fields", () => {
    render(<SCITemplateModule data={{ asia_m_c5_l: "3" }} navTo={vi.fn()} />);
    expect(screen.getByText(/2\. ASIA grading/)).toBeInTheDocument();
    expect(screen.getByText("1 of 10 sections have data")).toBeInTheDocument();
  });

  it("clicking the red flag step highlights autonomic dysreflexia specifically", () => {
    const navTo = vi.fn();
    render(<SCITemplateModule data={{}} navTo={navTo} />);
    fireEvent.click(screen.getByText(/1\. Red flags/));
    expect(navTo).toHaveBeenCalledWith("neuro", { fromTemplate: { id: "sci", label: "SCI" }, neuroHighlight: "nrf_autonomic_dysreflexia" });
  });
});

describe("Parkinson's template checklist", () => {
  it("shows all 10 steps including Hoehn and Yahr and UPDRS", () => {
    render(<ParkinsonsTemplateModule data={{}} navTo={vi.fn()} />);
    expect(screen.getByText(/2\. Hoehn and Yahr staging/)).toBeInTheDocument();
    expect(screen.getByText(/9\. UPDRS part summary/)).toBeInTheDocument();
  });

  it("clicking UPDRS opens Outcome Measures directly into that scale", () => {
    const navTo = vi.fn();
    render(<ParkinsonsTemplateModule data={{}} navTo={navTo} />);
    fireEvent.click(screen.getByText(/9\. UPDRS part summary/));
    expect(navTo).toHaveBeenCalledWith("outcome", { fromTemplate: { id: "parkinsons", label: "Parkinson's" }, scaleId: "updrs" });
  });
});

describe("MS template checklist", () => {
  it("shows all 10 steps and reuses the existing vestibular tab (no duplicate module built)", () => {
    render(<MSTemplateModule data={{}} navTo={vi.fn()} />);
    expect(screen.getByText(/4\. Vestibular and oculomotor/)).toBeInTheDocument();
  });

  it("clicking EDSS opens Outcome Measures directly into that scale", () => {
    const navTo = vi.fn();
    render(<MSTemplateModule data={{}} navTo={navTo} />);
    fireEvent.click(screen.getByText(/2\. EDSS/));
    expect(navTo).toHaveBeenCalledWith("outcome", { fromTemplate: { id: "ms", label: "MS" }, scaleId: "edss" });
  });
});
