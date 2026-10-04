// orthoAiFirst.test.jsx
// The Home "AI Assessment" tile promises "Say your assessment in your words",
// but used to open Demographics, then Region, and only the third screen let
// you speak (first-time walkthrough, 2026-10-02). AI entry now opens on the
// speaking screen; Demographics and Region stay reachable.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { default: OrthoAssessment } = await import("../OrthoAssessment.jsx");

describe("OrthoAssessment — AI entry opens on the speaking screen", () => {
  it("shows the say-it-in-your-words box first, not Demographics", () => {
    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    expect(screen.getByPlaceholderText(/45 year old office worker/)).toBeTruthy();
    expect(screen.queryByText("Body Region")).toBeNull();
  });

  it("still lets the clinician go to Demographics from the journey dots", () => {
    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Demographics" })[0]);
    expect(screen.queryByPlaceholderText(/45 year old office worker/)).toBeNull();
  });

  it("offers a way to type the history instead", () => {
    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Choose a different way/ }));
    expect(screen.getByText("Manual")).toBeTruthy();
  });

  it("does not tick Demographics or Region as done when nothing was entered there", () => {
    const { container } = render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    expect(container.querySelectorAll(".ai-journey-dot.done")).toHaveLength(0);
  });

  it("guests keep the usual order, so the sign-in wall is not the first thing they see", () => {
    render(<OrthoAssessment entryMode="ai" isGuest onSave={() => {}} />);
    expect(screen.queryByPlaceholderText(/45 year old office worker/)).toBeNull();
    // Demographics first, as before
    expect(screen.getAllByRole("button", { name: "Region" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("AI Parse")).toBeNull();
  });

  it("template entry is unchanged and still starts on Region", () => {
    render(<OrthoAssessment entryMode="template" onSave={() => {}} />);
    expect(screen.queryByPlaceholderText(/45 year old office worker/)).toBeNull();
  });
});
