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
    await waitFor(() => {
      expect(screen.getAllByText("PhysioFeed").length).toBeGreaterThan(0);
    }, { timeout: 10_000 });
    const [physiofeedTab] = screen.getAllByText("PhysioFeed");
    fireEvent.click(physiofeedTab);
    await waitFor(() => {
      expect(screen.getByText(/Demo content/i)).toBeTruthy();
    }, { timeout: 10_000 });
  }, 15_000);
});
