// walkthroughButtons.test.jsx
// Two points from the first-time walkthrough (2026-10-02):
//  - faded ("disabled") buttons gave no reason: "Create free account" until the terms
//    box is ticked, and "Continue" on the pathway / region / start screens.
//  - on Final Review the big bottom button said "Start new assessment" while "Save
//    Assessment" sat further down the page, so Save was easy to miss.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { default: AuthScreen } = await import("../AuthScreen.jsx");
const { default: OrthoAssessment } = await import("../OrthoAssessment.jsx");
const { default: OrthoOutpatientAssessment } = await import("../OrthoOutpatientAssessment.jsx");

describe("Create free account explains why it is faded", () => {
  function openRegister() {
    render(<AuthScreen onAuth={() => {}} onTryGuest={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Create free account" }));
  }
  it("tells the person to tick the terms box, and the note goes once it is ticked", () => {
    openRegister();
    const button = screen.getByRole("button", { name: /Create free account →/ });
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Tick the box above to create your account.")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(button.disabled).toBe(false);
    expect(screen.queryByText("Tick the box above to create your account.")).toBeNull();
  });
});

describe("Continue on the Ortho start screens explains why it is faded", () => {
  it("starts with Outpatient already chosen, so Continue is ready with no note", () => {
    render(<OrthoAssessment onSave={() => {}} />);
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(false);
    expect(screen.queryByText(/to continue\./)).toBeNull();
  });

  it("uses plain words for IPD", () => {
    render(<OrthoAssessment onSave={() => {}} />);
    expect(screen.getByText("Inpatient (IPD)")).toBeTruthy();
  });

  it("asks for a body region on the next screen", () => {
    render(<OrthoAssessment onSave={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Pick at least one body region to continue.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" }).disabled).toBe(true);
  });
});

describe("Final Review makes Save the main button", () => {
  function renderReview(props = {}) {
    return render(
      <OrthoOutpatientAssessment
        selectedRegions={[{ id: "knee", side: "Right" }]}
        condition="general"
        initialStep="review"
        initialData={{ demographics: { name: "Test Person", age: "30" } }}
        patientData={{}}
        onSave={vi.fn()}
        onExit={vi.fn()}
        onNav={() => {}}
        {...props}
      />
    );
  }

  it("puts Save Assessment in the bottom bar, and offers Start new assessment lower down", () => {
    const { container } = renderReview();
    const bar = container.querySelector(".bottombar");
    expect(within(bar).getByRole("button", { name: /Save Assessment/ })).toBeTruthy();
    expect(within(bar).queryByRole("button", { name: /Start new assessment/ })).toBeNull();
    // exactly one Save button on the page, so there is nothing to miss or confuse
    expect(screen.getAllByRole("button", { name: /Save Assessment/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Start new assessment/ })).toBeTruthy();
  });

  it("without a save handler the bottom bar still offers Start new assessment", () => {
    const { container } = renderReview({ onSave: undefined });
    const bar = container.querySelector(".bottombar");
    expect(within(bar).getByRole("button", { name: /Start new assessment/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Save Assessment/ })).toBeNull();
  });
});
