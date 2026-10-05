import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../supabase.js", () => ({
  supabase: { from: vi.fn(() => ({ insert: () => Promise.resolve({ error: null }), delete: () => ({ eq: () => Promise.resolve({ error: null }) }) })) },
  authHeader: vi.fn(() => Promise.resolve({ Authorization: "Bearer t" })),
}));
import NotificationsSettingsCard from "../NotificationsSettingsCard.jsx";

const user = { id: "u1" };
function setSupported(on, { subscribed = false } = {}) {
  if (on) {
    Object.defineProperty(window, "PushManager", { value: function () {}, configurable: true });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: () => Promise.resolve(subscribed ? { endpoint: "e" } : null) } }) } });
    Object.defineProperty(window, "Notification", { value: { permission: "granted" }, configurable: true });
  } else {
    delete window.PushManager;
  }
}

beforeEach(() => { vi.restoreAllMocks(); });

describe("Settings > Notifications", () => {
  it("explains Add to Home Screen on an iPhone browser tab instead of just 'not supported'", () => {
    setSupported(false);
    Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1", configurable: true });
    render(<NotificationsSettingsCard currentUser={user} isGuest={false} />);
    expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
    expect(screen.queryByText("Not supported in this browser.")).toBeNull();
  });

  it("the test button reports success in plain words", async () => {
    setSupported(true, { subscribed: true });
    globalThis.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ ok: true, message: "Sent to 1 of your device. It should pop up now, even with the screen locked." }) }));
    render(<NotificationsSettingsCard currentUser={user} isGuest={false} />);
    fireEvent.click(await screen.findByText("Send me a test notification"));
    expect(await screen.findByText(/pop up now/)).toBeTruthy();
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain("/api/pushTest");
  });

  it("the test button shows what is wrong when it fails", async () => {
    setSupported(true, { subscribed: true });
    globalThis.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ ok: false, stage: "function_rejected", message: "The notification service refused the server's key." }) }));
    render(<NotificationsSettingsCard currentUser={user} isGuest={false} />);
    fireEvent.click(await screen.findByText("Send me a test notification"));
    await waitFor(() => expect(screen.getByText(/refused the server's key/)).toBeTruthy());
  });

  it("no test button when notifications are off", async () => {
    setSupported(true, { subscribed: false });
    render(<NotificationsSettingsCard currentUser={user} isGuest={false} />);
    await screen.findByText("Enable notifications");
    expect(screen.queryByText("Send me a test notification")).toBeNull();
  });
});
