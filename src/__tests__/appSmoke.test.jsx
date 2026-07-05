// appSmoke.test.jsx
// First checkpoint: does the real App component (same one production ships)
// mount at all inside jsdom without crashing? This has to pass before any
// deeper interaction testing is worth attempting.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

// CRITICAL: never let a test touch the real production Supabase project.
vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import App from "../App.jsx";
import { supabase } from "../supabase.js"; // the mocked version, per vi.mock above

beforeEach(() => {
  localStorage.clear();
  cleanup();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
});

describe("App smoke test", () => {
  it("mounts without throwing, and settles on the sign-in screen when there's no session", async () => {
    expect(() => render(<App />)).not.toThrow();
    // App() checks supabase.auth.getSession() (mocked to return no session)
    // asynchronously, then renders AuthScreen — wait for that resolve so we're
    // not asserting mid-flight and don't trip React's act() warning.
    expect(await screen.findByText(/Welcome back/i)).toBeInTheDocument();
  });

  it("renders some recognizable app chrome after mount", async () => {
    render(<App />);
    await screen.findByText(/Welcome back/i);
    const root = document.body;
    expect(root.textContent.trim().length).toBeGreaterThan(0);
  });

  it("renders the actual app (not the sign-in screen) once a real session exists", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "test-user-123", email: "student@example.com" } } },
      error: null,
    });
    render(<App />);
    // Once logged in, AuthScreen's "Welcome back" must NOT be what's shown —
    // AppInner should render instead. It greets the signed-in user by name
    // derived from their email ("Hello, Dr student" for student@example.com,
    // split across two text nodes, hence the whole-body-text check rather
    // than an exact getByText match), which only appears once currentUser is
    // the real logged-in session, not the old devUser bypass.
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Hello, Dr\s*student/i);
    });
    expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument();
  });
});
