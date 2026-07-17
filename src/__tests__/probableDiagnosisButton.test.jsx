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

  it("shows a graceful message when no region can be determined from the data", () => {
    // All 9 regions the app supports (shoulder/cervical/lumbar/hip/knee/elbow/
    // thoracic/ankle/wrist) are now covered by the deterministic engine (see
    // each region's reasoningEngine_*.test.ts file), so there is no longer a
    // *specific* still-uncovered region to use as an example here. This test
    // instead exercises the other branch of the same graceful-degradation
    // message: a chief complaint with no region-identifying keywords at all.
    render(<ProbableDiagnosis data={{ cc_main: "generalised ache, unsure where it's coming from" }} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getByText(/currently supports/i)).toBeInTheDocument();
    expect(screen.getByText(/couldn't determine the region/i)).toBeInTheDocument();
  });

  it("runs the engine on a hip dataset via region detection (real field ids)", () => {
    const data = {
      cc_main: "Right groin pain, worse with FADIR movement, feels like it catches",
      hp_agg_mov: "FADIR combined (flexion + adduction + IR) — FAI pattern",
      hp_c_sign: "Yes — typical intra-articular pattern",
      st_fadir_test: "Positive — anterior groin pain (FAI / labral tear)",
    };
    render(<ProbableDiagnosis data={data} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getAllByText(/impingement|labral/i).length).toBeGreaterThan(0);
  });

  it("runs the engine on a knee dataset via region detection (real field ids)", () => {
    const data = {
      cc_main: "Right knee gave way during a pivoting movement while playing football, immediate swelling",
      knr_moi: "Twisting — non-contact (ACL)",
      knr_pop: "Yes — clear pop (ACL flag)",
      st_lachmans: "Grade 3 (> 10mm, soft end-feel — complete ACL rupture)",
      st_pivot_shift: "Grade 2 — clunk (moderate)",
    };
    render(<ProbableDiagnosis data={data} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getAllByText(/ACL/i).length).toBeGreaterThan(0);
  });

  it("runs the engine on an elbow dataset via region detection (real field ids)", () => {
    const data = {
      cc_main: "Right lateral elbow pain, tennis player, worse gripping the racquet",
      ew_loc: "Lateral elbow — lateral epicondyle / extensor origin",
      ew_moi: "Sport — racquet (lateral elbow — tennis elbow)",
      st_cozens: "Positive — lateral epicondyle pain (lateral epicondylalgia)",
      st_mills: "Positive — lateral epicondyle pain (ECRB)",
    };
    render(<ProbableDiagnosis data={data} />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getAllByText(/lateral epicondylalgia/i).length).toBeGreaterThan(0);
  });
});
