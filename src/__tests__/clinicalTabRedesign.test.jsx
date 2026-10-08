// clinicalTabRedesign.test.jsx
// Regression coverage for the Clinical tab redesign: tapping "Clinical" in
// the bottom nav must land on the Clinical hub (Today / Assess / Patients /
// Treatment) instead of jumping straight into an empty Subjective wizard
// with no patient loaded, and "+ New Assessment" must ask a few quick
// details and then which specialty before opening that specialty's tool.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import { supabase } from "../supabase.js";
import { renderLoggedIn, openClinical, openSubTab, openSpecialtyStep, tickPatientPermission } from "./clinicalFlow.js";

beforeEach(() => {
  localStorage.clear();
  cleanup();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { user: { id: "test-user-123", email: "student@example.com" } } },
    error: null,
  });
});

describe("Clinical tab — patient list + specialty picker", () => {
  it("tapping Clinical opens the Clinical hub, not the empty Subjective wizard, and Patients shows the list", async () => {
    await renderLoggedIn();
    await openClinical();
    // The old behaviour landed on Subjective step 2 with no patient loaded --
    // that specific "no patient" wizard heading must not be what's shown.
    expect(screen.queryByText(/No patient loaded/i)).not.toBeInTheDocument();
    openSubTab("Patients");
    expect(await screen.findByTestId("clinical-panel")).toBeInTheDocument();
    // Search is tucked behind the magnifier button.
    fireEvent.click(screen.getByTitle("Search"));
    expect(screen.getByPlaceholderText("Search patients…")).toBeInTheDocument();
  });

  it("+ New Assessment asks the quick details with a Specialty choice (Ortho/Neuro/Cardio) instead of a chief complaint", async () => {
    await renderLoggedIn();
    await openClinical();
    const modal = await openSpecialtyStep();
    expect(modal.getByText("Ortho")).toBeInTheDocument();
    expect(modal.getByText("Neuro")).toBeInTheDocument();
    expect(modal.getByText("Cardio")).toBeInTheDocument();
    expect(modal.queryByText(/Chief complaint/i)).not.toBeInTheDocument();
  });

  it("picking Ortho closes the picker and opens the real Ortho assessment (pathway step), not a floating popup", async () => {
    await renderLoggedIn();
    await openClinical();
    const modal = await openSpecialtyStep();
    fireEvent.click(modal.getByText("Ortho"));
    tickPatientPermission(modal);
    fireEvent.click(modal.getByText("Next →"));
    // No floating modal of any kind -- a real page in the normal tab flow.
    expect(screen.queryByTestId("intake-modal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("specialty-picker-modal")).not.toBeInTheDocument();
    // The assessment is loaded on demand now (it used to ride along with the first
    // screen), so under test its code has to be loaded and compiled on the spot.
    expect(await screen.findByText("Which pathway is this assessment for?", {}, { timeout: 25000 })).toBeInTheDocument();
  }, 30000);

  it("Next stays disabled until a specialty is picked (no permission tick any more)", async () => {
    await renderLoggedIn();
    await openClinical();
    const modal = await openSpecialtyStep();
    expect(modal.getByText("Next →").closest("button")).toBeDisabled();
    fireEvent.click(modal.getByText("Neuro"));
    expect(modal.getByText("Next →").closest("button")).not.toBeDisabled();
  });
});
