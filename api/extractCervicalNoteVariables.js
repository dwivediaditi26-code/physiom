// api/extractCervicalNoteVariables.js
//
// Pass 2 of the Cervical Variable Extractor (see
// src/cervicalVariableExtractor.js for Pass 1, the deterministic reading
// of structured cx_* fields). This route's only job is the free-text
// note fields Pass 1 deliberately does not interpret -- cx_loc_notes,
// cx_moi_notes, cx_agg_notes, cx_rel_notes, cx_symp_notes, cx_arm_notes,
// cx_ha_notes, cx_rf_notes, cx_fn_notes, cc_main, goal_belief,
// goal_concern, hx_notes.
//
// Same non-negotiable rule as api/parse.js and api/extractLumbarNoteVariables.js:
// extract only what's actually stated, mark unknown rather than guess,
// never diagnose. Told what Pass 1 already determined; only supplements
// genuine gaps, never overrides or contradicts a real clinician selection.
// Written directly with the negation/safe-inference guidance the lumbar
// extractor needed a follow-up audit to add -- not repeating that gap here.

const ALLOWED_VARIABLES = [
  "armHandPain", "dermatomalPattern", "whiplashMechanism",
  "flexionAggravates", "extensionAggravates", "rotationAggravates", "quadrantAggravates",
  "sustainedPostureAggravates", "coughSneezeAggravates",
  "chinTuckRelieves", "armOverheadRelievesArmSymptoms",
  "constantUnremitting", "morningStiffnessOver30", "constantNightPain",
  "occipitalHeadache", "headacheTriggeredByNeckMovement",
  "objectiveNeuroSigns", "lhermittePositive",
  "priorEpisodeCount",
  "myelopathyConcern", "vbiConcern", "instabilityConcern", "otherSeriousPathologyConcern",
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

  const system = `You are a clinical data extractor supplementing a cervical spine physiotherapy assessment. You are given free-text notes a clinician wrote (or notes carried over from an earlier AI narrative parse) AND a list of what has ALREADY been determined from structured checkboxes elsewhere on the form.

CRITICAL RULES — do not violate these:
1. Extract what the notes state — directly, OR through one of the specific SAFE INFERENCES named below. Never invent a finding beyond what is explicitly written or one of those named patterns.
2. NEVER output a variable that is already listed in "already known" below — those came from an actual clinician selection and are ground truth. Your job is only to fill genuine gaps the notes reveal that the checkboxes did not capture.
3. If the notes don't clearly support a value (directly or via a named safe inference), do not include that variable at all. Omission is always safer than a guess.
4. You may only use variable names from this exact list: ${ALLOWED_VARIABLES.join(", ")}. Use "otherRelevantFinding" (as many times as needed) for anything clinically relevant that doesn't map to a specific named variable.
5. Every finding must include a short direct quote or close paraphrase from the notes proving it.

NEGATIONS ARE FINDINGS TOO — an explicit denial is just as real and useful a finding as an explicit positive, and must be reported the same way (value "false"), not skipped:
- "denies arm pain / numbness / tingling / weakness", "no radiation into the arm" → armHandPain: "false"
- "no radiation", "does not radiate", "local neck pain only" → dermatomalPattern: "false"
- "no cough or sneeze aggravation" → coughSneezeAggravates: "false"
- "no headache", "denies headache" → occipitalHeadache should simply be omitted (absence of headache is not the same as a headache present-but-not-occipital; do not report occipitalHeadache: "false" unless a headache is present AND explicitly described as NOT occipital/base-of-skull)
- "not the first time", "similar episode before" without a specific count → do not guess a count; omit priorEpisodeCount rather than assume
- "this is the first time this has happened" → priorEpisodeCount: "First episode"
- "no dizziness with movement", "denies vertigo, visual changes" → do NOT set vbiConcern here; VBI/myelopathy/instability findings only ever go through the pendingRedFlagReview route (rule 6 below), never a plain "false" via this list — a clinician must still confirm the negative screen themselves.
Look for negation language such as: "denies", "no", "none", "without", "negative for", "not present", "absent", "resolved" — in addition to explicit positive statements.

SAFE INFERENCES — narrow, deterministic inferences you may make ONLY when the exact pattern below is met. Mark these with confidence no higher than 60 (lower than a directly stated finding), and quote the specific phrase that justifies it:
- If the notes give a COMPLETE location description using language like "localized to", "confined to", "only in", or explicitly state "no radiation" / "does not radiate into the arm" — AND no arm/hand symptom is mentioned anywhere else in the notes — you may infer armHandPain: "false" and dermatomalPattern: "false". Do NOT make this inference from a partial or ambiguous location mention — omit instead of guessing.
- Do not chain inferences (never infer a second variable from an already-inferred one).

VARIABLE-SPECIFIC GUIDANCE:
- priorEpisodeCount: map any stated count of past episodes to EXACTLY one of these five strings, no others: "First episode", "2–3 episodes", "4–6 episodes", "More than 6", "Continuous since onset".
- whiplashMechanism: "true" only from an explicit description of a motor vehicle collision, rear/front/side impact, or the word "whiplash" itself. A generic "neck pain after an accident" without any collision detail is not enough on its own — look for the collision description.
- quadrantAggravates: only from an explicit statement that a COMBINED movement (e.g. "looking up and turning", "extension and turning together", "tilting head back while turning") worsens symptoms — not from extension and rotation mentioned as two separate, unrelated aggravators.
- armOverheadRelievesArmSymptoms: only from an explicit statement that raising/resting the arm overhead or on the head relieves arm/hand symptoms (Bakody's sign pattern) — not a general comfort statement about arm position.
- occipitalHeadache: only when a headache is explicitly present AND its location is described at the base of the skull / back of the head / suboccipital area.
- objectiveNeuroSigns: only from an explicit statement of observed wasting/atrophy, or an examiner-confirmed numbness — not from the patient merely reporting a subjective sensation of weakness without more detail.
6. Cervical myelopathy / VBI / craniovertebral instability / other-serious-pathology findings are NEVER reported as ordinary variables even when explicitly mentioned as positive or negative in the notes — always use the matching red-flag category name below instead, exactly as written, so it routes to clinician review rather than being silently merged into scoring:
   - myelopathyConcern — any mention of bilateral hand symptoms, gait disturbance, unsteady/wide-based gait, new bowel/bladder change, hyperreflexia, Babinski/Hoffman's, rapidly progressive neurological symptoms.
   - vbiConcern — any mention of dizziness/vertigo with neck movement, drop attacks, diplopia, dysarthria, dysphagia, ataxia with neck movement, nystagmus.
   - instabilityConcern — any mention of known rheumatoid arthritis, Down syndrome, recent significant trauma, post-surgical cervical fusion, or a sense of the head being unstable on the neck.
   - otherSeriousPathologyConcern — fracture/neoplasm/infection indicators (e.g. recent high-energy trauma, unexplained weight loss, fever/night sweats, known cervical cancer history), or a meningism pattern (neck stiffness plus fever).

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
