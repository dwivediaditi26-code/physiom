import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installKeepBarsInPlace, viewportDrift } from "../pwa/keepBarsInPlace.js";

// A stand-in for the iPhone's "visible window" (window.visualViewport).
function fakeWindow(vvProps = {}) {
  const vv = Object.assign(new EventTarget(), { scale: 1, offsetTop: 0, height: 800 }, vvProps);
  const win = Object.assign(new EventTarget(), {
    visualViewport: vv,
    innerHeight: 800,
    scrollY: 300,
    document: Object.assign(new EventTarget(), { activeElement: { tagName: "BODY" } }),
    scrollTo: vi.fn(),
    requestAnimationFrame: (fn) => fn(),
  });
  return { win, vv };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("viewportDrift", () => {
  it("is null when the window is where it belongs", () => {
    expect(viewportDrift(fakeWindow().win)).toBeNull();
  });
  it("sees a window pushed down inside the page", () => {
    expect(viewportDrift(fakeWindow({ offsetTop: 245 }).win)).toEqual({ offsetTop: 245, shortBy: 0 });
  });
  it("sees a window left shorter than the page frame", () => {
    expect(viewportDrift(fakeWindow({ height: 560 }).win)).toEqual({ offsetTop: 0, shortBy: 240 });
  });
  it("ignores it while a field is being typed in (the keyboard is meant to be there)", () => {
    const { win } = fakeWindow({ height: 500 });
    win.document.activeElement = { tagName: "TEXTAREA" };
    expect(viewportDrift(win)).toBeNull();
  });
  it("ignores a page the person has pinch-zoomed", () => {
    expect(viewportDrift(fakeWindow({ offsetTop: 100, scale: 2 }).win)).toBeNull();
  });
  it("does nothing on browsers without a visual viewport", () => {
    expect(viewportDrift({ document: { activeElement: null } })).toBeNull();
    expect(typeof installKeepBarsInPlace({ win: { document: {} } })).toBe("function");
  });
});

describe("installKeepBarsInPlace", () => {
  it("nudges the page back after the keyboard closes and the window is left shifted", () => {
    const { win } = fakeWindow({ offsetTop: 245 });
    installKeepBarsInPlace({ win });
    win.document.dispatchEvent(new Event("focusout"));
    vi.advanceTimersByTime(200);
    expect(win.scrollTo).toHaveBeenCalledWith(0, 299); // one pixel away...
    expect(win.scrollTo).toHaveBeenLastCalledWith(0, 300); // ...and straight back
  });

  it("leaves the page alone when nothing is out of place", () => {
    const { win } = fakeWindow();
    installKeepBarsInPlace({ win });
    win.document.dispatchEvent(new Event("focusout"));
    vi.advanceTimersByTime(2000);
    expect(win.scrollTo).not.toHaveBeenCalled();
  });

  it("waits while the person is still scrolling", () => {
    const { win } = fakeWindow({ offsetTop: 245 });
    installKeepBarsInPlace({ win });
    win.dispatchEvent(new Event("scroll"));
    win.document.dispatchEvent(new Event("focusout"));
    vi.advanceTimersByTime(100);
    expect(win.scrollTo).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400); // finger lifted
    expect(win.scrollTo).toHaveBeenCalled();
  });

  it("stops after a few tries instead of fighting the browser", () => {
    const { win } = fakeWindow({ offsetTop: 245 }); // a nudge never fixes this one
    installKeepBarsInPlace({ win });
    win.document.dispatchEvent(new Event("focusout"));
    vi.advanceTimersByTime(10_000);
    expect(win.scrollTo.mock.calls.length).toBeLessThanOrEqual(2 * 3 * 3); // 3 tries per chain, 2 calls each
    const before = win.scrollTo.mock.calls.length;
    vi.advanceTimersByTime(10_000);
    expect(win.scrollTo.mock.calls.length).toBe(before);
  });

  it("reports what it saw once per visit", () => {
    const { win } = fakeWindow({ offsetTop: 245 });
    const report = vi.fn();
    installKeepBarsInPlace({ win, report });
    win.document.dispatchEvent(new Event("focusout"));
    vi.advanceTimersByTime(1000);
    win.document.dispatchEvent(new Event("focusout"));
    vi.advanceTimersByTime(1000);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({ offsetTop: 245, shortBy: 0 });
  });

  it("a failing report never breaks the page", () => {
    const { win } = fakeWindow({ offsetTop: 245 });
    installKeepBarsInPlace({ win, report: () => { throw new Error("boom"); } });
    win.document.dispatchEvent(new Event("focusout"));
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    expect(win.scrollTo).toHaveBeenCalled();
  });

  it("the returned function switches it all off", () => {
    const { win } = fakeWindow({ offsetTop: 245 });
    const stop = installKeepBarsInPlace({ win });
    stop();
    win.document.dispatchEvent(new Event("focusout"));
    vi.advanceTimersByTime(2000);
    expect(win.scrollTo).not.toHaveBeenCalled();
  });
});
