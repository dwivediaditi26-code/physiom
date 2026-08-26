import { authenticateAndRateLimit } from './_lib/rateLimit.js';

// Hybrid layer for the Neuro IPD "AI Treatment Suggestions" step. The
// deterministic rule engine (src/neuroTreatmentCatalog.js +
// matchNeuroTreatments in NeurologicalAssessment.jsx) already decided WHICH
// treatments apply and pulled their evidence/dosage straight from a
// hand-vetted catalog -- that part never touches an LLM and stays the
// safety anchor. This endpoint only asks the model to write the
// connecting clinical narrative -- explaining, in this patient's own
// findings, why this priority order makes sense -- and is explicitly
// forbidden from introducing any treatment, citation, or dosage number
// that wasn't already in the catalog data it's given. The frontend renders
// this output in a clearly separate "AI Clinical Reasoning" block so a
// clinician never confuses model prose with the verified evidence cards.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await authenticateAndRateLimit(req, res, 'neuroTreatmentReasoning');
  if (!userId) return;

  const { problems, treatments, phase } = req.body || {};
  if (!Array.isArray(problems) || !Array.isArray(treatments) || !treatments.length) {
    return res.status(400).json({ error: 'problems (array) and treatments (non-empty array) are required' });
  }

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  // Only the fields the rule engine already verified are handed to the
  // model -- name/why/dosage/evidence all come straight from
  // neuroTreatmentCatalog.js, not from free text, so there is nothing here
  // for the model to "cite" that wasn't already vetted.
  const catalogBlock = treatments.map((t, i) => `
${i + 1}. ${t.name} (addresses: ${t.matchedProblem})
   Why (this patient's documented findings): ${(t.why || []).join('; ') || 'not specified'}
   How: ${t.how}
   Dosage: ${t.dosage}
   Evidence on file: ${(t.evidenceRefs || []).map((e) => `${e.citation} [${e.strength}]`).join(' | ') || 'none on file'}
`).join('\n');

  const systemPrompt = `You are assisting a physiotherapist reviewing a deterministic, rule-based list of neuro-rehab treatment suggestions for one inpatient. A separate system already selected these treatments and pulled their dosage and evidence citations from a hand-vetted, pre-verified catalog -- that part is NOT your job and you must not change it.

Your ONLY job: write a short clinical-reasoning narrative (3-6 sentences) explaining, in plain clinical language, why this priority order makes sense for THIS patient's documented problems and rehab phase. Ground every sentence in the findings and treatments given to you below.

Hard rules -- violating any of these makes your output unusable and dangerous:
- Do NOT name, recommend, or imply any treatment that is not in the numbered list below.
- Do NOT invent, restate with different numbers, or alter any dosage, frequency, or duration. If you mention dosage, use the exact wording given.
- Do NOT cite any study, guideline, author, or statistic that is not already listed under "Evidence on file" for that treatment. Do not add new citations, even real ones you may know about.
- Do NOT diagnose, do NOT suggest medication, imaging, or referral.
- If the findings given are too sparse to say something specific, say so plainly rather than filling the gap with a generic or invented detail.
- Write for a treating physiotherapist, not the patient. No disclaimers, no restating these instructions, no headers -- just the narrative.

Patient's active problems (already identified by the rule engine): ${problems.join(', ')}
Current rehab phase (already determined by the rule engine): ${phase || 'not determined'}

Rule-engine-selected treatments, in priority order:
${catalogBlock}`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Write the clinical reasoning narrative now.' }],
        temperature: 0.2,
        max_completion_tokens: 500,
        reasoning_effort: 'low', include_reasoning: false,
      }),
    });
    if (!r.ok) { const t = await r.text(); return res.status(502).json({ error: 'Groq error', detail: t }); }
    const data = await r.json();
    const reasoning = data.choices?.[0]?.message?.content;
    if (!reasoning) return res.status(502).json({ error: 'Empty response from Groq' });
    return res.status(200).json({ reasoning });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
