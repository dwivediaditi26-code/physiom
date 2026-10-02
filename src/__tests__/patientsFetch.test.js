import { describe, it, expect, vi, beforeEach } from "vitest";

// The page the test hands back for each (from, size) request.
let handler;
vi.mock("../supabase.js", () => {
  const make = () => {
    const args = {};
    const chain = {
      select: () => chain, eq: () => chain, is: () => chain, order: () => chain,
      range: (from, to) => { args.from = from; args.to = to; return chain; },
      then: (resolve, reject) => Promise.resolve(handler(args.from, args.to - args.from + 1)).then(resolve, reject),
    };
    return chain;
  };
  return { supabase: { from: vi.fn(make), auth: {} } };
});

import { fetchPatientsFromSupabase } from "../PatientDatabase.jsx";

const rowsFor = (from, size, total) =>
  Array.from({ length: Math.max(0, Math.min(size, total - from)) }, (_, i) => ({ id: `p${from + i}`, name: `P${from + i}` }));
const ok = (data) => ({ data, error: null });
const bad = (message = "statement timeout") => ({ data: null, error: { message } });
const FAST = { pageSize: 4, retryDelays: [0, 0] };

beforeEach(() => { handler = null; });

describe("fetchPatientsFromSupabase", () => {
  it("reads every patient, a page at a time", async () => {
    handler = (from, size) => ok(rowsFor(from, size, 10));
    const r = await fetchPatientsFromSupabase("u1", FAST);
    expect(r.rows.map((x) => x.id)).toEqual(Array.from({ length: 10 }, (_, i) => `p${i}`));
    expect(r.skipped).toBe(0);
    expect(r.error).toBeNull();
  });

  it("handles an exact multiple of the page size and an empty account", async () => {
    handler = (from, size) => ok(rowsFor(from, size, 8));
    expect((await fetchPatientsFromSupabase("u1", FAST)).rows).toHaveLength(8);
    handler = () => ok([]);
    const empty = await fetchPatientsFromSupabase("u1", FAST);
    expect(empty.rows).toEqual([]);
    expect(empty.error).toBeNull();
  });

  it("retries a request that fails once and carries on", async () => {
    let fails = 1;
    handler = (from, size) => (from === 4 && fails-- > 0 ? bad() : ok(rowsFor(from, size, 10)));
    const r = await fetchPatientsFromSupabase("u1", FAST);
    expect(r.rows).toHaveLength(10);
    expect(r.error).toBeNull();
  });

  it("one record that can never be read does not hide the others", async () => {
    // record p5 always times out, so any request that includes it fails
    handler = (from, size) => (from <= 5 && 5 < from + size ? bad() : ok(rowsFor(from, size, 10)));
    const r = await fetchPatientsFromSupabase("u1", FAST);
    expect(r.rows.map((x) => x.id)).toEqual(["p0", "p1", "p2", "p3", "p4", "p6", "p7", "p8", "p9"]);
    expect(r.skipped).toBe(1);
    expect(r.error).toBeTruthy();
  });

  it("reports the failure (and keeps what it did read) when nothing works", async () => {
    handler = (from, size) => (from === 0 ? ok(rowsFor(0, size, 100)) : bad("permission denied"));
    const r = await fetchPatientsFromSupabase("u1", FAST);
    expect(r.rows).toHaveLength(4);
    expect(r.error.message).toBe("permission denied");
    expect(r.skipped).toBe(0); // the connection failed; it is not "N patients could not be opened"
  });
});
