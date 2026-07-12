// allConditionsVisibility.test.jsx
// Verifies that everything built across all 5 condition templates (TBI,
// Stroke, SCI, Parkinson's, MS) actually reaches all 3 real screens a
// clinician looks at: Live SOAP, the SOAP Notes visual card, and Patient
// Profile. This closes a gap found by checking rather than assuming: when
// the Stroke/SCI/Parkinson's/MS scales were built, buildRealtimeSOAP (the
// shared engine Live SOAP calls directly) was never extended for them --
// only the original TBI-era additions (cranial nerves, cognition,
// coordination, vestibular, perceptual, MoCA/MMSE/Mini-Cog) were wired in.
// Brunnstrom, Modified Rankin, Hoehn and Yahr, PD rigidity, UPDRS, EDSS,
// the autonomic dysreflexia red flag, and SCI bowel/bladder management
// status were all invisible on every screen despite being fully
// functional inside their own modules. Fixed in buildRealtimeSOAP (which
// also fixes the signed SOAP note text and the PDF, both downstream of
// it), the SOAP Notes visual card, and Patient Profile independently
// (those two don't consume buildRealtimeSOAP at all).
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildRealtimeSOAP, LiveSOAPPanel, SOAPNoteModule } from "../ClinicalModules.jsx";
import { PatientProfileModal } from "../PatientDatabase.jsx";

vi.mock("../supabase.js", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }) } }));

const fullData = {
  dem_name: "Test Patient",
  nrf_autonomic_dysreflexia: "Present",  // matches the exact value the real red-flag <select> writes
  brunnstrom_arm: "4 — IV. Spasticity declining; some movement combinations outside basic synergy are mastered",
  brunnstrom_hand: "3 — III. Spasticity peaks; voluntary control of movement synergies present, cannot move outside synergy",
  brunnstrom_leg: "5 — V. Spasticity continues to decline; more complex movement combinations independent of synergy",
  rankin_grade: "3 — Moderate disability; requires some help, but able to walk unassisted",
  hoehnyahr_stage: "2 — Bilateral or midline involvement, without impairment of balance",
  pdrigidity_upper: "3 — Marked, but full range of motion still easily achieved",
  updrs_part1: "10", updrs_part2: "15", updrs_part3: "40", updrs_part4: "4",
  edss_pyramidal: "3 — Mild to moderate paraparesis or hemiparesis; severe monoparesis",
  edss_overall: "4.5",
  sci_bladder_mgmt: "Intermittent self-catheterization",
  sci_bowel_mgmt: "Manual evacuation",
};

describe("buildRealtimeSOAP (feeds Live SOAP, signed notes, and the PDF)", () => {
  it("includes the autonomic dysreflexia red flag", () => {
    const soap = buildRealtimeSOAP(fullData);
    expect(soap.O).toContain("Autonomic dysreflexia");
  });

  it("includes all 6 new condition-staging scale scores with interpretation", () => {
    const soap = buildRealtimeSOAP(fullData);
    expect(soap.O).toContain("Brunnstrom: 12/18");
    expect(soap.O).toContain("mRS: 3/6");
    expect(soap.O).toContain("H&Y: 2");
    expect(soap.O).toContain("Rigidity: 3/4");
    expect(soap.O).toContain("UPDRS: 69");
    expect(soap.O).toContain("EDSS: 4.5");
  });

  it("includes SCI bowel and bladder management status", () => {
    const soap = buildRealtimeSOAP(fullData);
    expect(soap.O).toContain("Bladder management: Intermittent self-catheterization");
    expect(soap.O).toContain("Bowel management: Manual evacuation");
  });
});

describe("Live SOAP panel shows the same content", () => {
  it("opens and displays the new scales and red flag in the Objective text", () => {
    render(<LiveSOAPPanel data={fullData} onNavigate={() => {}} />);
    fireEvent.click(screen.getByTitle("Open Live SOAP Panel"));
    fireEvent.click(screen.getByText("O"));
    const text = document.body.textContent;
    expect(text).toContain("Brunnstrom");
    expect(text).toContain("Autonomic dysreflexia");
  });
});

describe("SOAP Notes visual card shows the new scales and status", () => {
  it("renders all 6 new scales and bowel/bladder management", () => {
    const { container } = render(<SOAPNoteModule data={fullData} set={vi.fn()} initialTab="O" />);
    const text = container.textContent;
    expect(text).toContain("Brunnstrom");
    expect(text).toContain("mRS");
    expect(text).toContain("H&Y");
    expect(text).toContain("Rigidity");
    expect(text).toContain("UPDRS");
    expect(text).toContain("EDSS");
    expect(text).toContain("Intermittent self-catheterization");
  });

  it("shows as populated when only a new-condition scale is present, nothing else", () => {
    const { container } = render(<SOAPNoteModule data={{ dem_name: "T", rankin_grade: "2 — Slight disability; able to look after own affairs without assistance, but unable to carry out all previous activities" }} set={vi.fn()} initialTab="O" />);
    expect(container.innerHTML).toContain("mRS");
  });
});

describe("Patient Profile shows the new scales and status", () => {
  it("renders a Condition Staging card and Bowel/Bladder Management card with real data", () => {
    const { container } = render(
      <PatientProfileModal patient={{ id: "1", data: fullData }} onClose={() => {}} onLoadAssessment={() => {}} onSaveField={() => {}} onNav={() => {}} initialTab="assessment" />
    );
    const html = container.innerHTML;
    expect(html).toContain("Condition Staging");
    expect(html).toContain("Brunnstrom");
    expect(html).toContain("EDSS");
    expect(html).toContain("Bowel and Bladder Management");
    expect(html).toContain("Manual evacuation");
  });

  it("shows as populated when only a new-condition scale is present, no dermatomes/GCS/etc at all", () => {
    const { container } = render(
      <PatientProfileModal patient={{ id: "1", data: { hoehnyahr_stage: "1 — Unilateral involvement only, usually minimal or no functional impairment" } }} onClose={() => {}} onLoadAssessment={() => {}} onSaveField={() => {}} onNav={() => {}} initialTab="assessment" />
    );
    expect(container.textContent).toContain("H&Y");
  });
});
