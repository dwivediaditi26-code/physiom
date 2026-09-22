// Shared parsing for Experience entries (rotations table's `department`/
// `duration` text columns, repurposed as "<Title> — <Organization>" /
// "<Start> – <End or Present>" -- see mockData.js's ROTATIONS comment for
// why this reuses those two columns instead of a schema migration).
// ProfileHeader.jsx and ProfileAboutSection.jsx both need "current
// workplace"; RotationsCard.jsx needs the full parsed shape to render a
// proper Experience card -- one parser so all three agree on what counts
// as "current" and how a legacy/undelimited entry degrades.
export function parseExperienceEntry(entry) {
  const [titlePart, orgPart] = (entry.department || "").split(" — ");
  const title = orgPart ? titlePart.trim() : "";
  const organization = orgPart ? orgPart.trim() : (entry.department || "").trim();
  const isCurrent = /present/i.test(entry.duration || "");
  return { title, organization, dateRange: entry.duration || "", isCurrent };
}

// The most recent-looking entry: whichever one says "Present", or else the
// last in the list (rotations are stored oldest-first, see db.js's
// getRotations() `.order("created_at", { ascending: true })`).
export function getCurrentWorkplace(entries) {
  if (!entries?.length) return null;
  const current = entries.find((e) => /present/i.test(e.duration || "")) || entries[entries.length - 1];
  const { organization } = parseExperienceEntry(current);
  return organization || null;
}

// The write side of the same convention -- EditRotationsModal.jsx edits
// Title/Organization and Start/End as four separate fields (friendlier
// than one delimited string) and combines them back into department/
// duration here before saving, so parseExperienceEntry() above stays the
// one place that understands the "—"/"–" delimiters either direction.
export function splitDateRange(duration) {
  const [start, end] = (duration || "").split(" – ");
  return { start: (start || "").trim(), end: end !== undefined ? end.trim() : "" };
}

export function formatExperienceEntry({ title, organization, start, end }) {
  const t = (title || "").trim();
  const o = (organization || "").trim();
  const department = t && o ? `${t} — ${o}` : o || t;
  const s = (start || "").trim();
  const e = (end || "").trim();
  const duration = s && e ? `${s} – ${e}` : s || e;
  return { department, duration };
}
