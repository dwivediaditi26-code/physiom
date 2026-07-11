// neuroVisibilityFix.test.jsx
// Regression test for a real gap found while checking whether the TBI
// work actually shows up outside buildRealtimeSOAP: SOAP Notes' on-screen
// Objective tab card and Patient Profile's Neurological section each use
// their OWN independent field-scanning logic (neuroRows in
// ClinicalModules.jsx, neuroKeys/groups in PatientDatabase.jsx) rather
// than buildRealtimeSOAP -- exactly the same kind of gap GCS itself once
// had (see the existing comments left from that earlier fix). Cranial
// nerves, cognition (orientation + MoCA/MMSE/Mini-Cog), coordination,
// vestibular, and perceptual data was correctly reaching SOAP text/PDF
// generation, but was invisible on both of these actual screens
// regardless of what a clinician recorded. Both surfaces are now extended
// with the same 5 categories, matching the existing GCS card pattern in
// each file, and their "has data" gating is extended to match.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PatientProfileModal } from "../PatientDatabase.jsx";
import { SOAPNoteModule } from "../ClinicalModules.jsx";

vi.mock("../supabase.js", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }) } }));

const tbiData = {
  dem_name: "Amit Sharma",
  cn_cn7_status: "UMN pattern — forehead spared, lower face weak",
  cog_orient_person: "Yes", cog_orient_time: "No",
  moca_visuospatial: "4", moca_naming: "3", moca_attention: "5", moca_language: "3", moca_abstraction: "2", moca_delayed_recall: "4", moca_orientation: "5",
  coord_fingernose_L: "Mild dysmetria — slight overshoot/undershoot",
  vest_vest_dixhallpike_result: "Positive — right, torsional/upbeating nystagmus with latency, resolves within 60s",
  perc_perc_neglect_result: "Mild neglect — slight deviation or a few omissions on one side",
};

describe("Patient Profile Neurological section shows the new TBI categories", () => {
  it("renders cranial nerve, cognition, coordination, vestibular, and perceptual findings", () => {
    const { container } = render(
      <PatientProfileModal patient={{ id: "1", data: tbiData }} onClose={() => {}} onLoadAssessment={() => {}} onSaveField={() => {}} onNav={() => {}} initialTab="assessment" />
    );
    const html = container.innerHTML;
    expect(html).toContain("Cranial Nerves");
    expect(html).toContain("CN VII");
    expect(html).toContain("Cognition");
    expect(html).toContain("MoCA");
    expect(html).toContain("26");
    expect(html).toContain("Coordination");
    expect(html).toContain("dysmetria");
    expect(html).toContain("Vestibular");
    expect(html).toContain("Dix-Hallpike");
    expect(html).toContain("Perceptual");
    expect(html).toContain("neglect");
  });

  it("the Neurological section shows as populated (hasData) when only new-category fields are present, with no dermatomes/reflexes/GCS at all", () => {
    const { container } = render(
      <PatientProfileModal patient={{ id: "1", data: { cn_cn1_status: "Intact bilaterally" } }} onClose={() => {}} onLoadAssessment={() => {}} onSaveField={() => {}} onNav={() => {}} initialTab="assessment" />
    );
    expect(container.innerHTML).toContain("CN I");
  });
});

describe("SOAP Notes visual Objective card shows the new TBI categories", () => {
  it("renders cranial nerve, cognition, coordination, vestibular, and perceptual findings", () => {
    const { container } = render(<SOAPNoteModule data={tbiData} set={vi.fn()} initialTab="O" />);
    const html = container.innerHTML;
    expect(html).toContain("CN VII");
    expect(html).toContain("MoCA");
    expect(html).toContain("dysmetria");
    expect(html).toContain("Dix-Hallpike");
    expect(html).toContain("neglect");
  });

  it("the Neurological card renders when only new-category fields are present, with no legacy dermatome/reflex/GCS data at all", () => {
    const { container } = render(<SOAPNoteModule data={{ dem_name: "Test", cn_cn1_status: "Intact bilaterally" }} set={vi.fn()} initialTab="O" />);
    expect(container.innerHTML).toContain("CN I");
  });
});
