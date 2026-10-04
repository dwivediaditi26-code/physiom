// patientPermission.test.jsx
// Students will record real patients, so a signed-in person confirms the patient's
// permission before a new patient record starts (follow-up to the first-time
// walkthrough, 2026-10-03). The time of the tick is kept on the record.
import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import { supabase } from "../supabase.js";
import { PatientPermissionCheck, PatientPermissionModal, PERMISSION_LABEL } from "../PatientPermission.jsx";
import { renderLoggedIn, openClinical, openSpecialtyStep, tickPatientPermission } from "./clinicalFlow.js";

beforeEach(() => {
  localStorage.clear();
  cleanup();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { user: { id: "test-user-123", email: "student@example.com" } } },
    error: null,
  });
});

describe("PatientPermissionCheck", () => {
  function Box() {
    const [on, setOn] = useState(false);
    return <PatientPermissionCheck checked={on} onChange={setOn} />;
  }
  it("is a plain checkbox with the permission wording", () => {
    render(<Box />);
    const box = screen.getByRole("checkbox", { name: new RegExp(PERMISSION_LABEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(box.checked).toBe(true);
  });
});

describe("PatientPermissionModal (the AI Assessment start)", () => {
  it("keeps Continue off until the box is ticked, and explains why", () => {
    const onConfirm = vi.fn();
    render(<PatientPermissionModal onConfirm={onConfirm} onCancel={() => {}} />);
    const cont = screen.getByRole("button", { name: "Continue" });
    expect(cont.disabled).toBe(true);
    expect(screen.getByText("Tick the box above to continue.")).toBeTruthy();
    fireEvent.click(cont);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(cont.disabled).toBe(false);
    fireEvent.click(cont);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Cancel closes it without confirming", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<PatientPermissionModal onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("New patient form (signed in)", () => {
  it("shows the permission tick and will not continue without it", async () => {
    await renderLoggedIn();
    await openClinical();
    const modal = await openSpecialtyStep("Test Patient");
    fireEvent.click(modal.getByText("Ortho"));
    const next = modal.getByText("Next →").closest("button");
    expect(next.disabled).toBe(true);
    tickPatientPermission(modal);
    expect(next.disabled).toBe(false);
  }, 30000);
});
