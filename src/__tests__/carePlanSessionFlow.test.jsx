// Start Session for a Neuro/Ortho/Cardio patient goes to the CARE PLAN's Sessions screen
// (seeded from the plan's treatments, goal measures feed Progress) -- not the separate tx_sessions log.
import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NeuroCarePlanSection } from "../NeuroCarePlan.jsx";
import { requestSessionLaunch, carePlanOf, patientSessionView } from "../txSessions.js";

const plan = {
  problems: [{ id: "p1", name: "Impaired gait" }],
  goals: [{ id: "g1", measure: "10MWT", baseline: 20, target: 10, unit: "s", term: "short", weeks: 4 }],
  treatments: [{ id: "t1", name: "Gait training", goalIds: ["g1"], sets: "3", reps: "10" }],
  sessions: [],
};
const store = { data: {} };
function Harness({ launch }) {
  const [data, setD] = useState(store.data);
  if (launch) requestSessionLaunch();
  const setData = (u) => { const next = typeof u === "function" ? u(store.data) : u; store.data = next; setD(next); };
  return <NeuroCarePlanSection data={data} setData={setData} initialPhase="sessions" />;
}
const fresh = (sessions = []) => { store.data = { neuroCarePlan: { ...plan, sessions } }; };
const bump = (w, n) => { for (let i = 0; i < n; i++) fireEvent.click(screen.getByLabelText(`${w} pain plus`)); };
const saved = () => store.data.neuroCarePlan.sessions;

describe("Care plan sessions (Start Session)", () => {
  it("opens straight into a new session, seeded from the plan, numbered 1", () => {
    fresh();
    render(<Harness launch />);
    expect(screen.getByText("Check-in")).toBeTruthy();
    expect(screen.getByText("Gait training")).toBeTruthy();
    expect(screen.getByText("Save Draft")).toBeTruthy();
  });

  it("saves a draft once, resumes it, completes it, then the next session is 2", () => {
    fresh();
    const first = render(<Harness launch />);
    bump("Before", 6);
    fireEvent.click(screen.getByText("Save Draft"));
    fireEvent.click(screen.getByText(/Draft saved|Save Draft/));
    expect(saved()).toHaveLength(1);
    expect(saved()[0].status).toBe("draft");
    first.unmount();

    render(<Harness launch />);                    // "refresh" -> Start Session resumes the draft
    expect(screen.getByLabelText("Before pain").textContent).toContain("6");
    bump("After", 3);
    fireEvent.click(screen.getByText(/Complete Session →/));   // -> review
    fireEvent.click(screen.getByText("✓ Complete Session"));   // confirm
    expect(screen.getByText("Session Completed")).toBeTruthy();
    expect(saved()).toHaveLength(1);
    expect(saved()[0]).toMatchObject({ status: "completed", no: 1, painBefore: "6", painAfter: "3" });
    const s1 = { ...saved()[0] };

    fireEvent.click(screen.getByText("Start Next Session"));
    expect(screen.getByText("Gait training")).toBeTruthy();
    bump("Before", 5); bump("After", 2);
    fireEvent.click(screen.getByText(/Complete Session →/));
    fireEvent.click(screen.getByText("✓ Complete Session"));
    expect(saved()).toHaveLength(2);
    expect(saved().find((x) => x.no === 2)).toMatchObject({ status: "completed" });
    expect(saved().find((x) => x.no === 1)).toEqual(s1);   // earlier session untouched
  });

  it("will not complete without the pain rating, and says why", () => {
    fresh();
    render(<Harness launch />);
    fireEvent.click(screen.getByText(/Complete Session →/));
    expect(screen.getByRole("alert").textContent).toMatch(/pain rating/);
    expect(saved()).toHaveLength(0);
  });

  it("goal measures recorded in a completed session feed Progress; drafts do not", () => {
    fresh([
      { id: "a", no: 1, date: "2026-10-01", items: [], measures: { g1: "18" }, note: "", status: "completed", painBefore: "6", painAfter: "4" },
      { id: "b", no: 2, date: "2026-10-03", items: [], measures: { g1: "5" }, note: "", status: "draft", painBefore: "", painAfter: "" },
    ]);
    const { container } = render(<NeuroCarePlanSection data={store.data} setData={() => {}} initialPhase="progress" />);
    expect(container.textContent).toMatch(/Latest value: 18/);          // the draft's measure (5) is ignored
    expect(container.textContent).not.toMatch(/Latest value: 5/);
    expect(container.textContent).toMatch(/6\/10 → 4\/10/);             // pain trend comes from completed sessions
  });

  it("older sessions with no status still count as completed and open as a summary", () => {
    fresh([{ id: "old", no: 1, date: "2026-09-20", items: [{ treatmentId: "t1", done: true, actual: "3 x 10", note: "" }], measures: {}, note: "Went well" }]);
    render(<Harness />);
    fireEvent.click(screen.getByText(/Session 1 · 2026-09-20/));
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("Went well")).toBeTruthy();
    expect(screen.getByText("Start Next Session")).toBeTruthy();
  });
});

describe("which store a patient uses", () => {
  it("care plan for neuro/ortho/cardio patients, tx_sessions otherwise", () => {
    expect(carePlanOf({ neuro: { x: 1 } }).kind).toBe("neuro");
    expect(carePlanOf({ ortho_outpatient_assessment: "{}" }).kind).toBe("ortho");
    expect(carePlanOf({ cardio: { x: 1 } }).kind).toBe("cardio");
    expect(carePlanOf({ cc_main: "LBP" })).toMatchObject({ kind: "ortho", implicit: true });   // no specialty -> general care plan
    const v = patientSessionView({ data: { neuro: { neuroCarePlan: { sessions: [{ id: "1", no: 1, status: "draft" }, { id: "2", no: 2 }] } } } });
    expect(v.source).toBe("careplan");
    expect(v.done).toHaveLength(1);
    expect(v.draft.id).toBe("1");
    expect(patientSessionView({ data: { cc_main: "LBP" } }).source).toBe("careplan");
  });
});

import { TreatmentSessionScreen } from "../SpecialtyPatientProfile.jsx";
describe("Treatment page session screen", () => {
  it("opens the care-plan session editor inside Treatment, with the patient's name and a back button", () => {
    const patient = { id: "n1", name: "Sita Rao", data: { dem_name: "Sita Rao", cc_main: "Stroke", neuro: { neuroCarePlan: { ...plan, sessions: [] } } } };
    let back = false, saved = null;
    requestSessionLaunch();
    render(<TreatmentSessionScreen patient={patient} onBack={() => { back = true; }} onSaveField={(id, d) => { saved = [id, d]; }} />);
    expect(screen.getByText("Sita Rao")).toBeTruthy();
    expect(screen.getByText("Check-in")).toBeTruthy();
    bump("Before", 4);
    fireEvent.click(screen.getByText("Save Draft"));
    expect(saved[0]).toBe("n1");
    expect(saved[1].neuro.neuroCarePlan.sessions[0]).toMatchObject({ status: "draft", no: 1, painBefore: "4" });
    fireEvent.click(screen.getByLabelText("Back to Treatment"));
    expect(back).toBe(true);
  });
});
