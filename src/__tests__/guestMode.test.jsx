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
    // HomeModule's Quick Start grid is real-app content, not the walkthrough
    expect(screen.getByText("New Patient")).toBeInTheDocument();
    expect(screen.getByText(/Guest mode/i)).toBeInTheDocument();
  });

  it("Home's 'Patient Intake' quick action opens the Subjective form for a guest with no sign-in gate", async () => {
    // 2026-08-19: the Subjective tab now renders the new simplified design
    // (SubjectiveAssessmentNew.jsx), which has no AI-triggering action at
    // all (its own demo-only "AI Extracted" fill button only exists when
    // NOT connected to a real patient -- see that file). The old
    // SubjectiveModule's requireAuth("AI Patient Intake") gate lived
    // entirely inside that removed AI panel, so there's nothing left here
    // for a guest to be gated on -- "Patient Intake" now behaves like any
    // other ordinary navigation for guests, same as "Assess Patient" below.
    // Real AI gating for guests is still covered separately -- AIAssistant
    // ("Clinical Assistant" quick action) keeps its own requireAuth check
    // untouched by this change.
    await enterGuestMode();
    fireEvent.click(screen.getByText("Patient Intake"));
    await waitFor(() => {
      expect(screen.getByText("History & Patient Report")).toBeInTheDocument();
    });
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
    fireEvent.click(screen.getByText("Assess Patient")); // Quick Start -> subjective, no AI
    // "Subjective Assessment" also appears as a nav-item label regardless
    // of which screen is active, so assert on content unique to the
    // rendered Subjective screen itself.
    // (2026-08-19: new design's header text, was "History & Complaint".)
    await waitFor(() => {
      expect(screen.getByText("History & Patient Report")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Sign in to use/i)).not.toBeInTheDocument();
  });
});
