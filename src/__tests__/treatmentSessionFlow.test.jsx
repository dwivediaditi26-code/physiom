// The appointment-free Treatment workflow: Start Session -> document -> Save Draft / Complete
// -> summary -> next session (number increments by itself) -> history. A small stateful harness
// stands in for the app's patient data so persistence and numbering are exercised for real.
import React, { useState } from "react";
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { preloadSessionDetailView, QuickVisitForm } from "../AppModules.jsx";
import { TreatmentCaseloadPanel } from "../PatientDatabase.jsx";
import { completedSessions, nextSessionNo, findDraftSession } from "../txSessions.js";

beforeAll(async () => { await preloadSessionDetailView(); });

const PC = { accent:"#7c3aed", a2:"#9333ea", a3:"#059669", a4:"#d97706", s2:"#f5f0fb", s3:"#ede7f6", surface:"#fff", border:"#E0E0E2", text:"#0D0D0D", muted:"#666", bg:"#fff" };
const store = { data: {} };

function Harness({ launch }) {
  const [data, setData] = useState(store.data);
  const set = (k, v) => { store.data = { ...store.data, [k]: v }; setData(store.data); };
  return <QuickVisitForm PC={PC} data={data} set={set} navTo={() => {}} launch={launch} />;
}
const fresh = (d = {}) => { store.data = { dem_name: "Rahul Sharma", cc_main: "Low Back Pain", ...d }; };
const addTreatment = (name) => {
  fireEvent.click(screen.getByText(name));
};
const bump = (which, n) => { for (let i = 0; i < n; i++) fireEvent.click(screen.getByLabelText(`${which} pain plus`)); };

describe("Session workflow (no appointments)", () => {
  it("numbers the first session 1, saves a draft, resumes it, completes it", () => {
    fresh();
    const { unmount } = render(<Harness launch={{ mode: "start" }} activePatientId={undefined} />);
    expect(screen.getByText(/Session 1/)).toBeTruthy();
    bump("Before", 6);
    fireEvent.change(screen.getByPlaceholderText(/Add treatment notes/), { target: { value: "Tolerated well" } });
    fireEvent.click(screen.getByText("Save Draft"));
    // saved once as a draft, not counted as a completed session
    let list = store.data.tx_sessions;
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("draft");
    expect(completedSessions(list)).toHaveLength(0);
    // saving the draft again updates it instead of adding a second one
    fireEvent.click(screen.getByText(/Draft saved|Save Draft/));
    expect(store.data.tx_sessions).toHaveLength(1);
    unmount();

    // "refresh": remount from the stored data; Start Session resumes the same draft
    render(<Harness launch={{ mode: "start" }} activePatientId={undefined} />);
    expect(screen.getByDisplayValue("Tolerated well")).toBeTruthy();
    expect(screen.getByLabelText("Before pain").textContent).toContain("6");
    bump("After", 3);
    fireEvent.click(screen.getByText(/Complete Session/));
    expect(screen.getByText("Session Completed")).toBeTruthy();
    expect(screen.getByText(/6\/10 → 3\/10/)).toBeTruthy();
    expect(store.data.tx_sessions).toHaveLength(1);
    expect(store.data.tx_sessions[0]).toMatchObject({ status: "completed", sessionNo: 1, vasStart: "6", vasEnd: "3" });
    expect(store.data.tx_sessions[0].completedAt).toBeTruthy();
    expect(findDraftSession(store.data.tx_sessions)).toBeNull();

    // Start Next Session auto-numbers 2 and leaves session 1 untouched
    const first = { ...store.data.tx_sessions[0] };
    fireEvent.click(screen.getByText("Start Next Session"));
    expect(screen.getByText(/Session 2/)).toBeTruthy();
    expect(nextSessionNo(store.data.tx_sessions)).toBe(2);
    addTreatment("Manual therapy");
    bump("After", 1);
    fireEvent.click(screen.getByText(/Complete Session/));
    const [s2, s1] = store.data.tx_sessions;
    expect(s2).toMatchObject({ status: "completed", sessionNo: 2 });
    expect(s1).toEqual(first);
    expect(completedSessions(store.data.tx_sessions)).toHaveLength(2);
  });

  it("tabs: Treatment checklist first; Exercises and Notes content only on their own tab", () => {
    fresh();
    render(<Harness launch={{ mode: "start" }} />);
    const visible = (text) => { const el = screen.getByText(text); return el.closest("div[style*='display: none']") === null; };
    expect(visible("Session Details")).toBe(true);
    expect(visible(/Exercises \/ Home Program/.source ? "Exercises / Home Program" : "")).toBe(false);
    fireEvent.click(screen.getByRole("tab", { name: "Exercises" }));
    expect(visible("Exercises / Home Program")).toBe(true);
    expect(visible("Session Details")).toBe(false);
    fireEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect(visible("Plan for next session")).toBe(true);
  });

  it("blocks completing an empty session and says why", () => {
    fresh();
    render(<Harness launch={{ mode: "start" }} activePatientId={undefined} />);
    fireEvent.click(screen.getByText(/Complete Session/));
    expect(screen.getByRole("alert").textContent).toMatch(/treatment or a session note/);
    expect(store.data.tx_sessions).toBeUndefined();
  });

  it("requires the after-treatment pain rating", () => {
    fresh();
    render(<Harness launch={{ mode: "start" }} activePatientId={undefined} />);
    addTreatment("Manual therapy");
    fireEvent.click(screen.getByText(/Complete Session/));
    expect(screen.getByRole("alert").textContent).toMatch(/pain rating/);
  });

  it("opens a completed session as a summary with its treatments and notes", () => {
    fresh({ tx_sessions: [{ id: "a", sessionNo: 1, date: "03/10/2026", status: "completed", vasStart: "6", vasEnd: "3",
      treatment: [{ id: "t", name: "Lumbar mobilisation", detail: "" }], quickNote: "Less stiff", exercises: [{ id: "e", name: "Cat-Camel", detail: "2×10" }] }] });
    render(<Harness launch={{ mode: "open", id: "a" }} activePatientId={undefined} />);
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText(/Lumbar mobilisation/)).toBeTruthy();
    expect(screen.getByText("Less stiff")).toBeTruthy();
    expect(screen.getByText(/Cat-Camel/)).toBeTruthy();
    expect(screen.getByText("Start Next Session")).toBeTruthy();
  });

  it("older sessions without a status still count as completed", () => {
    expect(nextSessionNo([{ id: "x" }, { id: "y" }])).toBe(3);
  });
});

describe("Treatment page", () => {
  const mk = (id, name, sessions) => ({ id, name, data: { cc_main: "Low Back Pain", ortho_care_plan: { sessions } } });
  const done = (no, date) => ({ id: "s" + no, no, date, status: "completed", painBefore: "6", painAfter: "3" });
  const patients = [
    mk("1", "Rahul Sharma", [done(1, "2026-10-01")]),
    mk("2", "Priya Patel", [{ id: "d", no: 1, status: "draft", date: "2026-10-02" }]),
    mk("3", "Amit Kumar", []),
  ];

  it("shows summary cards, ongoing patients only, and Start Session / Resume Draft", () => {
    const started = [];
    render(<TreatmentCaseloadPanel patients={patients} onStart={(p, id) => started.push([p.name, id])} />);
    expect(screen.getByText("Manage and record patient treatment sessions")).toBeTruthy();
    expect(screen.queryByText("Amit Kumar")).toBeNull();        // no sessions -> not ongoing
    expect(screen.getByText("Resume Draft →")).toBeTruthy();    // Priya has a draft
    fireEvent.click(screen.getByText("Start Session →"));
    expect(started).toEqual([["Rahul Sharma", undefined]]);
    expect(screen.queryByText(/appointment/i)).toBeNull();
  });

  it("All Patients lists everyone so a first session can start; search filters by name", () => {
    render(<TreatmentCaseloadPanel patients={patients} onStart={() => {}} />);
    fireEvent.click(screen.getByText("All Patients"));
    expect(screen.getByText("Amit Kumar")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search patient by name"), { target: { value: "pri" } });
    expect(screen.getByText("Priya Patel")).toBeTruthy();
    expect(screen.queryByText("Rahul Sharma")).toBeNull();
  });

  it("Completed tab lists completed sessions and opens that session", () => {
    const started = [];
    render(<TreatmentCaseloadPanel patients={patients} onStart={(p, id) => started.push([p.name, id])} />);
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    fireEvent.click(screen.getByText("Rahul Sharma"));
    expect(started).toEqual([["Rahul Sharma", "s1"]]);
  });

  it("shows a neuro patient's care-plan sessions (count, last session, draft), not tx_sessions", () => {
    const neuro = { id: "n1", name: "Sita Rao", data: { neuro: { neuroCarePlan: { sessions: [
      { id: "a", no: 1, date: "2026-10-01", status: "completed", painBefore: "6", painAfter: "4" },
      { id: "b", no: 2, date: "2026-10-03", status: "draft" },
    ] } } } };
    render(<TreatmentCaseloadPanel patients={[neuro]} onStart={() => {}} />);
    expect(screen.getByText("Sita Rao")).toBeTruthy();
    expect(screen.getByText("Resume Draft →")).toBeTruthy();
    expect(screen.getByText(/Last Session: 1 Oct 2026 · Session 1/)).toBeTruthy();
    expect(screen.queryByLabelText("More options")).toBeTruthy();
  });

  it("empty state with zero patients, with a View Patients button", () => {
    let went = false;
    render(<TreatmentCaseloadPanel patients={[]} onViewPatients={() => { went = true; }} />);
    expect(screen.getByText("No patients in treatment yet")).toBeTruthy();
    expect(screen.queryByText(/active treatment yet/)).toBeNull();
    fireEvent.click(screen.getByText("View Patients"));
    expect(went).toBe(true);
  });
});
