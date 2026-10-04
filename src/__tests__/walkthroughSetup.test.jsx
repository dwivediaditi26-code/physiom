// walkthroughSetup.test.jsx
// First-time walkthrough follow-ups (2026-10-03): fewer choices before the first question,
// and less clutter for a brand-new account.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { default: OrthoAssessment } = await import("../OrthoAssessment.jsx");
const { TherapistDashboardModule } = await import("../DashboardModules.jsx");
const { SAMPLE_PATIENT_IDS } = await import("../samplePatients.js");

describe("Ortho start: the usual choices are already made", () => {
  it("starts on Outpatient with General Assessment, so Continue, Continue, Start is enough", () => {
    render(<OrthoAssessment onSave={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" })); // pathway -> region
    fireEvent.click(screen.getByText("Knee"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" })); // region -> how to start
    expect(screen.getByText("How do you want to start?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start assessment" }).disabled).toBe(false);
  });

  it("choosing Inpatient (IPD) clears the Outpatient start, so it asks its own question", () => {
    render(<OrthoAssessment onSave={() => {}} />);
    fireEvent.click(screen.getByText("Inpatient (IPD)"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByText("Knee"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("What's the clinical context?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start assessment" }).disabled).toBe(true);
    expect(screen.getByText("Pick the clinical context to continue.")).toBeTruthy();
  });
});

describe("Clinical Today: the clinic-details prompt waits for a first patient", () => {
  const user = { id: "u1", user_metadata: { full_name: "Meera Rao" } };
  const real = { id: "p_real", name: "Real Person", updatedAt: new Date().toISOString(), data: {} };
  const sample = { id: SAMPLE_PATIENT_IDS[0], name: "Priya Sharma", updatedAt: new Date().toISOString(), data: {} };
  const renderToday = (patients) => render(<TherapistDashboardModule patients={patients} data={{}} onNav={() => {}} onProfile={() => {}} onQuickStart={() => {}} currentUser={user} />);

  it("is hidden for a brand-new account", () => {
    renderToday([]);
    expect(screen.queryByText(/Add your clinic details/)).toBeNull();
  });
  it("is hidden when only the sample patients exist", () => {
    renderToday([sample]);
    expect(screen.queryByText(/Add your clinic details/)).toBeNull();
  });
  it("shows once there is a real patient", () => {
    renderToday([real]);
    expect(screen.getByText(/Add your clinic details/)).toBeTruthy();
  });
});
