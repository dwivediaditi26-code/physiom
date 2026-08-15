// api/_lib/rateLimit.js
//
// Shared auth + rate-limit gate for our Groq-calling endpoints. Before this,
// api/parse.js (and every other api/*.js file -- api/chat.js,
// api/extract{Cervical,Lumbar,Thoracic}NoteVariables.js -- checked, none of
// them have this either) had NO auth check and Access-Control-Allow-Origin:
// '*', meaning literally anyone who found the URL could call it directly
// and spend real Groq tokens with no login, no limit, nothing stopping them.
//
// Three things enforced here:
//   1. Auth -- reject any request without a valid Supabase session. This
//      alone stops anonymous/internet-wide abuse.
//   2. Short-window rate limits -- even a real logged-in student can
//      accidentally (a retry loop, a double-submit) or deliberately hammer
//      the endpoint. Two limits, both against the real Groq constraint
//      discovered via e2e/ai-accuracy.spec.ts (this org's openai/gpt-oss-120b
//      key is capped at 8000 TPM on the free/on_demand tier -- confirmed
//      from an actual failed run, not assumed):
//        - GLOBAL_LIMIT_PER_MINUTE: caps total calls across ALL users in
//          any rolling 60s window, tuned to the actual TPM ceiling rather
//          than a guess. This is the one that actually protects the shared
//          Groq budget -- raise it once the Groq account is on a paid tier
//          with real TPM headroom (see e2e/ai-accuracy.spec.ts's comments
//          for the token-cost math).
//        - USER_LIMIT_PER_HOUR: stops one account (compromised, buggy
//          client, deliberate abuse) from starving every other student even
//          if the global limit alone would technically allow it.
//   3. Daily per-feature caps (DAILY_LIMITS below) -- closes the real gap
//      that USER_LIMIT_PER_HOUR alone leaves: 40/hour sustained across 24h
//      is 960 calls/day on a single account, which at real Groq cost
//      (~₹0.10-0.175/parse call) is a genuine platform-cost exposure, not
//      just a fairness one. Scoped per feature category (parser vs. note
//      analysis) rather than one number across all endpoints, since the two
//      features have very different real usage patterns (parser is the
//      high-frequency one, note analysis is a manual "Run Analysis" click).
//      Chat intentionally excluded -- not shipping (see api/chat.js status).
//
// Both counters live in a Supabase table (api_calls -- see
// supabase/api_rate_limit_setup.sql) read/written via the SERVICE ROLE key,
// which bypasses RLS -- this table has no client-facing policies at all
// (nothing in the browser ever touches it directly).
//
// Fails CLOSED on missing/invalid auth (no token = no access, correctly --
// that's the entire point) but fails OPEN on a rate-limit *counting* error
// (a transient Supabase hiccup on the counter table shouldn't block a real
// student from an otherwise-legitimate request -- logged, not silently
// swallowed).

import { createClient } from '@supabase/supabase-js';

// The URL is not secret (same value src/supabase.js already hardcodes as
// its own fallback), so hardcode it here too -- this removes one of the two
// ways getAdminClient() could silently return null, isolating "missing" to
// the one value that actually has to be configured as a secret.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GLOBAL_LIMIT_PER_MINUTE = 6; // conservative under the confirmed 8000 TPM free-tier ceiling; raise after a Groq tier upgrade
// Raised from 20 -> 40 after the first real ai-accuracy.yml full-suite run
// (2026-08-10): 20/20 (100%) scored correctly, but the remaining 11 of 31
// cases got a correct 429 from THIS limit -- the QA account making 31 calls
// in ~34min from a single account isn't realistic student behaviour, but it
// still meant we never got a complete baseline in one pass. 40/hour is still
// a small fraction of the real budget the GLOBAL_LIMIT_PER_MINUTE cap allows
// (6/min sustained = 360/hour theoretical ceiling across all users), so this
// doesn't meaningfully weaken the "one account can't hog it" guarantee --
// it just stops it from being the thing that blocks our own test coverage.
const USER_LIMIT_PER_HOUR = 40;

// Per-feature daily caps, keyed by a feature name (not the raw endpoint
// string) so the three note-analysis endpoints share one combined budget --
// a student doing 4 lumbar + 4 cervical + 2 thoracic analyses in a day has
// used the same "note analysis" feature 10 times, not three separate
// features 4/4/2 times. `endpoints` lists every api_calls.endpoint value
// that counts toward that feature's daily total.
// ALL daily per-feature caps intentionally removed (2026-08-15), same day
// they were added -- the parser's 5/day cap was hit mid-test-run by the QA
// account running window.physioAITest (5 real cases succeeded, the rest
// 429'd), not a parser bug, and the decision was made to pull all three
// (parser/noteAnalysis/chat) rather than leave a partial cap in place.
// Known, deliberate tradeoff: every endpoint is back to being protected
// ONLY by the pre-existing GLOBAL_LIMIT_PER_MINUTE (6/min, shared across
// all users) and USER_LIMIT_PER_HOUR (40/hour/user) below -- no per-day
// ceiling on any account. At today's real per-call costs (parser
// ~Rs.0.175, note-analysis ~Rs.0.09-0.12, chat ~Rs.0.35-0.47), a single
// account sustaining 40/hour for 24h is a real cost exposure again
// (~Rs.336-450/day on chat alone, worst case). Re-add entries to
// DAILY_LIMITS below (parser/noteAnalysis/chat, as they were) before any
// of this goes in front of real students -- not just before the next test
// run.
const DAILY_LIMITS = {};

// Reverse lookup: endpoint string -> { featureKey, limit, endpoints }.
// Empty for every endpoint right now (see note above) -- everything falls
// through to only the GLOBAL_LIMIT_PER_MINUTE / USER_LIMIT_PER_HOUR checks.
const ENDPOINT_TO_DAILY_LIMIT = Object.fromEntries(
  Object.entries(DAILY_LIMITS).flatMap(([featureKey, cfg]) =>
    cfg.endpoints.map((ep) => [ep, { featureKey, limit: cfg.limit, endpoints: cfg.endpoints }])
  )
);

let adminClient = null;
function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

// Call at the top of a handler, after CORS/method checks. Returns the
// authenticated user's id on success. On failure it has ALREADY written the
// response (401/429/500) -- the caller just needs to `return` immediately
// when this returns null.
export async function authenticateAndRateLimit(req, res, endpoint) {
  const admin = getAdminClient();
  if (!admin) {
    // SUPABASE_URL now always has a hardcoded fallback (see above), so if
    // getAdminClient() still returned null, SERVICE_ROLE_KEY is the one
    // that's actually missing -- log/report that specifically instead of
    // the ambiguous "one of these two" message this used to give.
    console.error(`rateLimit: SUPABASE_SERVICE_ROLE_KEY env var is not set on this deployment -- endpoint "${endpoint}" cannot authenticate requests`);
    res.status(500).json({ error: 'Server misconfigured (missing service role key). This endpoint cannot authenticate requests right now.' });
    return null;
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ error: 'Sign in required.' });
    return null;
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Your session has expired -- please sign in again.' });
    return null;
  }
  const userId = userData.user.id;

  const nowMs = Date.now();
  const oneMinuteAgo = new Date(nowMs - 60_000).toISOString();
  const oneHourAgo = new Date(nowMs - 60 * 60_000).toISOString();
  const oneDayAgo = new Date(nowMs - 24 * 60 * 60_000).toISOString();

  const dailyCfg = ENDPOINT_TO_DAILY_LIMIT[endpoint] || null;

  try {
    const queries = [
      admin.from('api_calls').select('id', { count: 'exact', head: true }).eq('endpoint', endpoint).gte('called_at', oneMinuteAgo),
      admin.from('api_calls').select('id', { count: 'exact', head: true }).eq('endpoint', endpoint).eq('user_id', userId).gte('called_at', oneHourAgo),
    ];
    if (dailyCfg) {
      queries.push(
        admin.from('api_calls').select('id', { count: 'exact', head: true }).in('endpoint', dailyCfg.endpoints).eq('user_id', userId).gte('called_at', oneDayAgo)
      );
    }
    const [globalRes, userRes, dailyRes] = await Promise.all(queries);

    if (globalRes.error || userRes.error || (dailyCfg && dailyRes.error)) {
      console.error('rateLimit: count query failed, failing OPEN', globalRes.error || userRes.error || dailyRes?.error);
    } else {
      if ((globalRes.count ?? 0) >= GLOBAL_LIMIT_PER_MINUTE) {
        res.status(429).json({ error: 'The AI assistant is busy right now -- please try again in about a minute.' });
        return null;
      }
      if ((userRes.count ?? 0) >= USER_LIMIT_PER_HOUR) {
        res.status(429).json({ error: `You've hit the limit of ${USER_LIMIT_PER_HOUR} AI requests per hour. Please try again later.` });
        return null;
      }
      if (dailyCfg && (dailyRes.count ?? 0) >= dailyCfg.limit) {
        res.status(429).json({ error: `You've hit today's limit of ${dailyCfg.limit} AI requests for this feature. Please try again tomorrow.` });
        return null;
      }
    }
  } catch (e) {
    console.error('rateLimit: count query threw, failing OPEN', e);
  }

  // Record this call. Awaited (not fire-and-forget) so a fast burst can't
  // race past the count check before its own row lands.
  const { error: insertErr } = await admin.from('api_calls').insert({ user_id: userId, endpoint });
  if (insertErr) console.error('rateLimit: failed to record call (non-fatal)', insertErr);

  return userId;
}
