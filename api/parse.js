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

  const system = `You are a clinical data extractor for a physiotherapy intake form. The physiotherapist dictates or types shorthand notes. Extract structured data and return ONLY valid JSON — no explanation, no markdown.

Return this exact JSON shape (use null for anything not mentioned):
{
  "age": number or null,
  "sex": "Male" | "Female" | "Other" | null,
  "occupation": string or null,
  "region": one of ["Lumbar / SI","Cervical spine","Thoracic spine","Shoulder (L)","Shoulder (R)","Knee (L)","Knee (R)","Hip / Groin","Ankle / Foot","Elbow/Wrist/Hand"] or null,
  "laterality": "Left" | "Right" | "Bilateral" | null,
  "duration": one of ["< 1 week (hyperacute)","1–2 weeks (acute)","2–6 weeks (subacute)","6 weeks–3 months","3-6 months (chronic)","6-12 months","1-2 years","> 2 years"] or null,
  "onset": one of ["Sudden — traumatic","Sudden — no trauma","Gradual — insidious","Sport-related","Lifting injury","Twisting injury","MVA / whiplash","Post-surgical","Woke with it","Repetitive strain","After new activity","Post-partum","Post-illness / viral","No clear cause"] or null,
  "nrsNow": number 0-10 or null,
  "nrsWorst": number 0-10 or null,
  "nrsBest": number 0-10 or null,
  "aggravating": array of plain strings describing what makes it worse,
  "relieving": array of plain strings describing what makes it better,
  "pattern": one of ["Mechanical — worse with load/posture, better with rest","Inflammatory — morning stiffness >30 min, eases with movement","Neuropathic — constant, burning, worse at night","Postural — sustained position dependent","No clear 24hr pattern"] or null,
  "morningStiffness": "Stiff but eases quickly <30 min" | "Stiff — takes 30-60 min to ease" | "Stiff — stays bad all morning (inflammatory flag)" | null,
  "nightPain": true | false | null,
  "hasRadiation": true | false,
  "radiationDetail": string or null,
  "flags": array of red flag strings found or []
}
If input is Hindi or mixed, extract clinical meaning in English.`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text.trim() },
        ],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return res.status(502).json({ error: 'Groq error', detail: errText });
    }

    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'Empty response' });
    const parsed = JSON.parse(content);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
