// treatmentPdfExercises.test.jsx
// Regression test for a bug report: exercises prescribed via the Treatment
// tab's Exercise Prescription module (written to data.tx_exercise_prescription)
// never appeared in the generated Treatment Plan PDF. Root cause:
// gatherExercises() in AppModules.jsx only ever read data.hep_programme
// (the separate Home Exercise Programme store), with zero awareness of
// tx_exercise_prescription -- so any patient whose exercises were only
// added via Exercise Prescription (the module the Treatment tab actually
// points at, per the Sessions/SOAP work earlier) got generic diagnosis-based
// placeholder exercises instead of what was really prescribed, or nothing
// meaningful at all. Fixed by merging tx_exercise_prescription and
// hep_programme (de-duplicated) before falling back to manual/generic data.
//
// Updated 2026-09-29: the standalone "Treatment Plan" report/button is gone
// (Aditi: "remove ... treatment ... make it one") -- its content is now the
// final page of the single "assessment" report, so these assertions run
// against that combined PDF instead of a `data-pdf-type="treatment"` button
// that no longer exists. Further updated the same day: PdfReportsModal no
// longer renders a report-picker UI at all -- it builds and opens the PDF
// the instant it mounts (Aditi: "just generate pdf remove this page"), so
// mounting it is enough; there's no button left to click.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { PdfReportsModal } from "../AppModules.jsx";

const capturePdf = async (data) => {
  let captured = "";
  window.open = vi.fn(() => ({ document: { open(){}, write(h){ captured = h; }, close(){} }, print(){} }));
  window.alert = vi.fn();
  render(<PdfReportsModal data={data} dx={{dx:[]}} onClose={()=>{}} />);
  await waitFor(() => { if (!captured) throw new Error("not yet"); }, { timeout: 5000 });
  return captured;
};

describe("Treatment Plan page (merged into the Assessment & Treatment PDF) shows exercises from Exercise Prescription", () => {
  it("real tx_exercise_prescription entries appear in the combined PDF (previously missing entirely)", async () => {
    const data = {
      dem_name: "Rahul Mehta", dem_age: "42", dem_sex: "Male",
      cc_main: "Chronic lower back pain",
      tx_exercise_prescription: [
        { id: "lx_bridge", name: "Glute Bridge", phase: "Phase 1", target: "Gluteus maximus",
          customSets: "3", customReps: "12", customHold: "5", customFreq: "Daily", notes: "Squeeze at top" },
        { id: "lx_birddog", name: "Bird Dog", phase: "Phase 2", target: "Multifidus, core",
          customSets: "3", customReps: "10", customHold: "5", customFreq: "Daily", notes: "" },
      ],
    };
    const html = await capturePdf(data);
    expect(html).toContain("Glute Bridge");
    expect(html).toContain("Bird Dog");
    expect(html).toContain("Gluteus maximus");
    expect(html).toContain("Multifidus, core");
  });

  it("still shows hep_programme exercises when Exercise Prescription is empty (no regression)", async () => {
    const data = {
      dem_name: "Priya Nair", dem_age: "30", dem_sex: "Female",
      cc_main: "Knee pain",
      hep_programme: [
        { id: "k_quadset", name: "Quad Set", phase: "Phase 1", target: "Quadriceps",
          customSets: "3", customReps: "15", customHold: "5", customFreq: "2x Daily", notes: "" },
      ],
    };
    const html = await capturePdf(data);
    expect(html).toContain("Quad Set");
  });

  it("merges both stores without duplicating an exercise present in both", async () => {
    const shared = { id: "shared_ex", name: "Shared Exercise", phase: "Phase 1", target: "Core",
      customSets: "3", customReps: "10", customHold: "", customFreq: "Daily", notes: "" };
    const data = {
      dem_name: "Test Patient",
      tx_exercise_prescription: [shared, { id: "rx_only", name: "Rx Only Exercise", phase: "Phase 1", target: "", customSets:"3",customReps:"10",customHold:"",customFreq:"Daily",notes:"" }],
      hep_programme: [shared],
    };
    const html = await capturePdf(data);
    const occurrences = html.split("Shared Exercise").length - 1;
    expect(occurrences).toBe(1);
    expect(html).toContain("Rx Only Exercise");
  });
});
