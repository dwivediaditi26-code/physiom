// Gaps found by running five published neuro cases (stroke x2, SCI C6 AIS-B, Guillain-Barre,
// severe TBI GCS 3T) through the Neuro wizard: GCS could not record an intubated patient,
// SCI had one free-text level and no ISNCSCI totals / anal checks, no vitals, no GBS template,
// no consciousness-level or neurosurgical items for TBI, and info cards had no photo upload.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { default: NeurologicalAssessment } = await import("../NeurologicalAssessment.jsx");
const { neuroConditionLibraryData } = await import("../neuroConditionLibraryData.js");
const { neuroExamLibraryData } = await import("../neuroExamLibraryData.js");
const { neuroRegionInfoData } = await import("../neuroRegionInfoData.js");

const clickText = (re) => {
  const el = screen.queryAllByRole("button").find((b) => re.test((b.textContent || "").trim()));
  if (!el) throw new Error("no button " + re);
  fireEvent.click(el);
};
function startTemplate(setting, template) {
  render(<NeurologicalAssessment />);
  clickText(new RegExp("^" + setting));
  clickText(/^(Continue|Next)/i);
  clickText(/Use Template/);
  clickText(new RegExp("^" + template));
}
const inputFor = (label) => screen.getByText(label).closest(".vital-field").querySelector("input");

describe("GCS records a component that cannot be tested", () => {
  it("shows 3T (not 4/15) for an intubated patient with E1 M2", () => {
    const neuro = { meta: { setting: "icu", condition: "tbi" }, cognition: { gcsEye: "1 - None", gcsVerbal: "T - Intubated / tracheostomy (not testable)", gcsMotor: "2 - Abnormal extension" } };
    render(<NeurologicalAssessment patientData={{ neuro }} navContext={{ wizardStep: "cognition" }} />);
    expect(screen.getByText(/GCS 3T/)).toBeTruthy();
    expect(screen.queryByText(/Total GCS: 4\/15/)).toBeNull();
    cleanup();
  });
  it("a full score still shows the plain total", () => {
    const neuro = { meta: { setting: "inpatient", condition: "tbi" }, cognition: { gcsEye: "3 - To voice", gcsVerbal: "4 - Confused", gcsMotor: "6 - Obeys commands" } };
    render(<NeurologicalAssessment patientData={{ neuro }} navContext={{ wizardStep: "cognition" }} />);
    expect(screen.getByText(/Total GCS: 13\/15/)).toBeTruthy();
    cleanup();
  });
});

describe("Safety step has vital signs", () => {
  it("asks for blood pressure and heart rate", () => {
    const neuro = { meta: { setting: "inpatient", condition: "stroke" } };
    render(<NeurologicalAssessment patientData={{ neuro }} navContext={{ wizardStep: "safety" }} />);
    expect(screen.getByText("BP systolic")).toBeTruthy();
    expect(screen.getByText("Heart rate")).toBeTruthy();
    cleanup();
  });
});

describe("Spinal cord injury template", () => {
  it("records ISNCSCI levels, totals and sacral sparing, and explains the result", () => {
    startTemplate("Neuro Rehabilitation", "Spinal Cord Injury");
    clickText(/^Neurological level of injury/);
    for (const label of ["Sensory level — right", "Sensory level — left", "Motor level — right", "Motor level — left", "Upper extremity motor score", "Light touch total", "Voluntary anal contraction (VAC)", "Deep anal pressure (DAP)"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    for (const label of ["Voluntary anal contraction (VAC)", "Deep anal pressure (DAP)", "Light touch or pinprick felt at S4-5"]) {
      const group = screen.getByText(label).closest(".field-label-row, .field-head, div").parentElement;
      fireEvent.click(within(group).getByRole("button", { name: "No" }));
    }
    expect(screen.getByText(/No sacral sparing on all three checks/)).toBeTruthy();
    cleanup();
  });
  it("includes the Outcome Measures step", () => {
    startTemplate("Neuro Rehabilitation", "Spinal Cord Injury");
    expect(screen.getAllByRole("button").some((b) => /^Outcome Measures/.test((b.textContent || "").trim()))).toBe(true);
    cleanup();
  });
});

describe("Guillain-Barre template", () => {
  it("adds cranial nerves, respiratory checks and the GBS course item", () => {
    startTemplate("Inpatient", "Guillain");
    const names = screen.getAllByRole("button").map((b) => (b.textContent || "").trim());
    expect(names.some((n) => /^Cranial Nerve/.test(n))).toBe(true);
    expect(names.some((n) => /^Respiratory status/.test(n))).toBe(true);
    expect(names.some((n) => /^Cough effectiveness/.test(n))).toBe(true);
    clickText(/^Guillain-Barré course/);
    expect(screen.getByText("Hughes disability grade")).toBeTruthy();
    expect(screen.getByText("Immunotherapy")).toBeTruthy();
    cleanup();
  });
  it("warns when vital capacity is under 20 mL/kg", () => {
    startTemplate("Inpatient", "Guillain");
    clickText(/^Respiratory status/);
    expect(screen.queryByText(/20\/30\/40 thresholds/)).toBeNull();
    fireEvent.change(inputFor("Vital capacity"), { target: { value: "15" } });
    expect(screen.getByText(/20\/30\/40 thresholds/)).toBeTruthy();
    cleanup();
  });
});

describe("TBI template", () => {
  it("has consciousness-level and neurosurgical-status items", () => {
    startTemplate("Inpatient", "TBI");
    const names = screen.getAllByRole("button").map((b) => (b.textContent || "").trim());
    expect(names.some((n) => /^Level of consciousness/.test(n))).toBe(true);
    expect(names.some((n) => /^Neurosurgical status/.test(n))).toBe(true);
    cleanup();
  });
});

describe("Stroke: Fugl-Meyer sub-scores fill the total", () => {
  it("adds the sub-scores into the UE motor total", () => {
    startTemplate("Inpatient", "Stroke");
    clickText(/^Fugl-Meyer Assessment/);
    fireEvent.change(inputFor("Shoulder / elbow / forearm"), { target: { value: "23" } });
    fireEvent.change(inputFor("Wrist"), { target: { value: "0" } });
    fireEvent.change(inputFor("Hand"), { target: { value: "10" } });
    expect(inputFor("UE motor (total)").value).toBe("33");
    cleanup();
  });
});

describe("Info cards offer photo upload", () => {
  const cards = [
    ...Object.entries(neuroConditionLibraryData),
    ...Object.entries(neuroExamLibraryData),
    ...Object.entries(neuroRegionInfoData),
  ];
  it("every neuro card has three Cloudinary photo slots", () => {
    const bad = cards.filter(([, c]) => {
      const imgs = c.perform.images;
      return !Array.isArray(imgs) || imgs.length !== 3 || imgs.some((u) => !u || !String(u).startsWith("https://res.cloudinary.com/"));
    }).map(([k]) => k);
    expect(bad).toEqual([]);
  });
  it("slot ids are unique per card", () => {
    const firsts = cards.map(([, c]) => c.perform.images[0]);
    expect(new Set(firsts).size).toBe(firsts.length);
  });
});
