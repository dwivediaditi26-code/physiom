// Admin-only aggregate stats for the whole PhysioMind app (clinical +
// PhysioFeed). Uses the SERVICE ROLE key deliberately -- `patients` and
// `applications` are RLS-scoped to "your own rows" (see
// supabase/supabase_rls_setup.sql and add_mvp_network_opportunities.sql),
// so a plain client-side query as the admin would silently undercount
// everyone else's data. This bypasses that safely, server-side only, after
// verifying the caller is a real admin -- never trusts a client-supplied
// "I'm an admin" flag (see AdminAnalyticsPage.jsx's client gate, which is
// UX-only, same as AdminReportsPage.jsx's).
import { createClient } from '@supabase/supabase-js';
import { resolveRange, distinctUsersSince, buildInsights, buildUserDailyActivity, buildCumulativeSeries, computeProfileCompleteness, buildPageStats, buildAssessmentStats, buildSpeedStats } from './_lib/analyticsMath.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// PostgREST returns at most 1000 rows per request, so a single query silently
// drops everything past the 1000th event -- fine for a handful of users, wrong
// at hundreds. Newest events first; first page alone when it isn't full (the
// common small case), otherwise the rest in parallel, up to MAX_EVENT_PAGES.
// `truncated` tells the dashboard it is looking at the newest N events, not
// all of them (the long-term fix is SQL-side rollups, not bigger fetches).
const EVENT_PAGE_SIZE = 1000;
const MAX_EVENT_PAGES = 10;
async function fetchEvents(admin, columns, from, to) {
  const page = (i) => admin.from('analytics_events').select(columns)
    .gte('created_at', from).lt('created_at', to)
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(i * EVENT_PAGE_SIZE, (i + 1) * EVENT_PAGE_SIZE - 1);
  const first = await page(0);
  if (first.error) return { data: null, error: first.error, truncated: false };
  if ((first.data || []).length < EVENT_PAGE_SIZE) return { data: first.data || [], error: null, truncated: false };
  const rest = await Promise.all(Array.from({ length: MAX_EVENT_PAGES - 1 }, (_, i) => page(i + 1)));
  const failed = rest.find((r) => r.error);
  if (failed) return { data: null, error: failed.error, truncated: false };
  const data = [...first.data, ...rest.flatMap((r) => r.data || [])];
  return { data, error: null, truncated: data.length >= MAX_EVENT_PAGES * EVENT_PAGE_SIZE };
}

let adminClient = null;
function getAdminClient() {
  if (!SERVICE_ROLE_KEY) return null;
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return adminClient;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = getAdminClient();
  if (!admin) {
    console.error('analyticsSummary: SUPABASE_SERVICE_ROLE_KEY not set on this deployment');
    return res.status(500).json({ error: 'Server misconfigured.' });
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Sign in required.' });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Your session has expired -- please sign in again.' });

  const { data: profile, error: profileErr } = await admin.from('profiles').select('is_admin').eq('id', userData.user.id).maybeSingle();
  if (profileErr || !profile?.is_admin) return res.status(403).json({ error: 'Admin access required.' });

  // `range` accepts: "today" | "yesterday" | "this_month" | "previous_month"
  // | "custom" (with from/to) | a plain number of days (7/30/90/...).
  const range = req.query?.range || req.query?.days || '30';
  const { since, until, prevSince, prevUntil } = resolveRange(range, { from: req.query?.from, to: req.query?.to });

  const [
    { count: totalUsers },
    { count: totalPatients },
    { count: totalPosts },
    { count: totalOpportunities },
    { count: totalApplications },
    { data: currentEvents, error: eventsErr, truncated: eventsTruncated },
    { data: previousEvents, error: prevErr },
    { data: patientRows, error: patientRowsErr },
    { data: profileRows, error: profileRowsErr },
    { data: postAuthorRows, error: postAuthorRowsErr },
    // Growth chart: how many of each existed before this range started
    // (the running total's starting point)...
    { count: usersBeforeRange },
    { count: patientsBeforeRange },
    { count: postsBeforeRange },
    // ...plus exactly when the ones inside this range were created, so the
    // running total can climb on the right day.
    { data: usersInRange, error: usersInRangeErr },
    { data: patientsInRange, error: patientsInRangeErr },
    { data: postsInRange, error: postsInRangeErr },
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('patients').select('id', { count: 'exact', head: true }),
    admin.from('posts').select('id', { count: 'exact', head: true }),
    admin.from('opportunities').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('applications').select('id', { count: 'exact', head: true }),
    fetchEvents(admin, 'event_name, user_id, entity_type, entity_id, properties, created_at', since, until),
    fetchEvents(admin, 'event_name, user_id, created_at', prevSince, prevUntil),
    // For the per-user "how many patients / how much time in the app" section
    // below -- patients is RLS-scoped to "your own rows" so, same reasoning
    // as totalPatients above, this has to go through the service role.
    admin.from('patients').select('user_id'),
    admin.from('profiles').select('id, name, bio, headline, clinical_title, college, experience, location, phone, skills, area_of_practice, resume_url'),
    // "post" = a regular feed post, "discussion" = a clinical case (same
    // split used for the case_created/post_created analytics events).
    admin.from('posts').select('author_id, post_type'),
    admin.from('profiles').select('id', { count: 'exact', head: true }).lt('created_at', since),
    admin.from('patients').select('id', { count: 'exact', head: true }).lt('created_at', since),
    admin.from('posts').select('id', { count: 'exact', head: true }).lt('created_at', since),
    admin.from('profiles').select('created_at').gte('created_at', since).lt('created_at', until),
    admin.from('patients').select('created_at').gte('created_at', since).lt('created_at', until),
    admin.from('posts').select('created_at').gte('created_at', since).lt('created_at', until),
  ]);
  if (eventsErr) return res.status(500).json({ error: eventsErr.message });
  if (prevErr) return res.status(500).json({ error: prevErr.message });
  if (patientRowsErr) return res.status(500).json({ error: patientRowsErr.message });
  if (profileRowsErr) return res.status(500).json({ error: profileRowsErr.message });
  if (postAuthorRowsErr) return res.status(500).json({ error: postAuthorRowsErr.message });
  if (usersInRangeErr) return res.status(500).json({ error: usersInRangeErr.message });
  if (patientsInRangeErr) return res.status(500).json({ error: patientsInRangeErr.message });
  if (postsInRangeErr) return res.status(500).json({ error: postsInRangeErr.message });

  const events = currentEvents || [];
  const prevEvents = previousEvents || [];
  const dayMs = 24 * 60 * 60 * 1000;

  const featureCounts = {};
  for (const e of events) {
    if (e.event_name === 'client_error' || e.event_name === 'app_loaded') continue; // shown separately, not mixed into "most-used features"
    featureCounts[e.event_name] = (featureCounts[e.event_name] || 0) + 1;
  }

  const patientCountByUser = {};
  for (const p of patientRows || []) {
    if (!p.user_id) continue;
    patientCountByUser[p.user_id] = (patientCountByUser[p.user_id] || 0) + 1;
  }
  const nameById = {};
  const completenessById = {};
  for (const p of profileRows || []) {
    nameById[p.id] = p.name;
    completenessById[p.id] = computeProfileCompleteness(p);
  }

  const postsCountByUser = {};
  const casesCountByUser = {};
  for (const row of postAuthorRows || []) {
    if (!row.author_id) continue;
    if (row.post_type === 'discussion') casesCountByUser[row.author_id] = (casesCountByUser[row.author_id] || 0) + 1;
    else postsCountByUser[row.author_id] = (postsCountByUser[row.author_id] || 0) + 1;
  }

  // Email lives on auth.users, not profiles -- only the service-role client
  // can read it, and only via the auth admin API (no direct table access).
  let emailById = {};
  try {
    const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of usersPage?.users || []) emailById[u.id] = u.email;
  } catch { /* non-fatal -- the table still renders without emails */ }

  // Client-side errors (React crashes + uncaught JS errors/rejections, see
  // src/analytics/errorReporter.js) -- who hit it and on which screen, so
  // this is the one thing on the dashboard worth checking first.
  const errors = events
    .filter((e) => e.event_name === 'client_error')
    .map((e) => ({
      userId: e.user_id,
      name: nameById[e.user_id] || 'Unknown',
      screen: e.entity_type === 'screen' ? e.entity_id : null,
      message: e.properties?.message || '',
      createdAt: e.created_at,
    }))
    .slice(0, 100);

  // Grouped by user, not by event -- every user with a profile OR at least
  // one patient shows up (with 0 patients / no days if that's the truth),
  // even if they haven't fired a single tracked event in this date range.
  // Basing this list on `events` instead (the earlier version of this code)
  // silently dropped anyone who hadn't logged in since event-tracking went
  // live, which looked like their patients had vanished.
  const daysByUser = new Map();
  for (const row of buildUserDailyActivity(events)) {
    if (!daysByUser.has(row.userId)) daysByUser.set(row.userId, []);
    daysByUser.get(row.userId).push({ date: row.date, loginTimes: row.loginTimes, activeMinutes: row.activeMinutes, eventCount: row.eventCount });
  }

  const allUserIds = new Set([
    ...(profileRows || []).map((p) => p.id),
    ...Object.keys(patientCountByUser),
    ...Object.keys(postsCountByUser),
    ...Object.keys(casesCountByUser),
  ]);
  const userActivity = Array.from(allUserIds)
    .map((userId) => ({
      userId,
      name: nameById[userId] || 'Unknown',
      email: emailById[userId] || '',
      totalPatients: patientCountByUser[userId] || 0,
      totalPosts: postsCountByUser[userId] || 0,
      totalClinicalCases: casesCountByUser[userId] || 0,
      profileCompletionPct: completenessById[userId] ?? 0,
      days: (daysByUser.get(userId) || []).sort((a, b) => (a.date < b.date ? 1 : -1)),
    }))
    .sort((a, b) => b.totalPatients - a.totalPatients);

  // Growth chart -- running totals over the selected range, not just
  // point-in-time snapshots, so an actual upward trend is visible instead of
  // two numbers you have to compare in your head.
  const growth = {
    users: buildCumulativeSeries((usersInRange || []).map((r) => r.created_at), usersBeforeRange ?? 0, since, until),
    patients: buildCumulativeSeries((patientsInRange || []).map((r) => r.created_at), patientsBeforeRange ?? 0, since, until),
    posts: buildCumulativeSeries((postsInRange || []).map((r) => r.created_at), postsBeforeRange ?? 0, since, until),
  };

  res.status(200).json({
    generatedAt: new Date().toISOString(),
    range: { key: range, since, until },
    state: {
      totalUsers: totalUsers ?? 0,
      totalPatients: totalPatients ?? 0,
      totalPosts: totalPosts ?? 0,
      totalOpportunities: totalOpportunities ?? 0,
      totalApplications: totalApplications ?? 0,
    },
    // Retention/cohort numbers deliberately omitted -- not enough historical
    // depth yet to compute honestly (event logging only just started). The
    // frontend shows "not enough data yet" rather than a fabricated number.
    trends: {
      dau: distinctUsersSince(events, dayMs),
      wau: distinctUsersSince(events, 7 * dayMs),
      mau: distinctUsersSince(events, 30 * dayMs),
      totalEventsInRange: events.length,
      featureCounts,
    },
    // "What should I do next" -- real period-over-period comparisons only,
    // grounded in the same event rows the rest of the page shows. Never a
    // fabricated explanation (see buildInsights' MIN_SAMPLE floor).
    insights: buildInsights(events, prevEvents),
    recentEvents: events.slice(0, 500),
    eventsTruncated: !!eventsTruncated,
    pageStats: buildPageStats(events),
    assessmentStats: buildAssessmentStats(events),
    speedStats: buildSpeedStats(events),
    userActivity,
    growth,
    errors,
  });
}
