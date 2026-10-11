// conditionObjectiveStoryGate.test.jsx -- the AI Objective Assessment must not show percentages without a story.
// Aditi (2026-10-10): "without the chief complaint, onset, mechanism and duration, how can it know the differential diagnosis".
// Rule (storyGate.js): Chief complaint + (Onset or Duration) + at least two ⭐ questions answered.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { default: ConditionObjectiveAssessment } = await import("../ConditionObjectiveAssessment.jsx");
const CERVICAL = [{ id: "cervical", label: "Cervical" }];
const TWO_TICKS = { location: "Neck, Right upper trapezius", radiation: "Radiates into right arm/hand" };
// ticks that really support a condition (the textbook radiculopathy case used by conditionObjectiveAssessment.test.jsx)
const RADICULOPATHY = { ...TWO_TICKS, dermatomal: "C6 — thumb/index finger", mechanismType: "No clear mechanism — insidious onset", armPresent: "Yes — unilateral (R)", armNeuro: "Objective numbness on testing" };

function Harness({ data }) {
  const [d, setD] = React.useState(data);
  const setData = (u) => setD((prev) => (typeof u === "function" ? u(prev) : { ...prev, ...u }));
  return <ConditionObjectiveAssessment data={d} setData={setData} selectedRegions={CERVICAL} />;
}
const pctTexts = () => [...document.querySelectorAll(".obj-match-card .obj-match-pct")].map((n) => n.textContent.trim());
const cards = () => document.querySelectorAll(".obj-match-card").length;

describe("AI Objective Assessment: no story, no ranking", () => {
  it("ticks only: no scores on any card, and it says what is missing", () => {
    render(<Harness data={{ subjective: { regions: { cervical: TWO_TICKS } } }} />);
    expect(screen.queryByText("Live Match")).toBeNull();
    expect(cards()).toBeGreaterThan(0);
    expect(pctTexts()).toEqual([]);
    const note = screen.getByTestId("story-gate-note").textContent;
    expect(note).toMatch(/Add these in Subjective first/);
    expect(note).toMatch(/Chief complaint/);
    expect(note).toMatch(/Onset or Duration/);
  });

  it("a Chief complaint and Onset with a single tick: still gated, and says one more tick is needed", () => {
    render(<Harness data={{ subjective: { chiefComplaint: "Neck pain", onset: "Gradual", regions: { cervical: { location: "Neck" } } } }} />);
    expect(screen.queryByText("Live Match")).toBeNull();
    expect(pctTexts()).toEqual([]);
    expect(screen.getByTestId("story-gate-note").textContent).toMatch(/1 more ⭐ answer/);
  });

  it("the conditions stay listed in their normal order while gated (nothing is hidden, nothing is ranked)", () => {
    render(<Harness data={{ subjective: { regions: { cervical: TWO_TICKS } } }} />);
    const names = [...document.querySelectorAll(".obj-match-card .obj-match-name")].map((n) => n.textContent);
    expect(names[0]).toMatch(/Mechanical \/ Non-Specific Neck Pain/);
  });

  it("Chief complaint + Duration + two ticks: nothing is blocked, and the ranking appears with percentages after Analyze Case", () => {
    render(<Harness data={{ subjective: { chiefComplaint: "Neck pain into the right arm", duration: "3 weeks", regions: { cervical: RADICULOPATHY } } }} />);
    expect(screen.queryByTestId("story-gate-note")).toBeNull();
    expect(pctTexts()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Analyze Case" }));
    expect(pctTexts().some((t) => /^\d+%$/.test(t))).toBe(true);
  });

  it("a red-flag warning is never held back by the gate", () => {
    const data = { subjective: { regions: { cervical: { redFlagsMyelopathy: "Bilateral hand symptoms (grip clumsiness / numbness)" } } } };
    render(<Harness data={data} />);
    expect(screen.getByTestId("story-gate-note")).toBeTruthy();
    expect(screen.getByText(/EMERGENCY — Myelopathy/i)).toBeInTheDocument();
  });
});
