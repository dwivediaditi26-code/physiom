// studyQuizScreens.test.jsx
// Learn's Cardio & Respiratory and Neurological study screens: opening an item and
// tapping Quiz now runs a several-question quiz (2026-09-20, Aditi: "now do same
// for neuro and cardio") instead of the single Quick Check they used to show.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CardioStudy from "../physiofeed/learn/CardioStudy.jsx";
import NeuroStudy from "../physiofeed/learn/NeuroStudy.jsx";

const openFirstCard = (container) => {
  const card = container.querySelector("button[aria-label^='Open ']");
  expect(card).toBeTruthy();
  fireEvent.click(card);
};
const quizLength = () => {
  fireEvent.click(screen.getByText("Quiz"));
  const label = screen.getByText(/^Question 1 of \d+$/).textContent;
  return Number(label.match(/of (\d+)/)[1]);
};

describe("Cardio & Respiratory study screen", () => {
  it("runs a several-question quiz on an item's Quiz tab", () => {
    const { container } = render(<CardioStudy onBack={() => {}} />);
    openFirstCard(container);
    expect(quizLength()).toBeGreaterThanOrEqual(6);
  });

  it("can be worked through to a score", () => {
    const { container } = render(<CardioStudy onBack={() => {}} />);
    openFirstCard(container);
    const total = quizLength();
    for (let i = 0; i < total; i++) {
      const options = [...container.querySelectorAll("button")].filter((b) => b.className.includes("items-start") && b.className.includes("rounded-xl"));
      expect(options.length).toBe(4);
      fireEvent.click(options[0]);
      fireEvent.click(screen.getByRole("button", { name: /Submit answer/ }));
      fireEvent.click(screen.getByRole("button", { name: i + 1 < total ? /Next question/ : /See results/ }));
    }
    expect(screen.getByText(new RegExp(`^\\d+ / ${total}$`))).toBeTruthy();
  });
});

describe("Neurological study screen", () => {
  const OPEN = [
    ["Reflexes", 2],
    ["Dermatomes", 3],
    ["Myotomes", 4],
    ["Cranial Nerves", 3],
    ["Conditions", 5],
  ];
  for (const [tab, atLeast] of OPEN) {
    it(`${tab}: an item's Quiz tab runs at least ${atLeast} questions`, () => {
      const { container } = render(<NeuroStudy onBack={() => {}} />);
      fireEvent.click(screen.getByText(tab));
      openFirstCard(container);
      expect(quizLength()).toBeGreaterThanOrEqual(atLeast);
    });
  }
});
