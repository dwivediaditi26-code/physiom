// localSaveFailure.test.jsx
// When the phone's own storage is full, keeping the local copy used to fail without a word.
// It now flips a flag, announces it once, and the banner tells the clinician in plain words.
// Supabase is mocked (never remove this).
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

const getUser = vi.hoisted(() => vi.fn(() => Promise.resolve({ data: { user: { id: "u1" } } })));
vi.mock("../supabase.js", () => ({
  supabase: { from: vi.fn(() => ({ upsert: () => Promise.resolve({ error: null }) })), auth: { getUser } },
  authHeader: vi.fn().mockResolvedValue({}),
}));

import { savePatientDBLocalOnly, localSaveFailed } from "../PatientDatabase.jsx";
import OfflineBanner from "../OfflineBanner.jsx";

const LIST = [{ id: "p1", name: "Real Patient", data: { dem_name: "Real Patient" }, createdAt: "2026-10-06T00:00:00.000Z", updatedAt: "2026-10-06T00:00:00.000Z" }];
// (the test setup replaces localStorage with a plain in-memory object, so spy on that object)
const fullStorage = () => vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new DOMException("quota", "QuotaExceededError"); });

beforeEach(() => { localStorage.clear(); getUser.mockClear(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("a full phone is no longer silent", () => {
  it("flags the failure, announces it once, and clears it when saving works again", async () => {
    const events = [];
    const onState = (e) => events.push(e.detail.failed);
    window.addEventListener("pm-local-save-state", onState);

    await savePatientDBLocalOnly(LIST, "full_user");
    expect(localSaveFailed()).toBe(false);

    const spy = fullStorage();
    await savePatientDBLocalOnly(LIST, "full_user");
    await savePatientDBLocalOnly(LIST, "full_user"); // still failing: no second announcement
    expect(localSaveFailed()).toBe(true);
    expect(events).toEqual([true]);

    spy.mockRestore();
    await savePatientDBLocalOnly(LIST, "full_user");
    expect(localSaveFailed()).toBe(false);
    expect(events).toEqual([true, false]);
    window.removeEventListener("pm-local-save-state", onState);
  });
});

describe("the banner says what it means", () => {
  it("signed in and online: your work is still going to the cloud", async () => {
    render(<OfflineBanner />);
    const spy = fullStorage();
    await act(async () => { await savePatientDBLocalOnly(LIST, "banner_user_1"); });
    spy.mockRestore();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/still being saved to the cloud/i));
    await act(async () => { await savePatientDBLocalOnly(LIST, "banner_user_1"); });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("signed out: warns that the latest changes are NOT saved", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<OfflineBanner />);
    const spy = fullStorage();
    await act(async () => { await savePatientDBLocalOnly(LIST, "banner_user_2"); });
    spy.mockRestore();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/NOT saved/));
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    await act(async () => { await savePatientDBLocalOnly(LIST, "banner_user_2"); });
  });
});
