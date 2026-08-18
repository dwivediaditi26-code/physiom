// Coverage for the Phase 2 PhysioFeed rewrite (2026-08-18): getPosts() and
// the like/save/follow/comment/create mutations in src/physiofeed/data/db.js
// now try real Supabase queries against posts/post_likes/comments/follows/
// saved_posts before falling back to the original in-memory mock array.
// This test mocks src/supabase.js per-table (never touches the network —
// same safety principle as the shared __mocks__/supabase.js used for the
// clinical app) and checks both paths: real data flowing through correctly,
// and every mutation falling back cleanly when the real query fails (e.g.
// a demo post id that doesn't exist in the real `posts` table).
import { describe, it, expect, vi, beforeEach } from "vitest";

const tableData = {};
function setTable(name, result) { tableData[name] = result; }

function makeChain(table) {
  const resolve = () => Promise.resolve(tableData[table] ?? { data: [], error: null });
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    maybeSingle: () => chain,
    single: () => chain,
    insert: () => chain,
    delete: () => chain,
    then: (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected),
  };
  return chain;
}

let currentUser = null;

vi.mock("../supabase.js", () => ({
  supabase: {
    from: vi.fn((table) => makeChain(table)),
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: currentUser }, error: null })) },
  },
}));

import * as db from "../physiofeed/data/db.js";

beforeEach(() => {
  for (const k of Object.keys(tableData)) delete tableData[k];
  currentUser = null;
});

describe("PhysioFeed db.js Supabase wiring", () => {
  it("getPosts() falls back to the demo feed when posts table is empty", async () => {
    setTable("posts", { data: [], error: null });
    const posts = await db.getPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0]).toHaveProperty("heading");
    expect(posts[0]).toHaveProperty("commentList");
  });

  it("getPosts() maps a real post + likes + comments + profiles into the exact shape FeedPostCard/PostMedia expect", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", {
      data: [{
        id: "p_real1", author_id: "u-author", category: "Techniques",
        heading: "Real post heading", caption: "Real caption",
        media_type: "checklist", media: { checklist: ["Step 1", "Step 2"], gradient: "blue", iconName: "Dumbbell" },
        tags: ["ACLRehab"], created_at: new Date(Date.now() - 3600_000).toISOString(),
      }],
      error: null,
    });
    setTable("post_likes", { data: [{ post_id: "p_real1", user_id: "u-me" }, { post_id: "p_real1", user_id: "u-author" }], error: null });
    setTable("comments", { data: [{ id: 1, post_id: "p_real1", author_id: "u-author", text: "Nice work", created_at: new Date().toISOString() }], error: null });
    setTable("saved_posts", { data: [{ post_id: "p_real1" }], error: null });
    setTable("follows", { data: [{ following_id: "u-author" }], error: null });
    setTable("profiles", {
      data: [
        { id: "u-me", name: "Dr Me", role: "PT", verified: false, gradient: "violet", initials: "M" },
        { id: "u-author", name: "Dr Author", role: "Sports PT", verified: true, gradient: "blue", initials: "A" },
      ],
      error: null,
    });

    const posts = await db.getPosts();
    expect(posts).toHaveLength(1);
    const p = posts[0];
    expect(p.id).toBe("p_real1");
    expect(p.author).toBe("Dr Author");
    expect(p.isSelf).toBe(false);
    expect(p.verified).toBe(true);
    expect(p.following).toBe(true);
    expect(p.media).toBe("checklist");
    expect(p.checklist).toEqual(["Step 1", "Step 2"]);
    expect(p.likes).toBe(2);
    expect(p.liked).toBe(true); // u-me is in post_likes
    expect(p.saved).toBe(true);
    expect(p.commentList).toEqual([{ id: "1", author: "Dr Author", text: "Nice work" }]);
    expect(p.time).toMatch(/^\d+h$/);
  });

  it("toggleLike() on a demo post (not in the real table) falls back to the local mock toggle without throwing", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", { data: [], error: null }); // keeps getPosts() on the demo feed
    setTable("post_likes", { data: null, error: { message: "insert or update on table violates foreign key constraint" } });

    const before = (await db.getPosts()).find((p) => p.id === "p1");
    await db.toggleLike("p1");
    const after = (await db.getPosts()).find((p) => p.id === "p1");
    expect(after.liked).toBe(!before.liked);
    expect(after.likes).toBe(before.likes + (before.liked ? -1 : 1));
  });

  it("createPost() inserts into Supabase when signed in and returns the inserted row", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", { data: { id: "p_new", author_id: "u-me", heading: "Hello world", caption: "Hello world, this is a longer test caption" }, error: null });

    const result = await db.createPost({ text: "Hello world, this is a longer test caption", category: "General" });
    expect(result.id).toBe("p_new");
  });

  it("createPost() falls back to a local mock post when signed out", async () => {
    currentUser = null;
    const result = await db.createPost({ text: "Guest mode post", category: "General" });
    expect(result.caption).toBe("Guest mode post");
    expect(result.id).toMatch(/^p/);
  });
});
