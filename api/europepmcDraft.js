// Evidence tab live search, second source -- drafts a Summary/Conclusion
// for a Europe PMC result the same way api/pubmedDraft.js does for a
// PubMed one, same auth + rate-limit gate, same Groq model/shape. The one
// difference: Europe PMC's search step (europepmcSearch.js) already
// returns abstractText directly, so there's no separate efetch-style
// lookup here -- this drafts straight from what the client already has.
import { authenticateAndRateLimit } from './_lib/rateLimit.js';

const CATEGORIES = ['MSK', 'Neuro', 'Sports', 'Cardio'];
const LEVELS = ['Level 1', 'Level 2', 'Level 3'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await authenticateAndRateLimit(req, res, 'europepmc-draft');
  if (!userId) return;

  const { title, journal, year, abstractText } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required.' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  const record = typeof abstractText === 'string' ? abstractText.slice(0, 6000) : '';

  const prompt = `Title: ${title}
Journal: ${journal || 'unknown'}
Year: ${year || 'unknown'}
Abstract (may be empty if unavailable):
${record || '(no abstract available -- draft from the title alone, and keep the summary/conclusion general rather than inventing findings)'}`;

  const systemPrompt = `You are drafting one entry for a physiotherapy Evidence library read by practicing clinicians. Given an article record, respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{
  "summary": "1-2 sentences: what the study did (design, population, what was measured). Plain clinical terminology, not layman's language.",
  "conclusion": "1-2 sentences: what the study actually found, in clinical terms. Never invent a specific number/statistic that isn't in the record text -- if there's no abstract, keep this general (e.g. what question the paper addresses) rather than fabricating a result.",
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
      return res.status(502).json({ error: 'Could not parse the draft -- try again.' });
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
