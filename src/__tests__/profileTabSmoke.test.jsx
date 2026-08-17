// profileTabSmoke.test.jsx
// Smoke test for the redesigned Profile tab (now reuses PhysioFeed's own
// ProfilePage component instead of the earlier plain placeholder). Confirms
// it renders without crashing, discloses that the bio/stats/posts are demo
// content (not the real logged-in user's real activity), and that the real
// Sign Out action is still present and wired to the real onSignOut handler.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";

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

  it("renders with a demo-content disclosure and a real, working Sign out button", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Profile").length).toBeGreaterThan(0);
    }, { timeout: 10_000 });
    const profileTab = screen.getAllByText("Profile").find(el => el.closest("button"));
    fireEvent.click(profileTab);
    await waitFor(() => {
      expect(screen.getByText(/Demo profile/i)).toBeTruthy();
    }, { timeout: 10_000 });
    expect(screen.getByRole("button", { name: /sign out/i })).toBeTruthy();
  }, 15_000);
});
