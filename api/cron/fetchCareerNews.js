// Daily fetch for PhysioFeed's Career & Opportunities News section (2026-09-30,
// Aditi's ChatGPT plan: "start with RSS + automatic collection, no AI cost").
// Writes into `career_news` (supabase/add_career_news.sql) using the service
// role key -- that table has no insert/update policy for anon/authenticated,
// on purpose, so only this job can write to it.
//
// Real sources only, verified reachable before wiring in (2026-09-30):
//   - News-Medical's Physiotherapy tag feed -- genuinely physio-specific
//     research/practice news, category 'research'.
//   - WHO's global news feed -- general health, kept only when a headline
//     actually mentions physio/rehab/disability terms, category 'alert'.
// No job-listing source is wired in yet -- a free, reliable RSS feed of real
// physiotherapy vacancies (India or international) doesn't exist; job_india
// and job_international stay empty until a real source is found. Don't
// invent one here.
//
// Trigger: Vercel Cron (see vercel.json "crons"), once daily. Protected by
// CRON_SECRET -- Vercel sends `Authorization: Bearer $CRON_SECRET`
// automatically for a configured cron job; this refuses any other caller.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SOURCES = [
  {
    name: 'News-Medical (Physiotherapy)',
    url: 'https://www.news-medical.net/tag/feed/Physiotherapy.aspx',
    category: 'research',
    // Despite the URL, this feed carries plenty of unrelated medical news
    // (verified 2026-09-30: only 2 of 5 sampled items were actually
    // physio-relevant) -- still filtered, same as WHO below.
    requireKeywordMatch: true,
    max: 5,
  },
  {
    name: 'World Health Organization',
    url: 'https://www.who.int/rss-feeds/news-english.xml',
    category: 'alert',
    requireKeywordMatch: true,
    max: 3,
  },
];

const RELEVANCE_KEYWORDS = [
  'physio', 'physical therapy', 'rehabilit', 'musculoskeletal', 'mobility',
  'disability', 'stroke recovery', 'orthopaedic', 'orthopedic', 'exercise therapy',
  'exercise', 'osteoarthritis', 'arthritis', 'back pain', 'joint pain', 'knee',
  'hip replacement', 'spine', 'sports injury', 'sports medicine', 'balance training',
  'fall prevention', 'gait', 'chronic pain', 'physical activity',
];

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return '';
  let val = m[1].trim();
  const cdata = val.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  if (cdata) val = cdata[1];
  return val
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAttr(block, tag, attr) {
  const m = block.match(new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["']`, 'i'));
  return m ? m[1] : null;
}

function parseRssItems(xml) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return blocks.map((block) => ({
    title: extractTag(block, 'title'),
    link: extractTag(block, 'link'),
    description: extractTag(block, 'description'),
    pubDate: extractTag(block, 'pubDate'),
    // Only News-Medical's feed carries this (media:content); WHO's doesn't
    // -- real image or nothing, never a placeholder graphic standing in
    // for a real photo.
    thumbnailUrl: extractAttr(block, 'media:content', 'url'),
  })).filter((it) => it.title && it.link);
}

function isRelevant(item) {
  const hay = `${item.title} ${item.description}`.toLowerCase();
  return RELEVANCE_KEYWORDS.some((kw) => hay.includes(kw));
}

function toRow(item, source) {
  return {
    category: source.category,
    title: item.title.slice(0, 300),
    summary: item.description ? item.description.slice(0, 500) : null,
    source_name: source.name,
    source_url: item.link,
    thumbnail_url: item.thumbnailUrl || null,
    location: null,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    deadline_at: null,
    last_checked_at: new Date().toISOString(),
    status: 'active',
    dedupe_key: item.link,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'] || '';
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('fetchCareerNews: SUPABASE_SERVICE_ROLE_KEY not set on this deployment');
    return res.status(500).json({ error: 'Server misconfigured.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const results = [];
  const rows = [];

  for (const source of SOURCES) {
    try {
      const r = await fetch(source.url, { headers: { 'User-Agent': 'PhysioMindNewsBot/1.0 (+https://physiomindapp.com)' } });
      if (!r.ok) { results.push({ source: source.name, ok: false, error: `HTTP ${r.status}` }); continue; }
      const xml = await r.text();
      let items = parseRssItems(xml);
      if (source.requireKeywordMatch) items = items.filter(isRelevant);
      items = items.slice(0, source.max);
      items.forEach((item) => rows.push(toRow(item, source)));
      results.push({ source: source.name, ok: true, found: items.length });
    } catch (err) {
      results.push({ source: source.name, ok: false, error: err.message });
    }
  }

  let written = 0;
  if (rows.length > 0) {
    const { error, count } = await admin.from('career_news').upsert(rows, { onConflict: 'dedupe_key', count: 'exact' });
    if (error) {
      console.error('fetchCareerNews: upsert failed', error.message);
      return res.status(500).json({ error: error.message, results });
    }
    written = count ?? rows.length;
  }

  // Housekeeping: stop showing anything that hasn't been re-seen by a
  // source in 30 days, rather than growing the board forever.
  await admin
    .from('career_news')
    .update({ status: 'expired' })
    .lt('last_checked_at', new Date(Date.now() - 30 * 86400000).toISOString())
    .eq('status', 'active');

  return res.status(200).json({ ok: true, written, results });
}
