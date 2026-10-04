// Your own listing on the board must not offer Apply/Register -- the detail
// page it opens has no apply bar ("This is your listing"), so the button
// would be a dead end.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OpportunityCard from "../physiofeed/components/opportunities/OpportunityCard.jsx";

const base = { id: 1, type: "job", org: "Org", orgInitials: "OR", title: "T", description: "d", postedAgo: "Just now", lifecycleStatus: "active" };

describe("OpportunityCard own listing", () => {
  it("shows 'Your listing' instead of Apply for the poster", () => {
    render(<OpportunityCard opp={{ ...base, postedByMe: true }} onOpen={() => {}} />);
    expect(screen.getByText("Your listing")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });
  it("shows Register for other people's workshops", () => {
    render(<OpportunityCard opp={{ ...base, type: "workshop", postedByMe: false }} onOpen={() => {}} />);
    expect(screen.getByRole("button", { name: "Register" })).toBeTruthy();
  });
});

describe("Workshop early-bird price", () => {
  const ws = { ...base, type: "workshop", fee: "₹1,500", date: "2099-11-20", mode: "In-person", earlyBirdFee: "₹1,000", earlyBirdDeadline: "2099-10-01" };
  it("card leads with the early-bird price while it applies, and the regular fee after its last date", () => {
    const { unmount } = render(<OpportunityCard opp={ws} onOpen={() => {}} />);
    expect(screen.getByText("₹1,000 · Early bird")).toBeTruthy();
    unmount();
    render(<OpportunityCard opp={{ ...ws, earlyBirdDeadline: "2020-01-01" }} onOpen={() => {}} />);
    expect(screen.getByText("₹1,500")).toBeTruthy();
    expect(screen.queryByText(/Early bird/)).toBeNull();
  });
});
