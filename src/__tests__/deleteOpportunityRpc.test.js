import { describe, it, expect, vi, beforeEach } from "vitest";

// 2026-10-10, Aditi: "when I click on delete it is coming back". A direct
// UPDATE of deleted_at was refused by the database (the board's SELECT policy
// hides deleted rows, and Postgres checks the updated row against it), so the
// listing was put back on screen. The delete now goes through the
// delete_opportunity() database function (supabase/add_delete_opportunity_rpc.sql).

let currentUser = null;
let rpcResult = { data: null, error: null };
const rpc = vi.fn(() => Promise.resolve(rpcResult));
const from = vi.fn(() => { throw new Error("deleteOpportunity must not update the table directly"); });

vi.mock("../supabase.js", () => ({
  supabase: {
    from: (...a) => from(...a),
    rpc: (...a) => rpc(...a),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: currentUser }, error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: currentUser ? { user: currentUser } : null }, error: null })),
    },
  },
}));

import { deleteOpportunity } from "../physiofeed/data/db.js";

beforeEach(() => {
  currentUser = { id: "u-owner" };
  rpcResult = { data: null, error: null };
  rpc.mockClear();
  from.mockClear();
});

describe("deleteOpportunity()", () => {
  it("hides the listing through the delete_opportunity() function, not a direct table update", async () => {
    await deleteOpportunity(42);
    expect(rpc).toHaveBeenCalledWith("delete_opportunity", { p_id: 42 });
    expect(from).not.toHaveBeenCalled();
  });

  it("throws the database's message so the page can put the listing back and say why", async () => {
    rpcResult = { data: null, error: new Error("That listing was not found, or it is not yours to delete.") };
    await expect(deleteOpportunity(42)).rejects.toThrow(/not yours to delete/);
  });

  it("asks a signed-out visitor to sign in and does not call the database", async () => {
    currentUser = null;
    await expect(deleteOpportunity(42)).rejects.toThrow(/Sign in/);
    expect(rpc).not.toHaveBeenCalled();
  });
});
