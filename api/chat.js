export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, patientContext } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'No messages provided' });

  const DS_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DS_KEY) return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });

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
    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DS_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (!dsRes.ok) {
      const errText = await dsRes.text();
      return res.status(502).json({ error: 'DeepSeek error', detail: errText });
    }

    const data = await dsRes.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'Empty response from DeepSeek' });
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
