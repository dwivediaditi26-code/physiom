import { createClient } from '@supabase/supabase-js';

// "Send me a test notification" (Settings > Notifications).
// Sends one real phone notification to the SIGNED-IN person's own registered
// devices -- never anyone else's -- and says in plain words which step failed
// when nothing arrives. Same path the connection / News notifications use
// (the send-push edge function), so a pass here means those can arrive too.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminClient = null;
function getAdminClient() {
  if (!SERVICE_ROLE_KEY) return null;
  if (!adminClient) adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  return adminClient;
}

// One test every few seconds per person is plenty; this only ever pings their own phones.
const lastTest = new Map();
const COOLDOWN_MS = 5000;

// Maps what send-push answered to a stage + a sentence a physio can act on.
export function describeSendPush({ status, json, text }) {
  if (status === 404) return { ok: false, stage: 'function_missing', message: "The notification service (send-push) is not deployed on the server. It needs to be deployed in Supabase." };
  if (status === 401 || status === 403) return { ok: false, stage: 'function_rejected', message: "The notification service refused the server's key. Fix: in Supabase run \"supabase functions deploy send-push --no-verify-jwt\" (this version accepts the newer sb_secret_ key). Or put the older long service_role key (starting eyJ, under Legacy API keys) into SUPABASE_SERVICE_ROLE_KEY on Vercel and redeploy." };
  if (status >= 500) return { ok: false, stage: 'function_error', message: `The notification service crashed${text ? ` (${text.slice(0, 160)})` : ''}. Usually the push keys (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) are missing or do not match the app's key.` };
  if (status !== 200) return { ok: false, stage: 'function_error', message: `The notification service answered ${status}${text ? `: ${text.slice(0, 160)}` : ''}.` };
  const sent = Number(json?.sent) || 0;
  const total = Number(json?.total) || 0;
  if (total === 0) return { ok: false, stage: 'no_device', sent, total, message: "No phone is registered for your account yet. Turn notifications on from this phone first." };
  if (sent === 0) {
    const detail = Array.isArray(json?.failed) && json.failed[0] ? ` (${json.failed[0].status || ''} ${String(json.failed[0].body || '').slice(0, 120)})`.trim() : '';
    return { ok: false, stage: 'push_rejected', sent, total, message: `Your phone's registration was refused by the phone's notification service${detail ? ' ' + detail : ''}. Turn notifications off and on again, or the push keys on the server do not match the app.` };
  }
  return { ok: true, stage: 'sent', sent, total, message: sent === total ? `Sent to ${sent} of your device${sent === 1 ? '' : 's'}. It should pop up now, even with the screen locked.` : `Sent to ${sent} of your ${total} devices; the rest were refused and may need notifications turned off and on again.` };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = getAdminClient();
  if (!admin) return res.status(200).json({ ok: false, stage: 'server_config', message: 'The server has no SUPABASE_SERVICE_ROLE_KEY set on Vercel, so it cannot send notifications.' });

  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Sign in required.' });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: 'Your session has expired -- please sign in again.' });
  const userId = userData.user.id;

  const now = Date.now();
  if (now - (lastTest.get(userId) || 0) < COOLDOWN_MS) return res.status(200).json({ ok: false, stage: 'slow_down', message: 'One moment — wait a few seconds between tests.' });
  lastTest.set(userId, now);

  const { count, error: countErr } = await admin.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (countErr) return res.status(200).json({ ok: false, stage: 'database', message: `Could not read your registered phones (${countErr.message}).` });
  if (!count) return res.status(200).json(describeSendPush({ status: 200, json: { sent: 0, total: 0 } }));

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
      body: JSON.stringify({ user_id: userId, title: 'PhysioMind test', body: 'Notifications are working on this phone.', url: '/' }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON -- describeSendPush uses the text */ }
    return res.status(200).json({ ...describeSendPush({ status: r.status, json, text }), registered: count });
  } catch (e) {
    return res.status(200).json({ ok: false, stage: 'unreachable', message: `Could not reach the notification service (${e.message}).`, registered: count });
  }
}
