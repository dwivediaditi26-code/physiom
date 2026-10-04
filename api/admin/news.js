import { createClient } from '@supabase/supabase-js';
import dns from 'node:dns/promises';
import net from 'node:net';
import { authenticateAndRateLimit } from '../_lib/rateLimit.js';

// Admin-only "Add news" tool (AdminAddNewsPage.jsx). One endpoint, two
// actions, so it adds a single serverless function:
//   action "draft"   -- Aditi pastes news text and/or a link; Groq drafts the
//                       title/summary/category from ONLY that text. Never
//                       published -- she reviews and edits it first.
//   action "publish" -- writes the reviewed item to career_news (service role,
//                       since that table has no client write policy on
//                       purpose) and optionally pushes a phone notification.
// Every call verifies the caller is a real admin server-side; the page's own
// isAdmin check is only a courtesy.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CATEGORIES = ['job_india', 'job_international', 'conference', 'regulation', 'research', 'alert'];

let adminClient = null;
function getAdminClient() {
  if (!SERVICE_ROLE_KEY) return null;
  if (!adminClient) adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  return adminClient;
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
}

// Fetches a news link server-side, refusing anything that resolves to a
// private/internal address (the page is admin-triggered, but the URL is
// still user-supplied text). Manual redirects so each hop is re-checked.
async function fetchPublicPage(startUrl) {
  let url = startUrl;
  for (let hop = 0; hop < 4; hop++) {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http/https links are supported.');
    if (u.hostname === 'localhost' || net.isIP(u.hostname)) throw new Error('That link points to an address that cannot be fetched.');
    const addrs = await dns.lookup(u.hostname, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new Error('That link points to an address that cannot be fetched.');
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'PhysioMindNewsBot/1.0', Accept: 'text/html,text/plain' } });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = new URL(r.headers.get('location'), url).toString(); continue; }
    if (!r.ok) throw new Error(`The page answered with status ${r.status}.`);
    return (await r.text()).slice(0, 400000);
  }
  throw new Error('Too many redirects.');
}

function htmlToText(html) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const site = /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] || '';
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
  return { title, site, text: text.slice(0, 8000) };
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isoDate = (v) => {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
function validUrl(v) {
  try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol) ? u.toString() : null; } catch { return null; }
}

async function draft(req, res) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  const pasted = str(req.body?.text, 8000);
  const link = req.body?.url ? validUrl(String(req.body.url).trim()) : null;
  if (!pasted && !link) return res.status(400).json({ error: 'Paste the news text or a link.' });

  let page = { title: '', site: '', text: '' };
  let pageNote = null;
  if (link) {
    try { page = htmlToText(await fetchPublicPage(link)); } catch (e) { pageNote = `Couldn't read the link (${e.message}) — drafted from the pasted text only.`; }
  }
  const source = [pasted && `Pasted by the admin:\n${pasted}`, page.text && `Text of the linked page (${page.title}):\n${page.text}`].filter(Boolean).join('\n\n');
  if (!source) return res.status(422).json({ error: pageNote || 'Nothing readable to draft from — paste the text.' });

  const system = `You draft one item for the News tab of a physiotherapy app read by clinicians and students in India. Use ONLY the text provided. Never add facts, dates, numbers, deadlines, locations or organisation names that are not in the text; leave a field empty ("") when the text does not say. Respond with ONLY a JSON object:
{
  "title": "a clear factual headline, max 120 characters",
  "summary": "1-3 plain sentences: what it is and what the reader should know (eligibility, dates, how to apply) -- only if stated in the text. Max 400 characters.",
  "category": "exactly one of: job_india (a vacancy in India), job_international (a vacancy outside India), conference (conference/workshop/webinar), regulation (council, registration, policy or legal update), research (research or practice news), alert (urgent notice)",
  "source_name": "the organisation or site that published it, as named in the text",
  "location": "city/state/country if stated, else empty",
  "deadline": "closing/last date as YYYY-MM-DD if stated, else empty",
  "published": "publication date as YYYY-MM-DD if stated, else empty"
}`;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: system }, { role: 'user', content: source }],
        temperature: 0.1, max_completion_tokens: 600, reasoning_effort: 'low', include_reasoning: false,
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'The AI service did not answer — try again, or fill the form in yourself.' });
    const raw = (await r.json()).choices?.[0]?.message?.content;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return res.status(502).json({ error: 'Could not read the draft — try again, or fill the form in yourself.' }); }
    return res.status(200).json({
      draft: {
        title: str(parsed.title, 300),
        summary: str(parsed.summary, 500),
        category: CATEGORIES.includes(parsed.category) ? parsed.category : 'research',
        source_name: str(parsed.source_name, 120) || page.site,
        location: str(parsed.location, 120),
        deadline: str(parsed.deadline, 10),
        published: str(parsed.published, 10),
        source_url: link || '',
      },
      note: pageNote,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function publish(req, res, admin) {
  const b = req.body || {};
  const title = str(b.title, 300);
  const source_name = str(b.source_name, 120);
  const source_url = validUrl(str(b.source_url, 1000));
  const category = b.category;
  if (!title) return res.status(400).json({ error: 'A title is required.' });
  if (!source_name) return res.status(400).json({ error: 'The source name is required.' });
  if (!source_url) return res.status(400).json({ error: 'A valid source link (http/https) is required — it is how readers verify the item.' });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Choose a category.' });

  const row = {
    category, title, source_name, source_url,
    summary: str(b.summary, 500) || null,
    location: str(b.location, 120) || null,
    deadline_at: isoDate(b.deadline),
    published_at: isoDate(b.published) || new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
    status: 'active',
    dedupe_key: source_url,
  };
  const { data: existing, error: selErr } = await admin.from('career_news').select('id').eq('dedupe_key', row.dedupe_key).maybeSingle();
  if (selErr) return res.status(500).json({ error: selErr.message });
  const { error } = await admin.from('career_news').upsert(row, { onConflict: 'dedupe_key' });
  if (error) return res.status(500).json({ error: error.message });

  let notified = false;
  if (!existing && b.notify !== false) {
    try {
      const push = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ broadcast: true, title: title.slice(0, 80), body: source_name, url: '/news' }),
        signal: AbortSignal.timeout(10000),
      });
      notified = push.ok;
    } catch (e) {
      console.error('admin/news: push broadcast failed', e.message);
    }
  }
  return res.status(200).json({ ok: true, updated: !!existing, notified });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await authenticateAndRateLimit(req, res, 'admin-news');
  if (!userId) return;
  const admin = getAdminClient();
  if (!admin) return res.status(500).json({ error: 'Server misconfigured.' });
  const { data: profile, error } = await admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  if (error || !profile?.is_admin) return res.status(403).json({ error: 'Admin access required.' });

  const action = req.body?.action;
  if (action === 'draft') return draft(req, res);
  if (action === 'publish') return publish(req, res, admin);
  return res.status(400).json({ error: 'Unknown action.' });
}
