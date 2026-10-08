import { describe, it, expect, vi, beforeEach } from "vitest";

// A phone that turned notifications on before the 2026-10-02 key change holds
// a registration the server can't use. ensurePushSubscription() replaces it.
const insert = vi.fn(() => Promise.resolve({ error: null }));
const del = vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
vi.mock("../supabase.js", () => ({
  supabase: { from: vi.fn(() => ({ insert, delete: del })) },
}));
import { ensurePushSubscription, subscribeToPush } from "../pushNotifications.js";

// Same key the app ships (pushNotifications.js), decoded the same way.
const KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BC03CRbyoaVuiw6xAlPjxoiEXW4hX6IDWpK1u3n9H5T6X67ICRduRfp55wCynYoI_P0KdnJp46i8n-UhazMtD_Y";
const currentKeyBytes = () => {
  const b64 = (KEY + "=".repeat((4 - (KEY.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

let existing; let subscribeCalls; let unsubscribed;
function fakeSubscription(endpoint, keyBytes) {
  return {
    endpoint,
    options: keyBytes ? { applicationServerKey: keyBytes.buffer } : {},
    unsubscribe: vi.fn(() => { unsubscribed.push(endpoint); return Promise.resolve(true); }),
    toJSON: () => ({ endpoint, keys: { p256dh: "p", auth: "a" } }),
  };
}
beforeEach(() => {
  insert.mockClear(); del.mockClear();
  subscribeCalls = []; unsubscribed = []; existing = null;
  Object.defineProperty(window, "PushManager", { value: function () {}, configurable: true });
  Object.defineProperty(window, "Notification", { value: { permission: "granted", requestPermission: vi.fn(() => Promise.resolve("granted")) }, configurable: true });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: {
      getSubscription: () => Promise.resolve(existing),
      subscribe: vi.fn(async (opts) => { subscribeCalls.push(opts); return fakeSubscription("https://push/new", new Uint8Array(opts.applicationServerKey)); }),
    } }) },
  });
});

describe("push registration repair", () => {
  it("replaces a registration made with an older key", async () => {
    existing = fakeSubscription("https://push/old", new Uint8Array([1, 2, 3, 4]));
    const r = await ensurePushSubscription("u1");
    expect(r.ok).toBe(true);
    expect(unsubscribed).toEqual(["https://push/old"]);
    expect(subscribeCalls).toHaveLength(1);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "u1", endpoint: "https://push/new" }));
  });

  it("keeps a registration that already uses the current key", async () => {
    existing = fakeSubscription("https://push/ok", currentKeyBytes());
    const r = await ensurePushSubscription("u1");
    expect(r.ok).toBe(true);
    expect(unsubscribed).toEqual([]);
    expect(subscribeCalls).toHaveLength(0);
  });

  it("never turns notifications back on for someone who turned them off", async () => {
    existing = null;
    const r = await ensurePushSubscription("u1");
    expect(r).toMatchObject({ ok: false, reason: "not_enabled" });
    expect(subscribeCalls).toHaveLength(0);
  });

  it("does nothing when notifications are not allowed", async () => {
    window.Notification.permission = "default";
    existing = fakeSubscription("https://push/old", new Uint8Array([1, 2, 3, 4]));
    expect(await ensurePushSubscription("u1")).toMatchObject({ ok: false });
    expect(unsubscribed).toEqual([]);
  });

  it("turning notifications on from Settings also fixes an old registration", async () => {
    existing = fakeSubscription("https://push/old", new Uint8Array([9, 9, 9]));
    const r = await subscribeToPush("u1");
    expect(r.ok).toBe(true);
    expect(unsubscribed).toEqual(["https://push/old"]);
  });
});
