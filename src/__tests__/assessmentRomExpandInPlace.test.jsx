// assessmentRomExpandInPlace.test.jsx
// Regression coverage for the Clinical Assessment redesign: tapping the ROM
// card on the Patient Profile's Assessment tab must expand ROMModule INLINE
// (reusing the existing, real ROM module) instead of navigating away to a
// separate full-page dashboard, and the "ⓘ How to Perform" button must open
// an overlay drawer on top of the still-visible page -- never a navigation.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Same safety rule as patientProfileLabels.test.jsx -- mock supabase so this
// can never touch the real production project even though the modal is only
// rendered read-only/interaction-only here.
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

describe("Assessment tab — ROM expands in place", () => {
  it("clicking the Range of Motion card renders the real ROMModule inline, without calling onNav", async () => {
    const { onNav } = renderProfile({ rom_cflex_arom: "40" });
    fireEvent.click(screen.getByText(/Range of Motion/));
    // "Active ROM" is ROMModule's own mode-toggle button -- proves the real
    // module rendered inline, not a placeholder.
    await screen.findByText("Active ROM");
    expect(onNav).not.toHaveBeenCalled();
  });

  it("the info button opens a How-to-Perform drawer with real field content, and closing it returns to the same expanded ROM section", async () => {
    const { onNav } = renderProfile({ rom_cflex_arom: "40" });
    fireEvent.click(screen.getByText(/Range of Motion/));
    await screen.findByText("Active ROM");

    // Open the first movement (Cervical Flexion, per ROM_DATA) to reveal its
    // compact "ⓘ How to perform" button.
    fireEvent.click(screen.getAllByText("Flexion")[0]);
    const infoBtn = await screen.findByText(/How to perform/i);
    fireEvent.click(infoBtn);

    // Real field content from ROM_DATA.Cervical[0] (rom_cflex), not invented.
    await screen.findByText(/Goniometer Placement/i);
    expect(screen.getByText(/Axis: C7 SP/i)).toBeInTheDocument();
    expect(onNav).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByText(/Goniometer Placement/i)).not.toBeInTheDocument());
    // Still on the same page, ROM section still expanded underneath.
    expect(screen.getByText("Active ROM")).toBeInTheDocument();
    expect(onNav).not.toHaveBeenCalled();
  });
});
