// fasciaInSoap.test.jsx
// Proves fascia findings recorded in the Fascia Integration module actually
// surface in the SOAP Notes screen the clinician reads — deterministically,
// in milliseconds, with no browser and no tokens.
//
// Renders SOAPNoteModule (the real visual SOAP screen, exported from
// ClinicalModules.jsx) with the SAME fa_* field keys the FasciaNKT module
// writes (FasciaNKT.jsx test ids) and the SAME labels the SOAP screen maps
// them to (FA_NAMES in ClinicalModules.jsx).
//
// Note: the SOAP screen renders each finding as "<label>: <value>" split
// across separate text nodes, so we match label and value independently
// rather than as one joined string.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SOAPNoteModule } from "../ClinicalModules.jsx";

describe("Fascia findings reach the SOAP note", () => {
  it("shows the Fascia Integration section when fascia fields are recorded", () => {
    const data = { fa_tlf: "Restricted", fa_sbl_hamstring: "Tight" };
    render(<SOAPNoteModule data={data} set={() => {}} onNav={() => {}} initialTab="O" />);
    expect(screen.getByText("Fascia Integration")).toBeInTheDocument();
  });

  it("renders each fascia finding with its real label and value (not a raw key)", () => {
    const data = {
      fa_tlf: "Restricted",              // -> "TLF Assessment"
      fa_dfl_breathing: "Dysfunctional", // -> "DFL Diaphragm"
      fa_force_closure: "Adequate",      // -> "Force Closure/SIJ"
    };
    render(<SOAPNoteModule data={data} set={() => {}} onNav={() => {}} initialTab="O" />);
    // labels present (real FA_NAMES mapping, not the raw fa_* key)
    expect(screen.getByText(/TLF Assessment/)).toBeInTheDocument();
    expect(screen.getByText(/DFL Diaphragm/)).toBeInTheDocument();
    expect(screen.getByText(/Force Closure\/SIJ/)).toBeInTheDocument();
    // values present (may appear in both a group heading and a chip, so allow >=1)
    expect(screen.getAllByText(/Restricted/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dysfunctional/).length).toBeGreaterThan(0);
    // raw key must never leak to the clinician
    expect(screen.queryByText(/fa_tlf/)).not.toBeInTheDocument();
  });

  it("does NOT show a Fascia section when no fascia fields are recorded", () => {
    const data = { mmt_l3_R: "5/5" };
    render(<SOAPNoteModule data={data} set={() => {}} onNav={() => {}} initialTab="O" />);
    expect(screen.queryByText("Fascia Integration")).not.toBeInTheDocument();
  });
});
