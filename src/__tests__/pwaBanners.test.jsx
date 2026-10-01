import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import PwaBanners, { INSTALL_DISMISSED_KEY, VISIT_COUNT_KEY } from "../pwa/PwaBanners.jsx";
import { UPDATE_READY_EVENT } from "../pwa/registerServiceWorker.js";

// engagedAfterMs=0 makes the "has been using the app for a while" condition
// true straight away; the visit count is the other condition.
const renderBanners = (props = {}) => render(<PwaBanners engagedAfterMs={0} {...props} />);

function fireInstallPrompt() {
  const prompt = vi.fn(() => Promise.resolve());
  const ev = new Event("beforeinstallprompt", { cancelable: true });
  ev.prompt = prompt;
  act(() => { window.dispatchEvent(ev); });
  return { ev, prompt };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
  vi.spyOn(window, "matchMedia").mockImplementation(() => ({ matches: false }));
});
afterEach(() => { vi.restoreAllMocks(); });

describe("new version message", () => {
  it("appears when a new version takes over, and Refresh reloads the page", () => {
    const onRefresh = vi.fn();
    renderBanners({ onRefresh });
    expect(screen.queryByText(/new version/i)).toBeNull();
    act(() => { window.dispatchEvent(new Event(UPDATE_READY_EVENT)); });
    expect(screen.getByText(/A new version of PhysioMind is ready/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("Later hides it", () => {
    renderBanners();
    act(() => { window.dispatchEvent(new Event(UPDATE_READY_EVENT)); });
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByText(/new version/i)).toBeNull();
  });
});

describe("install message (Android / desktop Chrome)", () => {
  it("is not offered on the first visit", () => {
    renderBanners();
    fireInstallPrompt();
    expect(screen.queryByText(/Install PhysioMind/)).toBeNull();
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe("1");
  });

  it("is offered once the person has come back, and Install opens the browser's own prompt", async () => {
    localStorage.setItem(VISIT_COUNT_KEY, "1"); // this render becomes visit 2
    renderBanners();
    const { prompt } = fireInstallPrompt();
    expect(await screen.findByText(/Install PhysioMind on this device/)).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Install" })); });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Install PhysioMind/)).toBeNull();
  });

  it("Not now hides it and it stays hidden on the next visit", async () => {
    localStorage.setItem(VISIT_COUNT_KEY, "1");
    const first = renderBanners();
    fireInstallPrompt();
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(screen.queryByText(/Install PhysioMind/)).toBeNull();
    expect(Number(localStorage.getItem(INSTALL_DISMISSED_KEY))).toBeGreaterThan(0);
    first.unmount();
    sessionStorage.clear(); // a new visit
    renderBanners();
    fireInstallPrompt();
    await new Promise((r) => setTimeout(r, 20)); // let the "engaged" timer fire
    expect(screen.queryByText(/Install PhysioMind/)).toBeNull();
  });

  it("is offered again 30 days after Not now", async () => {
    localStorage.setItem(VISIT_COUNT_KEY, "5");
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now() - 31 * 24 * 60 * 60 * 1000));
    renderBanners();
    fireInstallPrompt();
    expect(await screen.findByText(/Install PhysioMind on this device/)).toBeTruthy();
  });

  it("is never offered inside the installed app", async () => {
    localStorage.setItem(VISIT_COUNT_KEY, "5");
    window.matchMedia.mockImplementation(() => ({ matches: true })); // display-mode: standalone
    renderBanners();
    fireInstallPrompt();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/Install PhysioMind/)).toBeNull();
  });

  it("waits until the person has been using the app for a while", () => {
    vi.useFakeTimers();
    localStorage.setItem(VISIT_COUNT_KEY, "3");
    render(<PwaBanners engagedAfterMs={45000} />);
    fireInstallPrompt();
    expect(screen.queryByText(/Install PhysioMind/)).toBeNull();
    act(() => { vi.advanceTimersByTime(45000); });
    expect(screen.getByText(/Install PhysioMind on this device/)).toBeTruthy();
    vi.useRealTimers();
  });
});

describe("install message (iPhone Safari)", () => {
  it("explains Share -> Add to Home Screen, since Safari has no install prompt", async () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
    localStorage.setItem(VISIT_COUNT_KEY, "2");
    renderBanners();
    expect(await screen.findByText(/Add to Home Screen/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
  });

  it("is not shown in Chrome on iPhone (which cannot install either)", async () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0 Mobile/15E148 Safari/604.1"
    );
    localStorage.setItem(VISIT_COUNT_KEY, "2");
    renderBanners();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
  });
});
