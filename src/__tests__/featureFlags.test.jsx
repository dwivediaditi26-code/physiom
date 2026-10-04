import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// profiles.select("is_admin").eq("id", uid).maybeSingle() resolves to whatever the test sets.
let profileAnswer;
vi.mock("../supabase.js", () => {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: () => Promise.resolve(profileAnswer()) };
  return { supabase: { from: vi.fn(() => chain), auth: {} } };
});

import { usePreviewFeatures, fetchIsPreviewTester } from "../featureFlags.js";

const USER = { id: "u-1" };
beforeEach(() => { localStorage.clear(); profileAnswer = () => ({ data: { is_admin: false }, error: null }); });

describe("fetchIsPreviewTester", () => {
  it("is true for an admin profile, false for anyone else", async () => {
    profileAnswer = () => ({ data: { is_admin: true }, error: null });
    expect(await fetchIsPreviewTester("u-1")).toBe(true);
    profileAnswer = () => ({ data: { is_admin: false }, error: null });
    expect(await fetchIsPreviewTester("u-1")).toBe(false);
  });
  it("is false when the person has no profile row yet, and for guests", async () => {
    profileAnswer = () => ({ data: null, error: null });
    expect(await fetchIsPreviewTester("u-1")).toBe(false);
    expect(await fetchIsPreviewTester(null)).toBe(false);
  });
  it("is 'unknown' (null) when the check fails", async () => {
    profileAnswer = () => ({ data: null, error: { message: "offline" } });
    expect(await fetchIsPreviewTester("u-1")).toBeNull();
  });
});

describe("usePreviewFeatures", () => {
  it("guests never see preview features, and are 'ready' straight away", () => {
    const { result } = renderHook(() => usePreviewFeatures(null));
    expect(result.current).toEqual({ enabled: false, ready: true });
  });

  it("ordinary accounts do not see them", async () => {
    const { result } = renderHook(() => usePreviewFeatures(USER));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.enabled).toBe(false);
  });

  it("admin accounts see them once the answer arrives", async () => {
    profileAnswer = () => ({ data: { is_admin: true }, error: null });
    const { result } = renderHook(() => usePreviewFeatures(USER));
    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.enabled).toBe(true);
  });

  it("remembers an admin on the device so the feature does not pop in on every visit", async () => {
    profileAnswer = () => ({ data: { is_admin: true }, error: null });
    const first = renderHook(() => usePreviewFeatures(USER));
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    first.unmount();
    profileAnswer = () => new Promise(() => {}); // the next check is slow
    const second = renderHook(() => usePreviewFeatures(USER));
    expect(second.result.current.enabled).toBe(true); // from memory, before the answer
  });

  it("a failed check does not switch it off for an admin", async () => {
    localStorage.setItem("pm_ff_admin_u-1", "1");
    profileAnswer = () => ({ data: null, error: { message: "offline" } });
    const { result } = renderHook(() => usePreviewFeatures(USER));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.enabled).toBe(true);
  });

  it("but a real 'not an admin any more' answer switches it off and forgets it", async () => {
    localStorage.setItem("pm_ff_admin_u-1", "1");
    profileAnswer = () => ({ data: { is_admin: false }, error: null });
    const { result } = renderHook(() => usePreviewFeatures(USER));
    await waitFor(() => expect(result.current.enabled).toBe(false));
    expect(localStorage.getItem("pm_ff_admin_u-1")).toBeNull();
  });
});
