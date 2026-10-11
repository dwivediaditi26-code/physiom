// aiCreditsService.test.js -- src/aiCredits.js (the app's side of the credit functions) and
// api/_lib/credits.js (the server's side). The balance logic itself is tested against a real Postgres in
// supabase/add_ai_credits.sql's own checks; here it is the plumbing: who is a guest, what a missing function
// means, and that a retry reuses the same request id.
import { describe, it, expect, vi, beforeEach } from "vitest";

const sb = vi.hoisted(() => ({
  session: { user: { id: "u1" } },
  rpc: vi.fn(),
}));
vi.mock("../supabase.js", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: sb.session } }) },
    get rpc() { return sb.rpc; },
  },
}));

const credits = await import("../aiCredits.js");
const server = await import("../../api/_lib/credits.js");

beforeEach(() => {
  sb.session = { user: { id: "u1" } };
  sb.rpc = vi.fn();
  credits.resetCreditsForTests();
});

describe("refreshCredits", () => {
  it("a signed-out visitor is a guest with no credits", async () => {
    sb.session = null;
    const snap = await credits.refreshCredits("c:cervical");
    expect(snap.state).toBe("guest");
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it("reads the balance and the case's free re-analyses from Supabase", async () => {
    sb.rpc.mockResolvedValue({ data: { balance: 7, unlimited: false, analyzed: true, free_reanalyses_remaining: 2 }, error: null });
    const snap = await credits.refreshCredits("c:cervical");
    expect(sb.rpc).toHaveBeenCalledWith("ai_credits_status", { p_case_key: "c:cervical" });
    expect(snap).toMatchObject({ state: "ready", balance: 7, unlimited: false });
    expect(snap.cases["c:cervical"]).toEqual({ analyzed: true, freeLeft: 2 });
  });

  it("before the SQL has been run the functions are missing: credits are off, not an error", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Could not find the function public.ai_credits_status" } });
    expect((await credits.refreshCredits()).state).toBe("unconfigured");
  });

  it("any other failure is an error (spending is then refused, not allowed)", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { code: "500", message: "boom" } });
    expect((await credits.refreshCredits()).state).toBe("error");
    sb.rpc.mockRejectedValue(new Error("offline"));
    expect((await credits.refreshCredits()).state).toBe("error");
  });
});

describe("spendAnalysis", () => {
  it("keeps the answer and the new balance", async () => {
    sb.rpc.mockResolvedValue({ data: { ok: true, charged: true, reason: "first", balance: 4, free_reanalyses_remaining: 3 }, error: null });
    const r = await credits.spendAnalysis("c:cervical", "SIG");
    expect(r).toMatchObject({ ok: true, charged: true, balance: 4, freeLeft: 3 });
    expect(credits.getCreditsSnapshot().balance).toBe(4);
    expect(credits.getCreditsSnapshot().cases["c:cervical"]).toEqual({ analyzed: true, freeLeft: 3 });
  });

  it("not enough credits changes nothing but says so", async () => {
    sb.rpc.mockResolvedValue({ data: { ok: false, reason: "insufficient", balance: 0, free_reanalyses_remaining: 0 }, error: null });
    const r = await credits.spendAnalysis("c:cervical", "SIG");
    expect(r).toMatchObject({ ok: false, reason: "insufficient" });
    expect(credits.getCreditsSnapshot().cases["c:cervical"]?.analyzed).toBeFalsy();
  });

  it("a lost reply is retried with the SAME request id, a real answer starts a new one", async () => {
    sb.rpc.mockRejectedValueOnce(new Error("offline"));
    expect(await credits.spendAnalysis("c:cervical", "SIG")).toMatchObject({ ok: false, reason: "error" });
    sb.rpc.mockResolvedValue({ data: { ok: true, charged: true, balance: 4, free_reanalyses_remaining: 3 }, error: null });
    await credits.spendAnalysis("c:cervical", "SIG");
    await credits.spendAnalysis("c:cervical", "SIG");
    const ids = sb.rpc.mock.calls.map((c) => c[1].p_request_id);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[1]);
  });

  it("with no credit functions it is free", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { code: "42883", message: "function does not exist" } });
    expect(await credits.spendAnalysis("c:cervical", "SIG")).toMatchObject({ ok: true, charged: false });
  });
});

describe("small helpers", () => {
  it("applyServerBalance takes a number or 'unlimited' and ignores nonsense", () => {
    credits.applyServerBalance("5");
    expect(credits.getCreditsSnapshot()).toMatchObject({ state: "ready", balance: 5 });
    credits.applyServerBalance("unlimited");
    expect(credits.getCreditsSnapshot().unlimited).toBe(true);
    credits.applyServerBalance(null);
    credits.applyServerBalance("abc");
    expect(credits.getCreditsSnapshot().balance).toBe(5);
  });

  it("credits are enforced for signed-in accounts, and for guests only where they can be asked to sign in", () => {
    expect(credits.creditsEnforced("ready", false)).toBe(true);
    expect(credits.creditsEnforced("error", false)).toBe(true);
    expect(credits.creditsEnforced("guest", true)).toBe(true);
    expect(credits.creditsEnforced("guest", false)).toBe(false);
    expect(credits.creditsEnforced("unconfigured", true)).toBe(false);
    expect(credits.creditsEnforced("loading", true)).toBe(false);
  });
});

describe("api/_lib/credits.js", () => {
  const db = (result) => ({ rpc: vi.fn(async () => result) });

  it("cleanRequestId keeps a sensible id and replaces anything else", () => {
    expect(server.cleanRequestId("abc12345-def")).toBe("abc12345-def");
    expect(server.cleanRequestId("bad id!")).not.toBe("bad id!");
    expect(server.cleanRequestId(undefined)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("reserve reports what the database said", async () => {
    const d = db({ data: { ok: true, charged: true, balance: 4, unlimited: false }, error: null });
    expect(await server.reserveGeneration("u1", "req-12345678", d)).toMatchObject({ enabled: true, ok: true, balance: 4 });
    expect(d.rpc).toHaveBeenCalledWith("ai_reserve_generation", { p_user: "u1", p_request_id: "req-12345678" });
    expect(await server.reserveGeneration("u1", "req-12345678", db({ data: { ok: false, reason: "insufficient", balance: 0 }, error: null })))
      .toMatchObject({ enabled: true, ok: false, reason: "insufficient" });
  });

  it("no service key, or no SQL yet: credits are off and the endpoint works as before", async () => {
    expect(await server.reserveGeneration("u1", "req-12345678", null)).toEqual({ enabled: false, ok: true });
    expect(await server.reserveGeneration("u1", "req-12345678", db({ data: null, error: { code: "PGRST202", message: "x" } }))).toEqual({ enabled: false, ok: true });
  });

  it("any other database error stops the request", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await server.reserveGeneration("u1", "req-12345678", db({ data: null, error: { code: "XX000", message: "down" } }))).toMatchObject({ enabled: true, ok: false, reason: "error" });
    spy.mockRestore();
  });

  it("refund returns the new balance and complete never throws", async () => {
    expect(await server.refundGeneration("u1", "req-12345678", db({ data: { ok: true, refunded: true, balance: 5 }, error: null }))).toBe(5);
    await expect(server.completeGeneration("u1", "req-12345678", db({ data: null, error: { code: "XX000", message: "x" } }))).resolves.toBeUndefined();
  });
});
