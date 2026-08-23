// clinicalLandingRedesign.test.jsx
// Regression coverage for the Clinical landing page redesign (2026-08-17,
// re-scoped 2026-08-23): PatientDatabasePanel's embedded (Clinical tab)
// view now shows ONLY the patient list -- header, search pill, a "Recent
// Patients" list of compact rows, sort/flags/import/export tucked behind a
// "Sort, filters & backup" toggle. The New Assessment CTA and the Ortho/
// Neuro/Cardio/Sports specialty pills moved to their own "Assessment"
// sub-tab so the Patients tab stays a single-purpose list.
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

  it("Patients sub-tab shows only the patient list -- no CTA, Clinical Areas, or stat cards (2026-08-23)", async () => {
    const panel = await openClinical();
    expect(panel.getByText(/Recent Patients|Patients$/)).toBeInTheDocument();
    expect(panel.queryByText("＋ New Assessment")).not.toBeInTheDocument();
    expect(panel.queryByText("Clinical Areas")).not.toBeInTheDocument();
    expect(panel.queryByText("Assessments in progress")).not.toBeInTheDocument();
    expect(panel.queryByText("SOAP notes pending")).not.toBeInTheDocument();
    expect(panel.queryByText("Home protocols today")).not.toBeInTheDocument();
  });

  it("Assessment sub-tab shows the specialty pills + New Assessment CTA moved off the Patients tab", async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByText("Clinical"));
    await screen.findByPlaceholderText("Search patients…");
    fireEvent.click(screen.getByText("📋 Assessment"));
    expect(await screen.findByText("＋ New Assessment")).toBeInTheDocument();
    for (const label of ["Ortho", "Neuro", "Cardio", "Sports"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("sort/flags/import/export are still present, tucked behind a toggle", async () => {
    const panel = await openClinical();
    expect(panel.queryByText("🚩 Flags only")).not.toBeInTheDocument();
    fireEvent.click(panel.getByText(/Sort, filters & backup/));
    expect(panel.getByText("🚩 Flags only")).toBeInTheDocument();
    expect(panel.getByText("📂 Import JSON")).toBeInTheDocument();
    expect(panel.getByText("💾 Export All")).toBeInTheDocument();
  });

  it("creating a patient via the New Assessment specialty picker shows it in the Patients list", async () => {
    await openClinical();
    // Create one Ortho patient via the real New Assessment flow (now on its
    // own "Assessment" sub-tab -- specialty filtering pills on the Patients
    // tab itself were removed 2026-08-23 so that tab shows only the list).
    fireEvent.click(screen.getByText("📋 Assessment"));
    fireEvent.click(screen.getByText("＋ New Assessment"));
    const picker = within(await screen.findByTestId("specialty-picker-modal"));
    fireEvent.click(picker.getByText("Ortho"));
    // Lands directly on the full-page Demographics step now.
    fireEvent.change(await screen.findByLabelText(/^Full Name/), { target: { value: "Ortho Patient" } });
    fireEvent.change(screen.getByLabelText(/^Date of Birth/), { target: { value: "1996-07-17" } });
    fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: "28" } });
    fireEvent.click(screen.getByRole("button", { name: "Male" }));
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Patient & Continue/i }));
    await screen.findByText("Screening Workflow");

    // Back to Clinical's Patients sub-tab -- the new patient should show up.
    fireEvent.click(screen.getByText("Clinical"));
    await screen.findByPlaceholderText("Search patients…");
    const panel = within(screen.getByTestId("clinical-panel"));
    expect(panel.getByText("Ortho Patient")).toBeInTheDocument();
  });
});
