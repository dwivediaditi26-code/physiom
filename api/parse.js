export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided' });

  const DS_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DS_KEY) return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });

  const system = `You are a clinical data extractor for a physiotherapy intake form. Extract structured data and return ONLY valid JSON.

Return this exact JSON shape (null for anything not mentioned, empty array [] for arrays):
{
  "age": number or null,
  "sex": "Male"|"Female"|"Other"|null,
  "occupation": string or null,
  "region": one of ["Lumbar / SI","Cervical spine","Thoracic spine","Shoulder (L)","Shoulder (R)","Knee (L)","Knee (R)","Hip / Groin","Ankle / Foot","Elbow/Wrist/Hand"] or null,
  "laterality": "Left"|"Right"|"Bilateral"|null,
  "duration": one of ["< 1 week (hyperacute)","1–2 weeks (acute)","2–6 weeks (subacute)","6 weeks–3 months","3–6 months (chronic)","6–12 months","1–2 years","> 2 years"] or null,
  "onset": one of ["Sudden — traumatic","Sudden — no trauma","Gradual — insidious","Sport-related","Lifting injury","Twisting injury","MVA / whiplash","Post-surgical","Woke with it","Repetitive strain","After new activity","Post-partum","Post-illness / viral","No clear cause"] or null,
  "nrsNow": number 0-10 or null,
  "nrsWorst": number 0-10 or null,
  "nrsBest": number 0-10 or null,
  "painQuality": array of 0-4 from ["Sharp","Dull","Aching","Throbbing","Burning","Shooting","Stabbing","Electric shock","Tingling","Pins and needles","Numbness","Heaviness","Tightness","Pressure","Cramping","Grinding","Catching","Weakness"],
  "symptomPattern": one of ["Constant — never goes away","Constant — varies in intensity","Intermittent — clear triggers","Intermittent — unpredictable","Activity-related only","Position-related only","Morning dominant"] or null,
  "diurnalPattern": one of ["Mechanical — worse with load/posture, better with rest","Inflammatory — morning stiffness >30 min, eases with movement","Neuropathic — constant, burning, worse at night","Postural — sustained position dependent","No clear 24hr pattern","Unpredictable"] or null,
  "morningSymptoms": array of 0-2 from ["No morning symptoms","Stiff but eases quickly <30 min","Stiff — takes 30–60 min to ease","Stiff — stays bad all morning (inflammatory flag)","Pain on waking — worst first thing","Stiff — takes >1 hour to ease (inflammatory flag)","Painful on waking — stays painful all morning"],
  "nightSymptoms": array of 0-2 from ["No night symptoms","Difficulty finding comfortable position","Pain on turning over in bed","Wakes once from sleep","Wakes multiple times from sleep","Constant night pain — cannot sleep","Gets up to walk (restlessness / inflammatory)","Wakes once from pain","Wakes 2–3 times from pain"],
  "aggMovements": array of 0-4 plain English movement descriptions that make it worse,
  "aggActivities": array of 0-4 plain English activity descriptions that make it worse,
  "relMovements": array of 0-4 plain English movement or position descriptions that make it better,
  "hasRadiation": true|false|null,
  "radiationSide": "Left"|"Right"|"Bilateral"|null,
  "radiationArea": string describing where it radiates or null,
  "neuroSymptoms": array of 0-3 from ["No neurological symptoms","Objective numbness in specific area","Tingling","Pins and needles","Shooting pain","Burning — constant","Electric shock quality","Subjective weakness","Dropping objects involuntarily"],
  "hasLegNeuro": "No leg neurological symptoms"|"Yes — unilateral (L)"|"Yes — unilateral (R)"|"Yes — bilateral (cauda equina / stenosis flag)"|null,
  "flags": array of red flag strings or []
}
If input is Hindi/mixed, extract clinical meaning in English.`;

  try {
    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DS_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text.trim() },
        ],
        temperature: 0.1,
        max_tokens: 900,
        response_format: { type: 'json_object' },
      }),
    });

    if (!dsRes.ok) {
      const errText = await dsRes.text();
      return res.status(502).json({ error: 'DeepSeek error', detail: errText });
    }

    const dsData = await dsRes.json();
    const content = dsData.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'Empty response' });
    const parsed = JSON.parse(content);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
