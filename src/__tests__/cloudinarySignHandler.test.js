// api/admin/cloudinarySign.js decides who may get a signed Cloudinary upload. It must work with the
// caller's own login and the public key only (no Supabase service-role secret), and only admins pass.
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

let user, profile, profileError;
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: async (token) => (token === "good" && user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "bad" } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: profileError }) }) }) }),
  }),
}));

function res() {
  const r = { code: 200, body: null, headers: {}, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, end() { return r; } };
  return r;
}
const call = async (handler, { token = "good", body = { public_id: "slot_1" }, method = "POST" } = {}) => {
  const r = res();
  await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, r);
  return r;
};

async function load({ keys = true } = {}) {
  vi.resetModules();
  if (keys) { process.env.CLOUDINARY_API_KEY = "key123"; process.env.CLOUDINARY_API_SECRET = "s3cret"; }
  else { delete process.env.CLOUDINARY_API_KEY; delete process.env.CLOUDINARY_API_SECRET; }
  delete process.env.SUPABASE_SERVICE_ROLE_KEY; // proves it is not needed
  return (await import("../../api/admin/cloudinarySign.js")).default;
}

beforeEach(() => { user = { id: "u1" }; profile = { is_admin: true }; profileError = null; });

describe("cloudinarySign handler", () => {
  it("signs for an admin, with no service-role key set", async () => {
    const h = await load();
    const r = await call(h);
    expect(r.code).toBe(200);
    const want = crypto.createHash("sha1").update(`invalidate=true&overwrite=true&public_id=slot_1&timestamp=${r.body.timestamp}s3cret`).digest("hex");
    expect(r.body).toMatchObject({ api_key: "key123", public_id: "slot_1", signature: want });
  });
  it("refuses a signed-out call", async () => { expect((await call(await load(), { token: null })).code).toBe(401); });
  it("refuses an invalid or expired login", async () => { expect((await call(await load(), { token: "stale" })).code).toBe(401); });
  it("refuses someone who is not an admin", async () => {
    profile = { is_admin: false };
    expect((await call(await load())).code).toBe(403);
  });
  it("refuses when the profile cannot be read", async () => {
    profile = null; profileError = { message: "x" };
    expect((await call(await load())).code).toBe(403);
  });
  it("says 'not_configured' for an admin when the Cloudinary keys are missing", async () => {
    const r = await call(await load({ keys: false }));
    expect(r.code).toBe(501);
    expect(r.body.error).toBe("not_configured");
  });
  it("rejects a bad photo id", async () => {
    const h = await load();
    expect((await call(h, { body: { public_id: "../x" } })).code).toBe(400);
    expect((await call(h, { body: {} })).code).toBe(400);
  });
  it("only accepts POST", async () => { expect((await call(await load(), { method: "GET" })).code).toBe(405); });
});
