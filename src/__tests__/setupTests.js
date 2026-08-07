// setupTests.js — vitest + jsdom global setup for RTL component tests.
import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

// jest-axe's matcher is jest-flavored (uses jest's global `expect`) -- wire
// it into vitest's `expect` explicitly so `expect(results).toHaveNoViolations()`
// works the same way in this vitest suite as it would under jest.
expect.extend(toHaveNoViolations);

// Node 22 ships a NATIVE global `localStorage` that is unavailable unless the
// process is started with --localstorage-file. That native global shadows the
// one jsdom provides, so app code calling bare `localStorage.getItem(...)`
// (e.g. SubjectiveObjective.jsx) throws "Cannot read properties of undefined".
// Install a simple in-memory localStorage on both globalThis and window so the
// same reference is used everywhere, regardless of how it's referenced.
(() => {
  const store = new Map();
  const mem = {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => { store.set(String(k), String(v)); },
    removeItem: (k) => { store.delete(String(k)); },
    clear: () => { store.clear(); },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  Object.defineProperty(globalThis, "localStorage", { value: mem, configurable: true, writable: true });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", { value: mem, configurable: true, writable: true });
  }
})();

// window.matchMedia isn't implemented in jsdom; utils.jsx / InstallPrompt use it.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  });
}

// jsdom doesn't implement scrollTo / IntersectionObserver / ResizeObserver,
// which several UI components in this app call defensively.
window.scrollTo = window.scrollTo || (() => {});
global.IntersectionObserver = global.IntersectionObserver || class {
  observe() {} unobserve() {} disconnect() {}
};
global.ResizeObserver = global.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};
