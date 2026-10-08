import { describe, it, expect, vi, beforeEach } from "vitest";

// The bell shows people waiting to connect and new items in News even when no
// database trigger or phone push is set up (db.js: appSideBellItems).
const tableData = {};
const setTable = (name, result) => { tableData[name] = result; };
function makeChain(table) {
  const resolve = () => Promise.resolve(tableData[table] ?? { data: [], error: null });
  const chain = {};
  for (const m of ["select", "eq", "neq", "in", "or", "order", "gte", "limit", "maybeSingle", "single", "insert", "update", "delete"]) chain[m] = () => chain;
  chain.then = (ok, bad) => resolve().then(ok, bad);
  return chain;
}
let currentUser = null;
vi.mock("../supabase.js", () => ({
  supabase: {
    from: vi.fn((table) => makeChain(table)),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: currentUser }, error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: currentUser ? { user: currentUser } : null }, error: null })),
    },
  },
  authHeader: vi.fn(() => Promise.resolve({})),
}));

import * as db from "../physiofeed/data/db.js";

const ago = (ms) => new Date(Date.now() - ms).toISOString();

beforeEach(() => {
  for (const k of Object.keys(tableData)) delete tableData[k];
  currentUser = { id: "u-me" };
  try { localStorage.clear(); } catch {}
});

describe("bell: connection requests", () => {
  it("shows someone waiting to connect, even with no server notification", async () => {
    setTable("notifications", { data: [], error: null });
    setTable("connections", { data: [{ id: "c1", requester_id: "u-ria", created_at: ago(600_000) }], error: null });
    setTable("profiles", { data: [{ id: "u-ria", name: "Ria Shah" }], error: null });
    const list = await db.getNotifications();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "conn:c1", text: "Ria Shah wants to connect with you", link: "/people", read: false, iconName: "UserPlus" });
  });

  it("does not repeat a request the server already notified about", async () => {
    setTable("notifications", { data: [{ id: 7, icon_name: "UserPlus", text: "Ria Shah sent you a connection request", tone: "x", read: false, created_at: ago(500_000), kind: "connection_request", entity_id: "c1", entity_type: "connection" }], error: null });
    setTable("connections", { data: [{ id: "c1", requester_id: "u-ria", created_at: ago(600_000) }], error: null });
    setTable("profiles", { data: [{ id: "u-ria", name: "Ria Shah" }], error: null });
    const list = await db.getNotifications();
    expect(list.map((n) => n.id)).toEqual(["7"]);
  });

  it("marking it read is remembered", async () => {
    setTable("notifications", { data: [], error: null });
    setTable("connections", { data: [{ id: "c1", requester_id: "u-ria", created_at: ago(600_000) }], error: null });
    setTable("profiles", { data: [{ id: "u-ria", name: "Ria Shah" }], error: null });
    const after = await db.markNotificationRead("conn:c1");
    expect(after[0].read).toBe(true);
  });
});

describe("bell: new in News", () => {
  // fixed timestamps: the same item must keep the same created_at across calls
  const base = Date.now();
  const news = (n) => ({ id: `n${n}`, title: `Item ${n}`, created_at: new Date(base - n * 3_600_000).toISOString() });

  it("shows one entry for what was added in the last 3 days", async () => {
    setTable("notifications", { data: [], error: null });
    setTable("career_news", { data: [news(1)], error: null });
    const list = await db.getNotifications();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ iconName: "Newspaper", text: "New in News: Item 1", link: "/news", read: false });
  });

  it("counts several new items and names the latest", async () => {
    setTable("notifications", { data: [], error: null });
    setTable("career_news", { data: [news(1), news(2), news(3)], error: null });
    const list = await db.getNotifications();
    expect(list[0].text).toBe("3 new items in News — latest: Item 1");
  });

  it("becomes read once opened, and comes back unread when something newer is added", async () => {
    setTable("notifications", { data: [], error: null });
    setTable("career_news", { data: [news(2)], error: null });
    const [first] = await db.getNotifications();
    const afterRead = await db.markNotificationRead(first.id);
    expect(afterRead[0].read).toBe(true);
    setTable("career_news", { data: [news(0.5), news(2)], error: null });
    const [again] = await db.getNotifications();
    expect(again).toMatchObject({ read: false, text: "New in News: Item 0.5" });
  });

  it("guests keep the demo list and get no app-side items", async () => {
    currentUser = null;
    setTable("career_news", { data: [news(1)], error: null });
    const list = await db.getNotifications();
    expect(list.some((n) => String(n.id).startsWith("news:"))).toBe(false);
  });
});
