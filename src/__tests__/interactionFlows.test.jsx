// interactionFlows.test.jsx
// Interaction-level regression tests: click X, assert Y actually changed --
// not just "does this render given data." Added after a session that found
// several real bugs where a control looked wired but wasn't (Exercise
// Prescription dosage editing, ProtocolPanel's onAdd never destructured) and
// one real data-loss bug (Palpation wiping existing findings on mount).
// These lock in that the highest-traffic interactive flows genuinely work,
// not just render.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TreatmentTechniquesModule, PalpationModule } from "../ClinicalModules.jsx";
import { QuickVisitForm } from "../AppModules.jsx";

const PC = { accent:"#7c3aed", a2:"#9333ea", a3:"#059669", s2:"#f5f0fb", s3:"#ede7f6", surface:"#fff", border:"#E0E0E2", text:"#0D0D0D", muted:"#6B6B6B" };

describe("Treatment Techniques — add / edit / delete", () => {
  it("Add Technique saves a filled-in manual mobilisation", () => {
    const setMock = vi.fn();
    render(<TreatmentTechniquesModule data={{}} set={setMock} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "Cervical" } });
    const techniqueSelect = selects.find(s => Array.from(s.options).some(o => o.value === "PA Central"));
    fireEvent.change(techniqueSelect, { target: { value: "PA Central" } });
    fireEvent.click(screen.getByText("III"));
    fireEvent.click(screen.getByText("+ Add Technique"));
    expect(setMock).toHaveBeenCalledWith("tx_techniques", expect.arrayContaining([
      expect.objectContaining({ region: "Cervical", technique: "PA Central", grade: "III" }),
    ]));
  });

  it("delete removes the entry from tx_techniques", () => {
    const existing = [{ id: "t1", type: "manual", region: "Lumbar", technique: "PA Central", grade: "III" }];
    const setMock = vi.fn();
    render(<TreatmentTechniquesModule data={{ tx_techniques: existing }} set={setMock} />);
    fireEvent.click(screen.getByText("✕"));
    expect(setMock).toHaveBeenCalledWith("tx_techniques", []);
  });

  it("edit populates the form and Update saves the change", () => {
    const existing = [{ id: "t1", type: "manual", region: "Lumbar", technique: "PA Central", grade: "III" }];
    const setMock = vi.fn();
    render(<TreatmentTechniquesModule data={{ tx_techniques: existing }} set={setMock} />);
    fireEvent.click(screen.getByText("✏️"));
    fireEvent.click(screen.getByText("💾 Update"));
    expect(setMock).toHaveBeenCalledWith("tx_techniques", expect.arrayContaining([
      expect.objectContaining({ id: "t1", region: "Lumbar" }),
    ]));
  });
});

describe("Quick Visit — exercise picker, progress, remove", () => {
  it("picking an exercise from the library adds it to hep_programme", () => {
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={{}} set={setMock} navTo={() => {}} />);
    fireEvent.click(screen.getByText("＋ Add exercise from library"));
    fireEvent.change(screen.getByPlaceholderText(/Search exercises/), { target: { value: "chin tuck" } });
    const addRows = screen.getAllByText("＋ Add");
    fireEvent.click(addRows[0]);
    expect(setMock).toHaveBeenCalledWith("hep_programme", expect.arrayContaining([
      expect.objectContaining({ name: "Chin Tucks" }),
    ]));
  });

  it("progressing dosage on an existing exercise updates hep_programme", () => {
    const existing = { hep_programme: [{ id: "ex1", name: "Chin Tucks", sets: "3", reps: "10", hold: "5", freq: "Daily" }] };
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={existing} set={setMock} navTo={() => {}} />);
    fireEvent.click(screen.getByTitle("Progress dosage"));
    fireEvent.change(screen.getByPlaceholderText("sets"), { target: { value: "4" } });
    fireEvent.click(screen.getByText("✓ Apply"));
    expect(setMock).toHaveBeenCalledWith("hep_programme", expect.arrayContaining([
      expect.objectContaining({ id: "ex1", customSets: "4" }),
    ]));
  });

  it("removing an exercise with a reason takes it out of hep_programme", () => {
    const existing = { hep_programme: [{ id: "ex1", name: "Chin Tucks", sets: "3", reps: "10" }] };
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={existing} set={setMock} navTo={() => {}} />);
    fireEvent.click(screen.getByTitle("Remove"));
    fireEvent.click(screen.getByText("Mastered"));
    expect(setMock).toHaveBeenCalledWith("hep_programme", []);
  });
});

describe("Palpation — must not destroy existing findings on mount", () => {
  it("opening the module with existing pins does not wipe them", () => {
    const existingPins = [{ id: "p1", hotspotId: "h1", label: "Upper Trapezius", structures: "Upper trap", side: "front", tenderness: "Moderate", temp: "", texture: [], notes: "" }];
    const setMock = vi.fn();
    render(<PalpationModule data={{ palp_pins: JSON.stringify(existingPins) }} set={setMock} />);
    expect(screen.getAllByText("Upper Trapezius").length).toBeGreaterThan(0);
    // The mount-time persistence effect must echo back what was loaded,
    // never an empty array -- that was the actual bug (silent data loss
    // the instant the tab was opened).
    for (const call of setMock.mock.calls) {
      if (call[0] === "palp_pins") {
        expect(JSON.parse(call[1])).toEqual(existingPins);
      }
    }
  });
});
