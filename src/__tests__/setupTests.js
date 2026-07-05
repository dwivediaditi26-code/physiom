// setupTests.js — vitest + jsdom global setup for RTL component tests.
import "@testing-library/jest-dom/vitest";

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
