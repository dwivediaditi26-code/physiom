// Regression coverage for the Subjective Assessment form redesign.
//
// History: first landed as "every section within the active GROUP (Core /
// a body region / General / ...) renders top to bottom in one continuous
// scroll" -- i.e. within a group, no more one-section-at-a-time stepper.
// That still used a tab row to switch which GROUP was active.
//
// Redesigned again (2026-08-18, confirmed via several rounds of chat
// mockups) to drop the group-tab switcher entirely: Core, every selected
// region, and the universal Red Flag safety screen now ALL render inline,
// simultaneously, in one pass -- no tab click needed to see a different
// region's fields. Everything else (Goals, Previous Episodes, PMH &
// Medications, Lifestyle, Psychosocial) is collapsed by default behind a
// single "More details" toggle instead, so the default view stays a
// reasonably short scroll instead of a wall of mostly-empty fields.
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

describe("Subjective Assessment form: continuous scroll, no group-tab switcher", () => {
  test("a selected region's sections render immediately, with no tab click needed", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);

    // All of these belong to the same Cervical region module -- previously
    // only ONE of these section headers would be in the DOM at a time, and
    // only after clicking a "subj-group-tab-Cervical (R)" tab that no
    // longer exists.
    expect(screen.getByText(/Cervical — Location/)).toBeInTheDocument();
    expect(screen.getByText(/Cervical — Mechanism/)).toBeInTheDocument();
    expect(screen.getByText(/Cervical — Aggravating/)).toBeInTheDocument();
  });

  test("no step counter or Prev/Next controls remain", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);

    expect(screen.queryByText(/^\d+ \/ \d+$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/All done ✓/)).not.toBeInTheDocument();
  });

  test("no group-tab switcher remains -- Core, Chief Complaint always show alongside the region", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);

    expect(screen.queryByTestId("subj-group-tab-Core")).not.toBeInTheDocument();
    expect(screen.queryByTestId("subj-group-tab-Cervical (R)")).not.toBeInTheDocument();
    expect(screen.getByText(/Chief Complaint/)).toBeInTheDocument();
    expect(screen.getByText(/Cervical — Location/)).toBeInTheDocument();
  });

  test("two selected regions both render at once -- no switching required to see the second one", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)", "Lumbar/SI (L)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);

    expect(screen.getByText(/Cervical — Location/)).toBeInTheDocument();
    expect(screen.getByText(/Lumbar — Location/)).toBeInTheDocument();
  });

  test("the universal Red Flag safety screen always shows inline, not tucked behind More details", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);

    expect(screen.getByText(/General Red Flag Screen/)).toBeInTheDocument();
  });

  test("Goals/History/PMH/Lifestyle/Psychosocial are collapsed behind a single 'More details' toggle by default", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);

    expect(screen.queryByText(/Patient Goals & Beliefs/)).not.toBeInTheDocument();
    expect(screen.getByTestId("subj-more-toggle")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("subj-more-toggle"));

    expect(screen.getByText(/Patient Goals & Beliefs/)).toBeInTheDocument();
  });

  test("each multicheck/select field renders its own independent tap-to-select control, not a shared filter box", () => {
    const data = { cx_selected_regions: JSON.stringify(["Cervical (R)"]) };
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);

    const controls = screen.getAllByPlaceholderText(/Tap to select/);
    expect(controls.length).toBeGreaterThan(1);
  });
});
