// outcomeStudyPdfDownload.test.jsx
// Learn's Outcome Measures study mode (OutcomeStudy.jsx) gained a "Download
// PDF (blank form)" button on 2026-08-19 -- generates a printable blank
// form (patient name/date, admin note, every real item from SCALES exactly
// as the clinical entry screen defines it, MCID note, signature block) via
// the same makePDFPage/downloadPDFFromHTML helpers the rest of the app's
// PDF exports already use. Also added "Why this helps"/"How to perform"
// InfoBoxes sourced from OUTCOME_GUIDES (currently an empty placeholder --
// see outcomeMeasureGuides.js -- so this only asserts the wiring, not any
// specific guide copy).
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import OutcomeStudy from "../physiofeed/learn/OutcomeStudy.jsx";

describe("OutcomeStudy -- blank-form PDF download", () => {
  it("opening a scale's detail page shows a working Download PDF button", async () => {
    render(<OutcomeStudy onBack={vi.fn()}/>);
    // Land on the first category's grid, open the first card's detail.
    const firstCard = screen.getAllByRole("button", { name: /^Open /})[0];
    fireEvent.click(firstCard);

    const dlBtn = await screen.findByText(/Download PDF \(blank form\)/);
    // downloadPDFFromHTML resolves internally (try/catch'd, no real popup
    // in jsdom) -- this just proves buildBlankFormHTML/makePDFPage don't
    // throw on a real SCALES entry.
    expect(() => fireEvent.click(dlBtn)).not.toThrow();
  });

  it("does not crash for a scale with no per-item fields (clinician-scored only)", async () => {
    // Not every SCALES entry has `fields` (e.g. purely observational/scored
    // instruments) -- buildBlankFormHTML must fall back to its own
    // "no per-item form fields" note rather than crashing on `.map` over
    // undefined.
    render(<OutcomeStudy onBack={vi.fn()}/>);
    const cards = screen.getAllByRole("button", { name: /^Open /});
    for (const card of cards) {
      fireEvent.click(card);
      const dlBtn = await screen.findByText(/Download PDF \(blank form\)/);
      expect(() => fireEvent.click(dlBtn)).not.toThrow();
      fireEvent.click(screen.getByText("Back"));
    }
  });
});
