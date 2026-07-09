// soapSpaceBar.test.jsx
// Regression test for a real bug: typing a space at the end of text in any
// live-editable SOAP Notes field (Plan goals, clinical notes, total
// sessions, etc.) appeared to do nothing. Root cause: those fields used
// soapV(), which trims the value, as their controlled <input> value prop --
// so the instant a trailing space was typed, the next render recomputed the
// value with .trim() and silently reverted it. Fixed by using a separate
// non-trimming soapVRaw()/rv() for live-editable fields, keeping the
// trimming soapV()/v() for read-only display text.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SOAPNoteModule } from "../ClinicalModules.jsx";

describe("SOAP Notes — space bar in editable fields", () => {
  it("a trailing space typed into Short-term goals is not stripped back out", () => {
    const setMock = vi.fn();
    const { rerender } = render(<SOAPNoteModule data={{}} set={setMock} onNav={() => {}} initialTab="P" />);
    const input = screen.getByPlaceholderText(/Reduce pain to under 3\/10/);

    fireEvent.change(input, { target: { value: "Reduce pain " } });
    expect(setMock).toHaveBeenCalledWith("soap_goal_short", "Reduce pain ");

    // Simulate the re-render that follows a real onChange -> set() -> data update,
    // the same way the app actually re-renders this field from shared data.
    rerender(<SOAPNoteModule data={{ soap_goal_short: "Reduce pain " }} set={setMock} onNav={() => {}} initialTab="P" />);
    expect(screen.getByPlaceholderText(/Reduce pain to under 3\/10/).value).toBe("Reduce pain ");
  });

  it("clinical notes field also preserves a trailing space", () => {
    const setMock = vi.fn();
    const { rerender } = render(<SOAPNoteModule data={{}} set={setMock} onNav={() => {}} initialTab="P" />);
    const input = screen.getByPlaceholderText("Clinical notes / key findings...");
    fireEvent.change(input, { target: { value: "Tender to palpation " } });
    rerender(<SOAPNoteModule data={{ soap_clinical_notes: "Tender to palpation " }} set={setMock} onNav={() => {}} initialTab="P" />);
    expect(screen.getByPlaceholderText("Clinical notes / key findings...").value).toBe("Tender to palpation ");
  });
});
