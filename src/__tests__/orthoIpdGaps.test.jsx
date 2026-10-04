// Gaps found by walking the Ortho IPD wizard with five published inpatient cases
// (post-amputation, post-lumbar-surgery paraplegia, two hip replacements, tibial
// osteotomy): no height/weight/BMI, no ADL or pressure-risk measure, no
// cauda-equina/bladder-bowel screen after spine surgery, no stairs or home
// environment for discharge planning.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { default: OrthoIPDAssessment } = await import("../OrthoIPDAssessment.jsx");
const { MEASURES, suggestMeasures } = await import("../orthoOutcomeMeasureData.js");
const { resolveSurgicalOptions } = await import("../orthoSurgicalLibrary.js");

const answersAll = (measure, pick) => Object.fromEntries(measure.items.map((it) => [it.id, pick(it)]));
const maxOf = (it) => Math.max(...it.options.map((o) => o.value));
const minOf = (it) => Math.min(...it.options.map((o) => o.value));

describe("Barthel Index", () => {
  const b = MEASURES.barthel;
  it("has the ten standard activities and totals 100 at best", () => {
    expect(b.items).toHaveLength(10);
    expect(b.score(answersAll(b, maxOf))).toBe(100);
    expect(b.maxScore).toBe(100);
  });
  it("scores 0 for total dependence and bands correctly", () => {
    expect(b.score(answersAll(b, minOf))).toBe(0);
    expect(b.interpret(0).label).toBe("Total dependence");
    expect(b.interpret(20).label).toBe("Total dependence");
    expect(b.interpret(21).label).toBe("Severe dependence");
    expect(b.interpret(60).label).toBe("Severe dependence");
    expect(b.interpret(61).label).toBe("Moderate dependence");
    expect(b.interpret(90).label).toBe("Moderate dependence");
    expect(b.interpret(91).label).toBe("Slight dependence");
    expect(b.interpret(100).label).toBe("Independent");
  });
  it("gives no score until every item is answered", () => {
    expect(b.score({ bi_feeding: 10 })).toBeNull();
  });
});

describe("Braden Scale", () => {
  const br = MEASURES.braden;
  it("runs 6 (highest risk) to 23 (no risk)", () => {
    expect(br.score(answersAll(br, minOf))).toBe(6);
    expect(br.score(answersAll(br, maxOf))).toBe(23);
    expect(br.interpret(6).label).toBe("Very high risk");
    expect(br.interpret(9).label).toBe("Very high risk");
    expect(br.interpret(10).label).toBe("High risk");
    expect(br.interpret(13).label).toBe("Moderate risk");
    expect(br.interpret(15).label).toBe("Mild risk");
    expect(br.interpret(19).label).toBe("No risk");
  });
});

describe("suggestMeasures", () => {
  it("adds pathway-level recommendations alongside region ones", () => {
    const { recommended } = suggestMeasures({ selectedRegions: [], extraRecommended: [{ id: "barthel", reason: "ADL" }] });
    expect(recommended.map((r) => r.id)).toContain("barthel");
  });
});

function openStep(name) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("IPD wizard", () => {
  it("Vitals: height and weight give a BMI with a category", () => {
    render(<OrthoIPDAssessment selectedRegions={[{ id: "hip", side: "left" }]} condition="jointReplacement" onSave={() => {}} onExit={() => {}} />);
    openStep("Vital Signs");
    const field = (label) => screen.getByText(label).closest(".vital-field").querySelector("input");
    fireEvent.change(field("Height"), { target: { value: "170" } });
    fireEvent.change(field("Weight"), { target: { value: "51.5" } });
    // 51.5 / 1.7^2 = 17.8 -- the underweight patient in the published AVN case
    expect(screen.getByText(/BMI 17\.8 kg\/m²/)).toBeTruthy();
    expect(screen.getByText(/Underweight/)).toBeTruthy();
    cleanup();
  });

  it("Functional Mobility offers home environment and discharge planning; Gait offers stairs", () => {
    render(<OrthoIPDAssessment selectedRegions={[{ id: "hip", side: "right" }]} condition="jointReplacement" onSave={() => {}} onExit={() => {}} />);
    openStep("Functional Mobility");
    expect(screen.getByText(/Home environment/)).toBeTruthy();
    expect(screen.getByText("Toilet type")).toBeTruthy();
    expect(screen.getByText("Equipment needed")).toBeTruthy();
    expect(screen.getByText("Planned discharge")).toBeTruthy();
    openStep("Gait / Ambulation");
    expect(screen.getByText("Stairs")).toBeTruthy();
    cleanup();
  });

  it("Spine: Neuro Screen has a bladder/bowel/saddle screen that raises an emergency alert", () => {
    render(<OrthoIPDAssessment selectedRegions={[{ id: "lumbar" }]} condition="spine" onSave={() => {}} onExit={() => {}} />);
    openStep("Neuro Screen");
    expect(screen.getByText("Saddle (perineal) numbness")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    const group = screen.getByText("Saddle (perineal) numbness").closest(".field-label-row").parentElement;
    fireEvent.click(within(group).getByRole("button", { name: "Present" }));
    expect(screen.getByRole("alert").textContent).toMatch(/cauda equina/i);
    cleanup();
  });

  it("Non-spine conditions do not show the cauda equina screen", () => {
    render(<OrthoIPDAssessment selectedRegions={[{ id: "knee", side: "right" }]} condition="fracture" onSave={() => {}} onExit={() => {}} />);
    // fracture pathway has no Neuro Screen step promoted; add via the shared section is spine-only
    expect(screen.queryByText("Saddle (perineal) numbness")).toBeNull();
    cleanup();
  });

  it("Outcome Measure step recommends Barthel (and Braden for spine)", () => {
    render(<OrthoIPDAssessment selectedRegions={[{ id: "lumbar" }]} condition="spine" onSave={() => {}} onExit={() => {}} />);
    openStep("Outcome Measure");
    expect(screen.getByText("Barthel Index")).toBeTruthy();
    expect(screen.getByText("Braden Scale")).toBeTruthy();
    expect(screen.getAllByText(/Suggested/).length).toBeGreaterThanOrEqual(2);
    cleanup();
  });

  it("Post-operative offers surgical options (incl. osteotomy and bone graft) instead of an empty list", () => {
    const o = resolveSurgicalOptions([{ id: "knee", side: "right" }], "postop");
    expect(o.procedures).toContain("High tibial osteotomy — medial opening wedge");
    expect(o.graft).toContain("Allograft (e.g. fibular strut)");
    expect(o.graft).toContain("Synthetic bone substitute (e.g. beta-TCP)");
    expect(o.fixation.length).toBeGreaterThan(0);
    // still includes the ordinary knee options
    expect(o.procedures).toContain("ACL reconstruction");
  });

  it("Weight-bearing restriction asks how long, and fracture/post-op shows bone healing", () => {
    render(<OrthoIPDAssessment selectedRegions={[{ id: "knee", side: "right" }]} condition="postop" onSave={() => {}} onExit={() => {}} />);
    openStep("Medical / Chart Review");
    expect(screen.queryByText("Weight-bearing restricted for / until")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "NWB" }));
    expect(screen.getByText("Weight-bearing restricted for / until")).toBeTruthy();
    expect(screen.getByText("Weight-bearing review date")).toBeTruthy();
    expect(screen.getByText("Bone healing (radiology)")).toBeTruthy();
    expect(screen.getByText("Union status")).toBeTruthy();
    cleanup();
  });

  it("Amputation: the Wound step has a residual limb and phantom limb block", () => {
    render(<OrthoIPDAssessment selectedRegions={[{ id: "leg", side: "left" }]} condition="amputation" onSave={() => {}} onExit={() => {}} />);
    openStep("Wound / Surgical Site");
    expect(screen.getByText("Phantom limb symptoms")).toBeTruthy();
    expect(screen.getByText("Circumference, distal")).toBeTruthy();
    expect(screen.getByText("Contralateral limb check")).toBeTruthy();
    expect(screen.getByText("Prosthetic goal")).toBeTruthy();
    cleanup();
  });

  it("Other conditions do not show the residual limb block", () => {
    render(<OrthoIPDAssessment selectedRegions={[{ id: "knee", side: "right" }]} condition="postop" onSave={() => {}} onExit={() => {}} />);
    openStep("Wound / Surgical Site");
    expect(screen.queryByText("Phantom limb symptoms")).toBeNull();
    cleanup();
  });

  it("Limb Length is available on joint replacement and fracture pathways", () => {
    render(<OrthoIPDAssessment selectedRegions={[{ id: "hip", side: "left" }]} condition="jointReplacement" onSave={() => {}} onExit={() => {}} />);
    openStep("Limb Length");
    expect(screen.getByText(/Limb Length Discrepancy/)).toBeTruthy();
    expect(screen.getByText("True length")).toBeTruthy();
    cleanup();
    render(<OrthoIPDAssessment selectedRegions={[{ id: "knee", side: "right" }]} condition="fracture" onSave={() => {}} onExit={() => {}} />);
    expect(screen.getByRole("button", { name: "Limb Length" })).toBeTruthy();
    cleanup();
  });
});
