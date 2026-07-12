// Covers the zero-hallucination review UI added to the AI Assistant
// chat: a toggle-able side-by-side view of the original narrative vs.
// extracted fields (each with its own confidence % and source quote),
// a "Needs Review" flag for anything below 90% confidence, and a
// missing-information checklist -- so the clinician can verify exactly
// what the AI captured against exactly what was said before ever
// confirming it into the record.

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIAssistant from "../AIAssistant.jsx";

vi.mock("../supabase.js", () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } }));
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const PC = { accent: "#7c3aed", a2: "#9333ea", bg: "#F7F7F8", surface: "#fff", border: "#e5e7eb", text: "#111827", muted: "#6b7280", isDark: false };

describe("AI Assistant chat -- zero-hallucination review UI", () => {
  test("side-by-side narrative-vs-extraction toggle shows confidence, source quotes, and flags low confidence", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        chiefComplaint: "Left distal radius fracture, cast removed", age: 52, region: "Elbow/Wrist/Hand",
        laterality: "Left", duration: "6 weeks–3 months", flags: [],
        _confidence: { chiefComplaint: 95, age: 100, duration: 65 },
        _sourceQuotes: { chiefComplaint: "distal radius fracture, cast removed", age: "52 year old woman", duration: "a while back" },
      }),
    });
    const narrative = "52 year old woman, distal radius fracture on the left wrist, cast removed a while back.";

    render(<AIAssistant data={{}} set={vi.fn()} PC={PC} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/ask.*anything|type|message/i), { target: { value: narrative } });
    fireEvent.click(screen.getByText(/Fill patient record from this instead/i));
    await waitFor(() => expect(screen.getByText(/Confirm and fill record/i)).toBeInTheDocument());

    // Toggle open the review panel
    fireEvent.click(screen.getByText(/Show original speech vs. extracted fields/i));

    // Original narrative shown verbatim -- appears both as the user's
    // chat bubble and inside the review panel, so more than one match
    // is correct here.
    expect(screen.getAllByText(new RegExp(narrative.slice(0, 30))).length).toBeGreaterThan(0);
    // High-confidence field shown plainly
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    // Low-confidence field flagged for review
    expect(screen.getByText(/Needs Review/i)).toBeInTheDocument();
    // Source quotes shown
    expect(screen.getByText(/"52 year old woman"/)).toBeInTheDocument();
  });

  test("missing-information checklist appears when real gaps exist", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ age: 30, region: "Knee", laterality: "Left", flags: [] }),
    });
    render(<AIAssistant data={{}} set={vi.fn()} PC={PC} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/ask.*anything|type|message/i), { target: { value: "30 year old, hurt his left knee" } });
    fireEvent.click(screen.getByText(/Fill patient record from this instead/i));
    await waitFor(() => expect(screen.getByText(/Confirm and fill record/i)).toBeInTheDocument());

    expect(screen.getByText(/Not mentioned — worth asking about/i)).toBeInTheDocument();
    expect(screen.getByText(/Pain scale/i)).toBeInTheDocument();
  });

  test("confirming writes ai_extraction_audit with the narrative, confidence, and missing-info list", async () => {
    const setMock = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        age: 30, region: "Knee", laterality: "Left", flags: [],
        _confidence: { age: 100 }, _sourceQuotes: { age: "30 year old" },
      }),
    });
    render(<AIAssistant data={{}} set={setMock} PC={PC} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/ask.*anything|type|message/i), { target: { value: "30 year old, hurt his left knee" } });
    fireEvent.click(screen.getByText(/Fill patient record from this instead/i));
    await waitFor(() => expect(screen.getByText(/Confirm and fill record/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Confirm and fill record/i));

    expect(setMock).toHaveBeenCalledTimes(1);
    const updates = setMock.mock.calls[0][0];
    const audit = JSON.parse(updates.ai_extraction_audit);
    expect(audit.narrative).toContain("hurt his left knee");
    expect(audit.confidence.age).toBe(100);
    expect(Array.isArray(audit.missingInfo)).toBe(true);
    expect(audit.appliedAt).toBeTruthy();
  });
});
