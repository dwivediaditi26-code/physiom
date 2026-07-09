// persistentHighlight.test.js
// Regression test for Task 6 of the master prompt: deep-link highlights
// (used when jumping to a suggested ROM/MMT/Special Test/etc. item from the
// clinical review) used to vanish after a blind 4-second timeout, even if
// the clinician hadn't looked at the item yet. applyPersistentHighlight
// (src/utils.jsx) now keeps a persistent glow class on the element until
// the user actually interacts with it (click or focus), which both
// "completes it" and "manually dismisses" it in one natural gesture.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyPersistentHighlight } from "../utils.jsx";

describe("applyPersistentHighlight", () => {
  let el;
  beforeEach(() => {
    el = document.createElement("div");
    document.body.appendChild(el);
  });

  it("adds both the pulse and persistent highlight classes immediately", () => {
    applyPersistentHighlight(el);
    expect(el.classList.contains("physio-highlight")).toBe(true);
    expect(el.classList.contains("physio-highlight-persist")).toBe(true);
  });

  it("drops the pulse animation class after 4s but keeps the persistent glow", () => {
    vi.useFakeTimers();
    applyPersistentHighlight(el);
    vi.advanceTimersByTime(4000);
    expect(el.classList.contains("physio-highlight")).toBe(false);
    expect(el.classList.contains("physio-highlight-persist")).toBe(true);
    vi.useRealTimers();
  });

  it("does NOT clear the persistent highlight on its own after any amount of time", () => {
    vi.useFakeTimers();
    applyPersistentHighlight(el);
    vi.advanceTimersByTime(60_000);
    expect(el.classList.contains("physio-highlight-persist")).toBe(true);
    vi.useRealTimers();
  });

  it("clears the persistent highlight when the user clicks the element", () => {
    applyPersistentHighlight(el);
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.classList.contains("physio-highlight-persist")).toBe(false);
  });

  it("clears the persistent highlight when a field inside it gains focus", () => {
    applyPersistentHighlight(el);
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(el.classList.contains("physio-highlight-persist")).toBe(false);
  });

  it("does nothing (no throw) when passed a null element", () => {
    expect(() => applyPersistentHighlight(null)).not.toThrow();
  });
});
