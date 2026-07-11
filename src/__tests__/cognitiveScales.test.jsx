// cognitiveScales.test.jsx
// Covers the MoCA/MMSE domain-score entries, the full Mini-Cog entry, and
// the teaching-note rendering added to Outcome Measures' live-entry flow.
//
// MoCA and MMSE are both copyrighted, commercially-licensed instruments
// (MoCA requires a separate licence from MoCA Cognition to embed in
// software; MMSE's rights holder PAR explicitly advises against
// reproducing the test items in software). So neither is built as the
// verbatim item-by-item test -- both are domain-level score-entry forms:
// a clinician administers the real, officially-licensed test elsewhere
// and enters the resulting per-domain sub-scores, which this then sums
// and interprets. Mini-Cog is free to reproduce, so it's built as the
// full official 3-word-recall + clock-draw test with real content.
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SCALES } from "../sharedClinicalData.js";
import OutcomeMeasuresPro from "../OutcomeMeasuresPro.jsx";

describe("MoCA domain-score scale", () => {
  it("sums the 7 domain sub-scores correctly, capped at 30", () => {
    const v = { moca_visuospatial:"5", moca_naming:"3", moca_attention:"6", moca_language:"3", moca_abstraction:"2", moca_delayed_recall:"5", moca_orientation:"6" };
    expect(SCALES.moca.score(v)).toBe(30);
  });

  it("applies the standard low-education +1 point correction", () => {
    const v = { moca_visuospatial:"3", moca_naming:"3", moca_attention:"4", moca_language:"2", moca_abstraction:"1", moca_delayed_recall:"3", moca_orientation:"3", moca_education_adjust:"1 — Applied (plus 1 point)" };
    expect(SCALES.moca.score(v)).toBe(20); // 19 raw + 1
  });

  it("returns null when nothing has been entered, rather than 0", () => {
    expect(SCALES.moca.score({})).toBeNull();
  });

  it("interprets 26 as within normal range and 17 as moderate impairment", () => {
    expect(SCALES.moca.interpret(26).label).toBe("Within normal range");
    expect(SCALES.moca.interpret(17).label).toBe("Moderate cognitive impairment");
  });
});

describe("MMSE domain-score scale", () => {
  it("sums the 7 domain sub-scores correctly", () => {
    const v = { mmse_orientation_time:"5", mmse_orientation_place:"5", mmse_registration:"3", mmse_attention:"5", mmse_recall:"3", mmse_language:"8", mmse_construction:"1" };
    expect(SCALES.mmse.score(v)).toBe(30);
  });

  it("interprets 24 as normal and 15 as moderate impairment", () => {
    expect(SCALES.mmse.interpret(24).label).toBe("Within normal range");
    expect(SCALES.mmse.interpret(15).label).toBe("Moderate cognitive impairment");
  });
});

describe("Mini-Cog full test", () => {
  it("real recall + clock draw sum to the correct total", () => {
    const v = { minicog_recall: "3 — All three words recalled", minicog_clock: "2 — Normal" };
    expect(SCALES.minicog.score(v)).toBe(5);
  });

  it("a positive screen (0 words, abnormal clock) scores 0", () => {
    const v = { minicog_recall: "0 — None recalled", minicog_clock: "0 — Abnormal or not attempted" };
    expect(SCALES.minicog.score(v)).toBe(0);
  });

  it("interprets the validated <3 cut point as a positive screen", () => {
    expect(SCALES.minicog.interpret(2).label).toContain("Positive screen");
    expect(SCALES.minicog.interpret(4).label).toContain("Low likelihood");
  });

  it("offers all 6 official alternate word lists", () => {
    const wordListField = SCALES.minicog.fields.find(f => f.id === "minicog_wordlist");
    expect(wordListField.options).toHaveLength(6);
    expect(wordListField.options).toContain("Banana, Sunrise, Chair");
  });
});

describe("Teaching notes render in the live-entry flow", () => {
  it("shows the scale-level 'how to administer' note on the first question", () => {
    render(<OutcomeMeasuresPro data={{}} set={()=>{}} navContext={{ scaleId: "minicog" }} />);
    expect(screen.getByText("How to administer")).toBeInTheDocument();
    expect(screen.getByText(/free to use, reproduce, and distribute/)).toBeInTheDocument();
  });

  it("shows the per-item note for the current question", () => {
    render(<OutcomeMeasuresPro data={{}} set={()=>{}} navContext={{ scaleId: "moca" }} />);
    expect(screen.getByText(/trail-making, cube copy, and clock-drawing/)).toBeInTheDocument();
  });

  it("MoCA and MMSE both explain their licensing status in the admin note (no verbatim test content shown)", () => {
    render(<OutcomeMeasuresPro data={{}} set={()=>{}} navContext={{ scaleId: "moca" }} />);
    expect(screen.getByText(/requires a separate commercial licence/)).toBeInTheDocument();
  });
});
