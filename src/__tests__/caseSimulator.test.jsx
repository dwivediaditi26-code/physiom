// caseSimulator.test.jsx
// Learn -> Case Simulator: pick the knee-pain patient, play 4 questions, the
// bot reacts to each answer and the case moves on. Wording is Aditi's mockup
// text (kneeSimCase.js), so the tests read it from there.
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import CaseSimulator from "../physiofeed/learn/CaseSimulator.jsx";
import { KNEE_CASE, SIM_PATIENTS } from "../physiofeed/learn/kneeSimCase.js";

afterEach(cleanup);
const S = KNEE_CASE.stages;

function start() {
  render(<CaseSimulator onBack={() => {}}/>);
  fireEvent.click(screen.getByText("Knee Pain"));
}
function answer(stage, index) {
  fireEvent.click(screen.getByText(stage.options[index]));
  fireEvent.click(screen.getByText("Submit"));
}

describe("Case Simulator content", () => {
  it("every stage has a valid correct answer and 4 options", () => {
    for (const st of S) {
      expect(st.options).toHaveLength(4);
      expect(st.correct).toBeGreaterThanOrEqual(0);
      expect(st.correct).toBeLessThan(4);
    }
    expect(S).toHaveLength(4);
  });
});

describe("Case Simulator", () => {
  it("lists 5 patients; only Knee Pain can be opened for now", () => {
    render(<CaseSimulator onBack={() => {}}/>);
    for (const p of SIM_PATIENTS) expect(screen.getByText(p.title)).toBeInTheDocument();
    expect(screen.getByText("Neck Pain").closest("button")).toBeDisabled();
    expect(screen.getByText("Knee Pain").closest("button")).not.toBeDisabled();
  });

  it("opens the case at 1/4 with the patient's words and the first question", () => {
    start();
    expect(screen.getByTestId("sim-count")).toHaveTextContent("1/4");
    expect(screen.getByText(S[0].patient[0])).toBeInTheDocument();
    expect(screen.getByText(S[0].ask)).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeDisabled();
    expect(screen.queryByText(/Correct!/)).not.toBeInTheDocument();
  });

  it("right answer on stage 1: bot says correct, shows why, Next goes to stage 2", () => {
    start();
    answer(S[0], S[0].correct);
    expect(screen.getByText(/Correct!/)).toBeInTheDocument();
    expect(screen.getByText(S[0].explain)).toBeInTheDocument();
    expect(screen.getByText(S[0].goodLine)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("sim-count")).toHaveTextContent("2/4");
    expect(screen.getByText(S[1].ask)).toBeInTheDocument();
    expect(screen.getByText(S[1].notice)).toBeInTheDocument();
  });

  it("stage 2 right answer shows the red flag screen; stage 3 shows the key information", () => {
    start();
    answer(S[0], S[0].correct); fireEvent.click(screen.getByText("Next"));
    answer(S[1], S[1].correct);
    expect(screen.getByText("Red flag screen")).toBeInTheDocument();
    expect(screen.getByText(S[1].reply.bot)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    answer(S[2], S[2].correct);
    expect(screen.getByText("Key information")).toBeInTheDocument();
    expect(screen.getByText(S[2].reply.patient[0])).toBeInTheDocument();
  });

  it("wrong answer says not quite, marks the right one, and the case still moves on", () => {
    start();
    const wrong = S[0].options.findIndex((_, k) => k !== S[0].correct);
    answer(S[0], wrong);
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
    expect(screen.queryByText(S[0].explain)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("sim-count")).toHaveTextContent("2/4");
  });

  it("finishing all 4 shows the score; Play again restarts", () => {
    start();
    S.forEach((st, k) => { answer(st, st.correct); fireEvent.click(screen.getByText(k === S.length - 1 ? "Finish" : "Next")); });
    expect(screen.getByTestId("sim-finished")).toHaveTextContent("4 of 4");
    fireEvent.click(screen.getByText("Play again"));
    expect(screen.getByTestId("sim-count")).toHaveTextContent("1/4");
  });

  it("Back from the list calls onBack", () => {
    let back = 0;
    render(<CaseSimulator onBack={() => { back++; }}/>);
    fireEvent.click(screen.getByLabelText("Back to Learn"));
    expect(back).toBe(1);
  });
});
