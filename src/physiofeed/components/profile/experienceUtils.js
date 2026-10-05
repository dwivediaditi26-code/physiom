// Shared parsing for Experience entries (rotations table's `department`/
// `duration` text columns, repurposed as "<Title> — <Organization>" /
// "<Start> – <End or Present>" -- see mockData.js's ROTATIONS comment for
// why this reuses those two columns instead of a schema migration).
// ProfileHeader.jsx and ProfileAboutSection.jsx both need "current
// workplace"; RotationsCard.jsx needs the full parsed shape to render a
// proper Experience card -- one parser so all three agree on what counts
// as "current" and how a legacy/undelimited entry degrades.
export function parseExperienceEntry(entry) {
  const [titlePart, orgPart] = stripCurrentRoleMark(entry.department || "").split(" — ");
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
  const standalone = getCurrentRoleEntry(entries);
  if (standalone) return parseExperienceEntry(standalone).organization || null;
  const list = getExperienceEntries(entries);
  if (!list.length) return null;
  const current = list.find((e) => /present/i.test(e.duration || "")) || list[list.length - 1];
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

// ── Current Role is its own thing, separate from the Experience timeline ─────
// It is stored in the same rotations table (no schema change) but its `department` text carries
// this prefix, so Experience never lists it and editing one never touches the other.
export const CURRENT_ROLE_MARK = "@current|";
export const isCurrentRoleEntry = (e) => String(e?.department || "").startsWith(CURRENT_ROLE_MARK);
export const stripCurrentRoleMark = (department) => String(department || "").replace(CURRENT_ROLE_MARK, "");
export const getCurrentRoleEntry = (entries) => (entries || []).find(isCurrentRoleEntry) || null;
export const getExperienceEntries = (entries) => (entries || []).filter((e) => !isCurrentRoleEntry(e));
