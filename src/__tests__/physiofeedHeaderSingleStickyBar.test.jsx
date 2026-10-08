// On a phone the app's top bar and PhysioFeed's section tabs (Feed / Opportunity /
// News ...) used to be two separate sticky bars stacked in one scroll, which
// iPhone Safari redraws out of step with each other while the page glides
// (the header "vibrates"). The tabs are now drawn inside the app's own top bar
// (AppFull's #pm-mobile-subnav), so only one bar is pinned. Where that slot does
// not exist the tabs stay in PhysioFeed's own header.
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../physiofeed/context/AppDataContext.jsx", () => ({
  useAppData: () => ({
    notifications: [], profile: null, people: [], unreadMessages: 0, canGoBack: false, goBack: () => {},
  }),
}));

import Header from "../physiofeed/components/layout/Header.jsx";

const renderHeader = () => render(<MemoryRouter initialEntries={["/feed"]}><Header /></MemoryRouter>);

afterEach(() => {
  cleanup();
  document.getElementById("pm-mobile-subnav")?.remove();
});

describe("PhysioFeed section tabs on a phone", () => {
  it("stay in PhysioFeed's own header when the app's top bar has no slot for them", () => {
    renderHeader();
    const nav = screen.getByRole("navigation", { name: "PhysioFeed sections" });
    const header = document.querySelector(".pf-header");
    expect(header.contains(nav)).toBe(true);
    expect(header.hasAttribute("data-in-app-bar")).toBe(false);
  });

  it("move into the app's top bar, so only one bar is pinned", () => {
    const slot = document.createElement("div");
    slot.id = "pm-mobile-subnav";
    document.body.appendChild(slot);

    renderHeader();
    const nav = screen.getByRole("navigation", { name: "PhysioFeed sections" });
    const header = document.querySelector(".pf-header");
    expect(slot.contains(nav)).toBe(true);
    expect(header.contains(nav)).toBe(false);
    expect(header.getAttribute("data-in-app-bar")).toBe("1");
    // Same tabs, in the same order.
    expect(["Feed", "Opportunity", "News"].every((t) => slot.textContent.includes(t))).toBe(true);
    // Rendered once, not in both places.
    expect(screen.getAllByRole("navigation", { name: "PhysioFeed sections" })).toHaveLength(1);
  });
});
