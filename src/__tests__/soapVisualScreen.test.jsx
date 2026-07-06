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

  it("STTT section shows the real test label (card grid), not a title-cased fallback of the raw key", () => {
    // Real key structure verified against CyriaxModule's actual sv() calls:
    // "cyriax_<region>_<fieldtype>_<testid>" — this exact key means "shoulder
    // region, active ROM measurement, test id sh_a_abd", which
    // CYRIAX_REGIONS_DATA defines as label "Abduction". The old fallback
    // would have shown "Sh A Abd" (title-casing the raw remainder) — this
    // test fails if that regression reappears. Card grid renders label,
    // region badge, and value as separate elements, not one joined string.
    const data = { cyriax_shoulder_act_rom_sh_a_abd: "170" };
    render(<SOAPNoteModule data={data} set={() => {}} onNav={() => {}} initialTab="O" />);
    expect(screen.getByText("STTT / Selective Tissue Tension")).toBeInTheDocument();
    expect(screen.getByText("Abduction")).toBeInTheDocument();
    expect(screen.getByText("Shoulder")).toBeInTheDocument();
    expect(screen.getByText("170")).toBeInTheDocument();
    expect(screen.queryByText(/Sh A Abd/)).not.toBeInTheDocument();
  });

  it("MMT fallback labels a spinal-level-style key clearly instead of showing a bare, unclear fragment", () => {
    // Confirmed via screenshot: real patient data can contain keys like
    // "mmt_l3"/"mmt_s1" that aren't real MMT_DATA muscle IDs (spinal-level
    // myotome shorthand, not an anatomical name) — these used to fall
    // through to a bare, inconsistently-cased fragment ("I3", lowercase
    // "s1"). Now formatted clearly as a level, not a mystery code.
    const data = { mmt_l3_R: "5/5", mmt_s1_R: "5/5" };
    render(<SOAPNoteModule data={data} set={() => {}} onNav={() => {}} initialTab="O" />);
    expect(screen.getByText(/L3.*Myotome level/)).toBeInTheDocument();
    expect(screen.getByText(/S1.*Myotome level/)).toBeInTheDocument();
  });
});
