// sessionsRedesign.test.jsx
// Regression tests for the "Quick Visit" -> "Sessions" redesign: a session
// list (browsable by date and session number) plus a per-session detail
// view where exercises, modalities, and treatment are each independently
// add/edit/removable, alongside pain level and a quick note.
//
// Data model note: legacy sessions saved before this change only ever
// stored treatment as one comma-joined string (built by tapping chips that
// got appended together) and never tracked modalities per-session at all.
// legacyTreatmentToList() reconstructs that string back into discrete
// items -- a faithful, non-lossy conversion since the source data was
// already discrete, not a guess at missing data.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickVisitForm, legacyTreatmentToList, sessionSummaryLine } from "../AppModules.jsx";

const PC = { accent:"#7c3aed", a2:"#9333ea", a3:"#059669", a4:"#b45309", s2:"#f5f0fb", s3:"#ede7f6", surface:"#fff", border:"#E0E0E2", text:"#0D0D0D", muted:"#6B6B6B" };

describe("legacyTreatmentToList", () => {
  it("splits a comma-joined treatmentGiven string into discrete items", () => {
    const list = legacyTreatmentToList("Joint mobilisation, Soft tissue massage");
    expect(list).toHaveLength(2);
    expect(list.map(t => t.name)).toEqual(["Joint mobilisation", "Soft tissue massage"]);
  });

  it("returns an empty array for empty/undefined input -- no hallucinated data", () => {
    expect(legacyTreatmentToList("")).toEqual([]);
    expect(legacyTreatmentToList(undefined)).toEqual([]);
  });
});

describe("sessionSummaryLine", () => {
  it("counts structured exercises/modalities/treatment when present", () => {
    const s = { exercises: [{}, {}], modalities: [{}], treatment: [{}, {}, {}] };
    expect(sessionSummaryLine(s)).toBe("2 exercises · 1 modality · 3 treatments");
  });

  it("falls back to parsing legacy treatmentGiven when treatment array is absent", () => {
    const s = { treatmentGiven: "IFT, Manual therapy" };
    expect(sessionSummaryLine(s)).toBe("2 treatments");
  });

  it("reports no details for a session with nothing logged", () => {
    expect(sessionSummaryLine({})).toBe("No details logged");
  });
});

describe("Sessions list/detail navigation", () => {
  it("defaults to the session list, not the detail form", () => {
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={{}} set={setMock} navTo={() => {}} />);
    expect(screen.getByText("＋ New session")).toBeTruthy();
    expect(screen.queryByText(/Today — Session/)).toBeNull();
  });

  it("back button from a new session returns to the list", () => {
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={{}} set={setMock} navTo={() => {}} />);
    fireEvent.click(screen.getByText("＋ New session"));
    expect(screen.getByText(/Today — Session/)).toBeTruthy();
    fireEvent.click(screen.getByTitle("Back to sessions"));
    expect(screen.getByText("＋ New session")).toBeTruthy();
  });

  it("a saved session entry carries structured exercises/modalities/treatment plus legacy fields for older readers", () => {
    const setMock = vi.fn();
    render(<QuickVisitForm PC={PC} data={{ hep_programme: [{ id:"ex1", name:"Chin Tucks", sets:"3", reps:"10" }] }} set={setMock} navTo={() => {}} />);
    fireEvent.click(screen.getByText("＋ New session"));
    fireEvent.click(screen.getByText(/＋ Joint mobilisation/));
    fireEvent.click(screen.getByText(/＋ Hot pack/));
    fireEvent.click(screen.getByText("Save & Go to SOAP →"));
    const [, savedSessions] = setMock.mock.calls.find(c => c[0] === "tx_sessions");
    const entry = savedSessions[0];
    expect(entry.treatment).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Joint mobilisation" })]));
    expect(entry.modalities).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Hot pack" })]));
    expect(entry.exercises).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Chin Tucks" })]));
    // Legacy fields still populated so older read sites (PDF report,
    // Patient Profile history, SOAP auto-generation) keep working.
    expect(entry.treatmentGiven).toBe("Joint mobilisation");
    expect(typeof entry.response).toBe("string");
    expect(entry.vasStart).toBeDefined();
  });
});
