// Real interactive Guest Mode (2026-08-12): App.jsx's "Try the full app"
// entry renders the actual AppInner (not a scripted demo) with
// currentUser=null, isGuest=true. Guests can browse and use the real
// workflow -- nothing they do reaches Supabase, since every save path
// already guards on currentUser?.id. Only the AI-backed features (which
// hard-require a real Supabase JWT server-side) show a "sign in to
// continue" prompt instead of running.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

// CRITICAL: never let a test touch the real production Supabase project.
vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

import App from "../App.jsx";
import { supabase } from "../supabase.js"; // the mocked version, per vi.mock above

beforeEach(() => {
  localStorage.clear();
  cleanup();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
});

async function enterGuestMode() {
  render(<App />);
  await screen.findByText(/Welcome back/i);
  fireEvent.click(screen.getByText(/Try the full app/i));
  // Real AppInner mounted -- wait for it past the loading/Suspense fallback.
  await screen.findByText(/Guest mode/i);
}

describe("Guest Mode -- real app, no login wall on entry", () => {
  it("renders the real app (Home screen), not the scripted demo or the login form", async () => {
    await enterGuestMode();
    expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument();
    // Home's main tiles (2026-08-25 redesign) are real-app content, not the walkthrough
    expect(screen.getByTestId("home-tile-clinical")).toBeInTheDocument();
    expect(screen.getByText(/Guest mode/i)).toBeInTheDocument();
  });

  it("Home's Assessment tile opens Clinical's Assess tab for a guest with no sign-in gate", async () => {
    // Starting a manual assessment is ordinary navigation -- only the
    // AI-backed features (which need a real Supabase login server-side)
    // show the "Sign in to use" prompt for a guest.
    await enterGuestMode();
    fireEvent.click(screen.getByTestId("home-tile-assessment"));
    expect(await screen.findByText(/New Assessment/)).toBeInTheDocument();
    expect(screen.queryByText(/Sign in to use/i)).not.toBeInTheDocument();
  });

  it("the guest banner's CTA exits guest mode back to the real login screen", async () => {
    await enterGuestMode();
    fireEvent.click(screen.getByText("Sign in / Create free account →"));
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });
  });

  it("non-AI navigation works normally for a guest -- no prompt on an ordinary nav click", async () => {
    await enterGuestMode();
    fireEvent.click(screen.getByTestId("home-tile-clinical"));
    // Clinical opens on its "Today" view (2026-09-10 redesign).
    expect(await screen.findByText(/\d+ patients? today/)).toBeInTheDocument();
    expect(screen.queryByText(/Sign in to use/i)).not.toBeInTheDocument();
  });
});
