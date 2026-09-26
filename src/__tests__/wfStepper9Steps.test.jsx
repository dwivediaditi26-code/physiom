// wfStepper9Steps.test.jsx
// Regression coverage for the "Screening Workflow" stepper
// (2026-08-17): Subjective's region picker / AI panel / body chart+
// palpation used to be bundled into one long scroll under a single
// "Subjective" step. They're now their own steps -- Demographics, Body
// Regions, Subjective, AI, Chart/Palp, Objective, Treatment, Home
// Protocol -- each showing only its own content, reusing the exact
// same SubjectiveModule / BodyChart / Palpation / Treatment code that
// already existed (viewStep prop just controls what's visible).
// The SOAP step was removed when SOAP note generation was removed from
// the app entirely.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import { supabase } from "../supabase.js";
import { renderLoggedIn, createOrthoPatient, openScreeningWorkflow, leaveAssessment } from "./clinicalFlow.js";

beforeEach(() => {
  localStorage.clear();
  cleanup();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { user: { id: "test-user-123", email: "student@example.com" } } },
    error: null,
  });
});

// Creates a real patient through Clinical -> Assess -> New Assessment ->
// Ortho, then opens the Screening Workflow so the stepper has an active
// patient to render for (see clinicalFlow.js for the exact taps).
async function openWorkflowWithPatient() {
  await renderLoggedIn();
  await createOrthoPatient();
  await openScreeningWorkflow();
}

// Each test walks the whole app from sign-in to the workflow (~3-4s of
// rendering), so allow more than the default 5s.
describe("Screening Workflow stepper — 8 steps, each its own page", { timeout: 20_000 }, () => {
  it("shows all 8 step dots once a patient is active", async () => {
    await openWorkflowWithPatient();
    for (const key of ["demographics","region","subjective","ai","chart","objective","treatment","home"]) {
      expect(screen.getByTestId(`wf-step-${key}`)).toBeInTheDocument();
    }
  });

  it("Body Regions step shows the flat region picker without the AI buttons", async () => {
    await openWorkflowWithPatient();
    fireEvent.click(screen.getByTestId("wf-step-region"));
    // Region selector (flat searchable list, redesigned 2026-08-18) lives
    // under this step; the hero AI/mic buttons and hero title text must
    // not. Regression: the picker body only rendered when regionPickerOpen
    // was true, and the only button that ever set it true (Row 2's chip
    // row) lives on the AI step now -- so this step used to render
    // completely blank.
    await waitFor(() => {
      expect(screen.getByText("Select Body Region")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Search body region...")).toBeInTheDocument();
    expect(screen.queryByText("History & Complaint")).not.toBeInTheDocument();
    expect(screen.queryByText("✦")).not.toBeInTheDocument();
  });

  it("AI step shows the AI/mic buttons without the region accordion", async () => {
    await openWorkflowWithPatient();
    fireEvent.click(screen.getByTestId("wf-step-ai"));
    await waitFor(() => {
      expect(screen.getByText("History & Complaint")).toBeInTheDocument();
    });
    expect(screen.getByText("✦")).toBeInTheDocument();
    expect(screen.getByText("🎤")).toBeInTheDocument();
  });

  it("Subjective step shows the new simplified form header, not the old AI buttons or a duplicate Body Chart tab", async () => {
    // 2026-08-19: this step now renders the new simplified Subjective
    // design (SubjectiveAssessmentNew.jsx), not the old SubjectiveModule --
    // "History & Complaint" was the old form's header; swapped for the new
    // one's own header text. The old design's "✦"/duplicate Body Chart tab
    // never existed in the new design to begin with, and its own demo
    // "✨ AI Extracted" fill button is hidden when connected to a real
    // patient (see SubjectiveAssessmentNew.jsx) -- both still correctly
    // absent here, just for a different reason than before.
    await openWorkflowWithPatient();
    fireEvent.click(screen.getByTestId("wf-step-subjective"));
    await waitFor(() => {
      expect(screen.getByText("History & Patient Report")).toBeInTheDocument();
    });
    expect(screen.queryByText("✦")).not.toBeInTheDocument();
    expect(screen.queryByText("✨ AI Extracted")).not.toBeInTheDocument();
    // Body Chart now lives only on its own combined Chart/Palpation step.
    expect(screen.queryByText("🫁 Body Chart")).not.toBeInTheDocument();
  });

  it("Chart/Palp step shows a Body Chart / Palpation toggle", async () => {
    await openWorkflowWithPatient();
    fireEvent.click(screen.getByTestId("wf-step-chart"));
    expect(await screen.findByText("🧍 Body Chart")).toBeInTheDocument();
    expect(screen.getByText("🤚 Palpation")).toBeInTheDocument();
  });

  it("Home Protocol step opens Treatment on its HEP tab", async () => {
    await openWorkflowWithPatient();
    fireEvent.click(screen.getByTestId("wf-step-home"));
    await waitFor(() => {
      // Treatment screen's own HEP tab button, already existed pre-redesign.
      expect(screen.getByText("🏠 Home Protocol")).toBeInTheDocument();
    });
  });

  // Regression: the stepper was gated on activePatient alone, so once a
  // patient existed it kept showing at the top of Home/PhysioFeed/Learn/
  // Profile too -- screens that have nothing to do with this workflow.
  it("does not show on Home, PhysioFeed, Learn, or Profile once a patient is active", async () => {
    await openWorkflowWithPatient();
    for (const [i, key] of ["home", "physiofeed", "learn", "profile"].entries()) {
      fireEvent.click(screen.getByTestId(`bnav-tab-${key}`));
      // The first tap leaves the workflow, which asks "Save this assessment?".
      if (i === 0) await leaveAssessment();
      await waitFor(() => {
        expect(screen.queryByText("Screening Workflow")).not.toBeInTheDocument();
      });
    }
  });
});
