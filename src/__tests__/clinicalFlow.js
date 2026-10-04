// Shared steps for the whole-app tests that walk through the Clinical tab.
// Not a test file itself (no .test. in the name), just helpers, so every
// test follows the same real taps a clinician makes and there is one place
// to update when the Clinical screens change.
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { expect } from "vitest";
import React from "react";
import App from "../App.jsx";

// Screens are lazy-loaded, and under a full test run (100+ files in
// parallel) the first load can take well over the 1s findBy default.
const SLOW = { timeout: 10_000 };

export async function renderLoggedIn() {
  render(React.createElement(App));
  await waitFor(() => {
    expect(document.body.textContent).toMatch(/Hello, Dr\s*student/i);
  }, SLOW);
}

// Clinical's header line, e.g. "Dr student · 0 patients today". Shown on
// every Clinical sub-tab, so it's the signal that Clinical is open.
export const CLINICAL_HEADER = /\d+ patients? today/;

// "Clinical" also appears on a Home tile, in the sidebar and in the nav
// drawer, so tap the bottom-bar tab by its test id.
export function tapClinicalTab() {
  fireEvent.click(screen.getByTestId("bnav-tab-__clinical"));
}

// Clinical opens on its "Today" view (2026-09-10 redesign).
export async function openClinical() {
  tapClinicalTab();
  await screen.findByText(CLINICAL_HEADER, {}, SLOW);
}

// Clinical's sub-tabs (Today / Assess / Patients / Treatment / Posture) are
// the only <button>s with those labels -- the sidebar's "Patients" link is
// a plain div.
export function openSubTab(label) {
  const btn = screen.getAllByText(label).map((el) => el.closest("button")).find(Boolean);
  fireEvent.click(btn);
}

// Assess -> "+ New Assessment" -> the quick patient details (name, age, sex,
// phone, specialty). Returns the modal with the name filled in; the caller
// picks a specialty and taps Next.
export async function openSpecialtyStep(name = "Test Patient") {
  openSubTab("Assess");
  fireEvent.click(screen.getByText("＋ New Assessment"));
  const modal = within(await screen.findByTestId("specialty-picker-modal", {}, SLOW));
  expect(modal.getByText("New assessment")).toBeInTheDocument();
  expect(modal.getByText("Next →").closest("button")).toBeDisabled();
  fireEvent.change(modal.getByPlaceholderText("e.g. Riya Sharma"), { target: { value: name } });
  return modal;
}

// Full path to a new Ortho patient: the Ortho assessment opens with the
// name already filled, which creates the patient record straight away.
// Signed-in users confirm the patient's permission before a new patient record starts.
export function tickPatientPermission(modal) {
  fireEvent.click(modal.getByRole("checkbox", { name: /permission to record their details/i }));
}

export async function createOrthoPatient(name = "Test Patient") {
  await openClinical();
  const modal = await openSpecialtyStep(name);
  fireEvent.click(modal.getByText("Ortho"));
  tickPatientPermission(modal);
  fireEvent.click(modal.getByText("Next →"));
  await screen.findByText("Which pathway is this assessment for?", {}, SLOW);
}

// Leaving an assessment asks "Save this assessment?" first. Entries are
// kept either way; this takes the "Leave without saving" button.
export async function leaveAssessment() {
  fireEvent.click(await screen.findByText("Leave without saving", {}, SLOW));
}
