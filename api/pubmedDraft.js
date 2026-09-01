import { authenticateAndRateLimit } from './_lib/rateLimit.js';

// Add Evidence admin screen, step 2 (see AdminAddEvidencePage.jsx). Pulls
// the PubMed record's plain-text abstract (efetch) and asks Groq to draft
// a Summary + Conclusion in the same clinical-terminology style used
// throughout the Evidence tab's existing entries, plus suggested
// category/level/type/tags -- all of it a DRAFT the admin reviews and can
// edit before publishing, never auto-published. Same auth + rate-limit gate
// as every other Groq-calling endpoint in this repo (api/chat.js,
// api/parse.js) -- this one spends real Groq tokens too.
const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const CATEGORIES = ['MSK', 'Neuro', 'Sports', 'Cardio'];
const LEVELS = ['Level 1', 'Level 2', 'Level 3'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await authenticateAndRateLimit(req, res, 'pubmed-draft');
  if (!userId) return;

  const { pmid, title, journal, year } = req.body || {};
  if (!pmid || !title) return res.status(400).json({ error: 'pmid and title are required.' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  // Best-effort: a missing/failed abstract (e.g. an editorial with none)
  // isn't fatal -- draft from the title alone rather than failing the
  // whole step, same "never block the human review step" spirit as
  // ResearchCard.jsx already treats summary/conclusion as optional.
  let record = '';
  try {
    const efetchUrl = `${EFETCH_URL}?db=pubmed&rettype=abstract&retmode=text&id=${encodeURIComponent(pmid)}`;
    const efetchRes = await fetch(efetchUrl);
    if (efetchRes.ok) record = (await efetchRes.text()).slice(0, 6000);
  } catch (e) {
    console.error('pubmedDraft: efetch failed, drafting from title only --', e.message);
  }

  const prompt = `Title: ${title}
Journal: ${journal || 'unknown'}
Year: ${year || 'unknown'}
PubMed record text (may include the abstract; may be empty if unavailable):
${record || '(no abstract available -- draft from the title alone, and keep the summary/conclusion general rather than inventing findings)'}`;

  const systemPrompt = `You are drafting one entry for a physiotherapy Evidence library read by practicing clinicians. Given a PubMed record, respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{
  "summary": "1-2 sentences: what the study did (design, population, what was measured). Plain clinical terminology, not layman's language.",
  "conclusion": "1-2 sentences: what the study actually found, in clinical terms. Never invent a specific number/statistic that isn't in the record text -- if the record has no abstract, keep this general (e.g. what question the paper addresses) rather than fabricating a result.",
  "category": "exactly one of MSK, Neuro, Sports, Cardio -- whichever best fits the paper's subject",
  "level": "exactly one of Level 1, Level 2, Level 3 -- 1 for systematic review/meta-analysis/RCT/clinical practice guideline, 2 for a single non-RCT study or narrower review, 3 for narrative review/cross-sectional/observational/editorial",
  "type": "a short study-type label, e.g. Systematic Review, Meta-Analysis, RCT, Narrative Review, Clinical Practice Guideline, Cross-Sectional Study, Scientific Statement",
  "tags": ["TwoWordTag", "AnotherTag"] // exactly 2 short PascalCase or CamelCase tags, no spaces, no hashes
}`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
        temperature: 0.2,
        max_completion_tokens: 500,
        reasoning_effort: 'low', include_reasoning: false,
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) { const t = await r.text(); return res.status(502).json({ error: 'Groq error', detail: t }); }
    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return res.status(502).json({ error: 'Empty response from Groq' });

    let parsed;
    try { parsed = JSON.parse(raw); } catch {
      return res.status(502).json({ error: 'Could not parse the draft -- try again, or fill in Summary/Conclusion by hand.' });
    }

    const draft = {
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      conclusion: typeof parsed.conclusion === 'string' ? parsed.conclusion.trim() : '',
      category: CATEGORIES.includes(parsed.category) ? parsed.category : 'MSK',
      level: LEVELS.includes(parsed.level) ? parsed.level : 'Level 2',
      type: typeof parsed.type === 'string' && parsed.type.trim() ? parsed.type.trim() : 'Narrative Review',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === 'string').slice(0, 2) : [],
    };
    return res.status(200).json({ draft });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
