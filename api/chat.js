export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, patientContext } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'No messages provided' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

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

  // Convert OpenAI-style messages to Gemini format
  const geminiContents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
        }),
      }
    );

    if (!gemRes.ok) {
      const errText = await gemRes.text();
      return res.status(502).json({ error: 'Gemini error', detail: errText });
    }

    const data = await gemRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return res.status(502).json({ error: 'Empty response from Gemini' });
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
