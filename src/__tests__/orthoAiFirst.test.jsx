// orthoAiFirst.test.jsx
// The Home "AI Assessment" tile promises "Say your assessment in your words". Signed-in AI entry opens straight on the
// Subjective step (first-time walkthrough, 2026-10-02). Since 2026-10-10 (Aditi) that step is the manual form with a
// small optional "Fill in a paragraph" card above it: no "AI Parse / Manual" chooser, no "Choose a different way",
// no "Write it manually" button. Demographics and Region stay reachable on the journey dots.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { default: OrthoAssessment } = await import("../OrthoAssessment.jsx");
const PARAGRAPH = /45-year-old with gradual onset/;

describe("OrthoAssessment — AI entry opens on Subjective", () => {
  it("shows the optional paragraph card above the manual Subjective form", async () => {
    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    expect(await screen.findByText("Fill in a paragraph")).toBeTruthy();
    expect(screen.getByText("Optional")).toBeTruthy();
    expect(screen.getByPlaceholderText(PARAGRAPH)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generate with AI" })).toBeTruthy();
    expect(screen.getByText("Subjective Assessment")).toBeTruthy();
    expect(screen.getByText("Enter the patient's history from your interview.")).toBeTruthy();
    expect(screen.getAllByText(/Chief complaint/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Body Region")).toBeNull();
  });

  it("the card comes before the form, and nothing runs until Generate is tapped", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    const card = await screen.findByText("Fill in a paragraph");
    const heading = screen.getByText("Subjective Assessment");
    expect(card.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generate with AI" }).disabled).toBe(true); // nothing typed yet
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("has no chooser screen and no extra buttons to get to manual entry", () => {
    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    expect(screen.queryByText("AI Parse")).toBeNull();
    expect(screen.queryByRole("button", { name: /Choose a different way/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Write it manually/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Add manually instead/ })).toBeNull();
  });

  it("still lets the clinician go to Demographics from the journey dots", () => {
    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Demographics" })[0]);
    expect(screen.queryByPlaceholderText(PARAGRAPH)).toBeNull();
  });

  it("does not tick Demographics or Region as done when nothing was entered there", () => {
    const { container } = render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    expect(container.querySelectorAll(".ai-journey-dot.done")).toHaveLength(0);
  });

  it("guests keep the usual order, so the sign-in wall is not the first thing they see", () => {
    render(<OrthoAssessment entryMode="ai" isGuest onSave={() => {}} />);
    expect(screen.queryByPlaceholderText(PARAGRAPH)).toBeNull();
    // Demographics first, as before
    expect(screen.getAllByRole("button", { name: "Region" }).length).toBeGreaterThan(0);
  });

  it("guests reach the same Subjective step after Region, and are only asked to sign in when they tap Generate", async () => {
    const requireAuth = vi.fn(() => false);
    render(<OrthoAssessment entryMode="ai" isGuest requireAuth={requireAuth} onSave={() => {}} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Region" })[0]);
    fireEvent.click(screen.getByText("Cervical"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Fill in a paragraph")).toBeTruthy();
    expect(requireAuth).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText(PARAGRAPH), { target: { value: "Neck pain for 3 weeks" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI" }));
    expect(requireAuth).toHaveBeenCalledTimes(1);
  });

  it("template entry is unchanged and still starts on Region", () => {
    render(<OrthoAssessment entryMode="template" onSave={() => {}} />);
    expect(screen.queryByPlaceholderText(PARAGRAPH)).toBeNull();
  });
});
