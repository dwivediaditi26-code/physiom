// When someone ticks the Terms + Privacy Policy box and creates an account, the
// account records WHEN they accepted and WHICH version of the text it was, so
// consent can be shown later. Only the create-account path asks for it.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { supabase } = await import("../supabase.js");
const { default: AuthScreen } = await import("../AuthScreen.jsx");
const { LEGAL_VERSION } = await import("../LegalPages.jsx");

describe("Create account saves when and what was accepted", () => {
  it("sends the acceptance date and the Terms version with the new account", async () => {
    supabase.auth.signUp = vi.fn(() => Promise.resolve({ data: { session: null, user: null }, error: null }));
    render(<AuthScreen onAuth={() => {}} onTryGuest={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Create free account" }));
    fireEvent.change(screen.getByPlaceholderText("Dr. Aditi"), { target: { value: "Test Physio" } });
    fireEvent.change(screen.getByPlaceholderText("you@clinic.com"), { target: { value: "t@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("checkbox"));

    const before = Date.now();
    fireEvent.click(screen.getByRole("button", { name: /Create free account →/ }));
    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalledTimes(1));

    const { data } = supabase.auth.signUp.mock.calls[0][0].options;
    expect(data.terms_version).toBe(LEGAL_VERSION);
    const acceptedAt = new Date(data.terms_accepted_at).getTime();
    expect(Number.isNaN(acceptedAt)).toBe(false);
    expect(acceptedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(acceptedAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("the sign-in page no longer claims full DPDP compliance", () => {
    render(<AuthScreen onAuth={() => {}} onTryGuest={() => {}} />);
    expect(screen.queryByText(/DPDP Act compliant/)).toBeNull();
    expect(screen.getByText("🇮🇳 Privacy-first")).toBeTruthy();
  });
});
