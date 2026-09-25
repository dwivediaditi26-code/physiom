// apiUrl.js — where our own /api/* serverless functions live.
//
// On the website, a plain "/api/parse" resolves against the page's own
// origin (the Vercel deployment), so the bare path is right. Inside the
// Capacitor app the page is served from https://localhost (Android) or
// capacitor://localhost (iOS), where "/api/parse" points at nothing -- every
// AI intake, AI chat, evidence search and account deletion call failed in
// the native app. There, prefix the live site's origin instead. Every
// api/*.js already answers CORS preflights with Access-Control-Allow-Origin
// "*" and allows the Authorization header, so no server change is needed.
import { Capacitor } from "@capacitor/core";

const LIVE_SITE_ORIGIN = "https://physiom-sbs4.vercel.app";

// Origin a link or redirect should point at: this page's own origin on the
// web, the live site inside the native app (https://localhost means nothing
// outside the app -- e.g. in a password-reset email).
export function siteOrigin() {
  return Capacitor.isNativePlatform() ? LIVE_SITE_ORIGIN : window.location.origin;
}

// apiUrl("/api/parse") -> "/api/parse" on the web,
// "https://physiom-sbs4.vercel.app/api/parse" in the native app.
export function apiUrl(path) {
  return Capacitor.isNativePlatform() ? LIVE_SITE_ORIGIN + path : path;
}
