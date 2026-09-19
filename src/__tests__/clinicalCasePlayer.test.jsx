// clinicalCasePlayer.test.jsx
// Learn -> Clinical Learning -> Clinical Cases: the case player shows ONE step
// at a time under a pinned header of numbered step chips, with a Back / Next
// bar. Steps ahead stay locked until reached (so a student can't jump to the
// diagnosis); finished steps can be revisited; the last step offers Restart.
// (2026-09-19, Aditi: "i have scroll down to go to next ... a header should
// present step wise".)
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClinicalLearning from "../physiofeed/learn/ClinicalLearning.jsx";

function openFirstCase() {
  render(<ClinicalLearning onBack={() => {}} />);
  fireEvent.click(screen.getByText("Clinical Cases"));
  fireEvent.click(screen.getByText("Low Back Pain"));
}
const stepChip = (n, label, locked) =>
  screen.getByRole("button", { name: `Step ${n}: ${label}${locked ? " (locked)" : ""}` });

describe("Clinical case player", () => {
  it("starts on step 1 with the later steps locked and no Back button", () => {
    openFirstCase();
    expect(screen.getByText("1 / 9")).toBeTruthy();
    expect(screen.getByText("Patient profile")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Next: Complaint/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(stepChip(2, "Complaint", true)).toBeTruthy();
  });

  it("does not open a locked step", () => {
    openFirstCase();
    fireEvent.click(stepChip(5, "Exam", true));
    expect(screen.getByText("1 / 9")).toBeTruthy();
    expect(screen.getByText("Patient profile")).toBeTruthy();
  });

  it("shows one step per screen, unlocks it, and lets you go back to a finished step", () => {
    openFirstCase();
    fireEvent.click(screen.getByRole("button", { name: /Next: Complaint/ }));
    expect(screen.getByText("2 / 9")).toBeTruthy();
    expect(screen.getByText("Chief complaint")).toBeTruthy();
    expect(screen.queryByText("Patient profile")).toBeNull();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();

    fireEvent.click(stepChip(1, "Patient"));
    expect(screen.getByText("1 / 9")).toBeTruthy();
    expect(screen.getByText("Patient profile")).toBeTruthy();
    // step 2 was reached, so it stays open
    expect(stepChip(2, "Complaint")).toBeTruthy();
  });

  it("ends on Restart case, which locks the steps again", () => {
    openFirstCase();
    for (let i = 0; i < 8; i++) fireEvent.click(screen.getByRole("button", { name: /^Next:/ }));
    expect(screen.getByText("9 / 9")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Next:/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Restart case/ }));
    expect(screen.getByText("1 / 9")).toBeTruthy();
    expect(stepChip(2, "Complaint", true)).toBeTruthy();
  });
});
