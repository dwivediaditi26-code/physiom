// Where a tapped push notification should land. The notifications carry PhysioFeed's own paths
// (/news, /messages?with=<id>, /explore?view=postings, /profile/<id> ...). PhysioFeed lives inside the
// app and has no page of its own on the server, so Vercel serves index.html for these paths
// (see vercel.json) and the app opens the matching PhysioFeed screen on start.
const PATHS = /^\/(?:news|messages|people|explore|notifications|evidence|saved|profile\/[^/]+|post\/[^/]+)\/?$/;

// "/messages?with=abc" for a notification path, or null for anything else (including "/").
export function pushLinkTarget(pathname, search = "") {
  if (typeof pathname !== "string" || !PATHS.test(pathname)) return null;
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return clean + (typeof search === "string" && search.startsWith("?") ? search : "");
}
