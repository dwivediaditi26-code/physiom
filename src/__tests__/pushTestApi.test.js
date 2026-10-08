import { describe, it, expect, vi, beforeEach } from "vitest";

// api/pushTest.js: "Send me a test notification" -- says which step failed.
let registered = 1;
let userOk = true;
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: (token) => Promise.resolve(userOk ? { data: { user: { id: token } }, error: null } : { data: {}, error: { message: "bad" } }) },
    from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: registered, error: null }) }) }),
  }),
}));
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
const { default: handler, describeSendPush } = await import("../../api/pushTest.js");

let n = 0;
let lastUser = "";
async function call(token) {
  const res = { statusCode: 0, body: null, setHeader() {}, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
  // each call is a different "person" (the token is their id) so the 5-second cooldown does not interfere
  if (token === undefined) token = `person${++n}`;
  lastUser = token;
  await handler({ method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {}, body: {} }, res);
  return res;
}
const reply = (status, body) => vi.fn(() => Promise.resolve({ status, text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)) }));

describe("describeSendPush", () => {
  it("names the failing step", () => {
    expect(describeSendPush({ status: 404 }).stage).toBe("function_missing");
    expect(describeSendPush({ status: 403 }).stage).toBe("function_rejected");
    expect(describeSendPush({ status: 500, text: "boom" }).stage).toBe("function_error");
    expect(describeSendPush({ status: 200, json: { sent: 0, total: 0 } }).stage).toBe("no_device");
    expect(describeSendPush({ status: 200, json: { sent: 0, total: 2, failed: [{ status: 403, body: "VapidPkHashMismatch" }] } })).toMatchObject({ stage: "push_rejected", ok: false });
    expect(describeSendPush({ status: 200, json: { sent: 1, total: 1 } })).toMatchObject({ stage: "sent", ok: true });
    expect(describeSendPush({ status: 200, json: { sent: 1, total: 2 } }).message).toMatch(/1 of your 2 devices/);
  });
});

describe("api/pushTest", () => {
  beforeEach(() => { registered = 1; userOk = true; });

  it("needs a signed-in person", async () => {
    expect((await call("")).statusCode).toBe(401);
    userOk = false;
    expect((await call()).statusCode).toBe(401);
  });

  it("says so when no phone is registered, without calling send-push", async () => {
    registered = 0;
    globalThis.fetch = reply(200, {});
    const res = await call();
    expect(res.body).toMatchObject({ ok: false, stage: "no_device" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("sends only to the caller's own phones and reports success", async () => {
    globalThis.fetch = reply(200, { sent: 1, total: 1 });
    const res = await call();
    expect(res.body).toMatchObject({ ok: true, stage: "sent" });
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain("/functions/v1/send-push");
    expect(JSON.parse(init.body)).toMatchObject({ user_id: lastUser });
    expect(JSON.parse(init.body).broadcast).toBeUndefined();
  });

  it("reports a rejected key and an unreachable service in plain words", async () => {
    globalThis.fetch = reply(403, { error: "Forbidden" });
    expect((await call()).body.stage).toBe("function_rejected");
    globalThis.fetch = vi.fn(() => Promise.reject(new Error("timeout")));
    expect((await call()).body.stage).toBe("unreachable");
  });
});
