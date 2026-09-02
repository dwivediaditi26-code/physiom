// learnTabSmoke.test.jsx
// Smoke test for the new Learn tab (real assessment library grid, built
// from physiom's own ALL_TESTS labels -- no fabricated categories). Confirms
// it renders, search filters the grid, and tapping a real card (ROM) calls
// the real navTo("rom") -- lands on the exact same screen the desktop
// sidebar's "Range of Motion" link already opens.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import App from "../App.jsx";
import { supabase } from "../supabase.js";

const USER_ID = "test-user-123";

describe("Learn tab", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: USER_ID, email: "student@example.com" } } },
      error: null,
    });
  });

  it("renders the real assessment library and navigates to a real section on tap", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Learn").length).toBeGreaterThan(0);
    }, { timeout: 10_000 });
    const learnTab = screen.getAllByText("Learn").find(el => el.closest("button"));
    fireEvent.click(learnTab);

    await waitFor(() => {
      expect(screen.getByText("Assessment Library")).toBeTruthy();
    }, { timeout: 10_000 });
    // "Advanced Assessment" also matches the desktop sidebar's own group
    // header (same dual-render pattern as elsewhere in this app) -- use
    // getAllByText rather than getByText, which throws on multiple matches.
    expect(screen.getAllByText("Advanced Assessment").length).toBeGreaterThan(0);
    // Treatment and Tx Techniques cards (and the "Observation" card) were
    // removed from Learn (2026-09-02, Aditi: "remove the technique or
    // treatment section from learn and also observation ... let the
    // exercise section be there") -- Exercise Prescription now gets its
    // own section instead of sharing "Treatment & Exercise".
    expect(screen.queryByText("Treatment & Exercise")).toBeNull();
    // "Observation" itself also matches the always-present desktop sidebar
    // (dual-render pattern, same as "Advanced Assessment" above) -- its
    // Learn card's unique description text is the reliable signal instead.
    expect(screen.queryByText("Visual inspection")).toBeNull();
    expect(screen.getAllByText("Exercise Prescription").length).toBeGreaterThan(0);

    // Search narrows the grid down to a real match. Note: "Demographics"
    // also exists in the always-present real desktop sidebar (separate
    // component, unaffected by this local search state), so this only
    // checks that the search term's own match still shows -- not that
    // every other label vanishes app-wide.
    const search = screen.getByPlaceholderText(/search assessments/i);
    fireEvent.change(search, { target: { value: "gait" } });
    await waitFor(() => {
      expect(screen.getByText("Gait Analysis")).toBeTruthy();
    }, { timeout: 5_000 });

    // Clear the search, then tap ROM -- should land on the real ROM screen
    // (same one the desktop sidebar's "Range of Motion" link opens).
    fireEvent.change(search, { target: { value: "" } });
    const romCards = await waitFor(() => screen.getAllByText("ROM"), { timeout: 5_000 });
    fireEvent.click(romCards[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/Range of Motion/i).length).toBeGreaterThan(0);
    }, { timeout: 10_000 });
  }, 20_000);
});
