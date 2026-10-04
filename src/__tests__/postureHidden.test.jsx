import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../supabase.js", () => ({ supabase: { from: vi.fn(), auth: { getSession: vi.fn() } } }));

import SpecialtyPatientProfile from "../SpecialtyPatientProfile.jsx";

const patient = { id: "p1", name: "Asha Rao", data: { dem_name: "Asha Rao", dem_age: "40", dem_sex: "Female" }, createdAt: "2026-10-01T00:00:00Z" };
const base = { patient, onNav: () => {}, onBack: () => {}, onSaveField: () => {}, onOpenPosture: () => {} };

describe("patient profile: Posture tab is a preview feature", () => {
  it("is not there for ordinary accounts", () => {
    render(<SpecialtyPatientProfile {...base} />);
    expect(screen.getByRole("button", { name: "Overview" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Posture" })).toBeNull();
  });

  it("is there for preview accounts", () => {
    render(<SpecialtyPatientProfile {...base} showPosture />);
    expect(screen.getByRole("button", { name: "Posture" })).toBeTruthy();
  });

  it("never opens on the Posture tab for ordinary accounts, even if asked to", () => {
    render(<SpecialtyPatientProfile {...base} initialTab="posture" />);
    expect(screen.queryByText(/New Posture Analysis/)).toBeNull();
    expect(screen.getByText(/Patient information/i)).toBeTruthy();
  });
});
