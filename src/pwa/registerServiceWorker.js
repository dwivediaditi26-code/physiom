// registerServiceWorker.js — registers /sw.js for the installed-web-app
// experience (offline shell, push alerts) and tells the UI when a newer
// version of the app has been deployed.
//
// Why the second part matters: sw.js activates a new version immediately
// (skipWaiting + clients.claim), but a page that is ALREADY OPEN keeps
// running the old JavaScript until it is reloaded. A phone user who keeps
// the installed app open in the background could stay on an old version for
// days. When a new worker takes over, this fires "pm:update-ready" so
// PwaBanners.jsx can offer a one-tap refresh.
//
// Skipped in development (it fights Vite's own module requests) and inside
// the Android/iOS app, where the files ship inside the app.

export const UPDATE_READY_EVENT = "pm:update-ready";
const UPDATE_CHECK_EVERY_MS = 60 * 60 * 1000;

export function isNativeApp() {
  return !!(typeof window !== "undefined" && window.Capacitor
    && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator) || isNativeApp()) return;

  window.addEventListener("load", async () => {
    try {
      // A page with no controller yet is the very first visit: the worker
      // taking over then is the first install, not an update.
      const hadController = !!navigator.serviceWorker.controller;
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("[SW] registered:", registration.scope);

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadController) window.dispatchEvent(new Event(UPDATE_READY_EVENT));
      });

      // Look for a newer version when the app comes back to the foreground
      // and once an hour while it stays open.
      const check = () => registration.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
      setInterval(check, UPDATE_CHECK_EVERY_MS);
    } catch (e) {
      console.warn("[SW] registration failed:", e);
    }
  });
}
