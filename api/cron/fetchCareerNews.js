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
//   - freejobalert.com / sarkariresult.com -- general Indian government-job
//     aggregators (not official .gov.in feeds, everything from railways to
//     banking), category 'job_india'. Filtered to a narrow "physiotherap" /
//     "physical therapist" match (not the broader RELEVANCE_KEYWORDS below
//     -- a job listing needs a precise role match, not a loose topic match,
//     or "Physical Training Instructor" posts would show up as physio
//     jobs). Checked 2026-09-30: both feeds work, but neither had a real
//     physio vacancy posted that day -- left empty rather than padded with
//     a near-miss. verificationOf() in db.js already marks any source not
//     on its trusted allowlist "Needs review", which is correct here --
//     these are aggregators republishing notices, not the hiring body.
//   - World Physiotherapy (world.physio/rss.xml) -- the real international
//     professional body (WCPT). No keyword filter -- every item on this
//     feed already is physiotherapy-specific (congresses, global summits,
//     professional development), unlike WHO/News-Medical which cover a
//     much wider beat. category 'alert'; db.js's verificationOf() marks it
//     "Official source", same tier as WHO.
//
// Checked and rejected (2026-09-30, Aditi asked for the 10 sources from her
// ChatGPT research): IAP's domain doesn't resolve at either guessed address;
// AIIPMR, ICMR and India e-Gazette are reachable but present a TLS
// certificate this runtime (and Vercel's) can't verify, so fetching them
// would mean disabling certificate checking -- not doing that for a
// government site; NCAHP and MoHFW are client-rendered apps whose "feed"
// paths just return the same empty HTML shell, no real RSS underneath.
// AIIPMR genuinely does post real recruitment PDFs on its site (confirmed
// by hand), it's just not reachable by an automated fetch right now.
// No international job-listing source is wired in -- a free, reliable RSS
// feed of real overseas physiotherapy vacancies doesn't exist; job_international
// stays empty until a real source is found. Don't invent one here.
//
// Trigger: Vercel Cron (see vercel.json "crons"), once daily. Protected by
// CRON_SECRET -- Vercel sends `Authorization: Bearer $CRON_SECRET`
// automatically for a configured cron job; this refuses any other caller.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gkhcysvayjrkrufcnqvz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RELEVANCE_KEYWORDS = [
  'physio', 'physical therapy', 'rehabilit', 'musculoskeletal', 'mobility',
  'disability', 'stroke recovery', 'orthopaedic', 'orthopedic', 'exercise therapy',
  'exercise', 'osteoarthritis', 'arthritis', 'back pain', 'joint pain', 'knee',
  'hip replacement', 'spine', 'sports injury', 'sports medicine', 'balance training',
  'fall prevention', 'gait', 'chronic pain', 'physical activity',
];

// Narrower than RELEVANCE_KEYWORDS on purpose -- a JOB listing needs a
// precise role match. "Physical Training Instructor" (a real, common govt
// post, e.g. UPSSSC PTI) is a sports-coaching role, not a physiotherapist
// one, and must not match here even though it would under the broader list.
const JOB_KEYWORDS = ['physiotherap', 'physical therapist'];

const SOURCES = [
  {
    name: 'News-Medical (Physiotherapy)',
    url: 'https://www.news-medical.net/tag/feed/Physiotherapy.aspx',
    category: 'research',
    // Despite the URL, this feed carries plenty of unrelated medical news
    // (verified 2026-09-30: only 2 of 5 sampled items were actually
    // physio-relevant) -- still filtered, same as WHO below.
    requireKeywordMatch: true,
    keywords: RELEVANCE_KEYWORDS,
    max: 5,
  },
  {
    name: 'World Health Organization',
    url: 'https://www.who.int/rss-feeds/news-english.xml',
    category: 'alert',
    requireKeywordMatch: true,
    keywords: RELEVANCE_KEYWORDS,
    max: 3,
  },
  {
    name: 'FreeJobAlert (Govt jobs)',
    url: 'https://freejobalert.com/feed/',
    category: 'job_india',
    requireKeywordMatch: true,
    keywords: JOB_KEYWORDS,
    max: 5,
  },
  {
    name: 'SarkariResult (Govt jobs)',
    url: 'https://www.sarkariresult.com/feed/',
    category: 'job_india',
    requireKeywordMatch: true,
    keywords: JOB_KEYWORDS,
    max: 5,
  },
  {
    name: 'World Physiotherapy',
    url: 'https://world.physio/rss.xml',
    category: 'alert',
    requireKeywordMatch: false,
    max: 5,
  },
];

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&nbsp;/g, ' ');
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return '';
  let val = m[1].trim();
  const cdata = val.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  if (cdata) val = cdata[1];
  // Decode BEFORE stripping tags -- WHO's feed entity-encodes its HTML
  // (&lt;p&gt; rather than a raw <p> inside CDATA), so stripping first
  // leaves those encoded tags untouched and a later decode turns them
  // into literal <p> that leaks straight into the summary. Decode once
  // to reveal any real tags, strip those, then decode again for entities
  // that were sitting inside what just got stripped.
  return decodeEntities(decodeEntities(val).replace(/<[^>]+>/g, ' '))
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

function isRelevant(item, keywords) {
  const hay = `${item.title} ${item.description}`.toLowerCase();
  return keywords.some((kw) => hay.includes(kw));
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

  // One retry per source, each with its own timeout -- a single slow or
  // dead feed must not hang the whole run (every other source still needs
  // its chance), and one real retry absorbs a transient blip without
  // masking a genuinely dead source behind endless silent attempts.
  for (const source of SOURCES) {
    let lastError = null;
    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      try {
        const r = await fetch(source.url, {
          headers: { 'User-Agent': 'PhysioMindNewsBot/1.0 (+https://physiomindapp.com)' },
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) { lastError = `HTTP ${r.status}`; continue; }
        const xml = await r.text();
        let items = parseRssItems(xml);
        if (source.requireKeywordMatch) items = items.filter((it) => isRelevant(it, source.keywords));
        items = items.slice(0, source.max);
        items.forEach((item) => rows.push(toRow(item, source)));
        results.push({ source: source.name, ok: true, found: items.length, attempt });
        ok = true;
      } catch (err) {
        lastError = err.name === 'TimeoutError' ? 'Timed out after 10s' : err.message;
      }
    }
    if (!ok) results.push({ source: source.name, ok: false, error: lastError });
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
