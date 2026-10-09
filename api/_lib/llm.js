// api/_lib/llm.js -- one place that talks to the AI model, with a fallback.
//
// api/parse.js used to call Groq directly, so when Groq's daily token limit ran
// out (200,000 tokens/day on the free plan -- about 20 intakes) every student
// saw an error until the next day (2026-10-07). Now the AI intake asks this
// file for a JSON answer; it tries the providers that have a key set, in order,
// and moves on to the next one when a provider fails (limit reached, outage,
// bad key, empty or broken answer).
//
//   GROQ_API_KEY      Groq  (openai/gpt-oss-120b)
//   GEMINI_API_KEY    Google Gemini (default gemini-2.5-flash-lite; GEMINI_MODEL changes it)
//   AI_PROVIDER_ORDER "groq,gemini" (default) or "gemini,groq"
//
// With only one key set it behaves exactly as before. PRIVACY: use a Gemini key
// from a project with billing turned on. On Google's free tier, prompts are used
// to improve Google's products; on the paid tier they are not. Students type
// patient stories into this.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export function providerOrder(env = process.env) {
  const wanted = String(env.AI_PROVIDER_ORDER || 'groq,gemini').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const seen = new Set();
  return wanted.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return (p === 'groq' && !!env.GROQ_API_KEY) || (p === 'gemini' && !!env.GEMINI_API_KEY);
  });
}

async function callGroq({ system, user, maxTokens }, env) {
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // gpt-oss-120b is a reasoning model: reasoning tokens land in a separate
      // message.reasoning field, never mixed into content, so JSON.parse of the
      // content is unaffected. Reasoning kept low and excluded -- this is
      // structured extraction, not a task that benefits from chain-of-thought.
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.1, max_completion_tokens: maxTokens,
      reasoning_effort: 'low', include_reasoning: false,
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) return { ok: false, status: 502, error: 'Groq error', detail: await r.text() };
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return { ok: false, status: 502, error: 'Empty response' };
  return { ok: true, content };
}

async function callGemini({ system, user, maxTokens }, env) {
  const model = env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  const r = await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    }),
  });
  if (!r.ok) return { ok: false, status: 502, error: 'Gemini error', detail: await r.text() };
  const data = await r.json();
  if (data.promptFeedback?.blockReason) return { ok: false, status: 502, error: 'Gemini error', detail: `blocked: ${data.promptFeedback.blockReason}` };
  const content = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  if (!content) return { ok: false, status: 502, error: 'Empty response' };
  return { ok: true, content };
}

const CALLERS = { groq: callGroq, gemini: callGemini };

// Ask for a JSON object. Returns { ok: true, json, provider } or
// { ok: false, status, error, detail }. A provider that errors, returns nothing,
// or returns text that is not valid JSON is skipped and the next one is tried.
// One short, header-safe line about why a provider was skipped (no keys, no
// patient text): Google/Groq error messages only say things like "API key not valid".
export function skipNote(skipped = []) {
  return skipped.map((s) => {
    let msg = String(s.detail || '');
    try { msg = JSON.parse(msg)?.error?.message || msg; } catch { /* plain text */ }
    return `${s.provider}: ${s.error}${msg ? ` - ${msg}` : ''}`;
  }).join(' | ').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').slice(0, 220);
}

export async function chatJson({ system, user, maxTokens = 3000, env = process.env }) {
  const order = providerOrder(env);
  if (!order.length) return { ok: false, status: 500, error: 'No AI key configured (set GROQ_API_KEY or GEMINI_API_KEY)' };
  const failures = [];
  for (const provider of order) {
    let result;
    try {
      result = await CALLERS[provider]({ system, user, maxTokens }, env);
    } catch (e) {
      result = { ok: false, status: 502, error: `${provider === 'groq' ? 'Groq' : 'Gemini'} unreachable`, detail: e.message };
    }
    if (result.ok) {
      try {
        // `skipped` lists providers tried first that failed, so an admin can see why.
        return { ok: true, json: JSON.parse(result.content), provider, skipped: failures.map(({ provider: p, error, detail }) => ({ provider: p, error, detail })) };
      } catch (parseErr) {
        result = { ok: false, status: 502, error: 'Malformed extraction JSON', detail: parseErr.message };
      }
    }
    failures.push({ provider, ...result });
    if (order.length > 1) console.warn(`[ai] ${provider} failed (${result.error}); ${provider === order[order.length - 1] ? 'no more providers' : 'trying the next one'}`);
  }
  if (failures.length === 1) {
    const { provider, ...f } = failures[0];
    return { ok: false, ...f };
  }
  return { ok: false, status: 502, error: 'AI service unavailable', detail: failures.map((f) => `${f.provider}: ${f.error}${f.detail ? ` — ${String(f.detail).slice(0, 300)}` : ''}`).join(' | ') };
}
