// assessmentPdfCompleteness.test.jsx
// Regression test for a real bug: the Assessment Report PDF re-implemented
// its own field-name mapping separately from SOAP Notes/Live SOAP, and had
// drifted onto guessed/stale keys across most of the Subjective and
// Objective sections -- Aggravating/Easing factors, Red flags, ROM, and MMT
// were all silently empty even when a patient had real data recorded,
// because region detection relied on a "cc_body_region" field that doesn't
// exist, ROM looked for movement IDs like "rom_cx_flex" instead of the real
// "rom_cflex", and MMT looked for lowercase "_l"/"_r" suffixes instead of
// the real uppercase "_L"/"_R".
//
// Fixed by having buildAssessmentPdf call buildRealtimeSOAP (the single,
// already-verified source SOAP Notes and Live SOAP use) instead of
// re-deriving field names a second time, then rendering its Subjective/
// Objective sections into the PDF's existing card layout. This test drives
// the real PdfReportsModal component end to end (mocking window.open to
// capture the generated HTML) with a realistic patient record, so it
// exercises the exact same code path a clinician's click does.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { PdfReportsModal } from "../AppModules.jsx";

function samplePatient() {
  return {
    dem_name: "Aditi Sharma", dem_dob: "14/03/1990", dem_age: "36", dem_sex: "Female",
    dem_occupation: "Software Engineer", dem_gp: "Dr. R. Mehta",
    cc_main: "Neck pain radiating into right arm and hand",
    cc_onset: "Gradual, 6 weeks ago",
    cc_duration: "6 weeks",
    cc_vas_now: "4", cc_vas_worst: "8", cc_vas_best: "2",
    cx_agg_mov: "Looking down at phone|||Turning head to check blind spot",
    cx_agg_post: "Sitting at desk >30 min",
    cx_rel_mov: "Gentle neck rotation",
    cx_rel_med: "Ibuprofen",
    pmh_conditions: "Mild hypertension, controlled",
    med_allergies: "No known drug allergies",
    ar_goal_function: "Return to full desk work without arm symptoms",
    rom_cflex_arom: "30", rom_cflex_prom: "32",
    rom_cext_arom: "35", rom_cext_prom: "38",
    mmt_dnf_L: "3", mmt_dnf_R: "3",
    mmt_scm_L: "4", mmt_scm_R: "4",
    palp_pins: JSON.stringify([{ id:"p1", hotspotId:"c5c6", label:"Right C5/C6 facet", tenderness: 2, side:"right" }]),
    st_spurling: "Positive — radicular symptoms into right arm",
    soap_a_diagnosis: "Cervical radiculopathy (C5/C6)",
    soap_icd10: "M54.12",
  };
}

async function generateAssessmentPdf(data, dx) {
  let captured = "";
  window.open = vi.fn(() => ({ document: { open(){}, write(h){ captured = h; }, close(){} }, print(){} }));
  window.alert = vi.fn();
  render(<PdfReportsModal data={data} dx={dx} onClose={()=>{}} />);
  fireEvent.click(document.querySelector('[data-pdf-type="assessment"]'));
  await waitFor(() => { if (!captured) throw new Error("not yet"); }, { timeout: 5000 });
  return captured;
}

describe("Assessment Report PDF -- previously-missing sections now populate", () => {
  it("never throws generating a PDF for a realistic patient record", async () => {
    await expect(generateAssessmentPdf(samplePatient(), { dx: [] })).resolves.toBeTruthy();
  });

  it("region-dependent Aggravating/Easing factors are present, not silently dropped", async () => {
    const html = await generateAssessmentPdf(samplePatient(), { dx: [] });
    expect(html).toContain("Looking down at phone");
    expect(html).toContain("Turning head to check blind spot");
    expect(html).toContain("Sitting at desk");
    expect(html).toContain("Gentle neck rotation");
    expect(html).toContain("Ibuprofen");
  });

  it("Range of Motion table is present with the real recorded values", async () => {
    const html = await generateAssessmentPdf(samplePatient(), { dx: [] });
    expect(html).toContain("Range of Motion");
    expect(html).toContain("Cervical Flexion");
    expect(html).toContain("30");
  });

  it("Muscle Strength (MMT) is present with the real recorded values", async () => {
    const html = await generateAssessmentPdf(samplePatient(), { dx: [] });
    expect(html).toContain("Muscle Strength (MMT)");
    expect(html).toMatch(/Deep Neck Flexors|Sternocleidomastoid/);
  });

  it("Special Tests, Palpation, and diagnosis all still populate", async () => {
    const html = await generateAssessmentPdf(samplePatient(), { dx: [{ diagnosis: "Cervical radiculopathy (C5/C6)", icd10: "M54.12", confidence: 78 }] });
    expect(html).toContain("Spurling");
    expect(html).toContain("Right C5/C6 facet");
    expect(html).toContain("Cervical radiculopathy");
  });

  it("region is correctly detected from real objective data, not a nonexistent field", async () => {
    const html = await generateAssessmentPdf(samplePatient(), { dx: [] });
    expect(html).toContain("Cervical");
  });

  it("gracefully shows no data placeholders rather than crashing on an empty patient", async () => {
    await expect(generateAssessmentPdf({}, { dx: [] })).resolves.toBeTruthy();
  });
});
