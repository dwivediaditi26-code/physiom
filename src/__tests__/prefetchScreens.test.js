import { describe, it, expect, vi, afterEach } from "vitest";
import { shouldPrefetch, prefetchLikelyScreens } from "../prefetchScreens.js";

afterEach(() => { vi.useRealTimers(); });

describe("shouldPrefetch", () => {
  it("yes on a normal connection, or when the browser does not say", () => {
    expect(shouldPrefetch({})).toBe(true);
    expect(shouldPrefetch({ connection: { effectiveType: "4g", saveData: false } })).toBe(true);
  });
  it("no with Data Saver on, or on a very slow connection", () => {
    expect(shouldPrefetch({ connection: { saveData: true, effectiveType: "4g" } })).toBe(false);
    expect(shouldPrefetch({ connection: { effectiveType: "2g" } })).toBe(false);
    expect(shouldPrefetch({ connection: { effectiveType: "slow-2g" } })).toBe(false);
  });
});

describe("prefetchLikelyScreens", () => {
  const immediately = (fn) => fn();

  it("waits for the delay, then loads each screen one after another", async () => {
    vi.useFakeTimers();
    const order = [];
    const loaders = [() => { order.push("a"); return Promise.resolve(); }, () => { order.push("b"); return Promise.resolve(); }];
    prefetchLikelyScreens({ loaders, nav: {}, idle: immediately, delayMs: 1000 });
    await vi.advanceTimersByTimeAsync(900);
    expect(order).toEqual([]);
    await vi.advanceTimersByTimeAsync(200);
    expect(order).toEqual(["a", "b"]);
  });

  it("does nothing with Data Saver on", async () => {
    vi.useFakeTimers();
    const load = vi.fn(() => Promise.resolve());
    prefetchLikelyScreens({ loaders: [load], nav: { connection: { saveData: true } }, idle: immediately, delayMs: 10 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(load).not.toHaveBeenCalled();
  });

  it("a failed download does not stop the others or throw", async () => {
    vi.useFakeTimers();
    const second = vi.fn(() => Promise.resolve());
    prefetchLikelyScreens({ loaders: [() => Promise.reject(new Error("offline")), second], nav: {}, idle: immediately, delayMs: 10 });
    await vi.advanceTimersByTimeAsync(100);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("can be cancelled before it starts", async () => {
    vi.useFakeTimers();
    const load = vi.fn(() => Promise.resolve());
    const cancel = prefetchLikelyScreens({ loaders: [load], nav: {}, idle: immediately, delayMs: 1000 });
    cancel();
    await vi.advanceTimersByTimeAsync(5000);
    expect(load).not.toHaveBeenCalled();
  });
});
