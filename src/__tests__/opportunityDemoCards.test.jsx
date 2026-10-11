import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// 2026-10-10, Aditi: "why no demo cards showing". With the test/sample rows hidden from the live
// board, the page was empty. While no real listing exists it shows read-only Demo cards.
let board = [];
vi.mock("../physiofeed/context/AppDataContext.jsx", () => ({ useAppData: () => ({ profile: { isDemo: false, isAdmin: false } }) }));
vi.mock("../physiofeed/data/db.js", () => ({
  getOpportunities: () => Promise.resolve(board),
  getSavedOpportunityIds: () => Promise.resolve([]),
  getMyApplications: () => Promise.resolve([]),
  getSavedOpportunities: () => Promise.resolve([]),
  getProfile: () => Promise.resolve({ name: "P", initials: "P" }),
}));
vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: vi.fn() }));

import ExplorePage from "../physiofeed/pages/ExplorePage.jsx";
import { DEMO_OPPORTUNITIES } from "../physiofeed/data/opportunitiesMock.js";

const renderPage = () => render(<MemoryRouter><ExplorePage /></MemoryRouter>);

const realListing = {
  id: 501, type: "job", org: "Real Clinic", orgInitials: "RC", title: "Real Physio Job", description: "A real one.",
  location: "Pune", salary: "30,000/mo", tags: [], postedAgo: "1 day ago", postedByMe: false, lifecycleStatus: "published",
};

describe("Opportunity board with no real listings", () => {
  beforeEach(() => { board = []; });

  it("shows Demo cards, each marked Demo, instead of an empty page", async () => {
    renderPage();
    expect(await screen.findByText("Sports Physiotherapy Internship")).toBeTruthy();
    expect(screen.queryByText("No opportunities posted yet.")).toBeNull();
    expect(screen.getAllByText("Demo listing, not a real vacancy").length).toBe(DEMO_OPPORTUNITIES.length);
    // the category chips count them too
    expect(screen.getByRole("button", { name: new RegExp(`^All\\s*${DEMO_OPPORTUNITIES.length}$`) })).toBeTruthy();
  });

  it("has no working Apply / Register button on a Demo card", async () => {
    renderPage();
    await screen.findByText("Sports Physiotherapy Internship");
    expect(screen.queryByRole("button", { name: /^(Apply|Register)$/ })).toBeNull();
  });

  it("tapping a Demo card says it is a demo and does not open a detail page", async () => {
    renderPage();
    await screen.findByText("Sports Physiotherapy Internship");
    fireEvent.click(screen.getAllByRole("button", { name: "View details" })[0]);
    expect(await screen.findByText(/That is a demo listing/)).toBeTruthy();
    expect(screen.getByText("Explore")).toBeTruthy(); // still on the board
  });

  it("never names the real institutions the original mock used", async () => {
    renderPage();
    await screen.findByText("Sports Physiotherapy Internship");
    const text = document.body.textContent;
    expect(text).not.toMatch(/AIIMS|Bansal/);
  });
});

describe("Opportunity board with a real listing", () => {
  it("shows only the real listing and no Demo cards", async () => {
    board = [realListing];
    renderPage();
    expect(await screen.findByText("Real Physio Job")).toBeTruthy();
    expect(screen.queryByText("Sports Physiotherapy Internship")).toBeNull();
    expect(screen.queryByText("Demo listing, not a real vacancy")).toBeNull();
  });
});
