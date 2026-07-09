// sttRomStatus.test.jsx
// Regression tests for two STTT/Cyriax fixes:
//  - "Range" status previously had no way to record above-normal (hypermobile)
//    ROM -- everything not restricted collapsed into "Full range", the same
//    bucket a genuinely normal joint would use. Now "Hypermobile" exists as
//    its own distinct option.
//  - "Pain at Range" was a single-select, so a joint painful at both mid-range
//    AND end-range could only ever record one of the two. Now multiple
//    options can be selected at once, stored as a plain ", "-joined string so
//    every existing reader of this field (resolveCyriaxKey, the .includes()
//    styling checks) keeps working unmodified.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CyriaxModule } from "../SubjectiveObjective.jsx";

describe("STTT — ROM Range status", () => {
  it("Hypermobile is a selectable Range option, distinct from Full range", () => {
    render(<CyriaxModule data={{}} set={() => {}} />);
    const rangeSelect = screen.getAllByRole("combobox").find(s =>
      Array.from(s.options).some(o => o.value === "Hypermobile — above normal range")
    );
    expect(rangeSelect).toBeTruthy();
    const values = Array.from(rangeSelect.options).map(o => o.value);
    expect(values).toContain("Full range");
    expect(values).toContain("Hypermobile — above normal range");
  });
});

describe("STTT — Pain at Range multi-select", () => {
  it("allows selecting a pain-at-range option (first movement's Pain at Range chips)", () => {
    const setMock = vi.fn();
    render(<CyriaxModule data={{}} set={setMock} />);
    fireEvent.click(screen.getAllByText(/Pain at mid-range/)[0]);
    expect(setMock).toHaveBeenLastCalledWith(expect.stringContaining("act_pain_"), "Pain at mid-range");
  });

  it("selecting 'No pain' clears any other selected option", () => {
    const setMock = vi.fn();
    render(<CyriaxModule data={{}} set={setMock} />);
    fireEvent.click(screen.getAllByText(/Pain at end range/)[0]);
    const fieldKey = setMock.mock.calls[0][0];
    expect(setMock.mock.calls[0][1]).toBe("Pain at end range");

    // Simulate that value having landed in data (same field the app would
    // now hold), then toggling "No pain" instead -- it must replace, not
    // add to, the prior selection.
    render(<CyriaxModule data={{ [fieldKey]: "Pain at end range" }} set={setMock} />);
    fireEvent.click(screen.getAllByText(/^☐ No pain$/)[0]);
    expect(setMock).toHaveBeenLastCalledWith(fieldKey, "No pain");
  });
});
