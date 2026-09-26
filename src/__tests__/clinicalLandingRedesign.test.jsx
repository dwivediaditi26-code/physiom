// clinicalLandingRedesign.test.jsx
// Regression coverage for the Clinical landing page redesign (2026-08-17,
// re-scoped 2026-08-23): PatientDatabasePanel's embedded (Clinical tab)
// view now shows ONLY the patient list -- header, search, a list of
// compact rows, sort/flags/import/export tucked behind a "Sort, filters &
// backup" toggle. The New Assessment CTA and the Ortho/Neuro/Cardio/Sports
// specialty cards live on their own "Assess" sub-tab so the Patients tab
// stays a single-purpose list. (Since 2026-09-10 Clinical opens on "Today".)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import { supabase } from "../supabase.js";
import {
  renderLoggedIn, tapClinicalTab, openClinical, openSubTab, createOrthoPatient, leaveAssessment, CLINICAL_HEADER,
} from "./clinicalFlow.js";

beforeEach(() => {
  localStorage.clear();
  cleanup();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { user: { id: "test-user-123", email: "student@example.com" } } },
    error: null,
  });
});

// Opens Clinical, then its Patients sub-tab, and scopes queries to that
// panel so Home's or the sidebar's own labels don't create ambiguous matches.
async function openPatientsTab() {
  await openClinical();
  openSubTab("Patients");
  return within(await screen.findByTestId("clinical-panel"));
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
    expect(screen.getByTestId("home-tile-clinical")).toBeInTheDocument(); // Home's main tiles
    await openClinical();
    expect(screen.queryByTestId("home-tile-clinical")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("bnav-tab-learn"));
    await waitFor(() => {
      expect(screen.queryByText(CLINICAL_HEADER)).not.toBeInTheDocument();
    });
  });

  it("Patients sub-tab shows only the patient list -- no CTA, Clinical Areas, or stat cards (2026-08-23)", async () => {
    await renderLoggedIn();
    const panel = await openPatientsTab();
    expect(panel.queryByText("＋ New Assessment")).not.toBeInTheDocument();
    expect(panel.queryByText("Clinical Areas")).not.toBeInTheDocument();
    expect(panel.queryByText("Assessments in progress")).not.toBeInTheDocument();
    expect(panel.queryByText("SOAP notes pending")).not.toBeInTheDocument();
    expect(panel.queryByText("Home protocols today")).not.toBeInTheDocument();
  });

  it("Assess sub-tab shows the specialty cards + New Assessment CTA moved off the Patients tab", async () => {
    await renderLoggedIn();
    await openClinical();
    openSubTab("Assess");
    expect(await screen.findByText("＋ New Assessment")).toBeInTheDocument();
    for (const label of ["Ortho", "Neuro", "Cardio", "Sports"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("sort/flags/import/export are still present, tucked behind a toggle", async () => {
    await renderLoggedIn();
    const panel = await openPatientsTab();
    expect(panel.queryByText("🚩 Flags only")).not.toBeInTheDocument();
    fireEvent.click(panel.getByText(/Sort, filters & backup/));
    expect(panel.getByText("🚩 Flags only")).toBeInTheDocument();
    expect(panel.getByText("📂 Import JSON")).toBeInTheDocument();
    expect(panel.getByText("💾 Export All")).toBeInTheDocument();
  });

  it("creating a patient via New Assessment shows it in the Patients list", async () => {
    await renderLoggedIn();
    await createOrthoPatient("Ortho Patient");
    // Back to Clinical's Patients sub-tab -- the new patient should show up.
    tapClinicalTab();
    await leaveAssessment();
    await screen.findByText(CLINICAL_HEADER);
    openSubTab("Patients");
    const panel = within(await screen.findByTestId("clinical-panel"));
    expect(panel.getByText("Ortho Patient")).toBeInTheDocument();
  });
});
