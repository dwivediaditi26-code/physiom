export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  const system = `You are a clinical data extractor for a physiotherapy intake form used by physiotherapy students and clinicians for real patient care decisions. Extract structured data and return ONLY valid JSON.

CRITICAL — DO NOT HALLUCINATE. You are a scribe, not a clinician. Extract ONLY what the speaker explicitly states.
- Never invent, assume, infer, predict, or fill in a "typical" or "expected" value for anything not explicitly said, even if it seems clinically likely.
- If a value is not explicitly and unambiguously stated, you MUST return null (or [] for arrays) for that field. Do not guess.
- Do not summarize away or merge details in a way that changes their meaning. Carry over specific detail (a named diagnosis, a specific number, a specific activity) exactly as the speaker described it, not a generic paraphrase.
- It is always better to leave a field null than to guess incorrectly. Incorrect clinical data is dangerous in this application.
- Preserve the patient's own descriptive words rather than fully replacing them with clinical terminology. If they say "between my shoulder blades", don't silently reduce that to just a region code -- carry the phrase itself into the relevant free-text field alongside the structured classification.

Return this exact JSON shape (null for anything not mentioned, empty array [] for arrays):
{
  "chiefComplaint": a short, one-line clinical summary a physiotherapist would write as the presenting complaint -- include the specific diagnosis/injury if one is mentioned (e.g. a fracture, tear, or surgery), the body part, and its current status. Do NOT include a chronicity/duration adjective (acute, subacute, chronic) here -- that belongs only in the separate "duration" and "symptomPattern" fields below; inventing one here (e.g. calling a 3-week history "chronic") is a factual error, not a paraphrase. Examples: "Left distal radius fracture, cast removed, 6 weeks post-injury" or "Post-op right shoulder stiffness, 2 months post greater tuberosity fracture" or "Mechanical low back pain, no red flags". Do not just restate the region -- carry over any injury/diagnosis detail the patient description already stated. String or null if truly nothing describable.
  "age": number or null, "sex": "Male"|"Female"|"Other"|null, "occupation": string or null,
  "region": one of ["Lumbar / SI","Cervical spine","Thoracic spine","Shoulder (L)","Shoulder (R)","Knee (L)","Knee (R)","Hip / Groin","Ankle / Foot","Elbow/Wrist/Hand"] or null,
  "laterality": "Left"|"Right"|"Bilateral"|null,
  "locationDescription": string or null -- the patient's own words for exactly where the symptom is, kept close to how they said it (e.g. "Between the shoulder blades", "Front of the knee, just below the kneecap", "Deep in the buttock"). This is more specific than "region" above (which is just the general body area) -- don't just repeat the region name here, carry over their actual descriptive phrase. Null if they didn't describe the location beyond naming the general area.
  "duration": one of ["< 1 week (hyperacute)","1–2 weeks (acute)","2–6 weeks (subacute)","6 weeks–3 months","3–6 months (chronic)","6–12 months","1–2 years","> 2 years"] or null,
  "onset": one of ["Sudden — traumatic","Sudden — no trauma","Gradual — insidious","Sport-related","Lifting injury","Twisting injury","MVA / whiplash","Post-surgical","Woke with it","Repetitive strain","After new activity","Post-partum","Post-illness / viral","No clear cause"] or null -- only choose a SPECIFIC mechanism ("Lifting injury", "Twisting injury", "Sport-related", etc.) if the patient states it as the actual cause with reasonable confidence. If the patient hedges about the cause ("maybe", "not sure if", "possibly related to", "I think it might be because of") rather than stating it plainly, do NOT pick that specific mechanism -- use "Gradual — insidious" (or "No clear cause" if truly nothing points anywhere) instead, and put the patient's own tentative wording in onsetContext below. If the patient explicitly denies a fall or sudden traumatic event, do not choose "Sudden — traumatic".
  "nrsNow": number 0-10 or null, "nrsWorst": number 0-10 or null, "nrsBest": number 0-10 or null,
  "painQuality": array of 0-4 from ["Sharp","Dull","Aching","Throbbing","Burning","Shooting","Stabbing","Electric shock","Tingling","Pins and needles","Numbness","Heaviness","Tightness","Pressure","Cramping","Grinding","Catching","Weakness"] -- only include a word here if the patient actually used it or an unambiguous synonym (they said "sharp", "burning", "throbbing", etc.). Never pick a quality because it's typical for the region or a likely diagnosis -- if no quality word was used at all, this must be [].
  "symptomPattern": one of ["Constant — always present, varies in intensity","Intermittent — comes and goes","Mechanical — clearly varies with movement/position/load","Non-mechanical — no clear relationship to movement"] or null -- only set this if the patient description actually supports it, don't guess.
  "diurnalPattern": a phrase capturing any time-linked pattern mentioned -- time of day (morning, afternoon, evening, night) AND activity-linked delayed onset (after work, after sitting, after walking, etc.), e.g. "Worse first thing in the morning, eases through the day", "Fine in the morning, worsens by afternoon/evening", "Comes on after sitting for a while", "Aches after a day at work", "Worse at night, disturbs sleep". Cover every distinct time-linked pattern the patient mentioned, not just one -- or null if nothing about timing was mentioned.
  "morningSymptoms": array of 0-3 plain English descriptions of anything specifically worse/present in the morning (e.g. "Stiffness for 30 minutes on waking"), or [] if not mentioned.
  "nightSymptoms": array of 0-3 plain English descriptions of anything specifically worse/present at night (e.g. "Wakes with pain when rolling over"), or [] if not mentioned.
  "aggMovements": array of 0-4 plain English movement descriptions,
  "aggActivities": array of 0-4 plain English activity descriptions,
  "relMovements": array of 0-4 plain English relief descriptions,
  -- NEVER put the same activity/movement in both an aggravating list (aggMovements/aggActivities) and relMovements. If an activity comes up in a context where it's unclear which it is, re-read the sentence describing it and decide from what the patient actually said: did they say it makes things WORSE (aggravating) or BETTER (relieving)? Example: "If I stretch backwards it feels better" means "Stretching backwards" belongs ONLY in relMovements, never in aggMovements -- the direction the patient stated always decides which single list it goes in.
  "hasRadiation": true|false|null -- set true for ANY symptom described in a limb away from the main complaint area, not just classic shooting/sciatica-style pain. This includes neurogenic claudication (legs aching, heavy, or weak after walking a certain distance, relieved by sitting or bending forward) and any other referred limb symptom tied to a spinal or joint complaint.
  "radiationSide": "Left"|"Right"|"Bilateral"|null, "radiationArea": string or null -- describe what's actually happening there, e.g. "Bilateral leg heaviness and aching after walking >5 min, relieved by sitting or leaning forward" -- don't just name the limb, carry over the pattern the patient described.
  "neuroSymptoms": array of 0-3 from ["No neurological symptoms","Objective numbness in specific area","Tingling","Pins and needles","Shooting pain","Burning — constant","Electric shock quality","Subjective weakness","Heaviness/weakness in legs after walking (claudication pattern)","Dropping objects involuntarily"] -- if the patient EXPLICITLY denies these ("no numbness", "no pins and needles", "no weakness"), set this to ["No neurological symptoms"] rather than leaving it as [] -- an explicit denial is a real, valuable clinical finding and must be recorded, distinct from [] which means neurological symptoms were simply never discussed.
  "hasBladderBowelSymptoms": true|false|null -- true only if the patient describes any new bladder or bowel change (incontinence, retention, numbness, loss of control) in the context of their current complaint. false if they explicitly deny it (e.g. "no bladder or bowel problems"). null if never mentioned either way. This is a cauda equina red-flag screen -- never guess.
  "priorEpisodeCount": one of ["First episode","2–3 episodes","4–6 episodes","More than 6","Continuous since onset"] or null -- how many times (including now) this same problem has occurred, only if the patient explicitly describes it happening before as a SEPARATE, distinct occurrence (e.g. "this happened once before", "it's come back again", "2 years ago I had the same thing"). A single long-standing CURRENT episode is not a "prior episode" no matter how long it has lasted -- leave this null unless a genuinely separate earlier occurrence is described.
  "priorEpisodeOutcome": one of ["Resolved fully on its own","Physiotherapy helped","Medication helped","Injection helped","Surgery helped","Did not fully resolve","Never fully resolved"] or null -- how a PREVIOUS, SEPARATE episode resolved, only if one was actually described (see priorEpisodeCount). Do NOT use this for a treatment tried during the CURRENT episode (e.g. "had an injection a few weeks ago which helped briefly") -- that belongs in priorTreatmentTried below, not here. If no distinct prior episode was mentioned, this must be null.
  "medicalHistory": string or null -- relevant past medical history / comorbidities exactly as the patient described them, including explicit denials (e.g. "No diabetes or hypertension"). Do not infer conditions that weren't mentioned.
  "medications": string or null -- current medications exactly as stated, including explicit denials (e.g. "Not on any regular medications").
  "functionalLimitations": array of 0-4 plain English descriptions of activities/participation the patient says are affected (e.g. "Difficulty sitting at desk for long periods", "Difficulty driving", "Difficulty playing with children"), or [] if not mentioned.
  "patientGoals": string or null -- what the patient says they want to achieve/return to, in their own words or a close paraphrase (e.g. "Return to work and exercise without pain"), or null if not mentioned.
  "patientConcern": string or null -- the patient's own main WORRY or FEAR about their condition or its impact, distinct from their functional/treatment goal (e.g. "Worried about losing customers/income if unable to work", "Scared it might need surgery"). Only set this if the patient expressed an actual worry or fear in their own words -- do not infer one from their goal.
  "onsetContext": string or null -- when the patient's own description of how it started includes hedging, uncertainty, or a tentative link to an activity ("maybe that's got something to do with it", "not sure if that's related"), capture that nuance here as a close paraphrase that PRESERVES the uncertainty (e.g. "Denies a fall; noticed it around the time of a house move involving a lot of lifting, but is unsure if that's the cause"). Leave null if the patient stated the mechanism plainly and confidently (that goes in "onset" instead).
  "patientBelief": string or null -- the patient's own THEORY about what's causing or contributing to their problem, in their own words or a close paraphrase (e.g. "Thinks it's from poor posture at his desk", "Believes she slept awkwardly", "Thinks it's just old age catching up"). This is the patient's OPINION about cause, not a confirmed mechanism or a clinical diagnosis -- record it as their belief, never as fact. Distinct from onsetContext above: onsetContext is about how THIS episode actually started (a hedged mechanism), patientBelief is their broader personal theory about the underlying cause (which may or may not be about the onset moment at all, e.g. posture, ageing, stress, sleep habits as an ongoing pattern). If the same sentence covers both, it's fine to fill both -- they serve different purposes downstream. Null if the patient never voiced a theory about cause.
  "priorTreatmentTried": string or null -- any treatment already tried FOR THE CURRENT problem (injection, physio, medication, etc.) and its outcome, exactly as described (e.g. "Cortisone injection about a month ago — gave roughly 2 weeks of relief before pain returned"). This is about treatment during the CURRENT episode, NOT a separate prior episode -- see priorEpisodeOutcome above for that distinction.
  "flags": array of red flag strings or [],
  "_confidence": an object mapping EVERY field above that you filled with a non-null/non-empty value to an integer 0-100 confidence score, reflecting how explicitly and unambiguously the narrative stated it. Use 100 only when it's stated in nearly these exact words. Use below 70 if you are inferring/interpreting rather than directly reading. Only include keys for fields you actually filled -- do not include keys for fields you left null or empty.
  "_sourceQuotes": an object mapping EVERY field above that you filled with a non-null/non-empty value to a short (5-15 word) quote or very close paraphrase from the ORIGINAL narrative that directly supports that value. This must be real substance from what was actually said -- never invent a quote. Only include keys for fields you actually filled.
}

FINAL CHECK -- before you output, re-examine every field you are about to set to a non-null/non-empty value: could you point to the actual words in the transcript that prove it? If you cannot, set it to null (or [] for arrays) and leave it out of _confidence/_sourceQuotes -- do not include a plausible-sounding value just because it commonly fits this kind of presentation. Two specific mistakes to avoid, both seen in real output before this instruction was added: (1) completing a "typical" clinical picture -- inventing a pain quality (e.g. "Sharp"), a previous episode, or a confident mechanism the patient never actually described, because it's common for this kind of complaint; (2) letting one real detail bleed into the wrong field -- a treatment tried during the CURRENT episode is not evidence of a SEPARATE prior episode. Evidence in the transcript always wins over what's statistically likely.
If input is Hindi/mixed, extract clinical meaning in English.`;

  // ── STAGE 2: verification pass ──────────────────────────────────────────
  // A second, independent Groq call whose only job is to cross-check the
  // first pass against the transcript and fix two things: (a) values with
  // no real textual support, (b) the same activity landing in BOTH
  // aggMovements/aggActivities and relMovements -- a direct clinical
  // inversion (real QA example: "if I stretch backwards it feels better"
  // came back in the aggravating list too). Real multi-transcript QA
  // found that asking the FIRST call to "double check itself" in the same
  // generation (the FINAL CHECK instruction above) still let both error
  // classes through -- a single autoregressive pass tends to stay
  // consistent with tokens it already emitted. A genuinely separate call,
  // reading the same evidence with no memory of having written the first
  // answer, is a structurally different (and stronger) check, not just
  // the same instruction repeated.
  const verifierSystem = `You are a strict fact-checking reviewer for a physiotherapy intake extraction. You will be given the ORIGINAL patient narrative and a FIRST-PASS extraction of it as JSON, produced by a separate pass that sometimes over-interprets. Your only job is to output a CORRECTED version of that exact JSON, fixing two kinds of errors and nothing else:

1. UNSUPPORTED VALUES -- for every field that is not null/empty, check whether the ORIGINAL NARRATIVE actually, explicitly supports it. If you cannot point to the words that prove it, change that field to null (or [] for arrays). This includes: a pain quality, previous episode, or specific onset mechanism that isn't really stated; a treatment tried during the CURRENT episode wrongly recorded as a separate prior episode. Do not touch a field that IS genuinely supported -- leave it exactly as given.

2. MISCLASSIFIED FACTS -- most importantly: the same activity/movement must never appear in both an aggravating list (aggMovements/aggActivities) and relMovements. If you find the same (or clearly the same) activity in both, re-read the sentence describing it in the original narrative and decide from what the patient actually said: worse (aggravating) or better (relieving)? Keep it in ONLY the correct list and remove it from the other. Example: "if I stretch backwards it feels better" belongs ONLY in relMovements, never in aggMovements, even if the first pass put it in both.

Do not invent new information that isn't in the first-pass JSON or the narrative. Do not change a field's value unless you found a real, evidence-based problem with it -- when in doubt whether something is genuinely correct, leave it exactly as the first pass had it. Return ONLY the corrected JSON object, in EXACTLY the same shape as the first-pass JSON you were given (the same keys, the same value types, nothing added or removed). If a field's value changes, keep _confidence/_sourceQuotes in sync (remove entries for anything you nulled out).`;

  try {
    const extractResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // llama-3.3-70b-versatile was deprecated by Groq on 2026-06-17,
        // shutdown 2026-08-16 (console.groq.com/docs/deprecations) --
        // migrated to their recommended replacement ahead of that date.
        // gpt-oss-120b is a reasoning model: reasoning tokens land in a
        // separate message.reasoning field, never mixed into content, so
        // JSON.parse(content) below is unaffected. Reasoning kept low and
        // excluded from the response -- this is structured extraction,
        // not a task that benefits from visible chain-of-thought, and low
        // effort keeps latency close to the old non-reasoning model's.
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: system }, { role: 'user', content: text.trim() }],
        temperature: 0.1, max_completion_tokens: 3000,
        reasoning_effort: 'low', include_reasoning: false,
        response_format: { type: 'json_object' },
      }),
    });
    if (!extractResp.ok) { const t = await extractResp.text(); return res.status(502).json({ error: 'Groq error', detail: t }); }
    const extractData = await extractResp.json();
    const extractContent = extractData.choices?.[0]?.message?.content;
    if (!extractContent) return res.status(502).json({ error: 'Empty response' });
    let firstPass;
    try { firstPass = JSON.parse(extractContent); }
    catch (parseErr) { return res.status(502).json({ error: 'Malformed extraction JSON', detail: parseErr.message }); }

    // Verification is a strict-improvement layer, not a new point of
    // failure for a feature that already works stand-alone -- any problem
    // here (network error, bad JSON, non-OK response) falls back to the
    // first pass rather than failing the whole request.
    try {
      const verifyResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: verifierSystem },
            { role: 'user', content: `ORIGINAL NARRATIVE:\n${text.trim()}\n\nFIRST-PASS EXTRACTION:\n${JSON.stringify(firstPass)}` },
          ],
          temperature: 0.1, max_completion_tokens: 3000,
          reasoning_effort: 'low', include_reasoning: false,
          response_format: { type: 'json_object' },
        }),
      });
      if (!verifyResp.ok) return res.status(200).json(firstPass);
      const verifyData = await verifyResp.json();
      const verifyContent = verifyData.choices?.[0]?.message?.content;
      if (!verifyContent) return res.status(200).json(firstPass);
      const verified = JSON.parse(verifyContent);
      return res.status(200).json(verified);
    } catch (verifyErr) {
      return res.status(200).json(firstPass);
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
