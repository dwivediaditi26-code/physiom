// Covers the same zero-hallucination review UI (side-by-side narrative
// vs. extraction, confidence, source quotes, missing-info checklist)
// wired into the Subjective tab's OWN, original AI panel -- not just
// the chat. Both surfaces share the same aiIntakeParser.js logic, but
// each has its own UI, so each needs its own render proof.

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

vi.mock("../supabase.js", () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } }));
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

describe("Subjective tab's native AI panel -- zero-hallucination review UI", () => {
  test("side-by-side toggle shows confidence, flags low confidence, and lists missing info", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chiefComplaint: "Left distal radius fracture, cast removed", age: 52, region: "Elbow/Wrist/Hand",
        laterality: "Left", duration: "6 weeks–3 months", flags: [],
        _confidence: { chiefComplaint: 95, age: 100, duration: 60 },
        _sourceQuotes: { chiefComplaint: "distal radius fracture, cast removed", age: "52 year old woman" },
      }),
    });
    const narrative = "52 year old woman, distal radius fracture, cast removed a while back.";

    render(<SubjectiveModule data={{}} set={vi.fn()} onNav={() => {}} onTabChange={() => {}} />);
    const aiButtons = screen.getAllByRole("button").filter(b => b.textContent.trim() === "✦AI");
    fireEvent.click(aiButtons[0]);
    fireEvent.change(screen.getByPlaceholderText(/34M LBP/i), { target: { value: narrative } });
    fireEvent.click(screen.getByText(/Parse with Groq AI/i));
    await waitFor(() => expect(screen.getByText(/Apply to form/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Show original speech vs. extracted fields/i));

    expect(screen.getAllByText(new RegExp(narrative.slice(0, 25))).length).toBeGreaterThan(0);
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(screen.getByText(/Needs Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Not mentioned — worth asking about/i)).toBeInTheDocument();
  });

  test("applying writes ai_extraction_audit with narrative, confidence, and missing-info", async () => {
    const dataStore = {};
    const setMock = vi.fn((idOrObj) => { if (typeof idOrObj === "object") Object.assign(dataStore, idOrObj); });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        age: 52, region: "Elbow/Wrist/Hand", laterality: "Left", flags: [],
        _confidence: { age: 100 }, _sourceQuotes: { age: "52 year old woman" },
      }),
    });
    render(<SubjectiveModule data={dataStore} set={setMock} onNav={() => {}} onTabChange={() => {}} />);
    const aiButtons = screen.getAllByRole("button").filter(b => b.textContent.trim() === "✦AI");
    fireEvent.click(aiButtons[0]);
    fireEvent.change(screen.getByPlaceholderText(/34M LBP/i), { target: { value: "52 year old woman, wrist injury" } });
    fireEvent.click(screen.getByText(/Parse with Groq AI/i));
    await waitFor(() => expect(screen.getByText(/Apply to form/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Apply to form/i));

    expect(dataStore.ai_extraction_audit).toBeTruthy();
    const audit = JSON.parse(dataStore.ai_extraction_audit);
    expect(audit.narrative).toContain("wrist injury");
    expect(audit.confidence.age).toBe(100);
    expect(audit.appliedAt).toBeTruthy();
  });
});
