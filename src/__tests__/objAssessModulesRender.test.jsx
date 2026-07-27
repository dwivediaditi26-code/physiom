import React from "react";
import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { FasciaSection, FMASection } from "../SubjectiveObjective.jsx";
import Outcomes from "../OutcomeMeasuresPro.jsx";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

describe("Objective-assessment target modules render from an empty nav (Phase 0.5 tile click)", () => {
  test("FasciaSection renders with empty navContext", () => {
    expect(() => render(<FasciaSection data={{}} set={()=>{}} navContext={{}} />)).not.toThrow();
  });
  test("FMASection renders with empty navContext", () => {
    expect(() => render(<FMASection data={{}} set={()=>{}} navTo={()=>{}} navContext={{}} />)).not.toThrow();
  });
  test("Outcomes renders with empty navContext", () => {
    expect(() => render(<Outcomes data={{}} set={()=>{}} navTo={()=>{}} navContext={{}} />)).not.toThrow();
  });
});
