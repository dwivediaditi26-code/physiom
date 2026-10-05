import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClinicalInterpretationSection, INTERPRETATION_LISTS } from "../clinicalInterpretation.jsx";

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
    const order = ["Key impairments", "Activity limitations", "Participation restrictions", "Medical / referral diagnosis", "Physiotherapy diagnosis", "Differential diagnosis", "Investigations reviewed", "Red flags / precautions", "Clinical impression / hypothesis", "Physiotherapy problem list"];
    for (const kind of ["ortho", "neuro", "cardio"]) {
      const { container, unmount } = render(<Harness kind={kind} />);
      const text = container.textContent;
      let at = -1;
      for (const l of order) {
        const i = text.indexOf(l, at + 1);
        expect(i, `${kind}: ${l}`).toBeGreaterThan(at);
        at = i;
      }
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
    render(<Harness kind="ortho" section="clinicalAssessment" keys={{ physioDiagnosis: "finalDiagnosis", impression: "clinicalImpression" }} initial={{ clinicalAssessment: { clinicalImpression: "Old note", finalDiagnosis: "Old dx", problemList: "Old problems" } }} extras={[{ key: "keyFindings", label: "Key findings" }]} />);
    expect(screen.getByDisplayValue("Old note")).toBeTruthy();
    expect(screen.getByDisplayValue("Old dx")).toBeTruthy();
    expect(screen.getByDisplayValue("Old problems")).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("Old dx"), { target: { value: "New dx" } });
    expect(saved().clinicalAssessment.finalDiagnosis).toBe("New dx");
    expect(screen.getByText("Key findings")).toBeTruthy();
  });
});
