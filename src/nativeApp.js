// nativeApp.js — Capacitor native-shell wiring, no-ops in a plain browser.
//
// Three things App Store / Play Store review explicitly test for on a
// wrapped web app (see the App Store approval checklist, 2026-09):
//   1. Android hardware back button must navigate the app, not exit it.
//      AppFull.jsx already drives all its screen navigation through
//      window.history.pushState + a popstate listener (its own in-header
//      "← Back" button calls window.history.back()) -- so the fix is just
//      making the native back button call the same thing Capacitor's
//      `canGoBack` reports, and only exit the app once there's nowhere
//      left to go back to.
//   2. The status bar must not overlay the webview, or every fixed
//      header/nav needs manual safe-area math to avoid sitting under the
//      notch/Dynamic Island/status bar.
//   3. All of this must be skipped entirely on the web build (Vercel) --
//      @capacitor/core's isNativePlatform() is false there, and importing
//      the native plugins on web is harmless (they resolve to web stubs)
//      but the App.addListener/StatusBar calls would still be dead weight,
//      so short-circuit before touching them.
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

// AppFull.jsx registers its real goBack() here once it mounts (see
// setGoBackHandler below) -- this module loads and wires up the hardware
// back button in main.jsx, well before that happens, and a raw
// window.history.back() pops the WHOLE current screen's history entry in
// one jump, same as the in-header "← Back" button used to before it started
// deferring to PhysioFeed's/each assessment wizard's own local, one-step-at-
// a-time back bridge (2026-09-25, Aditi: "push the back button...it takes
// to direct home page...it should take us to previous page"). Routing the
// hardware button through the SAME goBack() the header uses means both
// always agree, instead of the hardware button alone keeping the old,
// coarser behavior. Falls back to plain history.back() for the brief window
// before AppFull has mounted and registered its own.
let goBackHandler = () => window.history.back();
export function setGoBackHandler(fn) { goBackHandler = fn; }

export function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return;

  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      goBackHandler();
    } else {
      CapacitorApp.exitApp();
    }
  });

  // overlaysWebView(false) means the webview starts below the status bar
  // instead of under it -- so .pm-header/.pm-bnav don't need their own
  // safe-area padding to avoid the notch (that CSS stays too, as a
  // harmless belt-and-braces fallback for devices/OS versions where this
  // call is unavailable).
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
}
