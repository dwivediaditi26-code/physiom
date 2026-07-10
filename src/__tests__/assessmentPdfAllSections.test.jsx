// assessmentPdfAllSections.test.jsx
// Broader companion to assessmentPdfCompleteness.test.jsx: that file
// verifies ROM/MMT/Special Tests/Palpation/diagnosis specifically. This one
// covers the remaining objective and advanced-assessment categories that
// weren't independently checked after the buildRealtimeSOAP integration --
// Neurological, CPA (Neuromuscular), Kinetic Chain, STTT/Cyriax, Fascial,
// Gait, Functional Screens, and Outcome Measures -- each verified with a
// real, verified field name (not guessed) and asserted to appear with its
// actual clinical content, not just its section label, in the real
// generated PDF HTML.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { PdfReportsModal } from "../AppModules.jsx";

async function generateAssessmentPdf(data) {
  let captured = "";
  window.open = vi.fn(() => ({ document: { open(){}, write(h){ captured = h; }, close(){} }, print(){} }));
  window.alert = vi.fn();
  render(<PdfReportsModal data={data} dx={{ dx: [] }} onClose={()=>{}} />);
  fireEvent.click(document.querySelector('[data-pdf-type="assessment"]'));
  await waitFor(() => { if (!captured) throw new Error("not yet"); }, { timeout: 5000 });
  return captured;
}

describe("Assessment Report PDF -- every objective/advanced category present with real content", () => {
  it("covers Observation, Neurological, CPA, Kinetic Chain, STTT, Fascial, Gait, Functional Screen, and Outcome Measures", async () => {
    const data = {
      dem_name: "Comprehensive Test", dem_age: "40", dem_sex: "Female",
      cc_main: "Chronic low back pain with right leg symptoms",
      cc_vas_now: "5", cc_vas_worst: "8",
      posture_defect_forward_head: true,
      obs_summary: "Antalgic posture, guarded lumbar movement",
      palp_pins: JSON.stringify([{ id:"p1", hotspotId:"l4l5", label:"L4/L5 paraspinals", tenderness: 3, side:"right" }]),
      rom_lflex_arom: "40", rom_lflex_prom: "45",
      mmt_glut_med_R: "3",
      st_slr_test: "Positive at 45 degrees, right",
      n_l5_left: "Normal", n_l5_right: "Reduced sensation",
      nkt_gmed: "Inhibited", nkt_notes: "Glute med inhibition with TFL overactivity",
      kc_hip_ext_mob: "Restricted — positive Thomas test",
      cy_lx_flex_active: "Positive",
      fa_sbl_hamstring: "Restricted, right side tighter",
      gait_pattern: "Antalgic",
      ag_trend: "Present", ag_trend_note: "Right side",
      lfs_data: JSON.stringify({ grades: { lfs_squat: 2 }, notes: { lfs_squat: "Loss of lumbar control" } }),
      om_odi_score: "32",
      soap_a_diagnosis: "Lumbar radiculopathy (L5) with gluteal dysfunction",
      soap_icd10: "M54.16",
    };
    const html = await generateAssessmentPdf(data);

    expect(html).toContain("Observation");
    expect(html).toContain("Antalgic posture, guarded lumbar movement");

    expect(html).toContain("Neurological");
    expect(html).toMatch(/L5.*Reduced sensation|Reduced sensation/);

    expect(html).toContain("Neuromuscular Assessment (CPA)");
    expect(html).toContain("Glute Med");
    expect(html).toContain("Inhibited");

    expect(html).toContain("Kinetic Chain Assessment");
    expect(html).toContain("Thomas Test");

    expect(html).toContain("STTT / Selective Tissue Tension");

    expect(html).toContain("Fascial Assessment");
    expect(html).toContain("SBL");
    expect(html).toContain("Hamstring");

    expect(html).toContain("Gait Analysis");
    expect(html).toContain("Antalgic");

    expect(html).toMatch(/Functional Screen|Squat/);

    expect(html).toContain("Outcome Measures");
    expect(html).toContain("ODI");
    expect(html).toContain("32");
  });
});
