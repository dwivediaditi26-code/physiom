// summaryModalCrash.test.jsx
// Regression test for a real production crash: "j(U).split is not a
// function" in the Cyriax/STTT lazy chunk, traced via a sourcemap-decoded
// stack trace to SubjectiveModule's Summary modal (SubjectiveObjective.jsx).
// v()/arr() there scanned data for any key containing "_agg"/"_rel"/
// "radiation" and unconditionally called .split("|") on the value -- but
// those same field classes are already known elsewhere in this file
// (rget()'s loc_radiation/cc_onset handling) to sometimes be arrays,
// written by multi-select/checkbox-group inputs rather than a
// pipe-joined string. Calling .split on an array crashes.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

describe("Summary modal — non-string aggravating/relieving/radiation fields", () => {
  it("does not crash when an *_agg key holds an array instead of a pipe-joined string", () => {
    const data = {
      cx_selected_regions: JSON.stringify(["cervical"]),
      cc_agg: ["Bending forward", "Prolonged sitting"],
      cc_rel: ["Rest", "Ice"],
      loc_radiation: ["Down the arm"],
    };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);

    const runBtn = screen.getByText(/Run Analysis/);
    expect(() => fireEvent.click(runBtn)).not.toThrow();

    // Summary modal should render and include the array-derived values,
    // not just avoid crashing.
    expect(screen.getByText(/Bending forward/)).toBeInTheDocument();
  });
});
