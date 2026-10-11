// parseApiCredits.test.js -- api/parse.js and AI credits (supabase/add_ai_credits.sql, api/_lib/credits.js).
//
// A paragraph costs 1 credit, taken BEFORE the AI is called and given back if the AI does not answer.
// With no credits left the AI is never called (402). Before the SQL has been run the endpoint works as before.
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/_lib/rateLimit.js", () => ({ authenticateAndRateLimit: vi.fn(async () => "user-1") }));
const credits = vi.hoisted(() => ({
  cleanRequestId: vi.fn((v) => (typeof v === "string" && v.length >= 8 ? v : "generated-id-0001")),
  reserveGeneration: vi.fn(),
  completeGeneration: vi.fn(async () => {}),
  refundGeneration: vi.fn(async () => 4),
}));
vi.mock("../../api/_lib/credits.js", () => credits);

import handler from "../../api/parse.js";

function mockReqRes(body, headers) {
  const req = { method: "POST", body, headers };
  const sent = {};
  const res = {
    _status: 200, _json: null, headers: sent,
    setHeader: vi.fn((k, v) => { sent[k] = v; }),
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    end() { return this; },
  };
  return { req, res };
}
const groqOk = () => vi.fn().mockImplementation(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ chiefComplaint: "Neck pain", flags: [] }) } }] }) }));
const groqDown = () => vi.fn().mockImplementation(async () => ({ ok: false, status: 500, text: async () => "boom", json: async () => ({ error: { message: "boom" } }) }));

describe("api/parse.js credits", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-key";
    delete process.env.GEMINI_API_KEY;
    Object.values(credits).forEach((f) => f.mockClear?.());
    credits.reserveGeneration.mockResolvedValue({ enabled: true, ok: true, balance: 4, unlimited: false });
  });

  test("a good answer keeps the credit and reports what is left", async () => {
    global.fetch = groqOk();
    const { req, res } = mockReqRes({ text: "Neck pain for 3 weeks" }, { "x-request-id": "request-abc-123" });
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(credits.reserveGeneration).toHaveBeenCalledWith("user-1", "request-abc-123");
    expect(credits.completeGeneration).toHaveBeenCalledWith("user-1", "request-abc-123");
    expect(credits.refundGeneration).not.toHaveBeenCalled();
    expect(res.headers["X-AI-Credits"]).toBe("4");
  });

  test("with no credits the AI is never called and the answer is 402", async () => {
    credits.reserveGeneration.mockResolvedValue({ enabled: true, ok: false, reason: "insufficient", balance: 0 });
    global.fetch = groqOk();
    const { req, res } = mockReqRes({ text: "Neck pain for 3 weeks" }, {});
    await handler(req, res);
    expect(res._status).toBe(402);
    expect(res._json).toMatchObject({ error: "no_credits", balance: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(credits.refundGeneration).not.toHaveBeenCalled();
  });

  test("when the AI fails the credit is given back and the new balance is reported", async () => {
    global.fetch = groqDown();
    const { req, res } = mockReqRes({ text: "Neck pain for 3 weeks" }, {});
    await handler(req, res);
    expect(res._status).toBeGreaterThanOrEqual(500);
    expect(credits.refundGeneration).toHaveBeenCalledTimes(1);
    expect(credits.completeGeneration).not.toHaveBeenCalled();
    expect(res.headers["X-AI-Credits"]).toBe("4");
  });

  test("a credit-check error stops the request (nothing is generated for free by accident)", async () => {
    credits.reserveGeneration.mockResolvedValue({ enabled: true, ok: false, reason: "error" });
    global.fetch = groqOk();
    const { req, res } = mockReqRes({ text: "Neck pain for 3 weeks" }, {});
    await handler(req, res);
    expect(res._status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("before the SQL is run credits are off: it works as before and nothing is settled", async () => {
    credits.reserveGeneration.mockResolvedValue({ enabled: false, ok: true });
    global.fetch = groqOk();
    const { req, res } = mockReqRes({ text: "Neck pain for 3 weeks" }, {});
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(credits.completeGeneration).not.toHaveBeenCalled();
    expect(credits.refundGeneration).not.toHaveBeenCalled();
    expect(res.headers["X-AI-Credits"]).toBeUndefined();
  });

  test("an admin is not charged and is told they are unlimited", async () => {
    credits.reserveGeneration.mockResolvedValue({ enabled: true, ok: true, balance: 0, unlimited: true });
    global.fetch = groqOk();
    const { req, res } = mockReqRes({ text: "Neck pain for 3 weeks" }, {});
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res.headers["X-AI-Credits"]).toBe("unlimited");
  });
});
