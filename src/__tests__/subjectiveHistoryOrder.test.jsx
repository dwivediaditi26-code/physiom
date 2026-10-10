// subjectiveHistoryOrder.test.jsx -- Aditi (2026-10-10): the history questions (previous treatment, medical history, medication, family,
// personal, socio-economic, functional limitations, patient goals) belong AFTER the region-specific subjective block, not before it.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { SubjectiveSection } = await import("../orthoOutpatientSections.jsx");

const AFTER = ["Previous treatment", "Relevant medical history", "Medication", "Family history", "Personal history", "Socio-economic history", "Functional limitations", "Patient goals"];
const BEFORE = ["Chief complaint", "Onset", "Duration"];

function renderFor(regionId) {
  document.body.innerHTML = "";
  render(
    <SubjectiveSection data={{}} setData={() => {}} selectedRegions={[{ id: regionId, label: regionId }]} setSelectedRegions={() => {}} regionLabelOf={(r) => r.label} requireAuth={() => true} />
  );
}
const pos = (el) => el.compareDocumentPosition.bind(el);

describe("order of the Subjective step", () => {
  it.each(["knee", "hip", "lumbar"])("%s: all eight history questions come after Region-specific subjective", (id) => {
    renderFor(id);
    const heading = screen.getByText("Region-specific subjective");
    for (const label of AFTER) {
      const el = screen.getByText(label, { selector: "label, .field-label, span, div" });
      expect(pos(heading)(el) & Node.DOCUMENT_POSITION_FOLLOWING, label).toBeTruthy();
    }
  });

  it("Chief complaint, Onset and Duration stay above Region-specific subjective", () => {
    renderFor("knee");
    const heading = screen.getByText("Region-specific subjective");
    for (const label of BEFORE) {
      const el = screen.getAllByText(label, { selector: "label, .field-label, span, div" })[0];
      expect(pos(heading)(el) & Node.DOCUMENT_POSITION_PRECEDING, label).toBeTruthy();
    }
  });

  it("the history questions keep their order among themselves", () => {
    renderFor("knee");
    const els = AFTER.map((l) => screen.getByText(l, { selector: "label, .field-label, span, div" }));
    for (let i = 1; i < els.length; i++) expect(pos(els[i - 1])(els[i]) & Node.DOCUMENT_POSITION_FOLLOWING, AFTER[i]).toBeTruthy();
  });
});
