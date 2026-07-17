// soapDiagnosisSuggestionRender.test.jsx
// End-to-end verification that the "Suggested Clinical Diagnoses" block in
// SOAP Notes' Assessment tab genuinely works through the real rendered UI --
// not just the underlying reasoning-engine functions in isolation (already
// covered by src/__tests__/reasoningEngine_*.test.ts). Renders the actual
// SOAPNoteModule component with realistic patient records the way a
// clinician's browser would, and checks the DOM for the right output.
//
// Uses a knee ACL scenario to confirm the engine generalises correctly
// across regions, and a red-flag case to confirm the halt behaviour reaches
// the screen, not just the return value. The older interpretationEngine/
// interpretationAdapter system this file used to also exercise has been
// removed -- the deterministic reasoning engine now covers all 9 regions
// and is the only diagnosis-suggestion path left in the app.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
import { SOAPNoteModule } from "../ClinicalModules.jsx";

describe("SOAP Notes Assessment tab -- diagnosis suggestion engine, rendered", () => {
  it("surfaces ACL tear at high confidence for a real knee ACL presentation (new deterministic engine)", () => {
    // Knee is now covered by the deterministic engine (src/reasoningEngine), so
    // this goes through the new "SUGGEST PROBABLE DIAGNOSIS" button + ranked
    // panel rather than the older auto-rendered block -- see the gate test
    // below and reasoningEngine_knee.test.ts for the underlying scoring proof.
    const data = {
      dem_name: "Test Patient", dem_age: "24", dem_sex: "Male",
      cc_main: "Right knee gave way during a pivoting movement while playing football, immediate swelling",
      cc_onset: "Sudden, during sport", cc_duration: "3 days",
      cc_vas_now: "5", cc_vas_worst: "9",
      rom_kflex_R_arom: "90", rom_kflex_R_prom: "95",
      mmt_mmt_quad_R: "3",
      knr_moi: "Twisting — non-contact (ACL)",
      knr_pop: "Yes — clear pop (ACL flag)",
      knr_swelling: "Immediate <2hrs (haemarthrosis flag)",
      st_lachmans: "Grade 3 (> 10mm, soft end-feel — complete ACL rupture)",
      st_anterior_drawer: "Positive — ACL insufficiency (compare to Lachman's)",
      st_pivot_shift: "Grade 2 — clunk (moderate)",
    };
    render(<SOAPNoteModule data={data} set={vi.fn()} onNav={()=>{}} initialTab="A" />);
    expect(screen.queryByText("💡 Suggested Clinical Diagnoses")).toBeNull();
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getAllByText(/ACL/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/High/)).toBeTruthy();
  });

  it("withholds suggestions and shows the red flag warning on the actual screen", () => {
    const data = {
      dem_name: "Test Patient", dem_age: "62",
      cc_main: "Low back pain with saddle numbness and bladder changes",
      lx_rf_cauda: "Positive — saddle anaesthesia and bladder changes reported",
    };
    render(<SOAPNoteModule data={data} set={vi.fn()} onNav={()=>{}} initialTab="A" />);
    fireEvent.click(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i));
    expect(screen.getByText(/Red flag screen positive — probable-diagnosis suggestions withheld/)).toBeTruthy();
    expect(screen.getByText(/Possible cauda equina syndrome/)).toBeTruthy();
    expect(screen.queryByText(/Probable Diagnoses \(ranked\)/)).toBeNull();
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

  it("shows only the new deterministic engine's button for hip -- no duplicate/competing panel", () => {
    const data = {
      dem_name: "Test Patient", dem_age: "35",
      cc_main: "Right anterior groin pain, worse with FADIR movement",
      rom_hflex_R_arom: "95", rom_hflex_R_prom: "100",
      hp_agg_mov: "FADIR combined (flexion + adduction + IR) — FAI pattern",
      st_fadir_test: "Positive — anterior groin pain (FAI / labral tear)",
    };
    render(<SOAPNoteModule data={data} set={vi.fn()} onNav={()=>{}} initialTab="A" />);
    expect(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i)).toBeTruthy();
    expect(screen.queryByText("💡 Suggested Clinical Diagnoses")).toBeNull();
  });

  it("shows only the new deterministic engine's button for knee -- no duplicate/competing panel (regression proof the gate now covers knee too)", () => {
    const data = {
      dem_name: "Test Patient", dem_age: "24",
      cc_main: "Right knee gave way during a pivoting movement while playing football, immediate swelling",
      rom_kflex_R_arom: "90", rom_kflex_R_prom: "95",
      knr_moi: "Twisting — non-contact (ACL)",
      st_lachmans: "Grade 3 (> 10mm, soft end-feel — complete ACL rupture)",
    };
    render(<SOAPNoteModule data={data} set={vi.fn()} onNav={()=>{}} initialTab="A" />);
    expect(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i)).toBeTruthy();
    expect(screen.queryByText("💡 Suggested Clinical Diagnoses")).toBeNull();
  });

  it("shows only the new deterministic engine's button for elbow -- no duplicate/competing panel (regression proof the gate now covers elbow too)", () => {
    const data = {
      dem_name: "Test Patient", dem_age: "32",
      cc_main: "Right lateral elbow pain, tennis player, worse gripping the racquet",
      rom_eflex_R_arom: "140", rom_eflex_R_prom: "145",
      ew_loc: "Lateral elbow — lateral epicondyle / extensor origin",
      st_cozens: "Positive — lateral epicondyle pain (lateral epicondylalgia)",
    };
    render(<SOAPNoteModule data={data} set={vi.fn()} onNav={()=>{}} initialTab="A" />);
    expect(screen.getByText(/SUGGEST PROBABLE DIAGNOSIS/i)).toBeTruthy();
    expect(screen.queryByText("💡 Suggested Clinical Diagnoses")).toBeNull();
  });
});
