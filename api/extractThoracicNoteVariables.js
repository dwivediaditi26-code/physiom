// api/extractThoracicNoteVariables.js
//
// Pass 2 of the Thoracic Variable Extractor (see
// src/thoracicVariableExtractor.js for Pass 1, the deterministic reading
// of structured tx_* fields). This route's only job is the free-text
// note fields Pass 1 deliberately does not interpret -- tx_loc_notes,
// tx_moi_notes, tx_agg_notes, tx_rel_notes, tx_symp_notes, tx_rf_notes,
// tx_fn_notes, plus shared cc_main/hx_notes/goal_belief/goal_concern.
//
// Same non-negotiable rule as api/parse.js and the lumbar/cervical Pass 2
// routes: extract only what's actually stated, mark unknown rather than
// guess, never diagnose. Told what Pass 1 already determined; only
// supplements genuine gaps, never overrides or contradicts a real
// clinician selection.

const ALLOWED_VARIABLES = [
  "rotationAggravates", "sideBendingAggravates", "extensionAggravates", "flexionAggravates",
  "coughSneezeLaughAggravates", "breathingAggravates", "overheadReachingAggravates",
  "sustainedPostureAggravates", "manipulationSignificantRelief",
  "mechanicalPattern", "constantUnaffectedPattern", "breathingRelatedPattern", "morningStiffness",
  "costovertebralLocation", "priorEpisodeCount",
  "cardiacConcern", "respiratoryConcern", "visceralConcern", "oncologicConcern",
  "infectionConcern", "fractureConcern", "cordCompressionConcern",
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

  const system = `You are a clinical data extractor supplementing a thoracic spine physiotherapy assessment. You are given free-text notes a clinician wrote (or notes carried over from an earlier AI narrative parse) AND a list of what has ALREADY been determined from structured checkboxes elsewhere on the form.

CRITICAL RULES — do not violate these:
1. Extract what the notes state — directly, OR through one of the specific SAFE INFERENCES named below. Never invent a finding beyond what is explicitly written or one of those named patterns.
2. NEVER output a variable that is already listed in "already known" below — those came from an actual clinician selection and are ground truth. Your job is only to fill genuine gaps the notes reveal that the checkboxes did not capture.
3. If the notes don't clearly support a value (directly or via a named safe inference), do not include that variable at all. Omission is always safer than a guess.
4. You may only use variable names from this exact list: ${ALLOWED_VARIABLES.join(", ")}. Use "otherRelevantFinding" (as many times as needed) for anything clinically relevant that doesn't map to a specific named variable.
5. Every finding must include a short direct quote or close paraphrase from the notes proving it.

NEGATIONS ARE FINDINGS TOO — an explicit denial is just as real and useful a finding as an explicit positive, and must be reported the same way (value "false"), not skipped:
- "no pain with rotation/turning" → rotationAggravates: "false"
- "not affected by breathing", "breathing doesn't change it" → breathingAggravates: "false"
- "no cough or sneeze aggravation" → coughSneezeLaughAggravates: "false"
- "not the first time", "similar episode before" without a specific count → do not guess a count; omit priorEpisodeCount rather than assume
- "this is the first time this has happened" → priorEpisodeCount: "First episode"
- "denies chest tightness", "no cardiac symptoms", "no shortness of breath", "no fever" → do NOT set cardiacConcern/respiratoryConcern/infectionConcern here; these red-flag category findings only ever go through the pendingRedFlagReview route (rule 6 below), never a plain "false" via this list — a clinician must still confirm the negative screen themselves.
Look for negation language such as: "denies", "no", "none", "without", "negative for", "not present", "absent", "resolved" — in addition to explicit positive statements.

SAFE INFERENCES — narrow, deterministic inferences you may make ONLY when the exact pattern below is met. Mark these with confidence no higher than 60 (lower than a directly stated finding), and quote the specific phrase that justifies it:
- If the notes explicitly describe the pain as "purely mechanical", "only with movement", or "comes and goes with position/posture, nothing else" — you may infer mechanicalPattern: "true". Do NOT infer this from a partial or ambiguous description.
- Do not chain inferences (never infer a second variable from an already-inferred one).

VARIABLE-SPECIFIC GUIDANCE:
- priorEpisodeCount: map any stated count of past episodes to EXACTLY one of these five strings, no others: "First episode", "2–3 episodes", "4–6 episodes", "More than 6", "Continuous since onset".
- costovertebralLocation: "true" only from an explicit description of pain wrapping/referring around the chest wall (band-like, following a rib) — not from a plain "mid-back pain" description alone.
- morningStiffness: only from an explicit statement of stiffness in the morning, especially if described as prolonged or easing with movement/activity through the day.
- constantUnaffectedPattern: only when the notes explicitly say the pain is constant AND unaffected by movement/position/rest — not from "pain most of the day" alone, which is compatible with a still-mechanical pattern.
6. Cardiac / respiratory / visceral / oncologic / infection / fracture / cord-compression findings are NEVER reported as ordinary variables even when explicitly mentioned as positive or negative in the notes — always use the matching red-flag category name below instead, exactly as written, so it routes to clinician review rather than being silently merged into scoring:
   - cardiacConcern — any mention of chest tightness/pressure, pain radiating to jaw/left arm, dyspnea, palpitations, diaphoresis, or a personal cardiac history reproducing a similar pattern.
   - respiratoryConcern — any mention of shortness of breath, haemoptysis, pleuritic (sharp, breath-related) pain, recent respiratory infection, or a cough with fever.
   - visceralConcern — any mention of pain related to eating, right-upper-quadrant pain, epigastric burning, or other GI-pattern referral.
   - oncologicConcern — any mention of a personal cancer history, unexplained weight loss, or a mass/lump.
   - infectionConcern — any mention of fever, chills, or feeling systemically unwell alongside the thoracic pain.
   - fractureConcern — any mention of a recent significant trauma, known osteoporosis, or minimal-trauma onset in an older patient.
   - cordCompressionConcern — any mention of leg weakness, leg sensory change, or gait/balance disturbance co-occurring with the thoracic pain.

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
