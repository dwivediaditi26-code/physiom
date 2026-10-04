import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MyOpportunitiesPage from "../physiofeed/components/opportunities/MyOpportunitiesPage.jsx";

const opp = (type) => ({ id: type, type, title: `T-${type}`, org: "O", orgInitials: "O", description: "d", postedAgo: "x" });

describe("My Opportunities status labels", () => {
  it("says Registered (not Applied) for a workshop registration", () => {
    render(<MyOpportunitiesPage registeredItems={[{ id: "1", status: "new", appliedAgo: "now", opportunity: opp("workshop") }]} applicationItems={[]} savedItems={[]} pastApplicationItems={[]} pastSavedItems={[]} onBack={() => {}} onOpen={() => {}} />);
    expect(screen.getByText("Registered", { selector: "span" })).toBeTruthy();
    expect(screen.queryByText("Applied")).toBeNull();
  });
});
