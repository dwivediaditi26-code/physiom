import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProbableDiagnosis from "../ProbableDiagnosis.jsx";
const SEP="|||";
describe("SOAP Suggest Probable Diagnosis — hip", () => {
  test("runs + renders objective assessment for hip without crashing", () => {
    const data = { cc_main:"right hip groin pain", cx_selected_regions: JSON.stringify(["Hip/Groin (L)"]),
      hp_loc:["Anterior hip / groin"].join(SEP), hp_moi:["Insidious onset"].join(SEP),
      hp_agg_mov:["Deep squat"].join(SEP) };
    render(<ProbableDiagnosis data={data} onNav={()=>{}} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getByText(/Probable Diagnoses \(ranked\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/OBJECTIVE ASSESSMENT/i).length).toBeGreaterThan(0);
  });
});
