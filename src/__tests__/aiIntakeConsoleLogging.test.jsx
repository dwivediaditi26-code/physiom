// Confirms the debug console logging added to the AI intake pipeline
// actually fires, end to end, through both real entry points -- the AI
// Assistant chat and the Subjective tab's own AI panel. This is what
// backs the "open DevTools and watch it work" verification path: if
// these logs don't fire in a real render, they won't fire for the user
// either.

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIAssistant from "../AIAssistant.jsx";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

vi.mock("../supabase.js", () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } }));
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const PARSE_RESULT = {
  age: 30, sex: "Male", occupation: null, region: "Knee", laterality: "Left",
  duration: "< 1 week (hyperacute)", onset: "Twisting injury", nrsNow: 5, nrsWorst: 8, nrsBest: 3,
  painQuality: ["Sharp"], aggMovements: ["Weight bearing"], aggActivities: [],
  relMovements: ["Ice"], hasRadiation: false, neuroSymptoms: [], flags: [],
};

describe("AI intake pipeline -- debug console logging", () => {
  let logSpy, groupSpy;
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => PARSE_RESULT });
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    groupSpy = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  test("AI Assistant chat logs all 5 stages", async () => {
    const setMock = vi.fn();
    render(<AIAssistant data={{}} set={setMock} PC={{}} onClose={() => {}} />);
    const textarea = screen.getByPlaceholderText(/ask.*anything|type|message/i);
    fireEvent.change(textarea, { target: { value: "30M twisted left knee" } });
    fireEvent.click(screen.getByText(/Fill patient record from this instead/i));
    await waitFor(() => expect(screen.getByText(/Confirm and fill record/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Confirm and fill record/i));

    const allLogText = logSpy.mock.calls.map(c => String(c[0] || "")).join(" | ");
    const allGroupText = groupSpy.mock.calls.map(c => String(c[0] || "")).join(" | ");
    expect(allLogText).toMatch(/Stage 1: narrative captured/);
    expect(allLogText).toMatch(/Stage 2: sending to \/api\/parse/);
    expect(allLogText).toMatch(/Stage 2: response received/);
    expect(allGroupText).toMatch(/Stage 3: mapped to form fields/);
    expect(allLogText).toMatch(/Stage 4: review card shown/);
    expect(allLogText).toMatch(/Stage 5: SAVING to patient record/);
  });

  test("Subjective tab's native AI panel logs all 5 stages", async () => {
    const dataStore = {};
    const setMock = vi.fn((idOrObj, val) => {
      if (typeof idOrObj === "object") Object.assign(dataStore, idOrObj);
      else dataStore[idOrObj] = val;
    });
    render(<SubjectiveModule data={dataStore} set={setMock} onNav={() => {}} onTabChange={() => {}} />);
    const aiButtons = screen.getAllByRole("button").filter(b => b.textContent.trim() === "✦AI");
    fireEvent.click(aiButtons[0]);
    const textarea = screen.getByPlaceholderText(/34M LBP/i);
    fireEvent.change(textarea, { target: { value: "30 year old, twisted left knee" } });
    fireEvent.click(screen.getByText(/Parse with Groq AI/i));
    await waitFor(() => expect(screen.getByText(/Apply to form/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Apply to form/i));

    const allLogText = logSpy.mock.calls.map(c => String(c[0] || "")).join(" | ");
    const allGroupText = groupSpy.mock.calls.map(c => String(c[0] || "")).join(" | ");
    expect(allLogText).toMatch(/Stage 1: narrative captured/);
    expect(allLogText).toMatch(/Stage 2: sending to \/api\/parse/);
    expect(allLogText).toMatch(/Stage 2: response received/);
    expect(allGroupText).toMatch(/Stage 3: mapped to form fields/);
    expect(allLogText).toMatch(/Stage 4: review panel shown/);
    expect(allLogText).toMatch(/Stage 5: SAVING to patient record/);
  });
});
