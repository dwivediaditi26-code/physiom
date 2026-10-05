// Helpers for patient.data.tx_sessions (newest first). An entry with no `status`
// is a session saved before drafts existed, so it counts as completed.
export const isDraftSession = (s) => s?.status === "draft";
export const completedSessions = (arr) => (Array.isArray(arr) ? arr : []).filter((s) => !isDraftSession(s));
export const findDraftSession = (arr) => (Array.isArray(arr) ? arr : []).find(isDraftSession) || null;
// Session number is never typed in: it is the number of completed sessions + 1.
export const nextSessionNo = (arr) => completedSessions(arr).length + 1;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// "4 October 2026" from an ISO timestamp, falling back to the stored dd/mm/yyyy text.
export function longDate(iso, fallback = "") {
  const d = iso ? new Date(iso) : null;
  if (d && !isNaN(d)) return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return fallback;
}
export function shortDate(iso, fallback = "") {
  const d = iso ? new Date(iso) : null;
  if (d && !isNaN(d)) return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  return fallback;
}

// Real Date of a session: its ISO timestamp, else the dd/mm/yyyy text older entries only have.
export function sessionDate(s) {
  const iso = s?.completedAt || s?.savedAt;
  if (iso) { const d = new Date(iso); if (!isNaN(d)) return d; }
  const m = String(s?.date || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
}

// ── Care plan sessions ───────────────────────────────────────────────────────
// Neuro, Ortho and Cardio patients keep their sessions INSIDE the care plan
// (seeded from its treatment list, with goal measures feeding Progress). Patients
// without a care plan use tx_sessions. These helpers pick the right store.
const hasKeys = (o) => o && typeof o === "object" && Object.keys(o).length > 0;
export function carePlanOf(d) {
  d = d || {};
  if (hasKeys(d.neuro)) return { kind: "neuro", plan: d.neuro.neuroCarePlan || {} };
  if (d.ortho_ipd_assessment || d.ortho_postop_assessment || d.ortho_outpatient_assessment) return { kind: "ortho", plan: d.ortho_care_plan || {} };
  if (hasKeys(d.cardio)) return { kind: "cardio", plan: d.cardio.cardioCarePlan || {} };
  // No specialty recorded yet: sessions still live in a care plan (the general one), so every
  // patient gets the same session screen and one history.
  return { kind: "ortho", plan: d.ortho_care_plan || {}, implicit: true };
}
// Care plan session dates are "YYYY-MM-DD".
export function carePlanSessionDate(s) {
  const iso = s?.completedAt || s?.savedAt;
  if (iso) { const d = new Date(iso); if (!isNaN(d)) return d; }
  const m = String(s?.date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
// One normalised view of a patient's sessions for the Treatment page.
export function patientSessionView(patient) {
  const d = patient?.data || {};
  const cp = carePlanOf(d);
  if (cp) {
    const all = Array.isArray(cp.plan.sessions) ? cp.plan.sessions : [];
    const done = all.filter((s) => !isDraftSession(s)).sort((a, b) => (b.no || 0) - (a.no || 0));
    return { source: "careplan", all, done, draft: all.find(isDraftSession) || null,
      dateOf: carePlanSessionDate, noOf: (s) => s.no, painOf: (s) => [s.painBefore, s.painAfter] };
  }
  const all = Array.isArray(d.tx_sessions) ? d.tx_sessions : [];
  return { source: "tx", all, done: completedSessions(all), draft: findDraftSession(all),
    dateOf: sessionDate, noOf: (s) => s.sessionNo, painOf: (s) => [s.vasStart, s.vasEnd] };
}

// One-shot signal from the Treatment page: "open the Sessions tab straight into a new
// session". Read once when the care plan's Sessions screen mounts (valid for a few seconds
// so a double mount in dev still sees it).
let _launchAt = 0;
export const requestSessionLaunch = () => { _launchAt = Date.now(); };
export const sessionLaunchPending = () => Date.now() - _launchAt < 3000;
export const clearSessionLaunch = () => { _launchAt = 0; };

// ── Deleting sessions ────────────────────────────────────────────────────────
// Returns the patient-data patch (for saveProfileField) with one session -- or all of them --
// removed from the patient's care plan. Remaining completed sessions are renumbered 1..n so the next
// session number (completed + 1) never collides; a draft that is left becomes n + 1.
export function sessionsRemovedPatch(data, sessionId /* null = all */) {
  const d = data || {};
  const cp = carePlanOf(d);
  if (!cp) return null;
  const all = Array.isArray(cp.plan.sessions) ? cp.plan.sessions : [];
  const kept = sessionId == null ? [] : all.filter((s) => s.id !== sessionId);
  const done = kept.filter((s) => !isDraftSession(s)).sort((a, b) => (a.no || 0) - (b.no || 0)).map((s, i) => ({ ...s, no: i + 1 }));
  const drafts = kept.filter(isDraftSession).map((s) => ({ ...s, no: done.length + 1 }));
  const sessions = [...done, ...drafts];
  const plan = { ...cp.plan, sessions };
  if (cp.kind === "neuro") return { neuro: { ...d.neuro, neuroCarePlan: plan } };
  if (cp.kind === "cardio") return { cardio: { ...d.cardio, cardioCarePlan: plan } };
  return { ortho_care_plan: plan };
}
