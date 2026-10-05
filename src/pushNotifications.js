// pushNotifications.js — client-side opt-in flow for web push reminders.
// Pairs with public/sw.js's 'push'/'notificationclick' handlers and the
// send-push edge function (supabase/functions/send-push).
import { supabase } from "./supabase.js";

// Public key only -- safe to ship in the client bundle (that's the whole
// point of VAPID: the private half stays server-side as a Supabase secret
// and is never sent to the browser). Override via VITE_VAPID_PUBLIC_KEY if
// the deployed project's keys are ever rotated.
// Rotated 2026-10-02 -- the previous key's matching private half was never
// actually set as a Supabase secret (confirmed via send-push's own logs:
// "No key set vapidDetails.publicKey"), so no push had ever really sent;
// this pairs with the fresh key pair set on send-push's VAPID_PUBLIC_KEY/
// VAPID_PRIVATE_KEY secrets. The 2 already-subscribed devices are tied to
// the old, never-working key and will need to re-enable notifications once.
const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  "BC03CRbyoaVuiw6xAlPjxoiEXW4hX6IDWpK1u3n9H5T6X67ICRduRfp55wCynYoI_P0KdnJp46i8n-UhazMtD_Y";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

// iPhone/iPad only allow web notifications once the app is added to the Home
// Screen and opened from there; in a normal Safari tab the push API does not
// exist at all.
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.navigator.standalone === true || (window.matchMedia?.("(display-mode: standalone)").matches ?? false);
}
export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function pushPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

// True when this device's existing push registration was made with the
// current public key. A registration made with an older key looks "on" (the
// browser still has it) but the server can no longer send to it.
function usesCurrentKey(subscription) {
  const have = subscription?.options?.applicationServerKey;
  if (!have) return true; // this browser doesn't say which key was used -- leave it alone
  const a = new Uint8Array(have);
  const b = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Gets a working registration for this device: reuses the existing one only
// if it uses the current key, otherwise drops it (and its saved row) and
// registers again, then saves it for this user.
async function registerDevice(userId) {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !usesCurrentKey(subscription)) {
    const oldEndpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => {});
    try { await supabase.from("push_subscriptions").delete().eq("endpoint", oldEndpoint); } catch {}
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  // Delete then insert, not upsert: the table lets you insert, read and
  // delete your own rows but has no UPDATE rule, so an upsert onto a row that
  // already exists (turning notifications on again, or the repair above) was
  // refused and the device silently stayed unregistered.
  try { await supabase.from("push_subscriptions").delete().eq("endpoint", json.endpoint); } catch { /* not ours or not there -- the insert below decides */ }
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });
  if (error) { console.warn("[push] failed to save subscription", error); return { ok: false, reason: "save_failed" }; }
  return { ok: true };
}

// Must be called from a user gesture (button click) -- browsers ignore or
// auto-reject a Notification.requestPermission() that isn't.
export async function subscribeToPush(userId) {
  if (!pushSupported() || !userId) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: permission };

  return registerDevice(userId);
}

// Runs on app start for a signed-in user who already allowed notifications.
// Fixes a device whose registration predates the 2026-10-02 key change: it
// shows as "on" but never receives anything. Does nothing if this device has
// no registration (the person turned notifications off) -- it never turns
// them back on by itself.
export async function ensurePushSubscription(userId) {
  if (!pushSupported() || !userId || pushPermission() !== "granted") return { ok: false, reason: "not_enabled" };
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return { ok: false, reason: "not_enabled" };
  return registerDevice(userId);
}

// Called on sign-out / "turn off reminders" -- removes both the browser's
// own subscription and the row so a stale device never gets pushed to
// after the student no longer wants it.
export async function unsubscribeFromPush(userId) {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});
  if (userId) {
    try { await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint); } catch {}
  }
}

export async function isSubscribedToPush() {
  if (!pushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}
