// Direct integration test for api/lumbarReasoning.js's handler function --
// this is a brand new endpoint (Task #10: adaptive lumbar AI reasoning,
// additive alongside the deterministic runEngineV6/reasoningEngine) with
// zero prior coverage. Mirrors the mockReqRes + global.fetch mocking
// pattern established in parseApiVerificationPipeline.test.js, but for a
// single-call endpoint rather than a two-stage pipeline.
import { describe, test, expect, vi, beforeEach } from "vitest";
import handler from "../../api/lumbarReasoning.js";

function mockReqRes(body, method = "POST") {
  const req = { method, body };
  const res = {
    _status: 200, _json: null, _ended: false,
    setHeader: vi.fn(),
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    end() { this._ended = true; return this; },
  };
  return { req, res };
}

describe("api/lumbarReasoning.js handler", () => {
  beforeEach(() => { process.env.GROQ_API_KEY = "test-key"; });

  test("400s when no subjectiveNarrative is provided", async () => {
    const { req, res } = mockReqRes({});
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/subjective narrative/i);
  });

  test("400s when subjectiveNarrative is only whitespace", async () => {
    const { req, res } = mockReqRes({ subjectiveNarrative: "   " });
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  test("405s on non-POST methods", async () => {
    const { req, res } = mockReqRes(null, "GET");
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  test("200s OPTIONS preflight without touching Groq", async () => {
    global.fetch = vi.fn();
    const { req, res } = mockReqRes(null, "OPTIONS");
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("500s when GROQ_API_KEY is not configured", async () => {
    delete process.env.GROQ_API_KEY;
    const { req, res } = mockReqRes({ subjectiveNarrative: "Gradual onset low back pain, worse sitting." });
    await handler(req, res);
    expect(res._status).toBe(500);
    expect(res._json.error).toMatch(/GROQ_API_KEY/);
  });

  test("makes exactly one Groq call and returns its parsed JSON on success", async () => {
    const aiResult = {
      clinicalClues: { painLocation: "Central low back", symptomBehaviour: "Worse sitting, eases walking" },
      hypotheses: [{ pattern: "Mechanical lumbar pain", probability: "High", reasoning: "Flexion-aggravated, movement-dependent pattern" }],
      objectivePlan: {
        observation: [{ item: "Lumbar posture", priority: "High", reasoning: "Screen for flexed/guarded posture" }],
        rom: [{ movement: "Flexion", priority: "High", reasoning: "Reproduces sitting-related symptoms" }],
        mmt: [], functional: [], kineticChain: [], specialTests: [],
      },
      clinicalSummary: "Mechanical, flexion-aggravated presentation with no red flags.",
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(aiResult) } }] }),
    });

    const { req, res } = mockReqRes({ subjectiveNarrative: "Gradual onset low back pain, worse sitting, better walking." });
    await handler(req, res);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("api.groq.com");
    const sentBody = JSON.parse(opts.body);
    expect(sentBody.model).toBe("openai/gpt-oss-120b");
    expect(sentBody.messages[1].content).toContain("SUBJECTIVE ASSESSMENT:");
    expect(sentBody.messages[1].content).toContain("worse sitting, better walking");

    expect(res._status).toBe(200);
    expect(res._json).toEqual(aiResult);
  });

  test("502s with detail when Groq responds non-OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, text: async () => "rate limited" });
    const { req, res } = mockReqRes({ subjectiveNarrative: "Low back pain." });
    await handler(req, res);
    expect(res._status).toBe(502);
    expect(res._json.detail).toBe("rate limited");
  });

  test("502s when Groq returns an empty completion", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: {} }] }) });
    const { req, res } = mockReqRes({ subjectiveNarrative: "Low back pain." });
    await handler(req, res);
    expect(res._status).toBe(502);
    expect(res._json.error).toBe("Empty response");
  });

  test("500s if fetch itself throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const { req, res } = mockReqRes({ subjectiveNarrative: "Low back pain." });
    await handler(req, res);
    expect(res._status).toBe(500);
    expect(res._json.error).toBe("network down");
  });
});
