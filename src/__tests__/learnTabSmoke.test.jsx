// learnTabSmoke.test.jsx
// Smoke test for the Learn tab (home card grid, then the Practical Skills
// list built from physiom's own ALL_TESTS labels -- no fabricated
// categories). Confirms it renders, search filters the list, and tapping a
// row with no study mode (Exercise Prescription) opens the real screen.
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
    fireEvent.click(screen.getByTestId("bnav-tab-learn"));

    // Learn opens on a home grid of cards (2026-09-18 redesign). Only Practical Skills
    // and Clinical Cases have content; the not-yet-built sections (Test, BPT, Exam Ready)
    // are shown as disabled "Soon" cards (restored 2026-10-07).
    await waitFor(() => {
      expect(screen.getByText("Practical Skills")).toBeTruthy();
    }, { timeout: 10_000 });
    expect(screen.getByText("Clinical Cases")).toBeTruthy();
    expect(screen.getByText("Case Simulator")).toBeTruthy();
    for (const name of ["Test", "BPT", "Exam Ready"]) {
      const card = screen.getByText(name, { selector: "span.cl-display" }).closest("button");
      expect(card.disabled, name).toBe(true);
      expect(card.textContent, name).toMatch(/Soon/);
    }
    expect(screen.queryByTestId("learn-coming-soon")).toBeNull();

    fireEvent.click(screen.getByText("Practical Skills"));
    expect(screen.getByRole("heading", { name: "Practical Skills" })).toBeTruthy();
    // Treatment and Tx Techniques cards (and the "Observation" card) were
    // removed from Learn (2026-09-02, Aditi: "remove the technique or
    // treatment section from learn and also observation ... let the
    // exercise section be there") -- Exercise Prescription now gets its
    // own section instead of sharing "Treatment & Exercise".
    expect(screen.queryByText("Treatment & Exercise")).toBeNull();
    // "Observation" itself also matches the always-present desktop sidebar
    // (dual-render pattern) -- its old Learn card's unique description text
    // is the reliable signal instead.
    expect(screen.queryByText("Visual inspection")).toBeNull();
    // Palpation is for admin accounts only (2026-10-06), so an ordinary user has no such row.
    expect(screen.queryByText("Tissue assessment")).toBeNull();
    expect(screen.getByText("Joint-by-joint")).toBeTruthy();    // Kinetic Chain row

    // Search narrows the list to real matches, checked by each row's own description text.
    const search = screen.getByPlaceholderText(/search topics/i);
    fireEvent.change(search, { target: { value: "kinetic" } });
    await waitFor(() => {
      expect(screen.queryByText("Range of motion")).toBeNull();
    }, { timeout: 5_000 });
    expect(screen.getByText("Joint-by-joint")).toBeTruthy();

    // Clear the search, then tap Exercise Learn -- it opens the student exercise library
    // (study mode), built from the app's own exercise data.
    fireEvent.change(search, { target: { value: "" } });
    fireEvent.click(await screen.findByText("Learn • Practice • Apply"));
    await waitFor(() => {
      expect(screen.getByText("Browse by region")).toBeTruthy();
    }, { timeout: 10_000 });
  }, 20_000);

  it("shows the Palpation row to an admin account", async () => {
    const realFrom = supabase.from.getMockImplementation();
    vi.mocked(supabase.from).mockImplementation((table) => {
      const chain = realFrom(table);
      if (table !== "profiles") return chain;
      return { ...chain, select: (cols) => (cols === "is_admin"
        ? { eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }
        : chain.select(cols)) };
    });
    render(<App />);
    await waitFor(() => { expect(screen.getAllByText("Learn").length).toBeGreaterThan(0); }, { timeout: 10_000 });
    fireEvent.click(screen.getByTestId("bnav-tab-learn"));
    fireEvent.click(await screen.findByText("Practical Skills"));
    await waitFor(() => { expect(screen.getByText("Tissue assessment")).toBeTruthy(); }, { timeout: 10_000 });
    vi.mocked(supabase.from).mockImplementation(realFrom);
  }, 30000);
});
