// api/cron/purgeDeletedPatients.js erases patient records a clinician deleted
// more than 30 days ago. What matters: it only ever targets already-deleted
// rows older than the grace period, and only for a caller holding the cron
// secret. Mocks @supabase/supabase-js so it never touches a real project.
import { describe, test, expect, vi, beforeEach } from "vitest";

function mockReqRes({ method = "GET", authorization } = {}) {
  const req = { method, headers: authorization ? { authorization } : {} };
  const res = {
    _status: 200, _json: null,
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
  };
  return { req, res };
}

// Records every call in the chain .from().delete().not().lt().select()
function fakeAdmin({ rows = [], error = null } = {}) {
  const calls = [];
  const chain = {
    delete: () => { calls.push(["delete"]); return chain; },
    not: (...a) => { calls.push(["not", ...a]); return chain; },
    lt: (...a) => { calls.push(["lt", ...a]); return chain; },
    select: async (...a) => { calls.push(["select", ...a]); return { data: error ? null : rows, error }; },
  };
  const from = vi.fn((table) => { calls.push(["from", table]); return chain; });
  return { client: { from }, calls, from };
}

describe("api/cron/purgeDeletedPatients.js handler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  test("wrong or missing cron secret -> 401 and nothing is deleted", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubEnv("CRON_SECRET", "right");
    const admin = fakeAdmin();
    vi.doMock("@supabase/supabase-js", () => ({ createClient: () => admin.client }));
    const { default: handler } = await import("../../api/cron/purgeDeletedPatients.js");
    for (const authorization of [undefined, "Bearer wrong"]) {
      const { req, res } = mockReqRes({ authorization });
      await handler(req, res);
      expect(res._status).toBe(401);
    }
    expect(admin.from).not.toHaveBeenCalled();
  });

  test("only deletes rows already deleted by their owner, older than 30 days", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.stubEnv("CRON_SECRET", "right");
    const admin = fakeAdmin({ rows: [{ id: "p1" }, { id: "p2" }] });
    vi.doMock("@supabase/supabase-js", () => ({ createClient: () => admin.client }));
    const { default: handler, GRACE_DAYS } = await import("../../api/cron/purgeDeletedPatients.js");
    const before = Date.now();
    const { req, res } = mockReqRes({ authorization: "Bearer right" });
    await handler(req, res);

    expect(GRACE_DAYS).toBe(30);
    expect(res._status).toBe(200);
    expect(res._json.purged).toBe(2);
    expect(admin.calls[0]).toEqual(["from", "patients"]);
    expect(admin.calls).toContainEqual(["not", "deleted_at", "is", null]); // live patients can never match
    const lt = admin.calls.find((c) => c[0] === "lt");
    expect(lt[1]).toBe("deleted_at");
    const cutoffMs = new Date(lt[2]).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(before - cutoffMs).toBeGreaterThanOrEqual(thirtyDays - 5);
    expect(before - cutoffMs).toBeLessThan(thirtyDays + 60_000);
  });

  test("database error -> 500, does not report success", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    const admin = fakeAdmin({ error: { message: "db down" } });
    vi.doMock("@supabase/supabase-js", () => ({ createClient: () => admin.client }));
    const { default: handler } = await import("../../api/cron/purgeDeletedPatients.js");
    const { req, res } = mockReqRes();
    await handler(req, res);
    expect(res._status).toBe(500);
    expect(res._json.purged).toBeUndefined();
  });

  test("missing service role key -> 500 and no client is created", async () => {
    const createClient = vi.fn();
    vi.doMock("@supabase/supabase-js", () => ({ createClient }));
    const { default: handler } = await import("../../api/cron/purgeDeletedPatients.js");
    const { req, res } = mockReqRes();
    await handler(req, res);
    expect(res._status).toBe(500);
    expect(createClient).not.toHaveBeenCalled();
  });

  test("non-GET -> 405", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "svc");
    vi.doMock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
    const { default: handler } = await import("../../api/cron/purgeDeletedPatients.js");
    const { req, res } = mockReqRes({ method: "POST" });
    await handler(req, res);
    expect(res._status).toBe(405);
  });
});
