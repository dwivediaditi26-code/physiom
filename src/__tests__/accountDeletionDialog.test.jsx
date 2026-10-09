// The Delete account window: it must (1) tell the person what will be erased,
// (2) ask "are you sure", and (3) need the account password before anything is
// sent. The server checks the password too (see deleteAccountApi.test.js).
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
vi.mock("../PatientDatabase.jsx", () => ({ clearPatientCache: vi.fn() }));

const { supabase } = await import("../supabase.js");
const { clearPatientCache } = await import("../PatientDatabase.jsx");
const { default: DeleteAccountButton } = await import("../AccountDeletion.jsx");

const patients = [{ id: "a" }, { id: "b" }, { id: "c" }];

function openDialog() {
  render(<DeleteAccountButton patients={patients} />);
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
}
const toConfirmScreen = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  supabase.auth.signOut = vi.fn(() => Promise.resolve({ error: null }));
  clearPatientCache.mockClear();
});

describe("Delete account window", () => {
  it("first explains what will happen, with the real patient count, and nothing is deleted yet", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    openDialog();
    expect(screen.getByText("Delete your account?")).toBeTruthy();
    expect(screen.getByText(/never sign in to this account again/i)).toBeTruthy();
    expect(screen.getByText(/3 patient records/)).toBeTruthy();
    expect(screen.getByText(/including from other people's inboxes/i)).toBeTruthy();
    expect(screen.getByText(/Photos, videos, documents and CVs you uploaded are erased/)).toBeTruthy();
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy();
    expect(screen.queryByLabelText("Your password")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("'Keep my account' closes it without deleting", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Keep my account" }));
    expect(screen.queryByText("Delete your account?")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("then asks 'are you sure' and the delete button stays off until a password is typed", () => {
    openDialog();
    toConfirmScreen();
    expect(screen.getByText("Are you sure you want to delete this account?")).toBeTruthy();
    const del = screen.getByRole("button", { name: "Yes, permanently delete my account" });
    expect(del.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Your password"), { target: { value: "x" } });
    expect(del.disabled).toBe(false);
  });

  it("a wrong password shows the error, keeps the account, and does not sign out", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false, status: 403, json: async () => ({ error: "That password is not correct.", code: "wrong_password" }),
    });
    openDialog();
    toConfirmScreen();
    fireEvent.change(screen.getByLabelText("Your password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Yes, permanently delete my account" }));
    expect(await screen.findByText("That password is not correct.")).toBeTruthy();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(clearPatientCache).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Your password").value).toBe("");
  });

  it("the right password sends it to the server, then clears local data and signs out", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => ({ deleted: true }) });
    openDialog();
    toConfirmScreen();
    fireEvent.change(screen.getByLabelText("Your password"), { target: { value: "my-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Yes, permanently delete my account" }));
    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/deleteAccount$/);
    expect(JSON.parse(init.body)).toEqual({ password: "my-secret" });
    expect(clearPatientCache).toHaveBeenCalled();
  });

  it("'Go back' returns to the explanation and forgets the typed password", () => {
    openDialog();
    toConfirmScreen();
    fireEvent.change(screen.getByLabelText("Your password"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText("Delete your account?")).toBeTruthy();
    toConfirmScreen();
    expect(screen.getByLabelText("Your password").value).toBe("");
  });
});
