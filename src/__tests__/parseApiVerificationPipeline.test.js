// Direct integration test for api/parse.js's handler function itself --
// specifically the new stage-2 verification pass added in round 4. No
// existing test invoked this handler directly (everything else mocks
// the client-side fetch('/api/parse') boundary and never exercises what
// actually happens inside the serverless function), so the two-call
// pipeline and its fallback behaviour had zero coverage before this.
//
// Mocks global.fetch to stand in for the two sequential Groq calls the
// handler now makes: the first (extraction) call, then the second
// (verification) call. Confirms: (1) the handler makes exactly 2 calls
// and returns the verifier's corrected JSON, not the raw first pass;
// (2) if the verification call fails outright, the handler falls back
// to the first pass rather than failing the whole request -- this is
// the behaviour that makes verification a strict improvement layer
// instead of a new single point of failure.
import { describe, test, expect, vi, beforeEach } from "vitest";
import handler from "../../api/parse.js";

function mockReqRes(body) {
  const req = { method: "POST", body };
  const res = {
    _status: 200, _json: null, _ended: false,
    setHeader: vi.fn(),
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    end() { this._ended = true; return this; },
  };
  return { req, res };
}

describe("api/parse.js handler: two-stage extraction + verification pipeline", () => {
  beforeEach(() => { process.env.GROQ_API_KEY = "test-key"; });

  test("returns the verifier's corrected JSON, not the raw first pass, and calls Groq exactly twice", async () => {
    const firstPass = {
      aggMovements: ["Stretching backwards"], aggActivities: [],
      relMovements: ["Stretching backwards"], flags: [],
    };
    const verified = {
      aggMovements: [], aggActivities: [],
      relMovements: ["Stretching backwards"], flags: [],
    };
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      const content = callCount === 1 ? firstPass : verified;
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) };
    });

    const { req, res } = mockReqRes({ text: "If I stretch backwards it feels better." });
    await handler(req, res);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(res._status).toBe(200);
    // The activity must end up in relMovements only -- never both.
    expect(res._json.relMovements).toContain("Stretching backwards");
    expect(res._json.aggMovements).not.toContain("Stretching backwards");
  });

  test("falls back to the first pass when the verification call fails (non-OK response)", async () => {
    const firstPass = { chiefComplaint: "Left shoulder pain", flags: [] };
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(firstPass) } }] }) };
      }
      return { ok: false, text: async () => "verifier unavailable" };
    });

    const { req, res } = mockReqRes({ text: "Some narrative." });
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(firstPass);
  });

  test("falls back to the first pass when the verification call throws", async () => {
    const firstPass = { chiefComplaint: "Right knee pain", flags: [] };
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(firstPass) } }] }) };
      }
      throw new Error("network down");
    });

    const { req, res } = mockReqRes({ text: "Some narrative." });
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(firstPass);
  });

  test("falls back to the first pass when the verification call returns unparseable JSON", async () => {
    const firstPass = { chiefComplaint: "Ankle sprain", flags: [] };
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(firstPass) } }] }) };
      }
      return { ok: true, json: async () => ({ choices: [{ message: { content: "not valid json {{{" } }] }) };
    });

    const { req, res } = mockReqRes({ text: "Some narrative." });
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(firstPass);
  });

  test("still returns a clean error if the FIRST (extraction) call fails -- verification never runs", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, text: async () => "rate limited" });

    const { req, res } = mockReqRes({ text: "Some narrative." });
    await handler(req, res);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(res._status).toBe(502);
    expect(res._json.error).toBe("Groq error");
  });
});
