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

  const system = `You are a clinical data extractor for a physiotherapy intake form. Extract structured data and return ONLY valid JSON.

Return this exact JSON shape (null for anything not mentioned, empty array [] for arrays):
{
  "age": number or null, "sex": "Male"|"Female"|"Other"|null, "occupation": string or null,
  "region": one of ["Lumbar / SI","Cervical spine","Thoracic spine","Shoulder (L)","Shoulder (R)","Knee (L)","Knee (R)","Hip / Groin","Ankle / Foot","Elbow/Wrist/Hand"] or null,
  "laterality": "Left"|"Right"|"Bilateral"|null,
  "duration": one of ["< 1 week (hyperacute)","1–2 weeks (acute)","2–6 weeks (subacute)","6 weeks–3 months","3–6 months (chronic)","6–12 months","1–2 years","> 2 years"] or null,
  "onset": one of ["Sudden — traumatic","Sudden — no trauma","Gradual — insidious","Sport-related","Lifting injury","Twisting injury","MVA / whiplash","Post-surgical","Woke with it","Repetitive strain","After new activity","Post-partum","Post-illness / viral","No clear cause"] or null,
  "nrsNow": number 0-10 or null, "nrsWorst": number 0-10 or null, "nrsBest": number 0-10 or null,
  "painQuality": array of 0-4 from ["Sharp","Dull","Aching","Throbbing","Burning","Shooting","Stabbing","Electric shock","Tingling","Pins and needles","Numbness","Heaviness","Tightness","Pressure","Cramping","Grinding","Catching","Weakness"],
  "aggMovements": array of 0-4 plain English movement descriptions,
  "aggActivities": array of 0-4 plain English activity descriptions,
  "relMovements": array of 0-4 plain English relief descriptions,
  "hasRadiation": true|false|null, "radiationSide": "Left"|"Right"|"Bilateral"|null, "radiationArea": string or null,
  "neuroSymptoms": array of 0-3 from ["No neurological symptoms","Objective numbness in specific area","Tingling","Pins and needles","Shooting pain","Burning — constant","Electric shock quality","Subjective weakness","Dropping objects involuntarily"],
  "flags": array of red flag strings or []
}
If input is Hindi/mixed, extract clinical meaning in English.`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: system }, { role: 'user', content: text.trim() }],
        temperature: 0.1, max_tokens: 900,
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) { const t = await r.text(); return res.status(502).json({ error: 'Groq error', detail: t }); }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'Empty response' });
    return res.status(200).json(JSON.parse(content));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
