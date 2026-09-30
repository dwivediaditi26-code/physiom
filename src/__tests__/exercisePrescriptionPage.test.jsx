// The Exercise tab / Learn > Exercise Prescription opens the redesigned
// exercise builder, but the programme must still live at
// data.tx_exercise_prescription -- SOAP, Home Protocol and session notes read
// that key -- and changes must keep feeding the Home Protocol log (hep_log).
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import ExercisePrescriptionPage from "../ExercisePrescriptionPage.jsx";
import { ALL_EXERCISES } from "../sharedClinicalData.js";

describe("ExercisePrescriptionPage adapter", () => {
  it("renders the redesigned builder with no programme yet", () => {
    const { container } = render(<ExercisePrescriptionPage data={{}} set={() => {}} />);
    expect(container.textContent).toMatch(/exercise/i);
  });

  it("shows programme entries read from tx_exercise_prescription", () => {
    const ex = ALL_EXERCISES[0];
    const data = { tx_exercise_prescription: [{ ...ex, customSets: ex.sets, customReps: ex.reps, customHold: ex.hold, customFreq: ex.freq, notes: "" }] };
    const { container } = render(<ExercisePrescriptionPage data={data} set={() => {}} />);
    expect(container.textContent).toContain(ex.name);
  });

  it("removing an entry writes tx_exercise_prescription and a hep_log line", () => {
    const ex = ALL_EXERCISES[0];
    const set = vi.fn();
    const data = { tx_exercise_prescription: [{ ...ex, customSets: ex.sets, customReps: ex.reps, customHold: ex.hold, customFreq: ex.freq, notes: "" }] };
    const { container } = render(<ExercisePrescriptionPage data={data} set={set} />);
    const remove = [...container.querySelectorAll("button")].find((b) => /remove|delete|✕|×/i.test(b.getAttribute("aria-label") || b.textContent));
    expect(remove).toBeTruthy();
    fireEvent.click(remove);
    const prog = set.mock.calls.find((c) => c[0] === "tx_exercise_prescription");
    expect(prog?.[1]).toEqual([]);
    const log = set.mock.calls.find((c) => c[0] === "hep_log");
    expect(log?.[1][0].changes).toEqual([`− ${ex.name}`]);
  });
});
