// pushNotifications.js — client-side opt-in flow for web push reminders.
// Pairs with public/sw.js's 'push'/'notificationclick' handlers and the
// send-push edge function (supabase/functions/send-push).
import { supabase } from "./supabase.js";

// Public key only -- safe to ship in the client bundle (that's the whole
// point of VAPID: the private half stays server-side as a Supabase secret
// and is never sent to the browser). Override via VITE_VAPID_PUBLIC_KEY if
// the deployed project's keys are ever rotated.
const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  "BEZ1IRBY1yJnLVz-eooDoc0QsBgHJDWDz5L6viG32cnV1HxYXTR7gS4Wc8DxYokORSF_WQlwQq7VnNckS40z6z8";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function pushPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

// Must be called from a user gesture (button click) -- browsers ignore or
// auto-reject a Notification.requestPermission() that isn't.
export async function subscribeToPush(userId) {
  if (!pushSupported() || !userId) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: permission };

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) { console.warn("[push] failed to save subscription", error); return { ok: false, reason: "save_failed" }; }
  return { ok: true };
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
