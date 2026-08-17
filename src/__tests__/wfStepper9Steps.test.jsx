// wfStepper9Steps.test.jsx
// Regression coverage for the 9-step "Screening Workflow" stepper
// (2026-08-17): Subjective's region picker / AI panel / body chart+
// palpation used to be bundled into one long scroll under a single
// "Subjective" step. They're now their own steps -- Demographics, Body
// Regions, Subjective, AI, Chart/Palp, Objective, Treatment, Home
// Protocol, SOAP -- each showing only its own content, reusing the exact
// same SubjectiveModule / BodyChart / Palpation / Treatment code that
// already existed (viewStep prop just controls what's visible).
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

// Creates a real patient through the actual Clinical -> New Assessment ->
// Ortho -> intake form flow (same one clinicalTabRedesign.test.jsx already
// exercises), so the master stepper has an activePatient to render for.
async function createOrthoPatient() {
  await renderLoggedIn();
  fireEvent.click(screen.getByText("Clinical"));
  await screen.findByText(/Patient Database/i);
  fireEvent.click(screen.getByText("＋ New Assessment"));
  const picker = within(await screen.findByTestId("specialty-picker-modal"));
  fireEvent.click(picker.getByText("Ortho"));
  await screen.findByTestId("intake-modal");
  fireEvent.change(screen.getByPlaceholderText("e.g. Riya Sharma"), { target: { value: "Test Patient" } });
  fireEvent.click(screen.getByText("Consent"));
  fireEvent.click(screen.getByLabelText(/I consent to physiotherapy assessment and treatment/i));
  fireEvent.click(screen.getByText("Start Assessment →"));
  await screen.findByText("Screening Workflow");
}

describe("Screening Workflow stepper — 9 steps, each its own page", () => {
  it("shows all 9 step dots once a patient is active", async () => {
    await createOrthoPatient();
    for (const key of ["demographics","region","subjective","ai","chart","objective","treatment","home","soap"]) {
      expect(screen.getByTestId(`wf-step-${key}`)).toBeInTheDocument();
    }
  });

  it("Body Regions step shows the region picker without the AI buttons", async () => {
    await createOrthoPatient();
    fireEvent.click(screen.getByTestId("wf-step-region"));
    // Region selector accordion lives under this step; the hero AI/mic
    // buttons and hero title text must not. Regression: the accordion body
    // only rendered when regionPickerOpen was true, and the only button
    // that ever set it true (Row 2's chip row) lives on the AI step now --
    // so this step used to render completely blank.
    await waitFor(() => {
      expect(screen.getByText("Spine")).toBeInTheDocument();
    });
    expect(screen.queryByText("History & Complaint")).not.toBeInTheDocument();
    expect(screen.queryByText("✦")).not.toBeInTheDocument();
  });

  it("AI step shows the AI/mic buttons without the region accordion", async () => {
    await createOrthoPatient();
    fireEvent.click(screen.getByTestId("wf-step-ai"));
    await waitFor(() => {
      expect(screen.getByText("History & Complaint")).toBeInTheDocument();
    });
    expect(screen.getByText("✦")).toBeInTheDocument();
    expect(screen.getByText("🎤")).toBeInTheDocument();
  });

  it("Subjective step shows the form header but not the AI buttons or a duplicate Body Chart tab", async () => {
    await createOrthoPatient();
    fireEvent.click(screen.getByTestId("wf-step-subjective"));
    await waitFor(() => {
      expect(screen.getByText("History & Complaint")).toBeInTheDocument();
    });
    expect(screen.queryByText("✦")).not.toBeInTheDocument();
    // Body Chart now lives only on its own combined Chart/Palpation step.
    expect(screen.queryByText("🫁 Body Chart")).not.toBeInTheDocument();
  });

  it("Chart/Palp step shows a Body Chart / Palpation toggle", async () => {
    await createOrthoPatient();
    fireEvent.click(screen.getByTestId("wf-step-chart"));
    expect(await screen.findByText("🧍 Body Chart")).toBeInTheDocument();
    expect(screen.getByText("🤚 Palpation")).toBeInTheDocument();
  });

  it("Home Protocol step opens Treatment on its HEP tab", async () => {
    await createOrthoPatient();
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
    await createOrthoPatient();
    for (const label of ["Home", "PhysioFeed", "Learn", "Profile"]) {
      const [navItem] = screen.getAllByText(label);
      fireEvent.click(navItem);
      await waitFor(() => {
        expect(screen.queryByText("Screening Workflow")).not.toBeInTheDocument();
      });
    }
  });
});
