// samplePatients.test.jsx
// Every new account starts with two practice patients (Priya Sharma, Arjun
// Kapoor). They looked like real patients and inflated "1 patient today /
// 2 total" (first-time walkthrough, 2026-10-02). They now carry a Sample tag,
// are left out of the counts, and can be removed in one tap.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { isSamplePatient, withoutSamples, SAMPLE_PATIENT_IDS } = await import("../samplePatients.js");
const { PatientDatabasePanel, getTodaysPatients, loadPatientDB } = await import("../PatientDatabase.jsx");
const { TherapistDashboardModule } = await import("../DashboardModules.jsx");

const today = new Date().toISOString();
const mine = { id: "p_real", name: "Real Person", createdAt: today, updatedAt: today, data: {} };
const priya = { id: SAMPLE_PATIENT_IDS[0], name: "Priya Sharma", createdAt: today, updatedAt: today, data: {} };
const arjun = { id: SAMPLE_PATIENT_IDS[1], name: "Arjun Kapoor", createdAt: today, updatedAt: today, data: {} };

describe("sample patients", () => {
  it("are recognised by id, and real patients are not", () => {
    expect(isSamplePatient(priya)).toBe(true);
    expect(isSamplePatient(arjun)).toBe(true);
    expect(isSamplePatient(mine)).toBe(false);
    expect(withoutSamples([priya, mine, arjun])).toEqual([mine]);
  });

  it("the seeded patients really use those ids", () => {
    localStorage.clear();
    const seeded = loadPatientDB("sample-test-user");
    expect(seeded.map((p) => p.id).sort()).toEqual([...SAMPLE_PATIENT_IDS].sort());
    expect(seeded.every(isSamplePatient)).toBe(true);
  });

  it("are not counted as patients today", () => {
    expect(getTodaysPatients([priya, arjun])).toHaveLength(0);
    expect(getTodaysPatients([priya, mine, arjun])).toHaveLength(1);
  });

  it("show a Sample tag in the list, and Remove samples calls back once", () => {
    const onRemoveSamples = vi.fn();
    render(<PatientDatabasePanel embedded patients={[mine, priya, arjun]} activeId={null}
      onSelect={() => {}} onNew={() => {}} onDelete={() => {}} onRemoveSamples={onRemoveSamples} onImport={() => {}} onNav={() => {}} />);
    expect(screen.getAllByText("Sample", { selector: "span" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove samples" }));
    expect(onRemoveSamples).toHaveBeenCalledTimes(1);
  });

  it("show no Sample note and no button when there are none", () => {
    render(<PatientDatabasePanel embedded patients={[mine]} activeId={null}
      onSelect={() => {}} onNew={() => {}} onDelete={() => {}} onRemoveSamples={() => {}} onImport={() => {}} onNav={() => {}} />);
    expect(screen.queryByText("Sample", { selector: "span" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove samples" })).toBeNull();
  });

  it("are left out of the Today and Total tiles on the dashboard", () => {
    render(<TherapistDashboardModule patients={[priya, arjun]} data={{}} onNav={() => {}} onProfile={() => {}} onQuickStart={() => {}} currentUser={{ id: "u1" }} />);
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Clinical Today greeting", () => {
  it("does not invent the name \"Aditi\" for someone with no name on file", () => {
    render(<TherapistDashboardModule patients={[]} data={{}} onNav={() => {}} onProfile={() => {}} onQuickStart={() => {}} currentUser={null} />);
    expect(screen.queryByText(/Aditi/)).toBeNull();
  });

  it("uses the name typed at sign-up", () => {
    render(<TherapistDashboardModule patients={[]} data={{}} onNav={() => {}} onProfile={() => {}} onQuickStart={() => {}} currentUser={{ id: "u1", user_metadata: { full_name: "Dr Meera Rao" } }} />);
    expect(screen.getByText(/Dr\. Meera/)).toBeTruthy();
  });
});
