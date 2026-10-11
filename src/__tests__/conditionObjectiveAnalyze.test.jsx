// conditionObjectiveAnalyze.test.jsx -- the "Analyze your case" card of the AI Objective Assessment page.
//
// Aditi (2026-10-10): the page should say plainly what to do. Scores appear only after Analyze Case, the same button
// then reads View Analysis (nothing changed) or Update Analysis (the Subjective answers changed what the scores would
// be), and a spelling or formatting edit that changes nothing must not ask for a new analysis. Everything stays free:
// there is no credit system in this app, so none of this costs anything or is limited.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

const { default: ConditionObjectiveAssessment, formatConditionObjectiveSection } = await import("../ConditionObjectiveAssessment.jsx");
const { default: OrthoOutpatientAssessment } = await import("../OrthoOutpatientAssessment.jsx");

const CERVICAL = [{ id: "cervical", label: "Cervical" }];
// A textbook radiculopathy case (the same fixture the ranking test in conditionObjectiveAssessment.test.jsx uses).
const RADICULOPATHY = {
  subjective: { chiefComplaint: "Neck pain with tingling into the right arm", onset: "Gradual", regions: { cervical: {
    location: "Neck, Right upper trapezius", radiation: "Radiates into right arm/hand", dermatomal: "C6 — thumb/index finger",
    mechanismType: "No clear mechanism — insidious onset", armPresent: "Yes — unilateral (R)", armNeuro: "Objective numbness on testing",
    aggMovements: "Extension — looking up, Combined extension + rotation (right) — quadrant position",
    relMovements: "Arm overhead — relieves arm symptoms (shoulder abduction relief sign)",
    redFlagsMyelopathy: "No myelopathy signs", redFlagsVbi: "No VBI signs", redFlagsInstability: "No instability signs", redFlagsOther: "No other red flags",
  } } },
};
// Same story with the arm answers gone: still enough to analyze, but the scores come out different.
const NECK_ONLY = {
  subjective: { chiefComplaint: "Neck pain", onset: "Gradual", regions: { cervical: {
    location: "Neck, Right upper trapezius", mechanismType: "No clear mechanism — insidious onset",
    aggMovements: "Extension — looking up",
  } } },
};

let latestData = null;
function Harness({ initialData }) {
  const [data, setDataRaw] = React.useState(initialData);
  const setData = (updater) => setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  latestData = data;
  return (
    <div>
      <button type="button" onClick={() => setDataRaw((p) => ({ ...p, subjective: { ...p.subjective, chiefComplaint: "Neck pain with tingling into the right arm." } }))}>test-fix-spelling</button>
      <button type="button" onClick={() => setDataRaw((p) => ({ ...p, subjective: NECK_ONLY.subjective }))}>test-change-answers</button>
      <ConditionObjectiveAssessment data={data} setData={setData} selectedRegions={CERVICAL} />
    </div>
  );
}

const cards = () => [...document.querySelectorAll(".obj-match-row .obj-match-card")];
const activeCard = () => document.querySelector(".obj-match-card-active");
const nameOf = (card) => card?.querySelector(".obj-match-name")?.textContent;
const pcts = () => [...document.querySelectorAll(".obj-match-card .obj-match-pct")].map((n) => n.textContent.trim());
const mainButton = () => document.querySelector(".obj-analyze-btn");
const label = () => mainButton().textContent.replace(/[✦→]/g, "").trim(); // the button also holds two small icons
const analyze = () => fireEvent.click(screen.getByRole("button", { name: "Analyze Case" }));

describe("Analyze your case: before the first analysis", () => {
  it("offers Analyze Case and shows no scores, no dashes and no 'Live Match'", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    expect(screen.getByText("Analyze your case")).toBeInTheDocument();
    expect(label()).toBe("Analyze Case");
    expect(mainButton().disabled).toBe(false);
    expect(pcts()).toEqual([]);
    expect(screen.queryByText("Live Match")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
    expect(screen.getByText(/Analyze your case to see condition-matching scores and personalized recommendations/)).toBeInTheDocument();
    expect(screen.queryByTestId("analysis-current-note")).toBeNull();
  });

  it("the conditions are still listed and open, labelled as educational previews", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    expect(cards().length).toBeGreaterThan(3);
    expect(screen.getByText("Explore conditions")).toBeInTheDocument();
    expect(screen.getByText(/educational only, not results for this patient/)).toBeInTheDocument();
  });

  it("with too little story the button is off and the card lists what to add, calmly", () => {
    render(<Harness initialData={{ subjective: { regions: { cervical: { location: "Neck" } } } }} />);
    expect(mainButton().disabled).toBe(true);
    const note = screen.getByTestId("story-gate-note");
    expect(note.textContent).toMatch(/Add these in Subjective first/);
    expect(note.textContent).toMatch(/Chief complaint/);
    expect(note.textContent).toMatch(/Onset or Duration/);
    expect(pcts()).toEqual([]);
  });
});

describe("Analyze your case: running and revisiting the analysis", () => {
  it("Analyze Case shows the real scores, best match first, and the button becomes View Analysis", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    analyze();
    expect(label()).toBe("View Analysis");
    const shown = pcts().filter((t) => /^\d+%$/.test(t)).map((t) => parseInt(t, 10));
    expect(shown.length).toBeGreaterThan(2);
    expect(shown[0]).toBe(Math.max(...shown));
    expect(screen.getByText("Condition-matching scores")).toBeInTheDocument();
    const note = screen.getByTestId("analysis-current-note");
    expect(note.textContent).toMatch(/Analysis is up to date/);
    expect(note.textContent).toContain(nameOf(cards()[0]));
    expect(nameOf(activeCard())).toBe(nameOf(cards()[0]));
  });

  it("View Analysis changes nothing in the saved data", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    analyze();
    const before = JSON.stringify(latestData);
    fireEvent.click(screen.getByRole("button", { name: "View Analysis" }));
    expect(JSON.stringify(latestData)).toBe(before);
    expect(label()).toBe("View Analysis");
  });

  it("a spelling or punctuation edit that changes no score does not ask for a new analysis", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    analyze();
    fireEvent.click(screen.getByRole("button", { name: "test-fix-spelling" }));
    expect(label()).toBe("View Analysis");
    expect(screen.queryByTestId("analysis-stale-note")).toBeNull();
  });

  it("an edit that changes the scores hides them and offers Update Analysis; updating brings the new scores back", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    analyze();
    fireEvent.click(screen.getByRole("button", { name: "test-change-answers" }));
    expect(label()).toBe("Update Analysis");
    expect(screen.getByTestId("analysis-stale-note").textContent).toMatch(/Subjective answers changed/);
    expect(pcts()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Update Analysis" }));
    expect(label()).toBe("View Analysis");
    expect(pcts().some((t) => /^\d+%$/.test(t))).toBe(true);
  });

  it("updating sends the page back to the new best match after another condition was tapped", () => {
    render(<Harness initialData={RADICULOPATHY} />);
    analyze();
    const top = nameOf(cards()[0]);
    fireEvent.click(cards()[3]);
    expect(nameOf(activeCard())).not.toBe(top);
    fireEvent.click(screen.getByRole("button", { name: "test-change-answers" }));
    fireEvent.click(screen.getByRole("button", { name: "Update Analysis" }));
    expect(nameOf(activeCard())).toBe(nameOf(cards()[0]));
  });

  it("the analysis is saved with the assessment: reopening it shows View Analysis and the scores", () => {
    const first = render(<Harness initialData={RADICULOPATHY} />);
    analyze();
    const saved = JSON.parse(JSON.stringify(latestData));
    first.unmount();
    render(<Harness initialData={saved} />);
    expect(label()).toBe("View Analysis");
    expect(pcts().some((t) => /^\d+%$/.test(t))).toBe(true);
  });
});

describe("an analysis that matched nothing", () => {
  it("says so plainly and keeps the conditions open, with no 'scores' heading over empty cards", () => {
    // enough story to analyze (Chief complaint, Onset, two starred answers) that no condition's checklist supports
    const thin = { subjective: { chiefComplaint: "Neck pain with tingling into the right arm", duration: "3 weeks", regions: { cervical: {
      location: "Neck, Right upper trapezius", radiation: "Radiates into right arm/hand", mechanismType: "No clear mechanism — insidious onset",
    } } } };
    render(<Harness initialData={thin} />);
    analyze();
    expect(label()).toBe("View Analysis");
    expect(screen.getByTestId("analysis-current-note").textContent).toMatch(/nothing matches yet/);
    expect(screen.queryByText("Condition-matching scores")).toBeNull();
    expect(screen.getByText(/No condition matched your Subjective answers yet/)).toBeInTheDocument();
    expect(cards().length).toBeGreaterThan(3);
  });
});

describe("the saved analysis marker stays out of the reports", () => {
  it("is not printed in Review or the PDF", () => {
    const section = formatConditionObjectiveSection({ conditionAssessment_cervical: { __analysis: { sig: "[]", at: 1 } } });
    expect(section.groups).toEqual([]);
  });
});

describe("the Ortho wizard", () => {
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

  it("has no Re-analyze button in the top bar any more: the card's one button does that job", () => {
    const { container } = renderWizard({ initialStep: "objectiveAI" });
    expect(within(container.querySelector(".topbar")).queryByRole("button", { name: /Re-analyze/ })).toBeNull();
    expect(screen.queryByText(/Re-analyze/)).toBeNull();
    expect(label()).toBe("Analyze Case");
  });
});
