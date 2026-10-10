// conditionObjectiveReanalyze.test.jsx -- the top-bar "Re-analyze" button of the AI Objective Assessment page.
//
// The ranked condition cards are always live off the Subjective answers, so there is nothing to "run". What the
// button really does (2026-10-10, Aditi: "if I change the Subjective I want to re-analyze"): a condition tapped
// earlier stays selected even after the Subjective answers change, so Re-analyze sends the page back to the NEW best
// match and says what it is. (An earlier Re-analyze button that did nothing at all was removed in 2026-10.)
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";

const { default: ConditionObjectiveAssessment } = await import("../ConditionObjectiveAssessment.jsx");
const { default: OrthoOutpatientAssessment } = await import("../OrthoOutpatientAssessment.jsx");

const CERVICAL = [{ id: "cervical", label: "Cervical" }];
// A textbook radiculopathy case (the same fixture the ranking test in conditionObjectiveAssessment.test.jsx uses).
const RADICULOPATHY = {
  subjective: { regions: { cervical: {
    location: "Neck, Right upper trapezius", radiation: "Radiates into right arm/hand", dermatomal: "C6 — thumb/index finger",
    mechanismType: "No clear mechanism — insidious onset", armPresent: "Yes — unilateral (R)", armNeuro: "Objective numbness on testing",
    aggMovements: "Extension — looking up, Combined extension + rotation (right) — quadrant position",
    relMovements: "Arm overhead — relieves arm symptoms (shoulder abduction relief sign)",
    redFlagsMyelopathy: "No myelopathy signs", redFlagsVbi: "No VBI signs", redFlagsInstability: "No instability signs", redFlagsOther: "No other red flags",
  } } },
};

function Harness({ initialData }) {
  const [data, setDataRaw] = React.useState(initialData);
  const [tick, setTick] = React.useState(0);
  const setData = (updater) => setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  return (
    <div>
      <button type="button" onClick={() => setTick((t) => t + 1)}>test-reanalyze</button>
      <button type="button" onClick={() => setDataRaw({})}>test-clear-subjective</button>
      <ConditionObjectiveAssessment data={data} setData={setData} selectedRegions={CERVICAL} reanalyzeSignal={tick} />
    </div>
  );
}

const cards = () => [...document.querySelectorAll(".obj-match-row .obj-match-card")];
const activeCard = () => document.querySelector(".obj-match-card-active");
const nameOf = (card) => card?.querySelector(".obj-match-name")?.textContent;

describe("Re-analyze on the AI Objective Assessment page", () => {
  it("shows no confirmation until the button is pressed", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    expect(screen.queryByTestId("reanalyzed-note")).toBeNull();
  });

  it("sends the page back to the best match after a different condition was tapped, and says what the best match is", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    const top = nameOf(cards()[0]);
    expect(nameOf(activeCard())).toBe(top);
    // the student taps a condition further down the list: it stays selected
    const other = cards()[3];
    fireEvent.click(other);
    expect(nameOf(activeCard())).toBe(nameOf(other));
    expect(nameOf(activeCard())).not.toBe(top);
    fireEvent.click(screen.getByRole("button", { name: "test-reanalyze" }));
    expect(nameOf(activeCard())).toBe(top);
    const note = screen.getByTestId("reanalyzed-note");
    expect(note.textContent).toMatch(/Re-analyzed just now/);
    expect(note.textContent).toContain(top);
    expect(note.textContent).toMatch(/\(\d+%\)/);
  });

  it("when the Subjective answers were cleared, it says nothing matches yet instead of naming a condition", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    fireEvent.click(screen.getByRole("button", { name: "test-clear-subjective" }));
    fireEvent.click(screen.getByRole("button", { name: "test-reanalyze" }));
    expect(screen.getByTestId("reanalyzed-note").textContent).toMatch(/nothing matches yet/i);
  });

  it("the confirmation fades away by itself", () => {
    vi.useFakeTimers();
    try {
      render(<Harness initialData={RADICULOPATHY} />);
      fireEvent.click(screen.getByRole("button", { name: "test-reanalyze" }));
      expect(screen.getByTestId("reanalyzed-note")).toBeTruthy();
      act(() => { vi.advanceTimersByTime(9000); });
      expect(screen.queryByTestId("reanalyzed-note")).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("pressing it twice keeps working", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    const top = nameOf(cards()[0]);
    for (let i = 0; i < 2; i++) {
      fireEvent.click(cards()[2]);
      fireEvent.click(screen.getByRole("button", { name: "test-reanalyze" }));
      expect(nameOf(activeCard())).toBe(top);
    }
  });
});

describe("the top-bar Re-analyze button of the Ortho wizard", () => {
  const renderWizard = (props) => render(
    <OrthoOutpatientAssessment
      selectedRegions={[{ id: "cervical", side: "Right" }]}
      condition="general"
      entryMode="ai"
      initialData={{ demographics: { name: "Test Person", age: "30" }, ...RADICULOPATHY }}
      patientData={{}}
      onSave={vi.fn()}
      onExit={vi.fn()}
      onNav={() => {}}
      {...props}
    />
  );

  it("is in the top bar of the AI Objective Assessment step and works", () => {
    const { container } = renderWizard({ initialStep: "objectiveAI" });
    const bar = container.querySelector(".topbar");
    const button = within(bar).getByRole("button", { name: /Re-analyze from my Subjective answers/ });
    expect(button).toBeTruthy();
    expect(screen.queryByTestId("reanalyzed-note")).toBeNull();
    fireEvent.click(cards()[3]);
    fireEvent.click(button);
    expect(screen.getByTestId("reanalyzed-note").textContent).toMatch(/best match/);
    expect(nameOf(activeCard())).toBe(nameOf(cards()[0]));
  });

  it("is not on the other steps", () => {
    const { container } = renderWizard({ initialStep: "subjective" });
    expect(within(container.querySelector(".topbar")).queryByRole("button", { name: /Re-analyze/ })).toBeNull();
  });
});
