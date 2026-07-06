// soapVisualScreen.test.jsx
// Regression test for two real bugs in the visual SOAP Notes screen
// (SOAPNoteModule's own JSX, distinct from buildRealtimeSOAP's plain-text
// builder used by Live SOAP / Copy note):
//   - CPA section showed its header but read unused legacy fields
//     (cpa_pattern, cx_cpa, etc.) instead of the real nkt_<muscle> fields
//     the actual CPA/NKT module writes — content was silently blank even
//     with real findings recorded.
//   - STTT/Cyriax had no section in the visual screen at all, even though
//     it was already correctly built into the plain-text builder.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SOAPNoteModule } from "../ClinicalModules.jsx";

describe("SOAP Notes visual screen — CPA and STTT sections", () => {
  it("CPA section shows real nkt_ findings, not a blank block", () => {
    const data = { nkt_upper_trap: "Overactive/Facilitated", nkt_lower_trap: "Inhibited" };
    render(<SOAPNoteModule data={data} set={() => {}} onNav={() => {}} initialTab="O" />);
    expect(screen.getByText("Compensation Pattern Analysis (CPA)")).toBeInTheDocument();
    expect(screen.getByText("Upper Trap")).toBeInTheDocument();
    expect(screen.getByText("Lower Trap")).toBeInTheDocument();
  });

  it("STTT section now exists and shows real cyriax_ findings", () => {
    const data = { cyriax_shoulder_a_abd: "Painful, limited" };
    render(<SOAPNoteModule data={data} set={() => {}} onNav={() => {}} initialTab="O" />);
    expect(screen.getByText("STTT / Selective Tissue Tension")).toBeInTheDocument();
    expect(screen.getByText(/Shoulder.*Abd/)).toBeInTheDocument();
  });
});
