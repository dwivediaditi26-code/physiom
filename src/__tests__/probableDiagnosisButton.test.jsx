import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProbableDiagnosis from "../ProbableDiagnosis.jsx";

describe("SUGGEST PROBABLE DIAGNOSIS button (SOAP Assessment)", () => {
  it("renders the button with the correct label", () => {
    render(<ProbableDiagnosis data={{}} />);
    expect(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i)).toBeInTheDocument();
  });

  it("runs the engine on a shoulder dataset and shows a ranked probable diagnosis", () => {
    const data = {
      cc_main: "Right shoulder pain reaching overhead",
      sh_agg_mov: "overhead",
      sh_hawkins: "positive", sh_neer: "positive", sh_painful_arc: "positive", sh_empty_can: "positive",
    };
    render(<ProbableDiagnosis data={data} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getByText(/Probable Diagnoses/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Subacromial/i).length).toBeGreaterThan(0);
  });

  it("runs on a cervical dataset via region detection", () => {
    const data = {
      cc_main: "Neck pain radiating to right arm",
      loc_radiation: "right arm and hand",
      cx_spurling: "positive", cx_distraction: "positive", cx_ultt: "positive",
    };
    render(<ProbableDiagnosis data={data} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getAllByText(/radiculopathy/i).length).toBeGreaterThan(0);
  });

  it("withholds suggestions and shows the red-flag banner when a red flag is present", () => {
    const data = { cc_main: "neck pain", cx_hoffmann: "positive", cx_gait: "positive" };
    render(<ProbableDiagnosis data={data} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getByText(/Red flag screen positive/i)).toBeInTheDocument();
  });

  it("shows a graceful message for a region the engine does not yet cover", () => {
    render(<ProbableDiagnosis data={{ cc_main: "knee pain after twisting" }} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getByText(/currently supports/i)).toBeInTheDocument();
  });
});
