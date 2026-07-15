import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProbableDiagnosis from "../ProbableDiagnosis.jsx";

describe("SUGGEST PROBABLE DIAGNOSIS button (SOAP Assessment)", () => {
  it("renders the button with the correct label", () => {
    render(<ProbableDiagnosis data={{}} />);
    expect(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i)).toBeInTheDocument();
  });

  it("runs the engine on a shoulder dataset (real field ids) and shows a ranked probable diagnosis", () => {
    const data = {
      cc_main: "Right shoulder pain reaching overhead",
      sh_agg_mov: "overhead",
      st_hawkins: "Positive — subacromial pain",
      st_neer: "Positive — anterior shoulder pain (impingement)",
      st_empty_can: "Positive — painful (tendinopathy)",
    };
    render(<ProbableDiagnosis data={data} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getByText(/Probable Diagnoses/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Subacromial/i).length).toBeGreaterThan(0);
  });

  it("runs on a cervical dataset via region detection (real field ids)", () => {
    const data = {
      cc_main: "Neck pain radiating to right arm",
      loc_radiation: "right arm and hand",
      st_spurling: "Positive — left (radiculopathy)",
      st_distraction: "Positive — symptom relief (nerve root compression)",
      myo_c6_left: "4", myo_c6_right: "3",
    };
    render(<ProbableDiagnosis data={data} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getAllByText(/radiculopathy/i).length).toBeGreaterThan(0);
  });

  it("runs on a lumbar dataset via region detection (real field ids)", () => {
    const data = {
      cc_main: "Low back pain with leg pain below the knee",
      lx_below_knee: "Leg pain — below knee (radiculopathy threshold)",
      lx_dermatomal: "L5 — lateral lower leg / dorsum foot / great toe",
      st_slr_test: "Positive 30–60° (highly specific for disc herniation)",
      myo_l5_left: "5", myo_l5_right: "3",
    };
    render(<ProbableDiagnosis data={data} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getAllByText(/radiculopathy/i).length).toBeGreaterThan(0);
  });

  it("withholds suggestions and shows the red-flag banner when a red flag is present", () => {
    const data = { cc_main: "neck pain", st_hoffmanns: "Positive — present", cx_gait: "positive" };
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
