import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// 2026-10-10, Aditi: "I want the Opportunity page also to say it is demo".
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

describe("Opportunity page says it is demo", () => {
  beforeEach(() => { isDemo = true; });

  it("shows the Demo notice to a guest", async () => {
    renderPage();
    const notice = await screen.findByTestId("opportunity-demo-notice");
    expect(notice.textContent).toMatch(/Demo/);
    expect(notice.textContent).toMatch(/samples, not real vacancies/);
  });

  it("shows it to a signed-in user too", async () => {
    isDemo = false;
    renderPage();
    expect(await screen.findByTestId("opportunity-demo-notice")).toBeTruthy();
  });
});
