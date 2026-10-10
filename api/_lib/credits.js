// api/_lib/credits.js -- the "Parse with AI" credit counter (server side).
//
// Each student has two counters (supabase/add_ai_credits.sql): parser_credits
// (spent here, by /api/parse) and analyze_credits (spent by the Re-analyze
// button, straight from the browser). spendCredit() takes one BEFORE the AI is
// called -- so two quick taps can't both slip past a balance of 1 -- and
// refundCredit() gives it back if the AI then fails, so a student never pays
// for an error. Admins are never charged.
//
// Fails OPEN when the counter itself is unavailable (service key or table
// missing, Supabase hiccup): a broken counter must not take the AI intake down
// for everyone. It is logged, not swallowed. Self-contained on purpose (own
// client, no import of rateLimit.js).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';

let client = null;
function getClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  if (!client) client = createClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}

// -> { ok: true, remaining, charged } or { ok: false, remaining: 0 } when the balance is 0.
// `charged` is false for admins and when the counter is unavailable (nothing to refund).
export async function spendCredit(userId, kind) {
  const admin = getClient();
  if (!admin) { console.error('credits: no service role key -- not charging'); return { ok: true, remaining: null, charged: false }; }
  try {
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
    if (profile?.is_admin) return { ok: true, remaining: null, charged: false, unlimited: true };
    const { data, error } = await admin.rpc('adjust_credit', { p_user: userId, p_kind: kind, p_delta: -1 });
    if (error) { console.error('credits: spend failed, failing OPEN', error); return { ok: true, remaining: null, charged: false }; }
    if (data === -1) return { ok: false, remaining: 0 };
    return { ok: true, remaining: data, charged: true };
  } catch (e) {
    console.error('credits: spend threw, failing OPEN', e);
    return { ok: true, remaining: null, charged: false };
  }
}

export async function refundCredit(userId, kind) {
  const admin = getClient();
  if (!admin) return;
  try {
    const { error } = await admin.rpc('adjust_credit', { p_user: userId, p_kind: kind, p_delta: 1 });
    if (error) console.error('credits: refund failed', error);
  } catch (e) {
    console.error('credits: refund threw', e);
  }
}
