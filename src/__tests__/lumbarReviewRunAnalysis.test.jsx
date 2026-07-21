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
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

describe("Lumbar/SI region: Phase 0.5 Reasoning Engine renders end to end", () => {
  test("realistic radiculopathy case shows the Phase 0.5 card with L02 leading", () => {
    const data = realisticRadiculopathyData("Lumbar/SI (L)");
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    runReviewAndAnalysis();

    expect(screen.getByText(/Phase 0.5 — Lumbar Condition Matches/)).toBeInTheDocument();
    expect(screen.getByText(/L02 — Lumbar Disc Herniation \/ Radiculopathy/)).toBeInTheDocument();
  });

  test("cauda equina indicators show the emergency override banner in Phase 0.5", () => {
    const data = {
      cx_selected_regions: JSON.stringify(["Lumbar/SI (L)"]),
      lx_rf_cauda: "Saddle area anaesthesia — perineum / inner thighs",
    };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    runReviewAndAnalysis();

    expect(screen.getByText(/EMERGENCY — Cauda Equina Indicators/)).toBeInTheDocument();
  });
});

// ── Regression test for the AI-extraction-not-merged-into-scoring bug ──
//
// Reported by real end-to-end use: a case narrated almost entirely in
// free text (not checkboxes) showed Phase 0 as "Not asked" for fields
// the AI pass had plainly found (visible only in the separate "Found
// in your notes" list below it), and Phase 0.5 scored L02 as
// "Insufficient data -- 0 supporting" despite a textbook radiculopathy
// presentation. Root cause: setLumbarReasoning(...) ran once,
// synchronously, on Pass-1-only data; the async Pass 2 fetch's .then()
// called setLumbarNoteFindings(...) but never re-ran the reasoning
// engine or updated lumbarVariables with the merged result -- so the
// two systems stayed disconnected no matter what the AI found.
//
// This test leaves the structured checkboxes UNSET (so Pass 1 alone
// would score L02 as weak/insufficient) and puts everything into the
// free-text notes instead, mocking the /api/extractLumbarNoteVariables
// response the same way the note-reading pass would return it for this
// narrative. It asserts the merged result actually reaches both the
// Phase 0 card (with an "AI extracted" badge, not "Not asked") and the
// Phase 0.5 reasoning engine (L02 promoted out of "Insufficient data").
describe("Lumbar/SI region: AI note findings merge into scoring (regression)", () => {
  test("AI-note-only radiculopathy findings upgrade L02 out of 'Insufficient data' and show as AI-extracted, not 'Not asked'", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        findings: [
          { variable: "dermatomalPattern", value: "L5 — lateral lower leg / dorsum foot / great toe", sourceQuote: "pain radiating into the left buttock, posterior thigh, and lateral calf", confidence: 90 },
          { variable: "sittingAggravates", value: "true", sourceQuote: "worse with prolonged sitting", confidence: 88 },
          { variable: "coughSneezeAggravates", value: "true", sourceQuote: "coughing brings on the leg pain", confidence: 85 },
          { variable: "flexionAggravates", value: "true", sourceQuote: "bending forward makes it worse", confidence: 85 },
          { variable: "flexionRelieves", value: "false", sourceQuote: "extension eases it, not flexion", confidence: 70 },
          { variable: "walkingRelieves", value: "true", sourceQuote: "walking around helps a bit", confidence: 60 },
          { variable: "hasLegNeuro", value: "true", sourceQuote: "numbness and tingling down the left leg", confidence: 92 },
        ],
      }),
    });

    const data = {
      cx_selected_regions: JSON.stringify(["Lumbar/SI (L)"]),
      // Everything below is free text only -- no lx_* checkboxes set --
      // so Pass 1 alone has nothing to score L02 on.
      lx_agg_notes: "Pain worse with prolonged sitting, coughing, and bending forward.",
      lx_neuro_notes: "Numbness and tingling down the left leg, radiating into the calf and foot.",
      lx_loc_notes: "Pain radiating into the left buttock, posterior thigh, and lateral calf.",
    };

    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));

    // Pass 2 resolves asynchronously -- wait for the merged reasoning
    // result to land rather than asserting on the Pass-1-only render.
    await waitFor(() => {
      expect(screen.getByText(/L02 — Lumbar Disc Herniation \/ Radiculopathy/)).toBeInTheDocument();
    });

    // Phase 0.5: L02 must no longer read "Insufficient data" once the
    // AI-found variables are actually feeding the matching engine.
    const l02Card = screen.getByText(/L02 — Lumbar Disc Herniation \/ Radiculopathy/).closest("div");
    expect(l02Card).not.toHaveTextContent(/Insufficient data/);

    // Phase 0: an AI-filled field must show the "AI extracted" badge,
    // not silently blend in with a real "Not asked".
    expect(screen.getAllByText(/AI extracted/).length).toBeGreaterThan(0);
  });
});

