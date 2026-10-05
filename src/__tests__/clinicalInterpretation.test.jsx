import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClinicalInterpretationSection, DiagnosisSection, INTERPRETATION_LISTS } from "../clinicalInterpretation.jsx";

function Harness({ initial = {}, ...props }) {
  const [data, setData] = useState(initial);
  return (
    <>
      <ClinicalInterpretationSection data={data} setData={setData} {...props} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </>
  );
}
const saved = () => JSON.parse(screen.getByTestId("data").textContent);

describe("shared Clinical Interpretation page", () => {
  it("shows the same sections in the same order for every specialty", () => {
    const order = ["Key impairments", "Activity limitations", "Participation restrictions", "Investigations reviewed", "Red flags / precautions", "Clinical impression / hypothesis", "Physiotherapy problem list"];
    for (const kind of ["ortho", "neuro", "cardio"]) {
      const { container, unmount } = render(<Harness kind={kind} />);
      const text = container.textContent;
      let at = -1;
      for (const l of order) {
        const i = text.indexOf(l, at + 1);
        expect(i, `${kind}: ${l}`).toBeGreaterThan(at);
        at = i;
      }
      // the diagnosis boxes are their own page now
      for (const gone of ["Medical diagnosis", "Physiotherapy diagnosis", "Differential diagnosis"]) expect(text, `${kind}: ${gone}`).not.toContain(gone);
      unmount();
    }
  });

  it("each specialty has its own pick-list options", () => {
    expect(INTERPRETATION_LISTS.ortho.impairments).toContain("Reduced ROM");
    expect(INTERPRETATION_LISTS.neuro.impairments).toContain("Spasticity");
    expect(INTERPRETATION_LISTS.cardio.impairments).toContain("Dyspnoea");
    expect(INTERPRETATION_LISTS.cardio.impairments).not.toContain("Reduced ROM");
  });

  it("lets you pick from the list and also type your own", () => {
    render(<Harness kind="neuro" />);
    const box = screen.getAllByPlaceholderText("Tap to pick from the list, or type your own")[0];
    fireEvent.focus(box);
    fireEvent.click(screen.getByText("Spasticity"));
    expect(saved().interpretation.impairments).toBe("Spasticity");
    fireEvent.change(box, { target: { value: "Spasticity, Clonus" } });
    expect(saved().interpretation.impairments).toBe("Spasticity, Clonus");
  });

  it("saves into the wizard's own field names, so old saved patients still show", () => {
    render(<Harness kind="ortho" section="clinicalAssessment" keys={{ impression: "clinicalImpression" }} initial={{ clinicalAssessment: { clinicalImpression: "Old note", problemList: "Old problems" } }} extras={[{ key: "keyFindings", label: "Key findings" }]} />);
    expect(screen.getByDisplayValue("Old note")).toBeTruthy();
    expect(screen.getByDisplayValue("Old problems")).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("Old note"), { target: { value: "New note" } });
    expect(saved().clinicalAssessment.clinicalImpression).toBe("New note");
    expect(screen.getByText("Key findings")).toBeTruthy();
  });


  describe("Diagnosis page (after the Clinical page)", () => {
    function DxHarness({ initial = {}, ...props }) {
      const [data, setData] = useState(initial);
      return (
        <>
          <DiagnosisSection data={data} setData={setData} {...props} />
          <pre data-testid="data">{JSON.stringify(data)}</pre>
        </>
      );
    }

    it("has medical, physiotherapy and differential diagnosis, in that order, for every specialty", () => {
      for (const kind of ["ortho", "neuro", "cardio"]) {
        const { container, unmount } = render(<DxHarness kind={kind} />);
        const text = container.textContent;
        const a = text.indexOf("Medical diagnosis"), b = text.indexOf("Physiotherapy diagnosis"), c = text.indexOf("Differential diagnosis");
        expect(a, kind).toBeGreaterThan(-1);
        expect(b, kind).toBeGreaterThan(a);
        expect(c, kind).toBeGreaterThan(b);
        unmount();
      }
    });

    it("saves into its own diagnosis section", () => {
      render(<DxHarness kind="neuro" />);
      fireEvent.change(screen.getByPlaceholderText("Type the diagnosis written on the referral"), { target: { value: "Ischaemic stroke" } });
      fireEvent.change(screen.getByPlaceholderText("Type your clinical diagnosis"), { target: { value: "Left hemiparesis" } });
      expect(saved().diagnosis).toEqual({ medicalDiagnosis: "Ischaemic stroke", physiotherapyDiagnosis: "Left hemiparesis" });
    });

    it("still shows diagnoses typed on the old Clinical page, and clears the old copy when edited", () => {
      const initial = { clinicalAssessment: { finalDiagnosis: "Old physio dx", differentialDiagnosis: "Old differential", referralDiagnosis: "Old referral dx", clinicalImpression: "Keep me" } };
      render(<DxHarness kind="ortho" legacy={{ section: "clinicalAssessment", keys: { physioDiagnosis: "finalDiagnosis" } }} initial={initial} />);
      expect(screen.getByDisplayValue("Old referral dx")).toBeTruthy();
      expect(screen.getByDisplayValue("Old physio dx")).toBeTruthy();
      expect(screen.getByDisplayValue("Old differential")).toBeTruthy();
      fireEvent.change(screen.getByDisplayValue("Old physio dx"), { target: { value: "New physio dx" } });
      const out = saved();
      expect(out.diagnosis.physiotherapyDiagnosis).toBe("New physio dx");
      expect(out.clinicalAssessment.finalDiagnosis).toBe("");
      expect(out.clinicalAssessment.differentialDiagnosis).toBe("Old differential"); // untouched until edited
      expect(out.clinicalAssessment.clinicalImpression).toBe("Keep me");
    });
  });
});
