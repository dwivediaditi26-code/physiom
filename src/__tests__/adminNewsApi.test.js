import { describe, it, expect, vi, beforeEach } from "vitest";

let isAdmin = true;
let existingRow = null;
const upsert = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table) => {
      if (table === "profiles") return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: isAdmin }, error: null }) }) }) };
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: existingRow, error: null }) }) }),
        upsert: (...a) => upsert(...a),
      };
    },
  }),
}));
vi.mock("../../api/_lib/rateLimit.js", () => ({ authenticateAndRateLimit: async () => "user-1" }));

process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
process.env.GROQ_API_KEY = "groq-key";
const { default: handler } = await import("../../api/admin/news.js");

function call(body) {
  const res = { statusCode: 0, body: null, setHeader() {}, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
  return handler({ method: "POST", headers: { authorization: "Bearer t" }, body }, res).then(() => res);
}

const good = { action: "publish", title: "AIIMS vacancy", source_name: "AIIMS", source_url: "https://www.aiims.edu/notice", category: "job_india" };

describe("api/admin/news", () => {
  let fetchMock;
  beforeEach(() => {
    isAdmin = true; existingRow = null; upsert.mockClear();
    fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
    globalThis.fetch = fetchMock;
  });

  it("refuses anyone who is not an admin", async () => {
    isAdmin = false;
    const res = await call(good);
    expect(res.statusCode).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("requires a valid source link and a real category", async () => {
    expect((await call({ ...good, source_url: "" })).statusCode).toBe(400);
    expect((await call({ ...good, source_url: "javascript:alert(1)" })).statusCode).toBe(400);
    expect((await call({ ...good, category: "made_up" })).statusCode).toBe(400);
    expect((await call({ ...good, title: "  " })).statusCode).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("publishes a new item keyed by its link and sends one phone notification", async () => {
    const res = await call(good);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, updated: false, notified: true });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ dedupe_key: "https://www.aiims.edu/notice", status: "active", category: "job_india" }), { onConflict: "dedupe_key" });
    const pushCall = fetchMock.mock.calls.find((c) => String(c[0]).includes("/functions/v1/send-push"));
    expect(JSON.parse(pushCall[1].body)).toMatchObject({ broadcast: true, url: "/news" });
  });

  it("does not notify again when the link is already in News, or when notify is off", async () => {
    existingRow = { id: "x" };
    let res = await call(good);
    expect(res.body).toMatchObject({ updated: true, notified: false });
    existingRow = null;
    res = await call({ ...good, notify: false });
    expect(res.body.notified).toBe(false);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("send-push"))).toBe(false);
  });

  it("drafts only from the provided text and falls back to a safe category", async () => {
    fetchMock.mockImplementation((url) => String(url).includes("groq.com")
      ? Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify({ title: "T", summary: "S", category: "nonsense", source_name: "Src", location: "", deadline: "", published: "" }) } }] }) })
      : Promise.resolve({ ok: true }));
    const res = await call({ action: "draft", text: "Some pasted notice text" });
    expect(res.statusCode).toBe(200);
    expect(res.body.draft).toMatchObject({ title: "T", category: "research", source_name: "Src" });
    const groqCall = fetchMock.mock.calls.find((c) => String(c[0]).includes("groq.com"));
    expect(groqCall[1].body).toContain("Some pasted notice text");
  });

  it("will not fetch a link that points at a private address", async () => {
    fetchMock.mockImplementation((url) => String(url).includes("groq.com")
      ? Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: "{}" } }] }) })
      : Promise.resolve({ ok: true, text: () => Promise.resolve("SECRET") }));
    const res = await call({ action: "draft", text: "pasted", url: "http://127.0.0.1/admin" });
    expect(res.body.note).toMatch(/Couldn't read the link/);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("127.0.0.1"))).toBe(false);
  });
});
