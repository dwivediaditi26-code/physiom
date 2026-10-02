// assessmentPdfAllSections.test.jsx
// Broader companion to assessmentPdfCompleteness.test.jsx: that file
// verifies ROM/MMT/Special Tests/Palpation/diagnosis specifically. This one
// covers the remaining objective and advanced-assessment categories that
// weren't independently checked after the buildRealtimeSOAP integration --
// Neurological, CPA (Neuromuscular), Kinetic Chain, STTT/Cyriax, Fascial,
// Gait, Functional Screens, and Outcome Measures -- each verified with a
// real, verified field name (not guessed) and asserted to appear with its
// actual clinical content, not just its section label, in the real
// generated PDF HTML. Updated 2026-09-29: PdfReportsModal no longer renders
// a report-picker UI -- it builds and opens the PDF the instant it mounts
// (Aditi: "just generate pdf remove this page"), so mounting it is enough;
// there's no button left to click.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { PdfReportsModal } from "../AppModules.jsx";

async function generateAssessmentPdf(data) {
  let captured = "";
  window.open = vi.fn(() => ({ document: { open(){}, write(h){ captured = h; }, close(){} }, print(){} }));
  window.alert = vi.fn();
  render(<PdfReportsModal data={data} dx={{ dx: [] }} onClose={()=>{}} />);
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

  it("never prints NeurologicalAssessment.jsx's/CardiopulmonaryAssessment.jsx's internal `meta` bookkeeping as a section", async () => {
    // meta (setting/stepOrder/customStepsMeta/selectedRegions) is how those
    // wizards remember which steps were picked and in what order -- not
    // clinical content. specialtyPage used to iterate every top-level key
    // of d.neuro/d.cardio with no allowlist, so it printed this as its own
    // "Meta" section, with customStepsMeta literally rendering as
    // "[object Object]" (2026-10-02, Aditi's screenshot: "why this section
    // showing... remove these things").
    const data = {
      dem_name: "Meta Leak Test",
      neuro: {
        safety: { redFlags: "Not required" },
        subjective: { chiefComplaint: "Walk independently and regain use of right hand" },
        meta: {
          setting: "inpatient",
          stepOrder: ["demographics", "safety", "subjective", "chart"],
          customStepsMeta: { "nx-stroke-neglect-inattention": { label: "Neglect / Inattention Screen" } },
        },
      },
      cardio: {
        observation: { generalAppearance: "Alert, no distress" },
        meta: { setting: "outpatient", stepOrder: ["observation"], customStepsMeta: {} },
      },
    };
    const html = await generateAssessmentPdf(data);

    expect(html).toContain("Not required");
    expect(html).toContain("Walk independently and regain use of right hand");
    expect(html).toContain("Alert, no distress");

    expect(html).not.toContain("[object Object]");
    expect(html).not.toContain("Step Order");
    expect(html).not.toContain("Custom Steps Meta");
    expect(html).not.toMatch(/>\s*Meta\s*</);
  });

  it("drops the empty/hardcoded Chief complaint, Red & yellow flags, History and Goals cards for every patient, Ortho included", async () => {
    // Those 4 cards are the generic Ortho-intake fallback's own fields
    // (cc_/rf_/pmh_ etc), and Red & yellow flags asserted a false
    // "No red flags identified" whenever nothing had actually been
    // screened. Removed everywhere this fallback runs -- not just for
    // Neuro/Cardio patients, where they also duplicated that module's own
    // real Subjective/Safety sections (2026-10-02, Aditi: "remove this
    // chief red flags goals history... totally remove", then "remove for
    // ortho also").
    const neuroData = {
      dem_name: "No Ortho Patient",
      cc_vas_now: "6",
      neuro: { subjective: { chiefComplaint: "Walk independently and regain use of right hand" } },
    };
    const orthoLegacyData = {
      dem_name: "Legacy Ortho Patient",
      cc_main: "Low back pain",
      cc_vas_now: "6",
      rf_action: "No red flags — safe to proceed",
    };
    for (const data of [neuroData, orthoLegacyData]) {
      const html = await generateAssessmentPdf(data);
      expect(html).not.toContain("Chief complaint");
      expect(html).not.toContain("Red & yellow flags");
      expect(html).not.toContain("Past medical history & medications");
      expect(html).not.toContain("Goals & lifestyle");
      expect(html).not.toContain("No red flags identified");
      // Pain scores isn't one of the hardcoded/duplicated ones -- still shown.
      expect(html).toContain("Pain scores");
    }
    expect(await generateAssessmentPdf(neuroData)).toContain("Walk independently and regain use of right hand");
  });

  it("never invents care plan goals, manual therapy techniques, or exercises when none were entered", async () => {
    // Treatment Plan page used to always print a hardcoded 3rd goal per
    // tier, a fabricated 6-technique table, and (via gatherExercises'
    // empty-fallback) a diagnosis-keyword-matched 4-exercise program --
    // all printed as if the clinician had entered them (2026-10-02,
    // Aditi: "se what are hard coded?" audit, then "remove this any thing
    // heard corded remove t"). None of this is real without clinician
    // input, so an empty case must show honest placeholders only.
    const data = { dem_name: "No Plan Yet", cc_main: "Low back pain" };
    const html = await generateAssessmentPdf(data);

    expect(html).not.toContain("Reduce swelling/inflammation");
    expect(html).not.toContain("Return to work/leisure activities");
    expect(html).not.toContain("Prevent recurrence");
    expect(html).toContain("No care plan goals recorded yet.");

    expect(html).not.toContain("Soft Tissue Mobilisation");
    expect(html).not.toContain("Joint Mobilisation (Grade III");
    expect(html).not.toContain("Therapeutic Ultrasound");
    expect(html).not.toContain("Dry Needling");
    expect(html).toContain("No manual therapy techniques logged yet.");

    expect(html).not.toContain("Pelvic Tilt");
    expect(html).not.toContain("Chin Tuck");
    expect(html).not.toContain("Quad Set");
    expect(html).not.toContain("Diaphragmatic Breathing");
    expect(html).toContain("Not yet prescribed");
  });

  it("states the diagnosis once on the Treatment Plan page, not twice", async () => {
    // "Working diagnosis" (top card) and "Clinical diagnosis" (bottom
    // section) both printed on the same Treatment Plan page (2026-10-02,
    // Aditi: "clinical diagnosis 2 bar aa raha hai"). Clinical diagnosis
    // has the real detail (ICD-10, confidence, reasoning) -- dropped the
    // terse duplicate instead.
    const data = { dem_name: "Diagnosis Dedup Test", soap_a_diagnosis: "Lumbar radiculopathy (L5)", soap_icd10: "M54.16" };
    const html = await generateAssessmentPdf(data);

    expect(html).not.toContain("Working diagnosis");
    const matches = html.match(/Clinical diagnosis/g) || [];
    expect(matches.length).toBe(1);
    expect(html).toContain("Lumbar radiculopathy (L5)");
  });
});
