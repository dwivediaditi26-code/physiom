// Mock Supabase client for tests — CRITICAL SAFETY MEASURE.
// The real src/supabase.js points at the actual production project
// (dlauxdokkrqbvbormxte). Tests that mount AppFull/AppInner must never be
// allowed to make a real network call against it — a simulated test patient
// could otherwise get upserted into the real patients table. Every test file
// that renders app components MUST vi.mock("../supabase.js", ...) using this.
function chainable(result = { data: [], error: null }) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    upsert: () => Promise.resolve(result),
    insert: () => Promise.resolve(result),
    delete: () => chain,
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

// vi.fn() wrappers (not plain functions) so individual tests can override
// return values per-test with vi.mocked(supabase.auth.getSession).mockResolvedValueOnce(...)
// — e.g. to simulate a logged-in session without ever touching real Supabase.
import { vi } from "vitest";

export const supabase = {
  from: vi.fn(() => chainable()),
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  },
};
