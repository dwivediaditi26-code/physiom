import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { neuroDiagnosisOptionsFor, cardioDiagnosisOptionsFor, NEURO_DIAGNOSES, CARDIO_DIAGNOSES } from "../specialtyDiagnoses.js";
import { DiagnosisSection } from "../clinicalInterpretation.jsx";

describe("Neuro diagnosis options", () => {
  it("follow the condition template that was chosen", () => {
    const o = neuroDiagnosisOptionsFor({ condition: "stroke", stepOrder: ["demographics", "interpretation"] });
    expect(o.label).toBe("Stroke");
    expect(o.diagnoses).toContain("Hemiparesis (upper and lower limb)");
    expect(o.differentials).toContain("Transient ischaemic attack (TIA)");
    expect(o.diagnoses).not.toContain("Bradykinesia with reduced movement amplitude");
  });

  it("also follow condition assessments added from the Neuro library", () => {
    const o = neuroDiagnosisOptionsFor({ condition: "general", stepOrder: ["interpretation", "nx-parkinson-s-disease-bradykinesia", "nx-stroke-fugl-meyer-assessment"] });
    expect(o.label).toBe("Parkinson's / Stroke");
    expect(o.diagnoses).toContain("Freezing of gait / festinating gait");
    expect(o.diagnoses).toContain("Hemiplegia");
  });

  it("maps the other templates (GBS, neuropathy, neuromuscular -> peripheral nerve; vestibular)", () => {
    for (const id of ["gbs", "peripheralneuropathy", "neuromusculartemplate"]) {
      expect(neuroDiagnosisOptionsFor({ condition: id }).differentials).toContain("Guillain-Barré syndrome");
    }
    expect(neuroDiagnosisOptionsFor({ condition: "vestibulartemplate" }).diagnoses).toContain("Positional vertigo (BPPV, canal-specific)");
  });

  it("give nothing when the case has no condition of its own", () => {
    expect(neuroDiagnosisOptionsFor({ condition: "general", stepOrder: ["interpretation"] })).toMatchObject({ diagnoses: [], differentials: [], label: "" });
    expect(neuroDiagnosisOptionsFor()).toMatchObject({ diagnoses: [] });
  });

  it("every condition has diagnoses and a differential", () => {
    for (const [k, v] of Object.entries(NEURO_DIAGNOSES)) {
      expect(v.diagnoses.length, k).toBeGreaterThan(4);
      expect(v.differentials.length, k).toBeGreaterThan(4);
    }
  });
});

describe("Cardio diagnosis options", () => {
  it("follow the system", () => {
    expect(cardioDiagnosisOptionsFor({ setting: "outpatient", system: "cardio" }).diagnoses).toContain("Post-myocardial infarction deconditioning");
    expect(cardioDiagnosisOptionsFor({ setting: "outpatient", system: "cardio" }).diagnoses).not.toContain("Impaired airway clearance / sputum retention");
    expect(cardioDiagnosisOptionsFor({ setting: "outpatient", system: "resp" }).differentials).toContain("COPD exacerbation");
    const both = cardioDiagnosisOptionsFor({ setting: "outpatient", system: "combined" });
    expect(both.label).toBe("Cardiovascular / Respiratory");
    expect(both.diagnoses).toContain("Dyspnoea on exertion");
    expect(both.differentials).toContain("Myocardial infarction");
  });

  it("add what goes with the setting", () => {
    expect(cardioDiagnosisOptionsFor({ setting: "icu", system: "resp" }).diagnoses).toContain("ICU-acquired weakness");
    expect(cardioDiagnosisOptionsFor({ setting: "postop", system: "cardio" }).differentials).toContain("Post-operative arrhythmia");
    expect(cardioDiagnosisOptionsFor({ setting: "outpatient", system: "cardio" }).diagnoses).not.toContain("ICU-acquired weakness");
  });

  it("give nothing before a system is chosen", () => {
    expect(cardioDiagnosisOptionsFor({ setting: "icu" })).toMatchObject({ diagnoses: [], differentials: [], label: "" });
    expect(Object.keys(CARDIO_DIAGNOSES)).toEqual(["cardio", "resp"]);
  });
});

function Harness({ kind, options }) {
  const [data, setData] = useState({});
  return (
    <>
      <DiagnosisSection data={data} setData={setData} kind={kind} options={options} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </>
  );
}
const saved = () => JSON.parse(screen.getByTestId("data").textContent);

describe("Diagnosis page with condition options (Neuro / Cardio)", () => {
  it("Neuro: pick the condition's physiotherapy diagnosis and still type your own", () => {
    render(<Harness kind="neuro" options={neuroDiagnosisOptionsFor({ condition: "stroke" })} />);
    const box = screen.getByPlaceholderText("Tap to pick a Stroke diagnosis, or type your own");
    fireEvent.focus(box);
    fireEvent.click(screen.getByText("Hemiplegia"));
    expect(saved().diagnosis.physiotherapyDiagnosis).toBe("Hemiplegia");
    fireEvent.change(box, { target: { value: "Hemiplegia, Neglect" } });
    expect(saved().diagnosis.physiotherapyDiagnosis).toBe("Hemiplegia, Neglect");
  });

  it("Cardio: the differential is the system's, not the general list", () => {
    render(<Harness kind="cardio" options={cardioDiagnosisOptionsFor({ setting: "outpatient", system: "resp" })} />);
    fireEvent.focus(screen.getByPlaceholderText("Tap to pick from the list, or type your own"));
    expect(screen.getByText("Bronchiectasis")).toBeTruthy();
    expect(screen.queryByText("Anaemia deconditioning")).toBeNull();
  });

  it("with no options it falls back to a typed diagnosis and the general differential list", () => {
    render(<Harness kind="neuro" options={neuroDiagnosisOptionsFor({ condition: "general" })} />);
    expect(screen.getByPlaceholderText("Type your clinical diagnosis")).toBeTruthy();
  });
});
