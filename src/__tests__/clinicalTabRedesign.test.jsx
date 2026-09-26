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
import { renderLoggedIn, openClinical, openSubTab, openSpecialtyStep } from "./clinicalFlow.js";

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

  it("+ New Assessment asks the quick details, then offers Ortho/Neuro/Cardio live and Sports as SOON", async () => {
    await renderLoggedIn();
    await openClinical();
    const modal = await openSpecialtyStep();
    expect(modal.getByText("Ortho")).toBeInTheDocument();
    expect(modal.getByText("Neuro")).toBeInTheDocument();
    expect(modal.getByText("Cardio")).toBeInTheDocument();
    expect(modal.getByText("Sports")).toBeInTheDocument();
    expect(modal.getAllByText("SOON")).toHaveLength(1); // Sports
  });

  it("picking Ortho closes the picker and opens the real Ortho assessment (pathway step), not a floating popup", async () => {
    await renderLoggedIn();
    await openClinical();
    const modal = await openSpecialtyStep();
    fireEvent.click(modal.getByText("Ortho"));
    // No floating modal of any kind -- a real page in the normal tab flow.
    expect(screen.queryByTestId("intake-modal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("specialty-picker-modal")).not.toBeInTheDocument();
    expect(await screen.findByText("Which pathway is this assessment for?")).toBeInTheDocument();
  });

  it("picking a SOON specialty (Sports) does not close the picker or create a patient", async () => {
    await renderLoggedIn();
    await openClinical();
    const modal = await openSpecialtyStep();
    fireEvent.click(modal.getByText("Sports"));
    // Still on the picker -- Sports isn't live yet, nothing should happen.
    expect(screen.getByTestId("specialty-picker-modal")).toBeInTheDocument();
    expect(screen.getByText("Which specialty?")).toBeInTheDocument();
    expect(screen.queryByTestId("intake-modal")).not.toBeInTheDocument();
  });
});
