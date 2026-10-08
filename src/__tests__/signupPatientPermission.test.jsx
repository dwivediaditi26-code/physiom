// The patient-permission confirmation is given ONCE, as part of creating the
// account (2026-10-07, Aditi: asked "again and again" -- "as sign up, not
// signing in"). The sign-up tick states it and the account is created with
// pm_perm_ack, which AppFull reads so nothing is asked inside the app again.
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signUp = vi.fn(async () => ({ data: { session: null, user: null }, error: null }));
vi.mock("../supabase.js", () => ({ supabase: { auth: { signUp: (...a) => signUp(...a), signInWithPassword: vi.fn(), resetPasswordForEmail: vi.fn() } } }));
const { default: AuthScreen } = await import("../AuthScreen.jsx");

describe("sign-up carries the patient-permission confirmation", () => {
  test("the sign-up tick mentions patient permission and the account is created with pm_perm_ack", async () => {
    render(<AuthScreen onAuth={() => {}} onTryGuest={() => {}} />);
    fireEvent.click(screen.getByText("Create free account"));
    expect(screen.getByText(/each patient's permission/i)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Dr. Aditi"), { target: { value: "Dr Test" } });
    fireEvent.change(screen.getByPlaceholderText("you@clinic.com"), { target: { value: "t@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Create free account/ }));
    await waitFor(() => expect(signUp).toHaveBeenCalled());
    const meta = signUp.mock.calls[0][0].options.data;
    expect(meta.pm_perm_ack).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
