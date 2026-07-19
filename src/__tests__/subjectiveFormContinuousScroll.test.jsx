// Regression coverage for the Subjective Assessment form redesign: every
// section within the active group (Core / a body region / General / ...)
// now renders top to bottom in one continuous scroll, instead of showing
// only the single "active" section behind a "N / M" counter with
// Prev/Next buttons to step through them one at a time. Confirmed via
// several rounds of mockups in chat, landing on: "it should be long
// line wise vertical form till last."
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

// Selecting a region does not auto-switch the active group tab (unchanged,
// pre-existing behavior) -- the "Core" group (Chief complaint) still shows
// by default. Tests that need a region's own sections click that region's
// group tab first, matching what a real user would do. Targeted via
// data-testid since the region-picker chip elsewhere on the page renders
// the exact same isolated text ("Cervical (R)") inside its own button.
function openRegionGroup(regionLabel) {
  fireEvent.click(screen.getByTestId(`subj-group-tab-${regionLabel}`));
}

describe("Subjective Assessment form: continuous scroll instead of a stepper", () => {
  test("every section in the active group renders simultaneously, not one at a time", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    openRegionGroup("Cervical (R)");

    // All of these belong to the same "Cervical (R)" group -- previously
    // only ONE of these section headers would be in the DOM at a time.
    expect(screen.getByText(/Cervical — Location/)).toBeInTheDocument();
    expect(screen.getByText(/Cervical — Mechanism/)).toBeInTheDocument();
    expect(screen.getByText(/Cervical — Aggravating/)).toBeInTheDocument();
  });

  test("no step counter or Prev/Next controls remain", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    openRegionGroup("Cervical (R)");

    expect(screen.queryByText(/^\d+ \/ \d+$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/All done ✓/)).not.toBeInTheDocument();
  });

  test("clicking a section pill scrolls to it without removing the other sections", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    openRegionGroup("Cervical (R)");

    const pill = screen.getAllByText(/Aggravating/).find(el => el.tagName === "SPAN" && el.closest("button"));
    fireEvent.click(pill.closest("button"));

    // Location and Mechanism must still be present -- the click only jumps
    // the scroll position, it doesn't hide sibling sections.
    expect(screen.getByText(/Cervical — Location/)).toBeInTheDocument();
    expect(screen.getByText(/Cervical — Mechanism/)).toBeInTheDocument();
    expect(screen.getByText(/Cervical — Aggravating/)).toBeInTheDocument();
  });

  test("switching the top-level group tab still switches which region's sections show", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)", "Lumbar/SI (L)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    openRegionGroup("Cervical (R)");

    expect(screen.getByText(/Cervical — Location/)).toBeInTheDocument();

    openRegionGroup("Lumbar/SI (L)");

    expect(screen.queryByText(/Cervical — Location/)).not.toBeInTheDocument();
  });

  test("shared filter box appears once per group, not once per multicheck section", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    openRegionGroup("Cervical (R)");

    expect(screen.getAllByPlaceholderText(/Filter options/).length).toBe(1);
  });
});
