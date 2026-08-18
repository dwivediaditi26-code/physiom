// clinicalLandingRedesign.test.jsx
// Regression coverage for the Clinical landing page redesign (2026-08-17):
// PatientDatabasePanel now matches a specific reference layout -- "Clinical"
// header, search pill, a prominent New Assessment CTA, a 5-icon "Clinical
// Areas" row (Ortho/Neuro/Cardio/Pedia/Sports), a "Recent Patients" list of
// compact rows, and 3 real computed stat cards. Sort/flags/import/export
// still work, just tucked behind a "Sort, filters & backup" toggle instead
// of being on by default.
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

async function openClinical() {
  await renderLoggedIn();
  fireEvent.click(screen.getByText("Clinical"));
  await screen.findByPlaceholderText("Search patients…");
  // Clinical opens as an overlay on top of whatever screen was behind it
  // (usually Home) -- Home has its own unrelated "Clinical Areas" section
  // and, once a patient is active, its own patient bar. Scope everything
  // to the panel itself so those don't create ambiguous text matches.
  return within(screen.getByTestId("clinical-panel"));
}

describe("Clinical landing page redesign", () => {
  // Regression: Clinical used to open PatientDatabasePanel as a fixed,
  // partial-width overlay on top of whatever screen was behind it (Home
  // stayed mounted, dimmed backdrop visible down the right side) --
  // instead of swapping the main content area the way Home/PhysioFeed/
  // Learn/Profile already do. It's a real tab now: opening it unmounts
  // whatever was there before, and leaving it unmounts Clinical in turn.
  it("is a real tab -- opening it unmounts Home, leaving it unmounts Clinical", async () => {
    await renderLoggedIn();
    expect(screen.getByText("New Patient")).toBeInTheDocument(); // Home's Quick Start grid
    fireEvent.click(screen.getByText("Clinical"));
    await screen.findByPlaceholderText("Search patients…");
    expect(screen.queryByText("New Patient")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Learn"));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Search patients…")).not.toBeInTheDocument();
    });
  });

  it("shows the reference layout: header, CTA, Clinical Areas, Recent Patients, stat cards", async () => {
    const panel = await openClinical();
    expect(panel.getByText("＋ New Assessment")).toBeInTheDocument();
    expect(panel.getByText("Clinical Areas")).toBeInTheDocument();
    for (const label of ["Ortho", "Neuro", "Cardio", "Pedia", "Sports"]) {
      expect(panel.getByText(label)).toBeInTheDocument();
    }
    expect(panel.getByText(/Recent Patients|Patients$/)).toBeInTheDocument();
    expect(panel.getByText("Assessments in progress")).toBeInTheDocument();
    expect(panel.getByText("SOAP notes pending")).toBeInTheDocument();
    expect(panel.getByText("Home protocols today")).toBeInTheDocument();
  });

  it("sort/flags/import/export are still present, tucked behind a toggle", async () => {
    const panel = await openClinical();
    expect(panel.queryByText("🚩 Flags only")).not.toBeInTheDocument();
    fireEvent.click(panel.getByText(/Sort, filters & backup/));
    expect(panel.getByText("🚩 Flags only")).toBeInTheDocument();
    expect(panel.getByText("📂 Import JSON")).toBeInTheDocument();
    expect(panel.getByText("💾 Export All")).toBeInTheDocument();
  });

  it("tapping a Clinical Area icon filters the patient list to that specialty", async () => {
    await openClinical();
    // Create one Ortho patient via the real New Assessment flow.
    fireEvent.click(screen.getByText("＋ New Assessment"));
    const picker = within(await screen.findByTestId("specialty-picker-modal"));
    fireEvent.click(picker.getByText("Ortho"));
    // Lands directly on the full-page Demographics step now.
    fireEvent.change(await screen.findByLabelText(/^Full Name/), { target: { value: "Ortho Patient" } });
    fireEvent.change(screen.getByLabelText(/^Date of Birth/), { target: { value: "1996-07-17" } });
    fireEvent.click(screen.getByRole("button", { name: "Male" }));
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Patient & Continue/i }));
    await screen.findByText("Screening Workflow");

    // Back to Clinical -- the new patient should show under Recent Patients.
    fireEvent.click(screen.getByText("Clinical"));
    await screen.findByPlaceholderText("Search patients…");
    const panel = within(screen.getByTestId("clinical-panel"));
    expect(panel.getByText("Ortho Patient")).toBeInTheDocument();

    // Filtering by a different specialty (Neuro) should hide it.
    fireEvent.click(panel.getByText("Neuro"));
    await waitFor(() => {
      expect(panel.queryByText("Ortho Patient")).not.toBeInTheDocument();
    });

    // Tapping the same (now-active) icon again clears the filter.
    fireEvent.click(panel.getByText("Neuro"));
    await waitFor(() => {
      expect(panel.getByText("Ortho Patient")).toBeInTheDocument();
    });
  });
});
