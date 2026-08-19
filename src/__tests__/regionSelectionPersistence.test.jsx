// regionSelectionPersistence.test.jsx
// Regression coverage for a real bug (2026-08-18): picking a region on the
// Body Regions step only ever updated this component's own local
// selectedRegions state -- handleSidePick never called set(...) to write
// data.cx_selected_regions, unlike the sibling toggleRegion() function
// which already did. That read as "selecting a region auto-deselects it"
// the moment anything reads from `data` instead of local state: navigating
// away and back remounts the picker (resetting local state from the
// never-updated persisted value), and ObjectiveHub -- a separate component
// that reads data.cx_selected_regions directly -- never saw a region at
// all, always showing "No body region selected yet".
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import App from "../App.jsx";
import { supabase } from "../supabase.js";

describe("region selection persists across navigation", () => {
  it("selecting a region survives navigating away and back, and shows in Objective", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "test-user-123", email: "student@example.com" } } },
      error: null,
    });
    localStorage.clear();
    render(<App />);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Hello, Dr\s*student/i);
    });
    fireEvent.click(screen.getByText("Clinical"));
    await screen.findByPlaceholderText("Search patients…");
    fireEvent.click(screen.getByText("＋ New Assessment"));
    const picker = within(await screen.findByTestId("specialty-picker-modal"));
    fireEvent.click(picker.getByText("Ortho"));
    fireEvent.change(await screen.findByLabelText(/^Full Name/), { target: { value: "Region Test Patient" } });
    fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Male" }));
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Patient & Continue/i }));
    await screen.findByText("Screening Workflow");

    fireEvent.click(screen.getByTestId("wf-step-region"));
    await screen.findByText("Select Body Region");
    fireEvent.click(screen.getByRole("button", { name: /Add Right Knee/i }));
    await screen.findByRole("button", { name: /Remove Right Knee/i });
    await screen.findByText("1 of 3 selected");

    // Navigate away to Subjective and back to Region -- old bug: local
    // state reset on remount because data.cx_selected_regions was never
    // actually written.
    // (2026-08-19: Subjective step now renders the new simplified design,
    // not the old SubjectiveModule -- "History & Complaint" was that old
    // form's header; the new one's is "History & Patient Report".)
    fireEvent.click(screen.getByTestId("wf-step-subjective"));
    await waitFor(() => expect(screen.getByText("History & Patient Report")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("wf-step-region"));
    await screen.findByText("Select Body Region");
    await screen.findByRole("button", { name: /Remove Right Knee/i });
    await screen.findByText("1 of 3 selected");

    // Objective (separate component, reads data.cx_selected_regions directly)
    fireEvent.click(screen.getByTestId("wf-step-objective"));
    await waitFor(() => {
      expect(screen.queryByText("No body region selected yet")).not.toBeInTheDocument();
    });
  });
});
