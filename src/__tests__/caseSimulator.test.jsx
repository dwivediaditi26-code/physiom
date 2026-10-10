// caseSimulator.test.jsx
// Learn -> Case Simulator: pick the knee-pain patient, play 6 questions
// (history, red flags, symptom behaviour, examination, findings, clinical
// reasoning), then see the summary. Wording is Aditi's mockup text
// (kneeSimCase.js), so the tests read it from there.
import React from "react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import CaseSimulator from "../physiofeed/learn/CaseSimulator.jsx";
import { KNEE_CASE, SIM_PATIENTS } from "../physiofeed/learn/kneeSimCase.js";

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const S = KNEE_CASE.stages;
const good = (st) => (Array.isArray(st.correct) ? st.correct[0] : st.correct);

function start() {
  render(<CaseSimulator onBack={() => {}}/>);
  fireEvent.click(screen.getByText("Knee Pain"));
}
function answer(stage, index) {
  fireEvent.click(screen.getByText(stage.options[index]));
  fireEvent.click(screen.getByText("Submit Answer"));
}
function goNext(k) { fireEvent.click(screen.getByText(k === S.length - 1 ? "See my summary" : "Next")); }
function playAll(pick = (st) => good(st)) {
  S.forEach((st, k) => { answer(st, pick(st, k)); goNext(k); });
}

describe("Case Simulator content", () => {
  it("every stage has 4 options and a valid correct answer", () => {
    expect(S).toHaveLength(6);
    for (const st of S) {
      expect(st.options).toHaveLength(4);
      for (const k of [].concat(st.correct)) { expect(k).toBeGreaterThanOrEqual(0); expect(k).toBeLessThan(4); }
    }
  });
  it("only uses existing app pictures for assessments that have one (ROM, MMT)", () => {
    const ex = Object.fromEntries(S.find((s) => s.kind === "findings").exams.map((e) => [e.id, e]));
    expect(ex.rom.images).toEqual(["rom_kflex", "rom_kext"]);
    expect(ex.mmt.images).toEqual(["mmt_quad"]);
    expect(ex.obs.images).toBeUndefined();
    expect(ex.special.findings).toBeUndefined();
  });
});

describe("Case Simulator", () => {
  it("lists 5 patients; only Knee Pain can be opened for now", () => {
    render(<CaseSimulator onBack={() => {}}/>);
    for (const p of SIM_PATIENTS) expect(screen.getByText(p.title)).toBeInTheDocument();
    expect(screen.getByText("Neck Pain").closest("button")).toBeDisabled();
    expect(screen.getByText("Knee Pain").closest("button")).not.toBeDisabled();
  });

  it("opens at 1/6 with a 7-step tracker, the patient's words and the first question", () => {
    start();
    expect(screen.getByTestId("sim-count")).toHaveTextContent("1/6");
    const tracker = screen.getByLabelText("Case progress");
    for (const t of ["History", "Red Flags", "Symptom Behaviour", "Examination", "Findings", "Clinical Reasoning", "Summary"]) expect(within(tracker).getByText(t)).toBeInTheDocument();
    expect(tracker.querySelector('[data-state="now"]')).toHaveTextContent("History");
    expect(screen.getByText(S[0].patient[0])).toBeInTheDocument();
    expect(screen.getByText("Submit Answer")).toBeDisabled();
    expect(screen.queryByText(/Correct!/)).not.toBeInTheDocument();
  });

  it("right answer on stage 1: bot says correct, shows why, Next goes to stage 2", () => {
    start();
    answer(S[0], good(S[0]));
    expect(screen.getByText(/Correct!/)).toBeInTheDocument();
    expect(screen.getByText(S[0].explain)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("sim-count")).toHaveTextContent("2/6");
    expect(screen.getByText(S[1].notice)).toBeInTheDocument();
  });

  it("stage 2 shows the red flag screen; stage 3 the key information; stage 4 the history-complete screen", () => {
    start();
    answer(S[0], good(S[0])); goNext(0);
    answer(S[1], good(S[1]));
    expect(screen.getByText("Red flag screen")).toBeInTheDocument();
    goNext(1);
    answer(S[2], good(S[2]));
    expect(screen.getByText("Key information")).toBeInTheDocument();
    goNext(2);
    expect(screen.getByText(S[3].historyDone.bot)).toBeInTheDocument();
    expect(screen.getByText(S[3].historyDone.infoTitle)).toBeInTheDocument();
    expect(screen.getByText(S[3].ask)).toBeInTheDocument();
  });

  it("findings stage: pick an exam, see its documented findings and the existing ROM picture", () => {
    start();
    S.slice(0, 4).forEach((st, k) => { answer(st, good(st)); goNext(k); });
    const f = S[4];
    expect(screen.queryByTestId("sim-findings")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Observation & Swelling"));
    expect(screen.getByText("Mild swelling around the joint")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Knee Range of Motion"));
    expect(screen.getByText("Flexion slightly reduced")).toBeInTheDocument();
    expect(screen.getByTestId("sim-findings").querySelectorAll("img")).toHaveLength(2);
    fireEvent.click(screen.getByText("Special Tests"));
    expect(screen.getByText("Not available in this case yet.")).toBeInTheDocument();
    expect(screen.getByText(f.ask)).toBeInTheDocument();
  });

  it("findings stage accepts ROM, strength or functional test as right; McMurray immediately is wrong", () => {
    const f = S[4];
    expect(f.correct).toEqual([0, 1, 2]);
    for (const k of [0, 1, 2]) {
      cleanup(); start();
      S.slice(0, 4).forEach((st, n) => { answer(st, good(st)); goNext(n); });
      answer(f, k);
      expect(screen.getByText(/Correct!/)).toBeInTheDocument();
    }
    cleanup(); start();
    S.slice(0, 4).forEach((st, n) => { answer(st, good(st)); goNext(n); });
    answer(f, 3);
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
    expect(screen.getByText(/right answers are/)).toBeInTheDocument();
  });

  it("wrong answer says not quite, marks the right one, and the case still moves on", () => {
    start();
    const wrong = S[0].options.findIndex((_, k) => k !== good(S[0]));
    answer(S[0], wrong);
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
    expect(screen.queryByText(S[0].explain)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("sim-count")).toHaveTextContent("2/6");
  });

  it("all right: summary shows 100%, 6/6, level, time and the case summary; result is remembered", () => {
    start();
    playAll();
    expect(screen.getByTestId("sim-pct")).toHaveTextContent("100%");
    expect(screen.getByTestId("sim-correct")).toHaveTextContent("6/6");
    expect(screen.getByTestId("sim-level")).toHaveTextContent("Intermediate");
    expect(screen.getByTestId("sim-time")).toHaveTextContent(/min/);
    expect(screen.getByText("Clinical Summary")).toBeInTheDocument();
    expect(screen.getByText("Examination Findings")).toBeInTheDocument();
    expect(screen.getByText(KNEE_CASE.summary.tutor)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("pm_sim_knee_v1"))).toMatchObject({ correct: 6, total: 6, pct: 100 });
  });

  it("summary tabs: Your Answers lists every question; Learning Points and References say not available", () => {
    start();
    playAll((st, k) => (k === 5 ? 1 : good(st))); // last one wrong
    expect(screen.getByTestId("sim-correct")).toHaveTextContent("5/6");
    fireEvent.click(screen.getByText("Review My Answers"));
    const a = within(screen.getByTestId("sim-answers"));
    expect(a.getAllByText(/^Question \d/)).toHaveLength(6);
    expect(a.getByText(`Right answer: ${S[5].options[0]}`)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Learning Points"));
    expect(screen.getByText(/not available for this case yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("References"));
    expect(screen.getByText(/References are not available/)).toBeInTheDocument();
  });

  it("Replay Case restarts; Next Patient returns to the list, which shows the last attempt", () => {
    start();
    playAll();
    fireEvent.click(screen.getByText("Replay Case"));
    expect(screen.getByTestId("sim-count")).toHaveTextContent("1/6");
    playAll();
    fireEvent.click(screen.getByText("Next Patient"));
    expect(screen.getByText("Choose a Patient")).toBeInTheDocument();
    expect(screen.getByTestId("sim-last")).toHaveTextContent("6/6");
  });

  it("Back from the list calls onBack", () => {
    let back = 0;
    render(<CaseSimulator onBack={() => { back++; }}/>);
    fireEvent.click(screen.getByLabelText("Back to Learn"));
    expect(back).toBe(1);
  });
});
