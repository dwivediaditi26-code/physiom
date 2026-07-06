// mmtCompactSelect.test.jsx
// Regression test for a real bug from a live screenshot: the MMT module's
// L/R grade <select> boxes rendered as colored empty rectangles with no
// visible grade number at all (not a font issue -- confirmed by checking
// correctly-labeled muscles right next to the broken ones, styled
// identically). Root cause: a global mobile stylesheet rule
// (MobileStyleInjector, src/utils.jsx) forces every input/select/textarea
// under 767px width to `padding: 10px 12px !important` plus
// `select { padding-right: 32px !important }` for a 44px min-height touch
// target. That's 44px of horizontal padding alone applied to a select that
// is only 40px wide by design (it sits beside a muscle name) -- leaving no
// room for the actual grade text, so only the colored background survives.
// Fixed by adding a more specific `select.pm-compact-select` override with
// compact padding/sizing, and tagging the two MMT grade selects with that
// class so the blanket touch-target rule no longer swallows their content.
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MMTModule } from "../PhysioNeuro.jsx";

describe("MMT grade selects are exempt from the touch-target padding that hid their text", () => {
  it("both L and R grade selects carry the pm-compact-select class", () => {
    const { container } = render(<MMTModule data={{}} set={() => {}} />);
    const selects = container.querySelectorAll("select.pm-compact-select");
    // Every muscle in the initially-active region (Cervical) renders one
    // select for L and one for R -- there should be at least one pair, and
    // every grade select on the page (there are no other <select> elements
    // in this view) must carry the compact class.
    const allSelects = container.querySelectorAll("select");
    expect(allSelects.length).toBeGreaterThan(0);
    expect(selects.length).toBe(allSelects.length);
  });

  it("a selected grade value is still present as real option text (not swallowed by CSS in this component)", () => {
    // The bug was CSS-only (jsdom doesn't apply the external stylesheet, so
    // this doesn't reproduce the visual squeeze) -- this test instead
    // guards the React-level contract: given a real recorded grade, the
    // select's value/text is actually the grade, not blank.
    // MMTModule writes keys as `mmt_${m.id}_${side}` where m.id already
    // includes the "mmt_" prefix (verified in mmtLabels.test.js), producing
    // the real double-prefixed key "mmt_mmt_scm_L".
    const data = { mmt_mmt_scm_L: "4" };
    const { container } = render(<MMTModule data={data} set={() => {}} />);
    const select = container.querySelector('select[title]');
    // At least one select on the page should reflect the "4" grade.
    const values = Array.from(container.querySelectorAll("select")).map(s => s.value);
    expect(values).toContain("4");
  });
});
