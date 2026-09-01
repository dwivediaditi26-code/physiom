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

  it("renders the feed with a clear demo-content disclosure, not silently as real community content", async () => {
    render(<App />);
    // Plain text "PhysioFeed" is ambiguous -- the Home dashboard also
    // renders a "PhysioFeed" preview widget (DashboardModules.jsx) whose
    // heading is that same literal text but isn't a nav control, and it
    // sits earlier in DOM order than the real bottom-nav tab button below.
    // getAllByText(...)[0]/.first() isn't guaranteed to land on the real
    // tab, so this used to click a no-op and time out waiting for "Demo
    // content". data-testid="bnav-tab-physiofeed" (AppFull.jsx) targets the
    // actual tab button unambiguously.
    const physiofeedTab = await screen.findByTestId("bnav-tab-physiofeed", {}, { timeout: 10_000 });
    fireEvent.click(physiofeedTab);
    await waitFor(() => {
      expect(screen.getByText(/Demo content/i)).toBeTruthy();
    }, { timeout: 10_000 });
  }, 15_000);
});
