// profileTabSmoke.test.jsx
// Smoke test for the redesigned Profile tab (now reuses PhysioFeed's own
// ProfilePage component instead of the earlier plain placeholder). Confirms
// it renders without crashing and that the real Sign Out action is still
// present and wired to the real onSignOut handler. Used to also assert a
// "Demo profile" disclosure banner here -- removed along with that banner
// (2026-09-22, Aditi: "remove this demo profile thing written").
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent, within } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import App from "../App.jsx";
import { supabase } from "../supabase.js";

const USER_ID = "test-user-123";

describe("Profile tab", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: USER_ID, email: "student@example.com" } } },
      error: null,
    });
  });

  it("renders with a real, working Sign out button", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Profile").length).toBeGreaterThan(0);
    }, { timeout: 10_000 });
    const profileTab = screen.getAllByText("Profile").find(el => el.closest("button"));
    fireEvent.click(profileTab);
    // Scoped to the Profile tab's own content (.physiofeed-root) -- the
    // sidebar also has its own "Sign out" now (2026-09-10, moved there from
    // the Clinical "Today" header), so an unscoped query matches both.
    await waitFor(() => {
      const profilePanel = document.querySelector(".physiofeed-root");
      expect(profilePanel && within(profilePanel).getByRole("button", { name: /sign out/i })).toBeTruthy();
    }, { timeout: 10_000 });
  }, 15_000);
});
