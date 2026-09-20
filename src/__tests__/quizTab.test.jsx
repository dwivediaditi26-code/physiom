// quizTab.test.jsx
// The Quiz tab: one question shows as the plain Quick Check; several run as a
// short quiz -- one question at a time, the answer explained straight away, a
// score at the end, and a way to retry only the ones you missed.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuizTab from "../physiofeed/learn/QuizTab.jsx";

const Q = (n, right) => ({
  id: `q${n}`,
  topic: `Topic ${n}`,
  question: `Question ${n}?`,
  options: ["A", "B", "C", "D"].map((id) => ({ id, text: `q${n}-${id.toLowerCase()}` })),
  correctOptionId: right,
  explanation: `Because ${n}.`,
});
const quiz = [Q(1, "A"), Q(2, "B"), Q(3, "C")];

const pick = (n, id) => fireEvent.click(screen.getByRole("button", { name: new RegExp(`q${n}-${id.toLowerCase()}$`) }));
const submit = () => fireEvent.click(screen.getByRole("button", { name: /Submit answer/ }));
const next = (label = /Next question/) => fireEvent.click(screen.getByRole("button", { name: label }));

describe("QuizTab", () => {
  it("says so when an item has no quiz", () => {
    render(<QuizTab quiz={null} />);
    expect(screen.getByText(/No quiz for this item yet/)).toBeTruthy();
  });

  it("shows a single question as the plain Quick Check", () => {
    render(<QuizTab quiz={Q(1, "A")} />);
    expect(screen.getByText("Question 1?")).toBeTruthy();
    expect(screen.queryByText(/Question 1 of/)).toBeNull();
  });

  it("runs several questions one at a time, with a score and explanations", () => {
    render(<QuizTab quiz={quiz} />);
    expect(screen.getByText("Question 1 of 3")).toBeTruthy();
    expect(screen.getByText("Topic 1")).toBeTruthy();

    // nothing happens until an option is chosen
    submit();
    expect(screen.queryByText("Correct")).toBeNull();

    pick(1, "A");
    submit();
    expect(screen.getByText("Correct")).toBeTruthy();
    expect(screen.getByText("Because 1.")).toBeTruthy();
    next();

    expect(screen.getByText("Question 2 of 3")).toBeTruthy();
    pick(2, "D"); // wrong
    submit();
    expect(screen.getByText("Not quite")).toBeTruthy();
    next();

    pick(3, "C");
    submit();
    next(/See results/);

    expect(screen.getByText("2 / 3")).toBeTruthy();
    expect(screen.getByText("Answer:")).toBeTruthy(); // shown for the one missed
    expect(screen.getByRole("button", { name: /Retry missed \(1\)/ })).toBeTruthy();
  });

  it("retries only the missed questions and updates the score", () => {
    render(<QuizTab quiz={quiz} />);
    pick(1, "A"); submit(); next();
    pick(2, "D"); submit(); next();
    pick(3, "C"); submit(); next(/See results/);

    fireEvent.click(screen.getByRole("button", { name: /Retry missed/ }));
    expect(screen.getByText(/Question 1 of 1 · retrying missed/)).toBeTruthy();
    expect(screen.getByText("Question 2?")).toBeTruthy();
    pick(2, "B"); submit(); next(/See results/);

    expect(screen.getByText("3 / 3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Retry missed/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Restart quiz/ }));
    expect(screen.getByText("Question 1 of 3")).toBeTruthy();
  });

  it("offers a way back to the Learn tab when something was missed", () => {
    const onReview = vi.fn();
    render(<QuizTab quiz={quiz} onReview={onReview} />);
    pick(1, "B"); submit(); next();
    pick(2, "B"); submit(); next();
    pick(3, "C"); submit(); next(/See results/);
    fireEvent.click(screen.getByRole("button", { name: /Revise in the Learn tab/ }));
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
