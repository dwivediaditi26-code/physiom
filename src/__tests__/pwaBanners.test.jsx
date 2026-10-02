import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import PwaBanners from "../pwa/PwaBanners.jsx";
import { UPDATE_READY_EVENT } from "../pwa/registerServiceWorker.js";

const renderBanners = (props = {}) => render(<PwaBanners {...props} />);

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
