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
