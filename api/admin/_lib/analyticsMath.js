// Pure calculation helpers for the admin analytics endpoint, split out of
// analyticsSummary.js so the math itself is unit-testable (see
// src/__tests__/analyticsMath.test.js) without spinning up a fake HTTP
// request/response or a fake Supabase client -- these functions take plain
// arrays/numbers in, plain numbers/objects out.

const DAY_MS = 24 * 60 * 60 * 1000;

// Resolves a `range` query param into a concrete [since, until) window, plus
// the immediately-preceding window of equal length (for period-over-period
// comparison in buildInsights below). `now` is injectable for tests.
export function resolveRange(range, { from, to } = {}, now = new Date()) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

  let since, until;
  switch (range) {
    case 'today':
      since = startOfDay(now); until = endOfDay(now); break;
    case 'yesterday': {
      const y = new Date(now.getTime() - DAY_MS);
      since = startOfDay(y); until = endOfDay(y); break;
    }
    case 'this_month':
      since = new Date(now.getFullYear(), now.getMonth(), 1);
      until = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'previous_month':
      since = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      until = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'custom': {
      const f = from ? new Date(from) : new Date(now.getTime() - 30 * DAY_MS);
      const t = to ? new Date(to) : now;
      since = f; until = t;
      break;
    }
    default: {
      // Numeric "last N days" (7/30/90/...), the pre-existing behaviour.
      const days = Math.min(Math.max(parseInt(range, 10) || 30, 1), 365);
      since = new Date(now.getTime() - days * DAY_MS);
      until = now;
    }
  }

  const spanMs = Math.max(until.getTime() - since.getTime(), DAY_MS);
  const prevUntil = since;
  const prevSince = new Date(since.getTime() - spanMs);

  return {
    since: since.toISOString(),
    until: until.toISOString(),
    prevSince: prevSince.toISOString(),
    prevUntil: prevUntil.toISOString(),
  };
}

export function distinctUsersSince(events, windowMs, now = Date.now()) {
  return new Set(
    events.filter((e) => now - new Date(e.created_at).getTime() <= windowMs).map((e) => e.user_id)
  ).size;
}

export function countFeature(events, matcher) {
  return events.filter((e) => matcher(e.event_name)).length;
}

// Real, measured period-over-period comparisons only -- never a fabricated
// explanation. Below MIN_SAMPLE in EITHER period, the honest answer is "not
// enough data," not a % that swings wildly on 1-vs-2 events.
const MIN_SAMPLE = 5;

// Per-user, per-day activity: how many patients they own (a running total,
// not date-scoped) plus, for each day they did anything in the range, what
// time(s) they logged in and roughly how long they were active.
//
// There's no real session-start/session-end tracking anywhere in the app, so
// "time spent" is an estimate built from the gaps between whatever events
// they fired that day (login, patient saves, feed actions, Learn, etc.): a
// gap under SESSION_GAP_MS counts as still-active time, a longer gap doesn't
// (they likely closed the tab), and TAIL_MS is a small flat credit for the
// last action of the day (there's no "next" event to measure a gap against).
// This will undercount quiet reading time with no clicks -- said honestly in
// the UI, never presented as exact wall-clock time.
const SESSION_GAP_MS = 15 * 60 * 1000;
const TAIL_MS = 60 * 1000;

export function buildUserDailyActivity(events, { sessionGapMs = SESSION_GAP_MS, tailMs = TAIL_MS } = {}) {
  const byUserDay = new Map();
  for (const e of events) {
    if (!e.user_id || !e.created_at) continue;
    const date = e.created_at.slice(0, 10); // UTC calendar day, same convention as resolveRange
    const key = `${e.user_id}|${date}`;
    if (!byUserDay.has(key)) byUserDay.set(key, { userId: e.user_id, date, timestamps: [], logins: [] });
    const bucket = byUserDay.get(key);
    bucket.timestamps.push(new Date(e.created_at).getTime());
    if (e.event_name === 'user_logged_in') bucket.logins.push(e.created_at);
  }

  const rows = [];
  for (const bucket of byUserDay.values()) {
    const ts = bucket.timestamps.slice().sort((a, b) => a - b);
    let activeMs = 0;
    if (ts.length === 1) {
      activeMs = tailMs;
    } else if (ts.length > 1) {
      for (let i = 1; i < ts.length; i++) activeMs += Math.min(ts[i] - ts[i - 1], sessionGapMs);
      activeMs += tailMs;
    }
    rows.push({
      userId: bucket.userId,
      date: bucket.date,
      loginTimes: bucket.logins.slice().sort(),
      eventCount: ts.length,
      activeMinutes: Math.round(activeMs / 60000),
    });
  }
  return rows.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

export function buildInsights(currentEvents, previousEvents) {
  const metrics = [
    { label: 'Workshop registrations', match: (n) => n === 'workshop_registered' },
    { label: 'Job/internship applications', match: (n) => n === 'job_application_submitted' || n === 'internship_application_submitted' || n === 'opportunity_application_submitted' },
    { label: 'Clinical case activity', match: (n) => n === 'case_created' || n === 'case_commented' || n === 'case_replied' },
    { label: 'Feed posts', match: (n) => n === 'post_created' },
  ];

  return metrics.map(({ label, match }) => {
    const current = countFeature(currentEvents, match);
    const previous = countFeature(previousEvents, match);
    if (current < MIN_SAMPLE && previous < MIN_SAMPLE) {
      return { label, current, previous, changePct: null, text: `${label}: not enough data to identify a reliable trend.` };
    }
    if (previous === 0) {
      return { label, current, previous, changePct: null, text: `${label}: ${current} this period (no activity in the previous period to compare against).` };
    }
    const changePct = Math.round(((current - previous) / previous) * 100);
    const direction = changePct >= 0 ? 'increased' : 'decreased';
    return { label, current, previous, changePct, text: `${label} ${direction} ${Math.abs(changePct)}% compared with the previous period (${previous} → ${current}).` };
  });
}
