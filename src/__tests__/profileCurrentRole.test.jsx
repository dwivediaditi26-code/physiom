// Profile: Current Role is standalone (own editor, never listed in Experience), the certification
// form fits a phone, and the old fixed "willing to relocate" tick is gone.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const calls = [];
const ctx = {
  rotations: [],
  addRotation: vi.fn(async (f) => { calls.push(["add", f]); }),
  updateRotation: vi.fn(async (id, f) => { calls.push(["update", id, f]); }),
  deleteRotation: vi.fn(async (id) => { calls.push(["delete", id]); }),
  achievements: [],
};
vi.mock("../physiofeed/context/AppDataContext.jsx", () => ({ useAppData: () => ctx }));

import CurrentRoleSection from "../physiofeed/components/profile/CurrentRoleSection.jsx";
import RotationsCard from "../physiofeed/components/profile/RotationsCard.jsx";
import CertificationsCard from "../physiofeed/components/profile/CertificationsCard.jsx";
import { CURRENT_ROLE_MARK, getCurrentWorkplace, getExperienceEntries, getCurrentRoleEntry } from "../physiofeed/components/profile/experienceUtils.js";

const exp = (id, dept, dur) => ({ id, department: dept, duration: dur });

describe("Current Role is standalone", () => {
  const rotations = [
    exp("1", "Physiotherapy Intern — M.Y. hospital", "Apr 2026 – Oct 2026"),
    exp("2", CURRENT_ROLE_MARK + "Senior Physio — Apollo", "Jan 2025 – Present"),
  ];

  it("shows only its own entry, not the last Experience row", () => {
    render(<CurrentRoleSection rotations={[rotations[0]]} isOwn />);
    expect(screen.getByText("Add your current role")).toBeTruthy();      // an Experience row alone does not fill it
    expect(screen.queryByText("Physiotherapy Intern")).toBeNull();
  });

  it("existing profiles can copy their latest Experience in as the Current Role with one tap", async () => {
    calls.length = 0;
    render(<CurrentRoleSection rotations={[rotations[0]]} isOwn />);
    fireEvent.click(screen.getByText(/Use my latest experience: Physiotherapy Intern/));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual(["add", { department: CURRENT_ROLE_MARK + "Physiotherapy Intern — M.Y. hospital", duration: "Apr 2026 – Oct 2026" }]);
  });

  it("renders the marked entry without the marker text", () => {
    render(<CurrentRoleSection rotations={rotations} isOwn />);
    expect(screen.getByText("Senior Physio")).toBeTruthy();
    expect(screen.getByText("Apollo")).toBeTruthy();
    expect(screen.queryByText(/@current/)).toBeNull();
  });

  it("its pencil opens the Current role editor, not the Experience list", () => {
    render(<CurrentRoleSection rotations={rotations} isOwn />);
    fireEvent.click(screen.getByLabelText("Edit current role"));
    expect(screen.getByRole("dialog", { name: "Current role" })).toBeTruthy();
    expect(screen.queryByText("Add role")).toBeNull();                   // Experience editor's button
    expect(screen.getByDisplayValue("Senior Physio")).toBeTruthy();
  });

  it("saving writes the marked entry (update when one exists, add when none)", async () => {
    calls.length = 0;
    const { unmount } = render(<CurrentRoleSection rotations={rotations} isOwn />);
    fireEvent.click(screen.getByLabelText("Edit current role"));
    fireEvent.change(screen.getByDisplayValue("Senior Physio"), { target: { value: "Lead Physio" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual(["update", "2", { department: CURRENT_ROLE_MARK + "Lead Physio — Apollo", duration: "Jan 2025 – Present" }]);
    unmount();

    calls.length = 0;
    render(<CurrentRoleSection rotations={[]} isOwn />);
    fireEvent.click(screen.getByText("Add your current role"));
    fireEvent.change(screen.getByPlaceholderText(/Physiotherapy Intern/), { target: { value: "Physio" } });
    fireEvent.change(screen.getByPlaceholderText(/M.Y. Hospital/), { target: { value: "City Clinic" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0][0]).toBe("add");
    expect(calls[0][1].department).toBe(CURRENT_ROLE_MARK + "Physio — City Clinic");
  });

  it("the Experience card never lists the Current Role entry", () => {
    ctx.rotations = rotations;
    render(<RotationsCard readOnly />);
    expect(screen.getByText("Physiotherapy Intern")).toBeTruthy();
    expect(screen.queryByText("Senior Physio")).toBeNull();
    expect(getExperienceEntries(rotations)).toHaveLength(1);
    expect(getCurrentRoleEntry(rotations).id).toBe("2");
  });

  it("current workplace prefers the standalone role over the Experience list", () => {
    expect(getCurrentWorkplace(rotations)).toBe("Apollo");
    expect(getCurrentWorkplace([rotations[0]])).toBe("M.Y. hospital");
  });
});

describe("Certifications show everything that was entered", () => {
  it("issuer, issue month/year and credential ID all appear on the card", () => {
    render(<CertificationsCard readOnly entries={[{ id: "a", title: "Dry needling", issuer: "IAFM", month: "July", year: "2025", credentialId: "DN-123", subtitle: "IAFM · July 2025" }]} />);
    expect(screen.getByText("Dry needling")).toBeTruthy();
    expect(screen.getByText("IAFM")).toBeTruthy();
    expect(screen.getByText("Issued July 2025")).toBeTruthy();
    expect(screen.getByText("Credential ID: DN-123")).toBeTruthy();
  });
});
