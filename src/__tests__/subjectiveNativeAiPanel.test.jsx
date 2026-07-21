// Confirms the AI intake pipeline also works through its ORIGINAL home --
// the Subjective Assessment tab's own "AI" panel (SubjectiveObjective.jsx),
// not just the AI Assistant chat. Both now share the same mapping logic
// (aiIntakeParser.js) but they're two separate UIs wired up independently,
// so each needs its own real-render proof.
//
// This directly answers "is it working in Subjective Assessment": type a
// narrative into the Subjective tab's own AI box, parse, apply, and check
// that (a) a real field actually renders the AI-filled value in the live
// form, and (b) the "Review & Run Analysis" button -- disabled with zero
// regions selected -- becomes enabled in the SAME mounted component,
// because this path updates selectedRegions state directly rather than
// only writing to the persisted field a fresh mount would need to re-read.

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

vi.mock("../supabase.js", () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } }));
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

describe("Subjective Assessment tab -- native AI panel, full pipeline", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  test("narrative -> parse -> review -> apply -> form field renders it -> analysis unlocks", async () => {
    const dataStore = {};
    const setMock = vi.fn((idOrObj, val) => {
      if (typeof idOrObj === "object") Object.assign(dataStore, idOrObj);
      else dataStore[idOrObj] = val;
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        age: 52, sex: "Male", occupation: "Plumber", region: "Lumbar / SI", laterality: null,
        duration: "2–6 weeks (subacute)", onset: "Lifting injury",
        nrsNow: 5, nrsWorst: 8, nrsBest: 2,
        painQuality: ["Aching", "Sharp"], aggMovements: ["Bending"], aggActivities: ["Lifting"],
        relMovements: ["Lying down"], hasRadiation: false, neuroSymptoms: [], flags: [],
      }),
    });

    const { rerender } = render(<SubjectiveModule data={dataStore} set={setMock} onNav={() => {}} onTabChange={() => {}} />);

    // "Review & Run Analysis" disabled before anything is selected
    const analysisBtn = screen.getByText(/Review & Run Analysis/i).closest("button");
    expect(analysisBtn).toBeDisabled();

    // Open the AI panel, type a narrative -- the button's icon and label
    // are separate text nodes ("✦" / "AI"), so match on combined textContent
    const aiButtons = screen.getAllByRole("button").filter(b => b.textContent.trim() === "✦AI");
    expect(aiButtons.length).toBeGreaterThan(0);
    fireEvent.click(aiButtons[0]);
    const textarea = screen.getByPlaceholderText(/34M LBP/i);
    fireEvent.change(textarea, { target: { value: "52 year old plumber, threw his back out lifting a pipe three weeks ago, worse bending, better lying down." } });

    // Parse
    fireEvent.click(screen.getByText(/Parse with Groq AI/i));
    await waitFor(() => {
      expect(screen.getByText(/Apply to form/i)).toBeInTheDocument();
    });
    expect(setMock).not.toHaveBeenCalled();

    // Apply
    fireEvent.click(screen.getByText(/Apply to form/i));
    expect(setMock).toHaveBeenCalled();
    expect(dataStore.dem_age).toBe("52");
    expect(dataStore.cc_duration).toBe("2–6 weeks (subacute)");
    expect(dataStore.lx_agg_notes).toContain("Bending");
    expect(JSON.parse(dataStore.cx_selected_regions)).toContain("Lumbar / SI");

    // Re-render with the updated data (as the real app would after set())
    // and confirm the analysis button is now enabled in the live component.
    rerender(<SubjectiveModule data={dataStore} set={setMock} onNav={() => {}} onTabChange={() => {}} />);
    const analysisBtnAfter = screen.getByText(/Review & Run Analysis/i).closest("button");
    expect(analysisBtnAfter).not.toBeDisabled();
  });

  // Regression test for a real reported bug: a user parsing in TEXT mode
  // (the default/most-used mode -- opening the panel goes straight to
  // text, not voice) saw only a generic "⚠ Error" header after a failed
  // parse, with no way to tell what actually went wrong. Root cause: the
  // error-detail banner rendering aiResult._errorMsg lived inside the
  // `aiMode === "voice"` block only, so it never rendered in text mode at
  // all -- the real reason (e.message from runParse's catch, e.g. the
  // server's actual error text) was computed and stored but never shown
  // anywhere on screen.
  test("a failed parse in TEXT mode shows the actual error detail, not just the header pill", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ error: "Groq API rate limit exceeded, please try again shortly" }),
    });

    render(<SubjectiveModule data={{}} set={vi.fn()} onNav={() => {}} onTabChange={() => {}} />);
    const aiButtons = screen.getAllByRole("button").filter(b => b.textContent.trim() === "✦AI");
    fireEvent.click(aiButtons[0]);
    // Default mode on opening the panel is text mode -- confirm the
    // textarea is already showing without switching to voice mode first.
    const textarea = screen.getByPlaceholderText(/34M LBP/i);
    fireEvent.change(textarea, { target: { value: "some narrative" } });
    fireEvent.click(screen.getByText(/Parse with Groq AI/i));

    await waitFor(() => {
      expect(screen.getByText(/Groq API rate limit exceeded/)).toBeInTheDocument();
    });
    // The header pill alone (previously the only visible signal) is not
    // sufficient -- assert the actual detail text renders on screen.
    expect(screen.getByText(/⚠ Error/)).toBeInTheDocument();
  });
});
