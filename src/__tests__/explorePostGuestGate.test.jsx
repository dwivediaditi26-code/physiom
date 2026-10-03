import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let isDemo = true;
vi.mock("../physiofeed/context/AppDataContext.jsx", () => ({ useAppData: () => ({ profile: { isDemo, isAdmin: false } }) }));
vi.mock("../physiofeed/data/db.js", () => ({
  getOpportunities: () => Promise.resolve([]),
  getSavedOpportunityIds: () => Promise.resolve([]),
  getMyApplications: () => Promise.resolve([]),
  getSavedOpportunities: () => Promise.resolve([]),
  getProfile: () => Promise.resolve({ name: "P", initials: "P" }),
}));
vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: vi.fn() }));

import ExplorePage from "../physiofeed/pages/ExplorePage.jsx";

const renderPage = () => render(<MemoryRouter><ExplorePage /></MemoryRouter>);

describe("Posting an opportunity as a guest", () => {
  beforeEach(() => { isDemo = true; });

  it("tells a guest to sign in up front instead of opening the form", async () => {
    renderPage();
    const post = await screen.findByRole("button", { name: /^Post$/ });
    fireEvent.click(post);
    expect(await screen.findByText(/Sign in or create a free account to post an opportunity/)).toBeTruthy();
    expect(screen.queryByText("What do you want to post?")).toBeNull();
  });

  it("opens the type picker for a signed-in user", async () => {
    isDemo = false;
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /^Post$/ }));
    await waitFor(() => expect(screen.getByText("What do you want to post?")).toBeTruthy());
  });
});
