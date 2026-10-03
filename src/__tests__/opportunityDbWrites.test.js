import { describe, it, expect, vi, beforeEach } from "vitest";

const calls = [];
function chain(table) {
  const c = {
    insert: (row) => { calls.push({ table, op: "insert", row }); return c; },
    update: (row) => { calls.push({ table, op: "update", row }); return c; },
    select: () => c, eq: () => c, neq: () => c, order: () => c,
    single: () => Promise.resolve({ data: { id: 1, type: "job", title: "T", details: {}, status: "published", creator_id: "u1", created_at: "2026-10-03T09:00:00Z" }, error: null }),
    then: (res) => res({ data: [], error: null }),
  };
  return c;
}
vi.mock("../supabase.js", () => ({
  supabase: {
    from: (t) => chain(t),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: "u1" } } } })),
      getUser: vi.fn(() => { throw new Error("getUser must not be called -- it is a network round trip"); }),
    },
  },
  authHeader: async () => ({}),
}));

const db = await import("../physiofeed/data/db.js");

describe("opportunity writes use the database's clock", () => {
  beforeEach(() => { calls.length = 0; });

  it("createOpportunity stamps published_at with the server's 'now', not the browser's time", async () => {
    await db.createOpportunity({ type: "job", title: "T", org: "O", description: "d" }, { publish: true });
    const insert = calls.find((c) => c.op === "insert");
    expect(insert.row.published_at).toBe("now");
    expect(insert.row.creator_id).toBe("u1");
  });

  it("cancel / close / publish stamp their timestamps with the server's 'now' too", async () => {
    await db.cancelOpportunity(1);
    await db.closeOpportunity(1);
    await db.publishOpportunity(1);
    const updates = calls.filter((c) => c.op === "update").map((c) => c.row);
    expect(updates[0]).toMatchObject({ status: "cancelled", cancelled_at: "now", updated_at: "now" });
    expect(updates[1]).toMatchObject({ status: "closed", closed_at: "now" });
    expect(updates[2]).toMatchObject({ status: "published", published_at: "now" });
  });

  it("works out who the user is from the stored session, never a network getUser() call", async () => {
    await expect(db.createOpportunity({ type: "job", title: "T", org: "O", description: "d" }, { publish: false })).resolves.toBeTruthy();
  });
});
