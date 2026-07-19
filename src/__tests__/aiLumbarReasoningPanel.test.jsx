// Component-level coverage for Task #10's frontend wiring: a new,
// additive "AI Clinical Reasoning" panel that runs alongside the existing
// deterministic runEngineV6 output, triggered from the same "Review & Run
// Analysis" flow, but only for Lumbar/SI.
//
// Deliberately seeds cx_selected_regions with the REAL region-picker id
// format ("Lumbar/SI (L)", laterality-suffixed) rather than the plain
// "Lumbar / SI" string -- the region picker (REGION_GROUPS in
// SubjectiveObjective.jsx) is lr:true for every region including lumbar,
// so it only ever writes laterality-suffixed ids into selectedRegions.
// The gating logic must translate through REGION_FAMILY_KEY to detect
// this correctly; testing with the plain string would have silently
// passed even if that translation were missing.
import React from "react";
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

vi.mock("../supabase.js", () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } }));
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const aiResponse = {
  clinicalClues: { painLocation: "Central low back" },
  hypotheses: [{ pattern: "Mechanical lumbar pain", probability: "High", reasoning: "Flexion-aggravated pattern with no red flags." }],
  objectivePlan: {
    observation: [{ item: "Lumbar posture", priority: "High", reasoning: "Screen for guarding" }],
    rom: [{ movement: "Flexion", priority: "High", reasoning: "Reproduces symptoms" }],
    mmt: [], functional: [], kineticChain: [], specialTests: [],
  },
  clinicalSummary: "Mechanical flexion-sensitive lumbar pattern, no red flags.",
};

function runAnalysisFlow() {
  fireEvent.click(screen.getByText(/Review & Run Analysis/));
  fireEvent.click(screen.getByText(/Run analysis/));
}

describe("AI Clinical Reasoning panel (Lumbar/SI, additive to Engine v6)", () => {
  test("renders hypotheses, exam plan, and summary when Lumbar/SI is selected via the real laterality-suffixed picker id", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => aiResponse });
    const data = { cx_selected_regions: JSON.stringify(["Lumbar/SI (L)"]) };

    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    runAnalysisFlow();

    // Deterministic Engine v6 output must still appear -- additive, never replaced.
    // (Matched via the footer's own unique phrase -- "Engine v6" alone now also
    // matches this new panel's own subtitle, since it names what it runs alongside.)
    await waitFor(() => expect(screen.getByText(/7-Phase Clinical Reasoning/)).toBeInTheDocument());

    await waitFor(() => expect(screen.getByText(/AI Clinical Reasoning/)).toBeInTheDocument());
    expect(screen.getByText("Mechanical lumbar pain")).toBeInTheDocument();
    expect(screen.getByText(/Flexion-aggravated pattern/)).toBeInTheDocument();
    expect(screen.getByText(/Mechanical flexion-sensitive lumbar pattern/)).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith("/api/lumbarReasoning", expect.objectContaining({ method: "POST" }));
  });

  test("does not call the AI endpoint or render the panel for a non-lumbar region", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => aiResponse });
    const data = { cx_selected_regions: JSON.stringify(["Cervical (L)"]) };

    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    runAnalysisFlow();

    await waitFor(() => expect(screen.getByText(/Engine v6/)).toBeInTheDocument());
    expect(screen.queryByText(/AI Clinical Reasoning/)).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("shows a non-blocking error state without breaking the deterministic results if the AI call fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Groq error" }) });
    const data = { cx_selected_regions: JSON.stringify(["Lumbar/SI (L)"]) };

    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    runAnalysisFlow();

    await waitFor(() => expect(screen.getByText(/7-Phase Clinical Reasoning/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/AI reasoning unavailable/)).toBeInTheDocument());
  });

  test("also fires for a plain 'Lumbar / SI' selection (e.g. written directly by the AI intake parser)", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => aiResponse });
    const data = { cx_selected_regions: JSON.stringify(["Lumbar / SI"]) };

    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    runAnalysisFlow();

    await waitFor(() => expect(screen.getByText(/AI Clinical Reasoning/)).toBeInTheDocument());
  });
});
