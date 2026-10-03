import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const cancelOpportunity = vi.fn(() => Promise.resolve());
const mine = {
  id: 7, type: "job", title: "My own job", org: "My Clinic", description: "d", postedAgo: "Just now", tags: [],
  postedByMe: true, rawStatus: "published", status: "active", lifecycleStatus: "published", salary: "Not disclosed",
  stats: { views: 0, applications: 0, saves: 0 },
};
vi.mock("../physiofeed/context/AppDataContext.jsx", () => ({ useAppData: () => ({ profile: { isDemo: false } }) }));
vi.mock("../physiofeed/data/db.js", () => ({
  getOpportunities: () => Promise.resolve([mine]),
  getSavedOpportunityIds: () => Promise.resolve([]),
  getMyApplications: () => Promise.resolve([]),
  getSavedOpportunities: () => Promise.resolve([]),
  getProfile: () => Promise.resolve({ name: "P" }),
  cancelOpportunity: (...a) => cancelOpportunity(...a),
}));
vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: vi.fn() }));

import ExplorePage from "../physiofeed/pages/ExplorePage.jsx";

describe("Cancel listing", () => {
  beforeEach(() => cancelOpportunity.mockClear());
  afterEach(() => vi.restoreAllMocks());

  const openCancel = async () => {
    render(<MemoryRouter><ExplorePage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /My Postings/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Listing options" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel listing" }));
  };

  it("asks first, and does nothing if the poster says no", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await openCancel();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("My own job"));
    expect(cancelOpportunity).not.toHaveBeenCalled();
  });

  it("cancels once the poster confirms", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await openCancel();
    await waitFor(() => expect(cancelOpportunity).toHaveBeenCalledWith(7));
  });
});
