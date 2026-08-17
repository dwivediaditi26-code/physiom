// assessmentSectionsExpandInPlace.test.jsx
// Regression coverage for the rest of the Clinical Assessment redesign
// (assessmentRomExpandInPlace.test.jsx covers ROM in depth): MMT, Special
// Tests, Neurological, Kinetic Chain, Fascia Integration and Outcome
// Measures must all expand IN PLACE on the Assessment tab, reusing the same
// real modules the full-page nav flow already uses -- never a navigation
// away via onNav.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { PatientProfileModal } = await import("../PatientDatabase.jsx");

function renderProfile(data) {
  const onNav = vi.fn();
  render(
    <PatientProfileModal
      patient={{ id: "p1", name: "Test Patient", data }}
      onClose={() => {}}
      onSaveField={() => {}}
      onNav={onNav}
      initialTab="assessment"
    />
  );
  return { onNav };
}

describe("Assessment tab — remaining sections expand in place", () => {
  it("MMT: expands inline (real MMTModule), and its info button opens the How-to-Perform drawer with real content", async () => {
    const { onNav } = renderProfile({ mmt_mmt_scm_L: "4" });
    fireEvent.click(screen.getByText(/Manual Muscle Testing/));
    await screen.findByText("MMT Scale");
    expect(onNav).not.toHaveBeenCalled();

    // "Sternocleidomastoid" also appears in the always-visible summary row
    // above the expanded module -- the module's own copy renders last.
    const muscleMatches = screen.getAllByText("Sternocleidomastoid");
    fireEvent.click(muscleMatches[muscleMatches.length - 1]);
    const infoBtn = await screen.findByText(/How to perform/i);
    fireEvent.click(infoBtn);
    await screen.findByText(/Anatomy/i);
    expect(screen.getAllByText(/ipsilateral lateral flex/i).length).toBeGreaterThan(0);
    expect(onNav).not.toHaveBeenCalled();
  });

  it("Special Tests: expands inline (real SpecialTestsSection)", async () => {
    const { onNav } = renderProfile({ st_neer: "Positive" });
    // "Special Tests" also appears in the completeness strip above the
    // card -- the card header is the last match.
    const stMatches = screen.getAllByText(/Special Tests/);
    fireEvent.click(stMatches[stMatches.length - 1]);
    // lazy_special.jsx is a large chunk (~360KB); first-time transform
    // under the test transformer is slower than the smaller modules above.
    await screen.findAllByPlaceholderText(/Search by test name/i, {}, { timeout: 8000 });
    expect(onNav).not.toHaveBeenCalled();
  });

  it("Neurological: expands inline (real NeurologicalModule)", async () => {
    const { onNav } = renderProfile({ n_biceps: "2+" });
    fireEvent.click(screen.getByText(/Neurological/));
    await screen.findByText("Dermatomes");
    expect(onNav).not.toHaveBeenCalled();
  });

  it("Kinetic Chain: expands inline (real KineticChainSection)", async () => {
    const { onNav } = renderProfile({ kinetic_chain: "Lower crossed syndrome pattern" });
    // Same completeness-strip collision as Special Tests above.
    const kcMatches = screen.getAllByText(/Kinetic Chain/);
    fireEvent.click(kcMatches[kcMatches.length - 1]);
    await screen.findByText(/Joint-by-Joint Theory/i);
    expect(onNav).not.toHaveBeenCalled();
  });

  it("Fascia Integration: expands inline (real FasciaSection)", async () => {
    // The Fascia card only renders once at least one fa_ field is present
    // (pre-existing gate: `{faKeys.length>0 && <Sec .../>}` in PatientDatabase.jsx).
    const { onNav } = renderProfile({ fa_sbl: "Restricted — thoracolumbar fascia" });
    fireEvent.click(screen.getByText(/Fascia Integration/));
    await screen.findByText("Global Screening");
    expect(onNav).not.toHaveBeenCalled();
  });

  it("Outcome Measures: expands inline (real OutcomeMeasuresPro)", async () => {
    const { onNav } = renderProfile({ om_history_ndi: JSON.stringify([{ score: 20, date: "2026-01-01" }]) });
    fireEvent.click(screen.getByText(/Outcome Measures/));
    // OutcomeMeasuresPro is a large lazy chunk -- same slow-cold-transform
    // reasoning as the Special Tests timeout bump above.
    await screen.findByText(/validated scales/i, {}, { timeout: 8000 });
    expect(onNav).not.toHaveBeenCalled();
  });
});
