// On a weak connection the app used to send every patient (attachments included) on
// every save, and download every patient on every start. These tests pin the new
// behaviour: only what changed travels, and nothing that might be unsaved is skipped.
//
// The cloud is a small in-memory stand-in with the same query methods the app uses.
import { describe, it, expect, vi, beforeEach } from "vitest";

const server = vi.hoisted(() => {
  const table = new Map();
  const log = [];
  const state = { failUpserts: 0, failOnCall: null, calls: 0, failIndex: false };
  const from = () => {
    const q = { cols: "*", ids: null, range: null, user: null };
    const chain = {
      select(cols) { q.cols = cols; return chain; },
      eq(_k, v) { q.user = v; return chain; },
      is() { return chain; },
      order() { return chain; },
      range(a, b) { q.range = [a, b]; return chain; },
      in(_k, ids) { q.ids = ids; return chain; },
      retry() { return chain; },
      upsert(rows) {
        state.calls += 1;
        if (state.failOnCall === state.calls) return Promise.resolve({ error: { message: "network" } });
        if (state.failUpserts > 0) { state.failUpserts -= 1; return Promise.resolve({ error: { message: "network" } }); }
        log.push({ type: "upsert", ids: rows.map((r) => r.id) });
        rows.forEach((r) => table.set(r.id, { ...r }));
        return Promise.resolve({ error: null });
      },
      then(resolve, reject) {
        let rows = [...table.values()].filter((r) => r.user_id === q.user);
        rows.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || (a.id < b.id ? -1 : 1));
        if (q.ids) rows = rows.filter((r) => q.ids.includes(r.id));
        if (q.range) rows = rows.slice(q.range[0], q.range[1] + 1);
        const index = q.cols !== "*";
        if (index && state.failIndex) {
          log.push({ type: "index-failed" });
          return Promise.resolve({ data: null, error: { message: "boom" } }).then(resolve, reject);
        }
        log.push({ type: index ? "index" : "rows", ids: q.ids || rows.map((r) => r.id) });
        const data = index ? rows.map((r) => ({ id: r.id, updated_at: r.updated_at })) : rows.map((r) => ({ ...r }));
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return chain;
  };
  return { table, log, state, from };
});

vi.mock("../supabase.js", () => ({
  supabase: { from: server.from, auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) } },
  authHeader: vi.fn().mockResolvedValue({}),
}));

const T = (n) => new Date(Date.UTC(2026, 9, 1, 10, n)).toISOString();
const patient = (id, minute, extra = {}) => ({
  id, name: `Patient ${id}`, data: { dem_name: `Patient ${id}`, note: `v${minute}` },
  createdAt: T(0), updatedAt: T(minute), hasRedFlags: false, lastDx: "", ...extra,
});

let db;
let userCounter = 0;
let uid;
beforeEach(async () => {
  server.table.clear();
  server.log.length = 0;
  server.state.failUpserts = 0;
  server.state.failOnCall = null;
  server.state.calls = 0;
  server.state.failIndex = false;
  localStorage.clear();
  vi.resetModules();
  db = await import("../PatientDatabase.jsx"); // a fresh "device": nothing remembered
  uid = `user_${++userCounter}`;
});

const uploads = () => server.log.filter((l) => l.type === "upsert");
const fullReads = () => server.log.filter((l) => l.type === "rows");

describe("saving sends only what changed", () => {
  it("the first save sends everyone, the next one only the patient that changed", async () => {
    const list = ["a", "b", "c"].map((id) => patient(id, 1));
    await db.savePatientDB(list, uid);
    expect(uploads().flatMap((u) => u.ids).sort()).toEqual(["a", "b", "c"]);

    server.log.length = 0;
    const edited = list.map((p) => (p.id === "b" ? { ...p, data: { ...p.data, note: "changed" }, updatedAt: T(5) } : p));
    await db.savePatientDB(edited, uid);
    expect(uploads().flatMap((u) => u.ids)).toEqual(["b"]);
    expect(server.table.get("b").data.note).toBe("changed");
  });

  it("saving again with nothing changed sends nothing but still reports 'saved'", async () => {
    const list = [patient("a", 1)];
    await db.savePatientDB(list, uid);
    server.log.length = 0;
    await expect(db.savePatientDB(list, uid)).resolves.toBe(true);
    expect(uploads()).toEqual([]);
  });

  it("a patient whose rename or red-flag mark changed is sent even if the time did not", async () => {
    const list = [patient("a", 1)];
    await db.savePatientDB(list, uid);
    server.log.length = 0;
    await db.savePatientDB([{ ...list[0], name: "Renamed" }], uid);
    expect(uploads().flatMap((u) => u.ids)).toEqual(["a"]);
    server.log.length = 0;
    await db.savePatientDB([{ ...list[0], name: "Renamed", hasRedFlags: true }], uid);
    expect(uploads().flatMap((u) => u.ids)).toEqual(["a"]);
  });

  it("a failed save is never counted as saved: the next save sends it again", async () => {
    const list = [patient("a", 1), patient("b", 1)];
    server.state.failUpserts = 1;
    await expect(db.savePatientDB(list, uid)).rejects.toBeTruthy();
    expect(server.table.size).toBe(0);
    await expect(db.savePatientDB(list, uid)).resolves.toBe(true);
    expect([...server.table.keys()].sort()).toEqual(["a", "b"]);
  });

  it("a big first save goes in small requests and keeps the progress it made if one fails", async () => {
    const list = Array.from({ length: 12 }, (_, i) => patient(`p${String(i).padStart(2, "0")}`, 1));
    await db.savePatientDB(list, uid);
    expect(uploads().length).toBe(3); // 5 + 5 + 2
    expect(Math.max(...uploads().map((u) => u.ids.length))).toBeLessThanOrEqual(5);

    // another account: the 2nd request fails, the 1st batch must not be sent again afterwards
    const uid2 = `user_${++userCounter}`;
    const list2 = list.map((p) => ({ ...p, id: `q${p.id}` }));
    server.table.clear(); server.log.length = 0;
    server.state.calls = 0; server.state.failOnCall = 2;
    await expect(db.savePatientDB(list2, uid2)).rejects.toBeTruthy();
    expect(server.table.size).toBe(5); // the first batch landed
    server.state.failOnCall = null; server.log.length = 0;
    await db.savePatientDB(list2, uid2);
    expect(uploads().flatMap((u) => u.ids)).toHaveLength(7); // only the rest
    expect(server.table.size).toBe(12);
  });

  it("a patient with no usable last-changed time is always sent", async () => {
    const odd = { ...patient("a", 1), updatedAt: undefined };
    await db.savePatientDB([odd], uid);
    server.log.length = 0;
    await db.savePatientDB([odd], uid);
    expect(uploads().flatMap((u) => u.ids)).toEqual(["a"]);
  });

  it("the sample patients are still never sent", async () => {
    const samples = db.loadPatientDB(uid); // a new account starts with the two samples
    await expect(db.savePatientDB(samples, uid)).resolves.toBe(false);
    expect(uploads()).toEqual([]);
  });
});

describe("opening the app downloads only what the phone does not have", () => {
  const seedCloud = (list) => { for (const p of list) server.table.set(p.id, { id: p.id, user_id: uid, name: p.name, data: p.data, created_at: p.createdAt, updated_at: p.updatedAt, has_red_flags: false, last_dx: "" }); };

  it("downloads nothing when the phone is up to date", async () => {
    const list = ["a", "b", "c"].map((id) => patient(id, 1));
    seedCloud(list);
    const r = await db.fetchPatientsFromSupabase(uid, { local: list });
    expect(r.rows).toEqual([]);
    expect(r.error).toBeNull();
    expect(fullReads()).toEqual([]);
    expect(server.log.map((l) => l.type)).toEqual(["index"]);
  });

  it("downloads only the patients that are new or newer in the cloud", async () => {
    const cloud = [patient("a", 1), patient("b", 9), patient("c", 1), patient("d", 1)];
    seedCloud(cloud);
    const local = [patient("a", 1), patient("b", 2), patient("c", 1)]; // b is older here, d is missing
    const r = await db.fetchPatientsFromSupabase(uid, { local });
    expect(r.rows.map((x) => x.id).sort()).toEqual(["b", "d"]);
    expect(fullReads().flatMap((l) => l.ids).sort()).toEqual(["b", "d"]);
  });

  it("never replaces a newer copy on the phone, and then uploads it with the next save", async () => {
    seedCloud([patient("a", 1)]);
    const local = [patient("a", 7, { data: { dem_name: "Patient a", note: "typed offline" } })];
    const r = await db.fetchPatientsFromSupabase(uid, { local });
    expect(r.rows).toEqual([]);
    await db.savePatientDB(local, uid);
    expect(uploads().flatMap((u) => u.ids)).toEqual(["a"]);
    expect(server.table.get("a").data.note).toBe("typed offline");
  });

  it("an empty phone (new device, cleared data) downloads everything", async () => {
    const cloud = Array.from({ length: 11 }, (_, i) => patient(`p${String(i).padStart(2, "0")}`, 1));
    seedCloud(cloud);
    const r = await db.fetchPatientsFromSupabase(uid, { local: [] });
    expect(r.rows).toHaveLength(11);
    expect(r.skipped).toBe(0);
  });

  it("without the phone's list it reads everything, as before", async () => {
    seedCloud([patient("a", 1), patient("b", 1)]);
    const r = await db.fetchPatientsFromSupabase(uid);
    expect(r.rows).toHaveLength(2);
    expect(server.log.some((l) => l.type === "index")).toBe(false);
  });

  it("if the cloud's list cannot be read it falls back to reading everything", async () => {
    seedCloud([patient("a", 1), patient("b", 1)]);
    server.state.failIndex = true;
    const r = await db.fetchPatientsFromSupabase(uid, { local: [patient("a", 1), patient("b", 1)], retryDelays: [0] });
    expect(r.rows).toHaveLength(2);
    expect(r.error).toBeNull();
  });

  it("what the phone already holds is not sent back up", async () => {
    const list = [patient("a", 1), patient("b", 1)];
    seedCloud(list);
    await db.fetchPatientsFromSupabase(uid, { local: list });
    server.log.length = 0;
    await db.savePatientDB(list, uid);
    expect(uploads()).toEqual([]);
  });

  it("downloaded patients are marked as in the cloud, so the next save does not echo them", async () => {
    const cloud = [patient("a", 3)];
    seedCloud(cloud);
    const r = await db.fetchPatientsFromSupabase(uid, { local: [] });
    const asOnPhone = r.rows.map((row) => ({ id: row.id, name: row.name, data: row.data, createdAt: row.created_at, updatedAt: row.updated_at, hasRedFlags: row.has_red_flags, lastDx: row.last_dx }));
    db.markPatientsSynced(uid, asOnPhone);
    server.log.length = 0;
    await db.savePatientDB(asOnPhone, uid);
    expect(uploads()).toEqual([]);
  });
});
