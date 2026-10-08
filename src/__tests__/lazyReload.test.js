// A tab opened before a deploy fails to load a screen ("Importing a module script failed").
// lazyReload.js reloads once to pick up the new build, and shows the normal error if that does not help.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isChunkLoadError } from "../lazyReload.js";

describe("isChunkLoadError", () => {
  it("recognises the wording of every browser", () => {
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module: https://x/a.js"))).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
  });
  it("does not treat an ordinary error as a chunk error", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});

describe("lazy() reload once", () => {
  let reload;
  beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload } });
  });
  afterEach(() => vi.restoreAllMocks());

  // React.lazy hands its factory to the first render; call it through the module's own wrapper.
  async function run(factory) {
    const { lazy } = await import("../lazyReload.js");
    const L = lazy(factory);
    return L._payload._result(); // the wrapped factory
  }

  it("reloads once when the screen file is gone", async () => {
    const p = run(() => Promise.reject(new Error("Importing a module script failed.")));
    await new Promise((r) => setTimeout(r, 20));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("pm_chunk_reload")).toBe("1");
    void p;
  });

  it("does not loop: a second failure in the same visit is passed on", async () => {
    sessionStorage.setItem("pm_chunk_reload", "1");
    await expect(run(() => Promise.reject(new Error("Importing a module script failed.")))).rejects.toThrow(/module script/);
    expect(reload).not.toHaveBeenCalled();
  });

  it("passes other errors straight through, no reload", async () => {
    await expect(run(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(reload).not.toHaveBeenCalled();
  });
});
