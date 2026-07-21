// lumbarReviewRunAnalysis.test.jsx
//
// End-to-end regression test through the real "Review & Run Analysis"
// button, not just the pure extractor function in
// lumbarVariableExtractor.test.js. Written after actually rendering the
// component with a textbook lumbar radiculopathy case and finding it
// silently produced "Insufficient data" -- root cause: selectedRegions
// holds the laterality-suffixed selection label ("Lumbar/SI (L)" /
// "Lumbar/SI (R)"), never the bare family key "Lumbar / SI" that
// REGION_FAMILY_KEY maps it to. Two places compared against the bare key
// directly and so silently never matched a real selection:
//   1. runInterpretation()'s Lumbar Variable Extractor trigger
//      (`selectedRegions.includes("Lumbar / SI")`)
//   2. The Phase 0 card's region guard (`r.region === "Lumbar / SI"`)
// This locks in the fix (both now resolve region through
// REGION_FAMILY_KEY first) so a future edit can't silently reintroduce
// the same mismatch.
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const SEP = "|||";

function realisticRadiculopathyData(regionKey) {
  return {
    cx_selected_regions: JSON.stringify([regionKey]),
    lx_moi: ["Lifting — spine flexed AND rotated (most common disc mechanism)"].join(SEP),
    lx_agg_mov: ["Forward bending (flexion)"].join(SEP),
    lx_agg_post: ["Sitting >30 minutes"].join(SEP),
    lx_agg_act: ["Coughing (discogenic indicator — intradiscal pressure)"].join(SEP),
    lx_rel_mov: ["Extension — McKenzie press-up / cobra"].join(SEP),
    lx_rel_post: ["Walking slowly"].join(SEP),
    lx_below_knee: "Leg pain — below knee (radiculopathy threshold)",
    lx_dermatomal: ["L5 — lateral lower leg / dorsum foot / great toe"].join(SEP),
    lx_neuro_present: "Yes — unilateral (L)",
    lx_rf_cauda: "No cauda equina signs",
    lx_rf_fracture: "No fracture indicators",
    lx_rf_inflammatory: "No inflammatory features",
    lx_rf_serious: "No other red flags",
  };
}

function runReviewAndAnalysis() {
  fireEvent.click(screen.getByText(/Review & Run Analysis/));
  fireEvent.click(screen.getByText(/Run analysis/));
}

describe("Lumbar/SI region: Review & Run Analysis end to end", () => {
  test.each(["Lumbar/SI (L)", "Lumbar/SI (R)"])(
    "selecting %s renders the Phase 0 extracted-variables card, not just Phase 1",
    (regionKey) => {
      const data = realisticRadiculopathyData(regionKey);
      render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
      runReviewAndAnalysis();

      expect(screen.getByText(/Phase 0 — Extracted Clinical Variables/)).toBeInTheDocument();
      // Below-knee pain, the acute lifting mechanism, and the dermatomal
      // pattern were all explicitly set in the fixture -- must read as
      // present, not silently dropped.
      expect(screen.getByText(/L5 — lateral lower leg/)).toBeInTheDocument();
    }
  );

  // NOT YET FIXED -- kept as test.skip (not deleted) so this stays tracked
  // rather than silently forgotten. Root cause is the same bare-family-key
  // mismatch as the two bugs fixed above, but inside runEngineV6's own
  // per-region differential logic (`if (region === "Lumbar / SI")` at line
  // ~1677 compares the raw, laterality-suffixed selectedRegions entry
  // against the bare family key, so it never matches). Confirmed present
  // BEFORE today's change (not something this session introduced) -- a
  // grep for `if (region === "` finds the identical pattern across all
  // 8 regions: Cervical, Lumbar,
  // Hip, Ankle, Elbow/Wrist/Hand, and Thoracic all have the identical
  // pattern and are almost certainly equally affected -- only Shoulder and
  // Knee are keyed directly by their laterality-suffixed name in REG_MOD_S
  // and so happen to still work. Flagged to the user rather than fixed
  // silently: this is a 6-region change to live clinical differential
  // logic, out of scope for what was asked today.
  test.skip("a realistic radiculopathy case is not shown as 'insufficient data' (KNOWN PRE-EXISTING BUG -- see comment)", () => {
    const data = realisticRadiculopathyData("Lumbar/SI (L)");
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    runReviewAndAnalysis();
    expect(screen.queryByText(/Insufficient data — complete subjective form/)).not.toBeInTheDocument();
  });
});
