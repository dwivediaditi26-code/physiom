// subjectiveStarHint.test.jsx -- the line under "Region-specific subjective" that explains the star.
// Aditi (2026-10-10): the old line said "everything else ... doesn't currently feed that matching", which read as if the whole
// Subjective (chief complaint, onset ...) was ignored, and it appeared even for the spine regions where every question counts.
// Now: spine regions say every question counts; other regions say un-starred answers are only notes; both say honestly that
// the Chief complaint / Onset text is only lightly read.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { SubjectiveSection } = await import("../orthoOutpatientSections.jsx");

function show(regionId) {
  document.body.innerHTML = "";
  render(
    <SubjectiveSection
      data={{}}
      setData={() => {}}
      selectedRegions={[{ id: regionId, label: regionId }]}
      setSelectedRegions={() => {}}
      regionLabelOf={(r) => r.label}
      requireAuth={() => true}
    />
  );
  return screen.getByText(/this answer changes which conditions/);
}

describe("the star hint under Region-specific subjective", () => {
  it("Cervical, Thoracic and Lumbar: every question counts", () => {
    for (const id of ["cervical", "thoracic", "lumbar"]) {
      const el = show(id);
      expect(el.textContent).toMatch(/In this region every question below does/);
      expect(el.textContent).not.toMatch(/Answers without a star/);
    }
  });

  it("Knee: un-starred answers are notes only", () => {
    const el = show("knee");
    expect(el.textContent).toMatch(/Answers without a star are saved in your notes but do not change the suggestions/);
    expect(el.textContent).not.toMatch(/every question below/);
  });

  it("never claims that the whole Subjective is ignored, and says the typed text is only lightly read", () => {
    const el = show("shoulder");
    expect(el.textContent).not.toMatch(/doesn't currently feed|valuable documentation/);
    expect(el.textContent).toMatch(/Chief complaint and Onset above is only lightly read/);
  });
});
