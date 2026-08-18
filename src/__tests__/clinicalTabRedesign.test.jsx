// clinicalTabRedesign.test.jsx
// Regression coverage for the Clinical tab redesign: tapping "Clinical" in
// the bottom nav must land on the patient list + specialty picker instead
// of jumping straight into an empty Subjective wizard with no patient
// loaded, and "+ New Assessment" must ask which specialty (Ortho/Neuro/
// Sports/Pedia/Cardio) before creating the patient.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import App from "../App.jsx";
import { supabase } from "../supabase.js";

beforeEach(() => {
  localStorage.clear();
  cleanup();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { user: { id: "test-user-123", email: "student@example.com" } } },
    error: null,
  });
});

async function renderLoggedIn() {
  render(<App />);
  await waitFor(() => {
    expect(document.body.textContent).toMatch(/Hello, Dr\s*student/i);
  });
}

describe("Clinical tab — patient list + specialty picker", () => {
  it("tapping Clinical opens the patient database panel, not the empty Subjective wizard", async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByText("Clinical"));
    expect(await screen.findByPlaceholderText("Search patients…")).toBeInTheDocument();
    // The old behaviour landed on Subjective step 2 with no patient loaded --
    // that specific "no patient" wizard heading must not be what's shown.
    expect(screen.queryByText(/No patient loaded/i)).not.toBeInTheDocument();
  });

  it("+ New Assessment opens the specialty picker (Ortho/Neuro live, others marked SOON)", async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByText("Clinical"));
    await screen.findByPlaceholderText("Search patients…");
    fireEvent.click(screen.getByText("＋ New Assessment"));
    const picker = within(await screen.findByTestId("specialty-picker-modal"));
    expect(picker.getByText("New assessment")).toBeInTheDocument();
    expect(picker.getByText("Ortho")).toBeInTheDocument();
    expect(picker.getByText("Neuro")).toBeInTheDocument();
    const soonBadges = picker.getAllByText("SOON");
    expect(soonBadges.length).toBe(3); // Sports, Pedia, Cardio
  });

  it("picking Ortho in the specialty picker lands on the real full-page Demographics step, not a floating popup", async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByText("Clinical"));
    await screen.findByPlaceholderText("Search patients…");
    fireEvent.click(screen.getByText("＋ New Assessment"));
    const picker = within(await screen.findByTestId("specialty-picker-modal"));
    fireEvent.click(picker.getByText("Ortho"));
    // No floating modal of any kind -- a real page in the normal tab flow.
    expect(screen.queryByTestId("intake-modal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("specialty-picker-modal")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Create Patient & Continue/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Riya Sharma")).toBeInTheDocument(); // Full Name field, blank
  });

  it("picking a SOON specialty (Sports) does not close the picker or create a patient", async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByText("Clinical"));
    await screen.findByPlaceholderText("Search patients…");
    fireEvent.click(screen.getByText("＋ New Assessment"));
    const picker = within(await screen.findByTestId("specialty-picker-modal"));
    fireEvent.click(picker.getByText("Sports"));
    // Still on the picker -- Sports isn't live yet, nothing should happen.
    expect(screen.getByTestId("specialty-picker-modal")).toBeInTheDocument();
    expect(screen.getByText("New assessment")).toBeInTheDocument();
    expect(screen.queryByTestId("intake-modal")).not.toBeInTheDocument();
  });
});
