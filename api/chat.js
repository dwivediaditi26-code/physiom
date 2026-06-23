export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, patientContext } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'No messages provided' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  const systemPrompt = `You are an expert clinical physiotherapy AI assistant. You assist physiotherapists with:
- Clinical reasoning and differential diagnosis
- Evidence-based treatment recommendations
- SOAP note generation and improvement
- Exercise prescription advice
- Red flag screening interpretation
- Clinical outcome interpretation
- Referral and imaging decisions

${patientContext ? `CURRENT PATIENT CONTEXT:\n${patientContext}\n` : ''}

Respond clearly and concisely. Use clinical terminology appropriately. Always remind the clinician that final decisions rest with them. Format lists with dashes when helpful.`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });
    if (!r.ok) { const t = await r.text(); return res.status(502).json({ error: 'Groq error', detail: t }); }
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'Empty response from Groq' });
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
