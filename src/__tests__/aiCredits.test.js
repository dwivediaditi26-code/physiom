// The parser credit counter: at 0 credits /api/parse answers 402 and never calls the AI;
// a failed AI call gives the credit back.
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../api/_lib/rateLimit.js", () => ({ authenticateAndRateLimit: vi.fn(async () => "test-user") }));
const spendCredit = vi.fn();
const refundCredit = vi.fn();
vi.mock("../../api/_lib/credits.js", () => ({ spendCredit: (...a) => spendCredit(...a), refundCredit: (...a) => refundCredit(...a) }));

import handler from "../../api/parse.js";

const mkRes = () => {
  const res = { headers: {}, setHeader: (k, v) => { res.headers[k] = v; }, status: (c) => { res.code = c; return res; }, json: (b) => { res.body = b; return res; }, end: () => res };
  return res;
};
const req = { method: "POST", headers: {}, body: { text: "45 year old with shoulder pain" } };

beforeEach(() => { process.env.GROQ_API_KEY = "k"; spendCredit.mockReset(); refundCredit.mockReset(); });
afterEach(() => { delete process.env.GROQ_API_KEY; vi.restoreAllMocks(); });

describe("parser credits", () => {
  test("at 0 credits: 402, and the AI is never called", async () => {
    spendCredit.mockResolvedValue({ ok: false, remaining: 0 });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = mkRes();
    await handler(req, res);
    expect(res.code).toBe(402);
    expect(res.body).toMatchObject({ code: "NO_CREDITS", kind: "parser", remaining: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(spendCredit).toHaveBeenCalledWith("test-user", "parser");
  });

  test("a failed AI call refunds the credit", async () => {
    spendCredit.mockResolvedValue({ ok: true, remaining: 4, charged: true });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 500, text: async () => "boom", json: async () => ({}) });
    const res = mkRes();
    await handler(req, res);
    expect(res.code).toBeGreaterThanOrEqual(500);
    expect(refundCredit).toHaveBeenCalledWith("test-user", "parser");
  });

  test("a successful call keeps the credit spent and reports the balance", async () => {
    spendCredit.mockResolvedValue({ ok: true, remaining: 4, charged: true });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ chiefComplaint: "x" }) } }] }), text: async () => "" });
    const res = mkRes();
    await handler(req, res);
    expect(res.code).toBe(200);
    expect(refundCredit).not.toHaveBeenCalled();
    expect(res.headers["X-Credits-Remaining"]).toBe("4");
  });
});
