import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummarySection as CardioSummary } from "../CardiopulmonaryAssessment.jsx";
import { SummarySection as NeuroSummary } from "../NeurologicalAssessment.jsx";

// Cardio and Neuro use the shared rowsForStep (orthoSummary.jsx); their Summary
// pages must read its { label, value } rows. (The Cardio Summary once crashed
// with "object is not iterable" when it still read [label, value] pairs.)
const steps = [{ id: "interpretation", label: "Clinical Interpretation", icon: "🧠" }];
const data = { interpretation: { impairments: "Dyspnoea, Fatigue", problemList: "Breathless on stairs" } };

describe("Cardio and Neuro summary pages", () => {
  it("Cardio shows rows from a filled section without crashing", () => {
    render(<CardioSummary setting="opd" system="combined" data={data} setData={() => {}} assessSteps={steps} formatters={{}} />);
    expect(screen.getByText("Dyspnoea, Fatigue")).toBeTruthy();
    expect(screen.getByText("Breathless on stairs")).toBeTruthy();
  });
  it("Neuro shows rows from a filled section without crashing", () => {
    render(<NeuroSummary setting="opd" data={data} setData={() => {}} assessSteps={steps} formatters={{}} />);
    expect(screen.getByText("Dyspnoea, Fatigue")).toBeTruthy();
    expect(screen.getByText("Breathless on stairs")).toBeTruthy();
  });
});
