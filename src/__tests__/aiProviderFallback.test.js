// The AI intake asks api/_lib/llm.js for its answer. Groq is tried first and
// Gemini takes over when Groq fails (daily limit used up, outage, bad answer),
// so students are not locked out for the rest of the day (2026-10-07: Groq's
// 200,000 tokens/day ran out after about 20 intakes).
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../api/_lib/rateLimit.js", () => ({ authenticateAndRateLimit: vi.fn(async () => "test-user") }));

import { chatJson, providerOrder, skipNote } from "../../api/_lib/llm.js";
import handler from "../../api/parse.js";

const groqOk = (obj) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }), text: async () => "" });
const geminiOk = (obj) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), text: async () => "" });
const limit429 = (msg = "Rate limit reached on tokens per day (TPD)") => ({ ok: false, status: 429, text: async () => msg, json: async () => ({}) });

const ENV_KEYS = ["GROQ_API_KEY", "GEMINI_API_KEY", "GEMINI_MODEL", "AI_PROVIDER_ORDER"];
let saved;
beforeEach(() => { saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]])); ENV_KEYS.forEach((k) => delete process.env[k]); });
afterEach(() => { ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))); vi.restoreAllMocks(); });

const isGroq = (url) => String(url).includes("api.groq.com");
const isGemini = (url) => String(url).includes("generativelanguage.googleapis.com");

describe("which providers are used, and in what order", () => {
  test("only the providers that have a key", () => {
    expect(providerOrder({})).toEqual([]);
    expect(providerOrder({ GROQ_API_KEY: "g" })).toEqual(["groq"]);
    expect(providerOrder({ GEMINI_API_KEY: "m" })).toEqual(["gemini"]);
    expect(providerOrder({ GROQ_API_KEY: "g", GEMINI_API_KEY: "m" })).toEqual(["groq", "gemini"]);
  });
  test("AI_PROVIDER_ORDER changes the order, and an unknown or key-less name is ignored", () => {
    expect(providerOrder({ GROQ_API_KEY: "g", GEMINI_API_KEY: "m", AI_PROVIDER_ORDER: "gemini,groq" })).toEqual(["gemini", "groq"]);
    expect(providerOrder({ GROQ_API_KEY: "g", AI_PROVIDER_ORDER: "gemini,groq,openai" })).toEqual(["groq"]);
  });
});

describe("chatJson with both keys", () => {
  beforeEach(() => { process.env.GROQ_API_KEY = "groq-key"; process.env.GEMINI_API_KEY = "gem-key"; });

  test("uses Groq and never touches Gemini while Groq works", async () => {
    global.fetch = vi.fn(async (url) => (isGroq(url) ? groqOk({ a: 1 }) : geminiOk({ a: 2 })));
    const r = await chatJson({ system: "S", user: "U" });
    expect(r).toMatchObject({ ok: true, json: { a: 1 }, provider: "groq" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("moves to Gemini when Groq's daily limit is used up (429)", async () => {
    global.fetch = vi.fn(async (url) => (isGroq(url) ? limit429() : geminiOk({ a: 2 })));
    const r = await chatJson({ system: "S", user: "U" });
    expect(r).toMatchObject({ ok: true, json: { a: 2 }, provider: "gemini" });
  });

  test("moves to Gemini when Groq is unreachable, returns nothing, or returns broken JSON", async () => {
    for (const bad of [() => { throw new Error("network down"); }, () => ({ ok: true, json: async () => ({ choices: [] }) }), () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "not json {" } }] }) })]) {
      global.fetch = vi.fn(async (url) => (isGroq(url) ? bad() : geminiOk({ ok: "gemini" })));
      const r = await chatJson({ system: "S", user: "U" });
      expect(r).toMatchObject({ ok: true, provider: "gemini", json: { ok: "gemini" } });
    }
  });

  test("sends Gemini the instructions and the narrative separately, asks for JSON, and keeps the key in a header (not the URL)", async () => {
    process.env.GEMINI_MODEL = "gemini-test-model";
    global.fetch = vi.fn(async (url) => (isGroq(url) ? limit429() : geminiOk({ a: 2 })));
    await chatJson({ system: "THE-SYSTEM", user: "THE-NARRATIVE", maxTokens: 1234 });
    const [url, init] = global.fetch.mock.calls.find(([u]) => isGemini(u));
    expect(url).toContain("/models/gemini-test-model:generateContent");
    expect(url).not.toContain("gem-key");
    expect(init.headers["x-goog-api-key"]).toBe("gem-key");
    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe("THE-SYSTEM");
    expect(body.contents).toEqual([{ role: "user", parts: [{ text: "THE-NARRATIVE" }] }]);
    expect(body.generationConfig).toMatchObject({ temperature: 0.1, maxOutputTokens: 1234, responseMimeType: "application/json" });
  });

  test("a Gemini answer blocked by Google's safety filter counts as a failure", async () => {
    process.env.AI_PROVIDER_ORDER = "gemini,groq";
    global.fetch = vi.fn(async (url) => (isGemini(url) ? { ok: true, json: async () => ({ promptFeedback: { blockReason: "SAFETY" } }) } : groqOk({ from: "groq" })));
    const r = await chatJson({ system: "S", user: "U" });
    expect(r).toMatchObject({ ok: true, provider: "groq", json: { from: "groq" } });
  });

  test("when both fail, says so and keeps each provider's reason", async () => {
    global.fetch = vi.fn(async (url) => (isGroq(url) ? limit429("groq limit") : limit429("gemini quota")));
    const r = await chatJson({ system: "S", user: "U" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("AI service unavailable");
    expect(r.detail).toContain("groq limit");
    expect(r.detail).toContain("gemini quota");
  });
});

describe("chatJson with one key behaves as before", () => {
  test("Groq only: a 429 is reported as the same 'Groq error' with its detail", async () => {
    process.env.GROQ_API_KEY = "groq-key";
    global.fetch = vi.fn(async () => limit429("TPD reached"));
    const r = await chatJson({ system: "S", user: "U" });
    expect(r).toMatchObject({ ok: false, status: 502, error: "Groq error", detail: "TPD reached" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  test("Gemini only works on its own", async () => {
    process.env.GEMINI_API_KEY = "gem-key";
    global.fetch = vi.fn(async () => geminiOk({ x: 1 }));
    expect(await chatJson({ system: "S", user: "U" })).toMatchObject({ ok: true, provider: "gemini", json: { x: 1 } });
  });
  test("no key at all is a clear configuration error", async () => {
    const r = await chatJson({ system: "S", user: "U" });
    expect(r).toMatchObject({ ok: false, status: 500 });
    expect(r.error).toMatch(/GROQ_API_KEY or GEMINI_API_KEY/);
  });
});

describe("the AI intake endpoint (api/parse.js)", () => {
  function mockReqRes(body) {
    const headers = {};
    const res = { _status: 200, _json: null, setHeader: (k, v) => { headers[k] = v; }, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; } };
    return { req: { method: "POST", body }, res, headers };
  }

  test("with Groq out of tokens, both the reading and the double-check are done by Gemini and the student gets an answer", async () => {
    process.env.GROQ_API_KEY = "groq-key"; process.env.GEMINI_API_KEY = "gem-key";
    let geminiCalls = 0;
    global.fetch = vi.fn(async (url) => {
      if (isGroq(url)) return limit429();
      geminiCalls += 1;
      return geminiOk(geminiCalls === 1 ? { chiefComplaint: "first pass" } : { chiefComplaint: "verified" });
    });
    const { req, res, headers } = mockReqRes({ text: "Right shoulder pain for 6 weeks." });
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ chiefComplaint: "verified" });
    expect(headers["X-AI-Provider"]).toBe("gemini");
    expect(geminiCalls).toBe(2);
  });

  test("with Groq working, Gemini is never called (no cost, no data sent to Google)", async () => {
    process.env.GROQ_API_KEY = "groq-key"; process.env.GEMINI_API_KEY = "gem-key";
    global.fetch = vi.fn(async (url) => (isGroq(url) ? groqOk({ chiefComplaint: "ok" }) : geminiOk({})));
    const { req, res, headers } = mockReqRes({ text: "Knee pain." });
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(headers["X-AI-Provider"]).toBe("groq");
    expect(global.fetch.mock.calls.every(([u]) => isGroq(u))).toBe(true);
  });

  test("with every provider failing the student gets a clear error, not a hang", async () => {
    process.env.GROQ_API_KEY = "groq-key"; process.env.GEMINI_API_KEY = "gem-key";
    global.fetch = vi.fn(async () => limit429());
    const { req, res } = mockReqRes({ text: "Knee pain." });
    await handler(req, res);
    expect(res._status).toBe(502);
    expect(res._json.error).toBe("AI service unavailable");
  });
});

describe("the AI intake screen tells the console which AI answered", () => {
  test("logs the provider from the X-AI-Provider header, and stays quiet without it", async () => {
    vi.resetModules();
    vi.doMock("../supabase.js", () => import("../__mocks__/supabase.js"));
    const React = (await import("react")).default;
    const { render, screen, fireEvent, waitFor } = await import("@testing-library/react");
    const { default: Panel } = await import("../OrthoAIIntakePanel.jsx");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    for (const [header, expected] of [["gemini", true], [null, false]]) {
      info.mockClear();
      global.fetch = vi.fn(async () => ({ ok: true, headers: { get: (k) => (k === "X-AI-Provider" ? header : null) }, json: async () => ({ chiefComplaint: "Low back pain", region: "Lumbar / SI" }) }));
      const { unmount } = render(React.createElement(Panel, { onApply: () => {}, defaultOpen: true }));
      fireEvent.change(screen.getByPlaceholderText(/45 year old office worker/), { target: { value: "Low back pain for 5 days" } });
      fireEvent.click(screen.getByRole("button", { name: /Parse with AI/ }));
      await waitFor(() => expect(screen.getByText("Extracted Patient Information")).toBeTruthy());
      expect(info.mock.calls.some((c) => c[0] === "[AI intake] answered by" && c[1] === "gemini")).toBe(expected);
      unmount();
    }
  });
});

describe("admins see which AI answered, on screen", () => {
  async function runWith({ admin, header }) {
    vi.resetModules();
    vi.doMock("../supabase.js", () => import("../__mocks__/supabase.js"));
    vi.doMock("../useIsAdmin.js", () => ({ useIsAdmin: () => admin }));
    const React = (await import("react")).default;
    const { render, screen, fireEvent, waitFor, cleanup } = await import("@testing-library/react");
    cleanup(); // the previous test's screen must not leak into this one
    const { default: Panel } = await import("../OrthoAIIntakePanel.jsx");
    global.fetch = vi.fn(async () => ({ ok: true, headers: { get: (k) => (k === "X-AI-Provider" ? header : null) }, json: async () => ({ chiefComplaint: "Low back pain", region: "Lumbar / SI" }) }));
    render(React.createElement(Panel, { onApply: () => {}, defaultOpen: true }));
    fireEvent.change(screen.getByPlaceholderText(/45 year old office worker/), { target: { value: "Low back pain for 5 days" } });
    fireEvent.click(screen.getByRole("button", { name: /Parse with AI/ }));
    await waitFor(() => expect(screen.getByText("Extracted Patient Information")).toBeTruthy());
    return screen;
  }
  test("an admin sees 'AI engine: Gemini'", async () => {
    const screen = await runWith({ admin: true, header: "gemini" });
    expect(screen.getByTestId("ai-provider-note").textContent).toBe("AI engine: Gemini");
  });
  test("a student sees nothing about it", async () => {
    const screen = await runWith({ admin: false, header: "gemini" });
    expect(screen.queryByTestId("ai-provider-note")).toBeNull();
  });
});

describe("an admin can see why Gemini was skipped", () => {
  test("chatJson reports the skipped provider and its reason, and skipNote makes a short header-safe line", async () => {
    process.env.GROQ_API_KEY = "groq-key"; process.env.GEMINI_API_KEY = "gem-key"; process.env.AI_PROVIDER_ORDER = "gemini,groq";
    global.fetch = vi.fn(async (url) => (isGemini(url)
      ? { ok: false, status: 400, text: async () => JSON.stringify({ error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }) }
      : groqOk({ a: 1 })));
    const r = await chatJson({ system: "S", user: "U" });
    expect(r).toMatchObject({ ok: true, provider: "groq" });
    expect(r.skipped).toHaveLength(1);
    expect(skipNote(r.skipped)).toBe("gemini: Gemini error - API key not valid. Please pass a valid API key.");
    expect(skipNote([{ provider: "gemini", error: "Gemini error", detail: "line1\nline2 \u2713" }])).not.toMatch(/[\n\u2713]/);
    expect(skipNote([])).toBe("");
  });
  test("api/parse.js sends it as the X-AI-Fallback header, and not when nothing was skipped", async () => {
    process.env.GROQ_API_KEY = "groq-key"; process.env.GEMINI_API_KEY = "gem-key"; process.env.AI_PROVIDER_ORDER = "gemini,groq";
    const headers = {};
    const res = { _status: 200, _json: null, setHeader: (k, v) => { headers[k] = v; }, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; } };
    global.fetch = vi.fn(async (url) => (isGemini(url) ? limit429("quota exceeded") : groqOk({ chiefComplaint: "ok" })));
    await handler({ method: "POST", body: { text: "Knee pain." } }, res);
    expect(headers["X-AI-Provider"]).toBe("groq");
    expect(headers["X-AI-Fallback"]).toMatch(/^gemini: Gemini error - quota exceeded/);
    expect(headers["X-AI-Order"]).toBe("gemini,groq");
    const h2 = {};
    const res2 = { ...res, setHeader: (k, v) => { h2[k] = v; } };
    global.fetch = vi.fn(async () => groqOk({ chiefComplaint: "ok" }));
    process.env.AI_PROVIDER_ORDER = "groq,gemini";
    await handler({ method: "POST", body: { text: "Knee pain." } }, res2);
    expect(h2["X-AI-Fallback"]).toBeUndefined();
  });
});
