// soapDiagnosisSuggestionRender.test.jsx
// End-to-end verification that the "Suggested Clinical Diagnoses" block in
// SOAP Notes' Assessment tab genuinely works through the real rendered UI --
// not just the underlying runInterpretation/buildAssessmentData functions in
// isolation (already covered by interpretationEngine.test.js). Renders the
// actual SOAPNoteModule component with realistic patient records the way a
// clinician's browser would, and checks the DOM for the right output.
//
// Uses a knee ACL scenario (independent of the cervical radiculopathy case
// interpretationEngine.test.js already covers) to confirm the engine
// generalises correctly across regions, and a red-flag case to confirm the
// halt behaviour reaches the screen, not just the return value.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
import { SOAPNoteModule } from "../ClinicalModules.jsx";

describe("SOAP Notes Assessment tab -- diagnosis suggestion engine, rendered", () => {
  it("surfaces ACL tear at high confidence for a real knee ACL presentation", () => {
    const data = {
      dem_name: "Test Patient", dem_age: "24", dem_sex: "Male",
      cc_main: "Right knee gave way during a pivoting movement while playing football, immediate swelling",
      cc_onset: "Sudden, during sport", cc_duration: "3 days",
      cc_vas_now: "5", cc_vas_worst: "9",
      rom_kflex_R_arom: "90", rom_kflex_R_prom: "95",
      mmt_quad_R: "3",
      st_lachmans: "Positive — soft end point, increased translation",
      st_anterior_drawer: "Positive",
      st_pivot_shift: "Positive",
    };
    render(<SOAPNoteModule data={data} set={vi.fn()} onNav={()=>{}} initialTab="A" />);
    expect(screen.getByText("💡 Suggested Clinical Diagnoses")).toBeTruthy();
    expect(screen.getByText("ACL tear")).toBeTruthy();
    expect(screen.getByText(/High/)).toBeTruthy();
  });

  it("withholds suggestions and shows the red flag warning on the actual screen", () => {
    const data = {
      dem_name: "Test Patient", dem_age: "62",
      cc_main: "Low back pain with saddle numbness and bladder changes",
      lx_rf_cauda: "Positive — saddle anaesthesia and bladder changes reported",
    };
    render(<SOAPNoteModule data={data} set={vi.fn()} onNav={()=>{}} initialTab="A" />);
    expect(screen.getByText(/Red flag screen positive — diagnosis suggestions withheld/)).toBeTruthy();
    expect(screen.getByText(/Possible cauda equina syndrome/)).toBeTruthy();
    expect(screen.queryByText("💡 Suggested Clinical Diagnoses")).toBeNull();
  });

  it("never crashes rendering the Assessment tab for a patient with no data at all", () => {
    expect(() => render(<SOAPNoteModule data={{}} set={vi.fn()} onNav={()=>{}} initialTab="A" />)).not.toThrow();
  });

  it("shows only the new deterministic engine's button for a region it now covers (shoulder) -- no duplicate/competing panel", () => {
    const data = {
      dem_name: "Test Patient", dem_age: "45",
      cc_main: "Right shoulder pain reaching overhead",
      rom_sflex_R_arom: "150", rom_sflex_R_prom: "160",
      st_hawkins: "Positive — subacromial pain",
      st_neer: "Positive — anterior shoulder pain (impingement)",
    };
    render(<SOAPNoteModule data={data} set={vi.fn()} onNav={()=>{}} initialTab="A" />);
    expect(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i)).toBeTruthy();
    expect(screen.queryByText("💡 Suggested Clinical Diagnoses")).toBeNull();
  });

  it("still shows the OLDER suggestion panel for a region the new engine doesn't cover yet (knee), confirming the gate is per-region not global", () => {
    const data = {
      dem_name: "Test Patient", dem_age: "24",
      cc_main: "Right knee gave way during a pivoting movement while playing football, immediate swelling",
      rom_kflex_R_arom: "90", rom_kflex_R_prom: "95",
      mmt_quad_R: "3",
      st_lachmans: "Positive — soft end point, increased translation",
      st_anterior_drawer: "Positive",
      st_pivot_shift: "Positive",
    };
    render(<SOAPNoteModule data={data} set={vi.fn()} onNav={()=>{}} initialTab="A" />);
    expect(screen.getByText("💡 Suggested Clinical Diagnoses")).toBeTruthy();
  });
});
