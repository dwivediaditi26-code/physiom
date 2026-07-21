// api/extractLumbarNoteVariables.js
//
// Pass 2 of the Lumbar Variable Extractor (see
// src/lumbarVariableExtractor.js for Pass 1, the deterministic reading of
// structured lx_* fields). This route's only job is the free-text note
// fields Pass 1 deliberately does not interpret -- lx_loc_notes,
// lx_moi_notes, lx_agg_notes, lx_rel_notes, lx_symp_notes, lx_neuro_notes,
// lx_rf_notes, lx_yf_notes, lx_fn_notes, cc_main, goal_belief,
// goal_concern, hx_notes.
//
// Same non-negotiable rule as api/parse.js: extract only what's actually
// stated, mark unknown rather than guess, never diagnose. This route adds
// one more constraint on top -- it is told what Pass 1 ALREADY determined
// from the structured picks, and is only allowed to SUPPLEMENT genuine
// gaps, never override or contradict a real clinician selection. A
// structured tick is ground truth; free text is a secondary source only
// consulted where the structured fields are silent.

const ALLOWED_VARIABLES = [
  "belowKneePain", "dermatomalPattern", "acuteLiftingMechanism",
  "flexionAggravates", "extensionAggravates", "sittingAggravates",
  "coughSneezeAggravates", "valsalvaAggravates", "extensionRelieves",
  "flexionRelieves", "walkingRelieves", "constantUnremitting",
  "constantNightPain", "hasLegNeuro", "footDrop", "neurogenicClaudication",
  "caudaEquinaConcern", "fractureRiskConcern", "inflammatoryConcern",
  "otherSeriousPathologyConcern", "highPsychosocialLoad",
  "otherRelevantFinding",
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { notes, alreadyKnown } = req.body || {};
  if (!notes || typeof notes !== 'object') return res.status(400).json({ error: 'No notes provided' });

  const notesText = Object.entries(notes)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  if (!notesText.trim()) return res.status(200).json({ findings: [] }); // nothing to interpret

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  const system = `You are a clinical data extractor supplementing a lumbar spine physiotherapy assessment. You are given free-text notes a clinician wrote (or notes carried over from an earlier AI narrative parse) AND a list of what has ALREADY been determined from structured checkboxes elsewhere on the form.

CRITICAL RULES — do not violate these:
1. Extract ONLY what the notes explicitly state. Never invent, assume, or infer a "typical" finding.
2. NEVER output a variable that is already listed in "already known" below — those came from an actual clinician selection and are ground truth. Your job is only to fill genuine gaps the notes reveal that the checkboxes did not capture.
3. If the notes don't clearly support a value, do not include that variable at all. Omission is always safer than a guess.
4. You may only use variable names from this exact list: ${ALLOWED_VARIABLES.join(", ")}. Use "otherRelevantFinding" (as many times as needed) for anything clinically relevant that doesn't map to a specific named variable — e.g. a detail affecting confidence but not itself a listed variable.
5. Every finding must include a short direct quote or close paraphrase from the notes proving it.

Return ONLY valid JSON in this exact shape:
{
  "findings": [
    { "variable": "one of the allowed names", "value": "true" | "false" | "a short string", "sourceQuote": "short quote/paraphrase from the notes", "confidence": integer 0-100 }
  ]
}
If nothing in the notes adds anything beyond what's already known, return { "findings": [] }.`;

  const alreadyKnownText = Array.isArray(alreadyKnown) && alreadyKnown.length
    ? alreadyKnown.join(", ")
    : "(nothing yet determined from structured fields)";

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `ALREADY KNOWN (do not repeat these): ${alreadyKnownText}\n\nFREE-TEXT NOTES:\n${notesText}` },
        ],
        temperature: 0.1, max_completion_tokens: 1200,
        reasoning_effort: 'low', include_reasoning: false,
        response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) { const t = await resp.text(); return res.status(502).json({ error: 'Groq error', detail: t }); }
    const respData = await resp.json();
    const content = respData.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'Empty response' });
    let parsed;
    try { parsed = JSON.parse(content); }
    catch (e) { return res.status(502).json({ error: 'Malformed JSON', detail: e.message }); }

    // Belt-and-braces filter: even if the model slips, never let a
    // disallowed variable name or an already-known one through.
    const known = new Set(Array.isArray(alreadyKnown) ? alreadyKnown : []);
    const findings = Array.isArray(parsed.findings)
      ? parsed.findings.filter((f) => f && ALLOWED_VARIABLES.includes(f.variable) && !known.has(f.variable))
      : [];

    return res.status(200).json({ findings });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
