import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let profile = null;
vi.mock("../physiofeed/context/AppDataContext.jsx", () => ({ useAppData: () => ({ profile }) }));
vi.mock("../physiofeed/data/db.js", () => ({ applyToOpportunity: vi.fn() }));
vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: vi.fn() }));

import ApplyOpportunityModal from "../physiofeed/components/opportunities/ApplyOpportunityModal.jsx";
const opp = { id: "1", type: "job", title: "Job", org: "Org" };

describe("Apply with Profile modal", () => {
  it("a guest is told to sign in and never sees the demo profile or a Confirm button", () => {
    profile = { isDemo: true, name: "Dr. Aditi Sharma, PT" };
    render(<ApplyOpportunityModal opp={opp} onClose={() => {}} onApplied={() => {}} />);
    expect(screen.getByText(/Sign in or create a free account to apply/)).toBeTruthy();
    expect(screen.queryByText("Dr. Aditi Sharma, PT")).toBeNull();
    expect(screen.queryByRole("button", { name: /Confirm/ })).toBeNull();
  });
  it("a signed-in member with no name must add one first", () => {
    profile = { name: "" };
    render(<ApplyOpportunityModal opp={opp} onClose={() => {}} onApplied={() => {}} />);
    expect(screen.getByText(/Add your name in Profile first/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Confirm/ }).disabled).toBe(true);
  });
  it("a normal member can confirm", () => {
    profile = { name: "Real Person" };
    render(<ApplyOpportunityModal opp={opp} onClose={() => {}} onApplied={() => {}} />);
    expect(screen.getByRole("button", { name: /Confirm/ }).disabled).toBe(false);
  });
});
