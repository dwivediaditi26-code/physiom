// deleteAccountApi.test.js
//
// Direct test of api/deleteAccount.js's handler. This endpoint permanently
// deletes a real account (and, via cascade, every patient row it owns) --
// the one property that matters most is that it can NEVER delete anyone
// other than whoever's token was actually verified, regardless of what the
// request claims. Mocks @supabase/supabase-js's createClient since this
// must never hit a real Supabase project in tests.
import { describe, test, expect, vi, beforeEach } from "vitest";

// A storage with nothing in it, for tests that are about something else.
const emptyStorage = () => ({ from: () => ({ list: async () => ({ data: [], error: null }), remove: vi.fn() }) });

function mockReqRes({ authHeader } = {}) {
  const req = { method: "POST", headers: authHeader ? { authorization: authHeader } : {} };
  const res = {
    _status: 200, _json: null,
    setHeader: vi.fn(),
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    end() { return this; },
  };
  return { req, res };
}

describe("api/deleteAccount.js handler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  test("missing Authorization header -> 401, deleteUser never called", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const deleteUser = vi.fn();
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { getUser: vi.fn(), admin: { deleteUser } } }),
    }));
    const { default: handler } = await import("../../api/deleteAccount.js");
    const { req, res } = mockReqRes();
    await handler(req, res);
    expect(res._status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  test("invalid/expired token -> 401, deleteUser never called", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const deleteUser = vi.fn();
    const getUser = vi.fn().mockResolvedValue({ data: null, error: { message: "invalid token" } });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { getUser, admin: { deleteUser } }, storage: emptyStorage() }),
    }));
    const { default: handler } = await import("../../api/deleteAccount.js");
    const { req, res } = mockReqRes({ authHeader: "Bearer bad-token" });
    await handler(req, res);
    expect(res._status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  test("valid token -> deletes EXACTLY the verified caller's own id, never a client-supplied one, and returns 200", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "real-user-abc" } }, error: null });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { getUser, admin: { deleteUser } }, storage: emptyStorage() }),
    }));
    const { default: handler } = await import("../../api/deleteAccount.js");
    const { req, res } = mockReqRes({ authHeader: "Bearer good-token" });
    await handler(req, res);
    expect(getUser).toHaveBeenCalledWith("good-token");
    expect(deleteUser).toHaveBeenCalledWith("real-user-abc");
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ deleted: true });
  });

  test("Supabase deleteUser failure -> 500, does not report success", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const deleteUser = vi.fn().mockResolvedValue({ error: { message: "db error" } });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "real-user-abc" } }, error: null });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { getUser, admin: { deleteUser } }, storage: emptyStorage() }),
    }));
    const { default: handler } = await import("../../api/deleteAccount.js");
    const { req, res } = mockReqRes({ authHeader: "Bearer good-token" });
    await handler(req, res);
    expect(res._status).toBe(500);
    expect(res._json).not.toEqual({ deleted: true });
  });

  test("erases the caller's uploaded files from every media bucket BEFORE deleting the account", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const order = [];
    const deleteUser = vi.fn(async () => { order.push("deleteUser"); return { error: null }; });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "real-user-abc" } }, error: null });
    // Each bucket holds two files the first time it is listed, nothing afterwards.
    const left = {};
    const removeCalls = [];
    const storage = {
      from: (bucket) => ({
        list: vi.fn(async (folder) => {
          expect(folder).toBe("real-user-abc");
          left[bucket] ??= ["a.jpg", "b.jpg"];
          return { data: left[bucket].map((name) => ({ name })), error: null };
        }),
        remove: vi.fn(async (paths) => {
          order.push("remove:" + bucket);
          removeCalls.push([bucket, paths]);
          left[bucket] = [];
          return { data: paths.map((name) => ({ name })), error: null };
        }),
      }),
    };
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { getUser, admin: { deleteUser } }, storage }),
    }));
    const { default: handler, MEDIA_BUCKETS } = await import("../../api/deleteAccount.js");
    const { req, res } = mockReqRes({ authHeader: "Bearer good-token" });
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(removeCalls.map(([b]) => b).sort()).toEqual([...MEDIA_BUCKETS].sort());
    for (const [, paths] of removeCalls) expect(paths).toEqual(["real-user-abc/a.jpg", "real-user-abc/b.jpg"]);
    expect(order[order.length - 1]).toBe("deleteUser");
    expect(order.filter((s) => s === "deleteUser")).toHaveLength(1);
  });

  test("if the files cannot be erased -> 500 and the account is NOT deleted (so the person can retry)", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const deleteUser = vi.fn();
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "real-user-abc" } }, error: null });
    const storage = { from: () => ({
      list: async () => ({ data: [{ name: "a.jpg" }], error: null }),
      remove: async () => ({ data: null, error: { message: "storage down" } }),
    }) };
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { getUser, admin: { deleteUser } }, storage }),
    }));
    const { default: handler } = await import("../../api/deleteAccount.js");
    const { req, res } = mockReqRes({ authHeader: "Bearer good-token" });
    await handler(req, res);
    expect(res._status).toBe(500);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  test("a bucket that does not exist has no files, so it does not block deletion", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "real-user-abc" } }, error: null });
    const storage = { from: () => ({
      list: async () => ({ data: null, error: { message: "Bucket not found", statusCode: "404" } }),
      remove: vi.fn(),
    }) };
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { getUser, admin: { deleteUser } }, storage }),
    }));
    const { default: handler } = await import("../../api/deleteAccount.js");
    const { req, res } = mockReqRes({ authHeader: "Bearer good-token" });
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith("real-user-abc");
  });

  test("the bucket list here matches the buckets the app can upload to", async () => {
    vi.doMock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
    const { MEDIA_BUCKETS } = await import("../../api/deleteAccount.js");
    const { BUCKET_LIMIT_MB } = await import("../physiofeed/data/mediaStorage.js");
    expect([...MEDIA_BUCKETS].sort()).toEqual(Object.keys(BUCKET_LIMIT_MB).sort());
  });

  test("missing SUPABASE_SERVICE_ROLE_KEY env var -> 500, fails closed instead of silently allowing an unauthenticated deletion", async () => {
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => { throw new Error("createClient should not be called without a service role key"); }),
    }));
    const { default: handler } = await import("../../api/deleteAccount.js");
    const { req, res } = mockReqRes({ authHeader: "Bearer good-token" });
    await handler(req, res);
    expect(res._status).toBe(500);
  });

  test("non-POST method -> 405", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { getUser: vi.fn(), admin: { deleteUser: vi.fn() } } }),
    }));
    const { default: handler } = await import("../../api/deleteAccount.js");
    const { req, res } = mockReqRes();
    req.method = "GET";
    await handler(req, res);
    expect(res._status).toBe(405);
  });
});
