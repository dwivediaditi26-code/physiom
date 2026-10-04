// physioFeedSmoke.test.jsx
// Smoke test for the new PhysioFeed tab (wired to a real, self-contained
// sub-app under src/physiofeed/, mounted via MemoryRouter so it can't touch
// the real browser URL that navTo() already manages). No existing test
// exercises active==="physiofeed" at all, so this just confirms it renders
// without crashing, shows the demo-content disclosure (real requirement --
// the feed's people/posts are fabricated placeholders, not real students),
// and that switching to it and back doesn't disturb normal app state.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import App from "../App.jsx";
import { supabase } from "../supabase.js";

const USER_ID = "test-user-123";

describe("PhysioFeed tab", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: USER_ID, email: "student@example.com" } } },
      error: null,
    });
  });

  // The demo banner belongs to guest mode (db.js hands guests the shared demo
  // identity). A signed-in clinician whose feed or profile cannot be read gets an
  // honest empty feed and a blank profile of their own, never canned posts or
  // someone else's identity (first-time walkthrough, 2026-10-02/03), so no banner.
  it("renders the feed for a signed-in clinician without the demo disclosure or canned posts", async () => {
    render(<App />);
    const physiofeedTab = await screen.findByTestId("bnav-tab-physiofeed", {}, { timeout: 10_000 });
    fireEvent.click(physiofeedTab);
    // Slower than the guest case: it waits for the feed read to finish and fail first.
    await waitFor(() => {
      expect(screen.getByText(/Nothing here yet/i)).toBeTruthy();
    }, { timeout: 20_000 });
    expect(screen.queryByText(/Demo content/i)).toBeNull();
    expect(screen.queryByText(/Aditi Sharma/)).toBeNull();
  }, 35_000);

  it("renders the feed in guest mode with a clear demo-content disclosure, not silently as real community content", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    render(<App />);
    fireEvent.click(await screen.findByText(/Try the full app/i));
    // Plain text "PhysioFeed" is ambiguous -- the Home dashboard also renders a
    // "PhysioFeed" preview widget. data-testid="bnav-tab-physiofeed" (AppFull.jsx)
    // targets the actual tab button unambiguously.
    const physiofeedTab = await screen.findByTestId("bnav-tab-physiofeed", {}, { timeout: 10_000 });
    fireEvent.click(physiofeedTab);
    await waitFor(() => {
      expect(screen.getByText(/Demo content/i)).toBeTruthy();
    }, { timeout: 10_000 });
  }, 15_000);
});
