import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExercisePrescriptionSection } from "../orthoExercisePrescription.jsx";
import { EXERCISE_DB } from "../sharedClinicalData.js";

// Neuro uses the same exercise builder as Ortho and Cardio, locked to the
// Neuro exercise library and saving to Neuro's own section.
function Harness({ initial = {} }) {
  const [data, setData] = useState(initial);
  return (
    <>
      <ExercisePrescriptionSection data={data} setData={setData} sectionKey="neuroExercisePrescription" onlyRegion="neurological" />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </>
  );
}
const saved = () => JSON.parse(screen.getByTestId("data").textContent);
const neuroCats = Object.keys(EXERCISE_DB.neurological.categories);

describe("Neuro exercise page (shared builder)", () => {
  it("shows the Neuro treatment-type tiles and no Region picker", () => {
    render(<Harness />);
    expect(screen.getByText(neuroCats[0])).toBeTruthy();
    expect(screen.queryByText("Region")).toBeNull();
    expect(screen.queryByText(/Cervical/)).toBeNull();
  });

  it("adds an exercise into the Neuro section (not the Ortho one)", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText(neuroCats[0]));
    fireEvent.click(screen.getAllByLabelText("Add to programme")[0]);
    const out = saved();
    expect(out.neuroExercisePrescription.programme.length).toBe(1);
    expect(out.exercisePrescription).toBeUndefined();
  });

  it("keeps exercises already saved on a Neuro patient", () => {
    const ex = EXERCISE_DB.neurological.categories[neuroCats[0]][0];
    render(<Harness initial={{ neuroExercisePrescription: { programme: [{ ...ex, customSets: "3", customReps: "10", customHold: "", customFreq: "Daily", notes: "" }] } }} />);
    expect(screen.getAllByText(ex.name).length).toBeGreaterThan(0);
  });
});
