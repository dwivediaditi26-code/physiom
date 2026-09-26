// Outcome Measures (OutcomeMeasuresPro.jsx, used inside the Neurological
// Assessment) must render from an empty navContext without crashing.
// (Its old siblings here, FasciaSection/FMASection, were removed with the
// old Screening Workflow on 2026-09-25.)
import React from "react";
import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import Outcomes from "../OutcomeMeasuresPro.jsx";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

describe("Outcome Measures renders from an empty nav", () => {
  test("Outcomes renders with empty navContext", () => {
    expect(() => render(<Outcomes data={{}} set={()=>{}} navTo={()=>{}} navContext={{}} />)).not.toThrow();
  });
});
