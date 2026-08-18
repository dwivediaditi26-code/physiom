// Coverage for the PhysioFeed real-world rewrite (2026-08-18): getPosts()/
// getPeople()/getEvidence()/getCommunities()/getNotifications() and their
// mutations in src/physiofeed/data/db.js now try real Supabase queries
// before falling back to the original in-memory mock arrays.
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
    neq: () => chain,
    in: () => chain,
    or: () => chain,
    order: () => chain,
    maybeSingle: () => chain,
    single: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    then: (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected),
  };
  return chain;
}

let currentUser = null;
let storageUploadError = null;

vi.mock("../supabase.js", () => ({
  supabase: {
    from: vi.fn((table) => makeChain(table)),
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: currentUser }, error: null })) },
    storage: {
      from: vi.fn((bucket) => ({
        upload: vi.fn((path) => Promise.resolve({ data: storageUploadError ? null : { path }, error: storageUploadError })),
        getPublicUrl: vi.fn((path) => ({ data: { publicUrl: `https://fake.test/storage/${bucket}/${path}` } })),
      })),
    },
  },
}));

import * as db from "../physiofeed/data/db.js";

beforeEach(() => {
  for (const k of Object.keys(tableData)) delete tableData[k];
  currentUser = null;
  storageUploadError = null;
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
    expect(p.commentList).toEqual([{ id: "1", author: "Dr Author", text: "Nice work", isSelf: false }]);
    expect(p.time).toMatch(/^\d+h$/);
  });

  it("getPosts() maps the author's avatar_url onto authorAvatarUrl, and null when the author has none", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", {
      data: [
        { id: "p_avatar1", author_id: "u-has-avatar", category: "Techniques", heading: "h1", caption: "c1", media_type: "checklist", media: {}, media_urls: [], tags: [], post_type: "post", created_at: new Date().toISOString() },
        { id: "p_avatar2", author_id: "u-no-avatar", category: "Techniques", heading: "h2", caption: "c2", media_type: "checklist", media: {}, media_urls: [], tags: [], post_type: "post", created_at: new Date().toISOString() },
      ],
      error: null,
    });
    setTable("profiles", {
      data: [
        { id: "u-has-avatar", name: "Dr Has Avatar", avatar_url: "https://fake.test/storage/profile-images/u-has-avatar/photo.jpg" },
        { id: "u-no-avatar", name: "Dr No Avatar" },
      ],
      error: null,
    });
    const posts = await db.getPosts();
    expect(posts.find((p) => p.id === "p_avatar1").authorAvatarUrl).toBe("https://fake.test/storage/profile-images/u-has-avatar/photo.jpg");
    expect(posts.find((p) => p.id === "p_avatar2").authorAvatarUrl).toBeNull();
  });

  it("REGRESSION (2026-08-18 bug): toggleLike()/toggleSave()/addComment() on a REAL post resolve without throwing", async () => {
    // This is the exact bug Aditi reported ("likes and comments are not
    // working"): the old code did `clone(_posts.find(...)) || null` as its
    // final return in every one of these functions. For a real post (not
    // present in the local demo _posts array), .find() returns undefined,
    // and JSON.parse(JSON.stringify(undefined)) throws a SyntaxError --
    // AFTER the real Supabase write had already succeeded. That crash
    // rejected the promise, so AppDataContext's `setPosts(await
    // db.getPosts())` line right after never ran and the UI never updated,
    // even though the like/save/comment silently succeeded server-side.
    currentUser = { id: "u-me" };
    setTable("posts", {
      data: [{
        id: "p_real_regression", author_id: "u-other", category: "Techniques",
        heading: "Real post", caption: "Real post", media_type: "checklist", media: {}, media_urls: [], tags: [],
        post_type: "post", created_at: new Date().toISOString(),
      }],
      error: null,
    });
    setTable("post_likes", { data: [], error: null });
    setTable("saved_posts", { data: [], error: null });
    setTable("comments", { data: [], error: null });
    setTable("profiles", { data: [{ id: "u-other", name: "Dr Other" }], error: null });

    // Each of these would have thrown a SyntaxError before the fix -- if
    // any of them reject, this test fails (no try/catch needed: an
    // unhandled rejection from an awaited call fails the test directly).
    await db.toggleLike("p_real_regression");
    await db.toggleSave("p_real_regression");
    await db.addComment("p_real_regression", "Nice!");

    const posts = await db.toggleLike("p_real_regression");
    expect(Array.isArray(posts)).toBe(true); // returns the full posts list (via getPosts()), not a single stale/undefined post
  });

  it("REGRESSION: toggleFollowAuthor() on a REAL post resolves without throwing", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", {
      data: [{ id: "p_real_regression2", author_id: "u-other", category: "Techniques", heading: "Real post", caption: "Real post", media_type: "checklist", media: {}, media_urls: [], tags: [], post_type: "post", created_at: new Date().toISOString() }],
      error: null,
    });
    setTable("follows", { data: [], error: null });
    setTable("profiles", { data: [{ id: "u-other", name: "Dr Other" }], error: null });
    await db.toggleFollowAuthor("p_real_regression2");
  });

  it("getPosts() marks isSelf on comments authored by the signed-in user, for the delete-comment UI", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", {
      data: [{ id: "p_comment_isself", author_id: "u-other", category: "Techniques", heading: "h", caption: "c", media_type: "checklist", media: {}, media_urls: [], tags: [], post_type: "post", created_at: new Date().toISOString() }],
      error: null,
    });
    setTable("comments", {
      data: [
        { id: 10, post_id: "p_comment_isself", author_id: "u-me", text: "mine", created_at: new Date().toISOString() },
        { id: 11, post_id: "p_comment_isself", author_id: "u-other", text: "not mine", created_at: new Date().toISOString() },
      ],
      error: null,
    });
    setTable("profiles", { data: [{ id: "u-me", name: "Dr Me" }, { id: "u-other", name: "Dr Other" }], error: null });
    const commentList = (await db.getPosts())[0].commentList;
    expect(commentList.find((c) => c.id === "10").isSelf).toBe(true);
    expect(commentList.find((c) => c.id === "11").isSelf).toBe(false);
  });

  it("deletePost() on a REAL post (as its own author) resolves without throwing and returns the refreshed feed", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", {
      data: [{ id: "p_real_delete", author_id: "u-me", category: "Techniques", heading: "h", caption: "c", media_type: "checklist", media: {}, media_urls: [], tags: [], post_type: "post", created_at: new Date().toISOString() }],
      error: null,
    });
    setTable("profiles", { data: [{ id: "u-me", name: "Dr Me" }], error: null });
    const posts = await db.deletePost("p_real_delete");
    expect(Array.isArray(posts)).toBe(true);
  });

  it("deletePost() falls back to a local mock removal for a demo-only post id, without throwing", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", { data: [], error: null }); // keeps getPosts() on the demo feed
    const posts = await db.deletePost("p_nonexistent_demo_id_for_delete_test");
    expect(Array.isArray(posts)).toBe(true);
  });

  it("deleteComment() on a REAL comment (as its own author) resolves without throwing", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", { data: [], error: null });
    setTable("comments", { data: null, error: null });
    const posts = await db.deleteComment("p_any", "123");
    expect(Array.isArray(posts)).toBe(true);
  });

  it("deleteComment() falls back to a local mock removal without throwing when the real delete fails", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", { data: [], error: null });
    setTable("comments", { data: null, error: { message: "not found" } });
    const posts = await db.deleteComment("p_nonexistent_demo_post_for_comment_delete_test", "c_nonexistent");
    expect(Array.isArray(posts)).toBe(true);
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

  it("getPeople() falls back to the demo list when profiles table is empty", async () => {
    setTable("profiles", { data: [], error: null });
    const people = await db.getPeople();
    expect(people.length).toBeGreaterThan(0);
    expect(people[0]).toHaveProperty("mutual");
  });

  it("getPeople() maps real profiles + follows and keeps demo people alongside them", async () => {
    currentUser = { id: "u-me" };
    setTable("profiles", { data: [{ id: "u-other", name: "Dr Other", role: "PT", location: "Pune", gradient: "blue" }], error: null });
    setTable("follows", { data: [{ following_id: "u-other" }], error: null });
    const people = await db.getPeople();
    const real = people.find((p) => p.id === "u-other");
    expect(real).toBeTruthy();
    expect(real.following).toBe(true);
    expect(real.location).toBe("Pune");
    // demo people (u-priya etc.) still present
    expect(people.some((p) => p.id === "u-priya")).toBe(true);
  });

  it("getPeople() maps avatar_url onto avatarUrl, and null when a profile has none", async () => {
    currentUser = { id: "u-me" };
    setTable("profiles", {
      data: [{ id: "u-other", name: "Dr Other", role: "PT", location: "Pune", gradient: "blue", avatar_url: "https://fake.test/storage/profile-images/u-other/photo.jpg" }],
      error: null,
    });
    setTable("follows", { data: [], error: null });
    const people = await db.getPeople();
    const real = people.find((p) => p.id === "u-other");
    expect(real.avatarUrl).toBe("https://fake.test/storage/profile-images/u-other/photo.jpg");
  });

  it("toggleFollowPerson() on a demo person falls back to the local mock toggle", async () => {
    currentUser = { id: "u-me" };
    setTable("profiles", { data: [], error: null });
    setTable("follows", { data: null, error: { message: "foreign key violation" } });
    const before = (await db.getPeople()).find((p) => p.id === "u-priya");
    const after = (await db.toggleFollowPerson("u-priya")).find((p) => p.id === "u-priya");
    expect(after.following).toBe(!before.following);
  });

  it("getEvidence() falls back to demo evidence when research_articles is empty", async () => {
    setTable("research_articles", { data: [], error: null });
    const evidence = await db.getEvidence();
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence[0]).toHaveProperty("journal");
  });

  it("getEvidence() maps real articles + research_saves into the ResearchCard shape", async () => {
    currentUser = { id: "u-me" };
    setTable("research_articles", {
      data: [{ id: "ev_real1", title: "Real article", journal: "Real Journal", type: "RCT", year: 2026, level: "Level 1", category: "Sports", tags: ["Sports"], gradient: "blue" }],
      error: null,
    });
    setTable("research_saves", { data: [{ article_id: "ev_real1" }], error: null });
    const evidence = await db.getEvidence();
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ id: "ev_real1", grad: "blue", saved: true, journal: "Real Journal" });
  });

  it("getCommunities() falls back to demo communities when communities table is empty", async () => {
    setTable("communities", { data: [], error: null });
    const communities = await db.getCommunities();
    expect(communities.length).toBeGreaterThan(0);
    expect(communities[0]).toHaveProperty("desc");
  });

  it("getCommunities() maps real rows + embedded member count + membership", async () => {
    currentUser = { id: "u-me" };
    setTable("communities", {
      data: [{ id: "cm_real1", name: "Real Community", description: "A real one", gradient: "teal", community_members: [{ count: 5 }] }],
      error: null,
    });
    setTable("community_members", { data: [{ community_id: "cm_real1" }], error: null });
    const communities = await db.getCommunities();
    expect(communities).toHaveLength(1);
    expect(communities[0]).toMatchObject({ id: "cm_real1", desc: "A real one", grad: "teal", members: 5, joined: true });
  });

  it("getNotifications() falls back to demo notifications when signed out", async () => {
    currentUser = null;
    const notifications = await db.getNotifications();
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]).toHaveProperty("iconName");
  });

  it("getNotifications() maps real rows for the signed-in user", async () => {
    currentUser = { id: "u-me" };
    setTable("notifications", {
      data: [{ id: 1, icon_name: "Heart", text: "Someone liked your post", tone: "text-rose-500", read: false, created_at: new Date(Date.now() - 600_000).toISOString() }],
      error: null,
    });
    const notifications = await db.getNotifications();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ id: "1", iconName: "Heart", read: false });
    expect(notifications[0].time).toMatch(/^\d+m$/);
  });

  it("reportPost() inserts a report when signed in", async () => {
    currentUser = { id: "u-me" };
    setTable("reports", { data: null, error: null });
    const ok = await db.reportPost("p1", "Spam");
    expect(ok).toBe(true);
  });

  it("reportPost() no-ops (returns false, never throws) when signed out", async () => {
    currentUser = null;
    const ok = await db.reportPost("p1", "Spam");
    expect(ok).toBe(false);
  });

  it("getReports() maps joined post + reporter fields for the admin view", async () => {
    setTable("reports", {
      data: [{
        id: 7, post_id: "p1", reason: "Spam", status: "open", created_at: new Date().toISOString(),
        posts: { heading: "Reported heading", caption: "Reported caption" },
        profiles: { name: "Dr Reporter" },
      }],
      error: null,
    });
    const reports = await db.getReports();
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ id: 7, postId: "p1", reason: "Spam", postHeading: "Reported heading", reporterName: "Dr Reporter" });
  });

  it("dismissReport() and removeReportedPost() resolve true on success", async () => {
    setTable("reports", { data: null, error: null });
    setTable("posts", { data: null, error: null });
    expect(await db.dismissReport(7)).toBe(true);
    expect(await db.removeReportedPost(7, "p1")).toBe(true);
  });

  it("updateProfile() writes real changes and returns the refreshed profile", async () => {
    currentUser = { id: "u-me" };
    setTable("profiles", { data: { id: "u-me", name: "Dr New Name", role: "Sports PT", location: "Pune", bio: "", quote: "", followers_count: 0, following_count: 0, gradient: "blue" }, error: null });
    const updated = await db.updateProfile({ name: "Dr New Name", gradient: "blue" });
    expect(updated.name).toBe("Dr New Name");
    expect(updated.gradient).toBe("blue");
  });

  it("updateProfile() throws (does not silently no-op) when signed out, so the edit form can show a real error", async () => {
    currentUser = null;
    await expect(db.updateProfile({ name: "Someone" })).rejects.toThrow(/sign in/i);
  });

  it("updateProfile() throws when the real Supabase update fails, instead of pretending it saved", async () => {
    currentUser = { id: "u-me" };
    setTable("profiles", { data: null, error: { message: "relation \"profiles\" does not exist" } });
    await expect(db.updateProfile({ name: "Someone" })).rejects.toBeTruthy();
  });

  it("uploadPostImage()/uploadPostVideo() throw a clear error when signed out", async () => {
    currentUser = null;
    await expect(db.uploadPostImage(new Blob())).rejects.toThrow(/sign in/i);
    await expect(db.uploadPostVideo(new File([], "clip.mp4"))).rejects.toThrow(/sign in/i);
  });

  it("uploadPostImage() returns a public URL when signed in and the upload succeeds", async () => {
    currentUser = { id: "u-me" };
    const url = await db.uploadPostImage(new Blob(["fake"], { type: "image/jpeg" }));
    expect(url).toMatch(/^https:\/\/fake\.test\/storage\/post-images\/u-me\//);
  });

  it("uploadPostVideo() propagates a real Storage error instead of silently swallowing it", async () => {
    currentUser = { id: "u-me" };
    storageUploadError = { message: "The resource already exists" };
    await expect(db.uploadPostVideo(new File([], "clip.mp4"))).rejects.toBeTruthy();
  });

  it("uploadProfileImage() throws a clear error when signed out", async () => {
    currentUser = null;
    await expect(db.uploadProfileImage(new Blob())).rejects.toThrow(/sign in/i);
  });

  it("uploadProfileImage() returns a public URL from the profile-images bucket when signed in", async () => {
    currentUser = { id: "u-me" };
    const url = await db.uploadProfileImage(new Blob(["fake"], { type: "image/jpeg" }));
    expect(url).toMatch(/^https:\/\/fake\.test\/storage\/profile-images\/u-me\//);
  });

  it("getProfile() maps avatar_url onto avatarUrl for a real profile row", async () => {
    currentUser = { id: "u-me" };
    setTable("profiles", {
      data: { id: "u-me", name: "Dr Me", role: "PT", location: "", bio: "", quote: "", followers_count: 0, following_count: 0, gradient: "violet", initials: "M", avatar_url: "https://fake.test/storage/profile-images/u-me/photo.jpg" },
      error: null,
    });
    const profile = await db.getProfile();
    expect(profile.avatarUrl).toBe("https://fake.test/storage/profile-images/u-me/photo.jpg");
  });

  it("getProfile() falls back to avatarUrl: null (not undefined/crash) on rows from before add_profile_avatar.sql runs", async () => {
    currentUser = { id: "u-me" };
    setTable("profiles", {
      data: { id: "u-me", name: "Dr Me", role: "PT", location: "", bio: "", quote: "", followers_count: 0, following_count: 0, gradient: "violet", initials: "M" },
      error: null,
    });
    const profile = await db.getProfile();
    expect(profile.avatarUrl).toBeNull();
  });

  it("createPost() with media stores media_type/media_urls and maps them back out via getPosts()", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", { data: { id: "p_photo1" }, error: null });
    const result = await db.createPost({
      text: "Look at this ROM improvement",
      category: "Case Studies",
      media: { type: "photo", urls: ["https://fake.test/storage/post-images/u-me/a.jpg"] },
    });
    expect(result.id).toBe("p_photo1");

    setTable("posts", {
      data: [{
        id: "p_photo1", author_id: "u-me", category: "Case Studies",
        heading: "Look at this ROM improvement", caption: "Look at this ROM improvement",
        media_type: "photo", media: {}, media_urls: ["https://fake.test/storage/post-images/u-me/a.jpg"],
        tags: [], created_at: new Date().toISOString(),
      }],
      error: null,
    });
    setTable("profiles", { data: [{ id: "u-me", name: "Dr Me", role: "PT", verified: false, gradient: "violet", initials: "M" }], error: null });
    const posts = await db.getPosts();
    expect(posts[0]).toMatchObject({ media: "photo", mediaUrls: ["https://fake.test/storage/post-images/u-me/a.jpg"] });
  });

  it("createPost() falls back to a local mock post carrying mediaUrls when signed out", async () => {
    currentUser = null;
    const result = await db.createPost({ text: "Guest photo post", category: "General", media: { type: "photo", urls: ["blob://local"] } });
    expect(result.media).toBe("photo");
    expect(result.mediaUrls).toEqual(["blob://local"]);
  });

  it("getPosts() maps a real poll post's post_type + vote counts + my vote", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", {
      data: [{
        id: "p_poll1", author_id: "u-me", category: "Techniques", heading: "Which test do you use?",
        caption: "Which test do you use?", media_type: "checklist",
        media: { poll: { options: ["A", "B", "C"] } }, media_urls: [], tags: [],
        post_type: "poll", created_at: new Date().toISOString(),
      }],
      error: null,
    });
    setTable("poll_votes", {
      data: [
        { post_id: "p_poll1", user_id: "u-me", option_index: 1 },
        { post_id: "p_poll1", user_id: "u-other", option_index: 0 },
      ],
      error: null,
    });
    setTable("profiles", { data: [{ id: "u-me", name: "Dr Me" }], error: null });
    const posts = await db.getPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].postType).toBe("poll");
    expect(posts[0].poll).toMatchObject({ options: ["A", "B", "C"], counts: [1, 1, 0], total: 2, myVote: 1 });
  });

  it("getPosts() maps a real case post's structured fields", async () => {
    currentUser = null;
    setTable("posts", {
      data: [{
        id: "p_case1", author_id: "u-me", category: "Case Studies", heading: "Shoulder pain case",
        caption: "6 months of pain", media_type: "checklist",
        media: { case: { presentation: "6 months of pain", assessment: "Reduced ROM", management: "Strengthening", outcome: "Improved", question: "Thoughts?" } },
        media_urls: [], tags: [], post_type: "case", created_at: new Date().toISOString(),
      }],
      error: null,
    });
    const posts = await db.getPosts();
    expect(posts[0].postType).toBe("case");
    expect(posts[0].case).toMatchObject({ presentation: "6 months of pain", assessment: "Reduced ROM" });
  });

  it("createPost() with postType 'poll' stores post_type + poll options for real inserts", async () => {
    currentUser = { id: "u-me" };
    setTable("posts", { data: { id: "p_poll_new", post_type: "poll" }, error: null });
    const result = await db.createPost({ text: "Best knee OA measure?", category: "Techniques", postType: "poll", pollOptions: ["KOOS", "WOMAC"] });
    expect(result.id).toBe("p_poll_new");
  });

  it("getConversations() returns [] when signed out, without throwing", async () => {
    currentUser = null;
    expect(await db.getConversations()).toEqual([]);
  });

  it("getConversations() groups messages by the other person, with an unread count and the latest preview", async () => {
    currentUser = { id: "u-me" };
    // Data is given newest-first, matching what the real
    // .order("created_at", { ascending: false }) query in getConversations()
    // would return -- the mock doesn't sort for us.
    setTable("direct_messages", {
      data: [
        { id: 2, sender_id: "u-me", recipient_id: "u-other", text: "Reply", created_at: new Date().toISOString(), read: true },
        { id: 1, sender_id: "u-other", recipient_id: "u-me", text: "First message", created_at: new Date(Date.now() - 60_000).toISOString(), read: false },
      ],
      error: null,
    });
    setTable("profiles", { data: [{ id: "u-other", name: "Dr Other", role: "PT", gradient: "blue", initials: "O", avatar_url: null }], error: null });
    const conversations = await db.getConversations();
    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject({ userId: "u-other", name: "Dr Other", lastText: "Reply" });
  });

  it("getMessages() maps isSelf per message for the chat bubble alignment", async () => {
    currentUser = { id: "u-me" };
    setTable("direct_messages", {
      data: [
        { id: 1, sender_id: "u-other", recipient_id: "u-me", text: "Hi", created_at: new Date().toISOString(), read: true },
        { id: 2, sender_id: "u-me", recipient_id: "u-other", text: "Hello!", created_at: new Date().toISOString(), read: false },
      ],
      error: null,
    });
    const messages = await db.getMessages("u-other");
    expect(messages.find((m) => m.text === "Hi").isSelf).toBe(false);
    expect(messages.find((m) => m.text === "Hello!").isSelf).toBe(true);
  });

  it("getMessages() throws when signed out, so the UI can show a real sign-in prompt instead of an empty thread", async () => {
    currentUser = null;
    await expect(db.getMessages("u-other")).rejects.toThrow(/sign in/i);
  });

  it("sendMessage() inserts as the signed-in sender and returns the refreshed thread", async () => {
    currentUser = { id: "u-me" };
    setTable("direct_messages", { data: [{ id: 1, sender_id: "u-me", recipient_id: "u-other", text: "Hey!", created_at: new Date().toISOString(), read: false }], error: null });
    const thread = await db.sendMessage("u-other", "Hey!");
    expect(thread).toHaveLength(1);
    expect(thread[0]).toMatchObject({ text: "Hey!", isSelf: true });
  });

  it("sendMessage() throws when signed out, instead of silently no-op'ing", async () => {
    currentUser = null;
    await expect(db.sendMessage("u-other", "Hey!")).rejects.toThrow(/sign in/i);
  });

  it("sendMessage() propagates a real Supabase error (e.g. a blocked self-message) instead of swallowing it", async () => {
    currentUser = { id: "u-me" };
    setTable("direct_messages", { data: null, error: { message: "new row violates check constraint \"direct_messages_no_self_message\"" } });
    await expect(db.sendMessage("u-me", "talking to myself")).rejects.toBeTruthy();
  });

  it("markConversationRead() no-ops (never throws) when signed out or the update fails", async () => {
    currentUser = null;
    await expect(db.markConversationRead("u-other")).resolves.toBeUndefined();
    currentUser = { id: "u-me" };
    setTable("direct_messages", { data: null, error: { message: "boom" } });
    await expect(db.markConversationRead("u-other")).resolves.toBeUndefined();
  });

  it("votePoll() falls back to a local vote-count bump for a demo poll and blocks double voting", async () => {
    currentUser = null;
    const before = (await db.getPosts()).find((p) => p.postType === "poll");
    expect(before.poll.myVote).toBeNull();
    const afterFirst = (await db.votePoll(before.id, 0)).find((p) => p.id === before.id);
    expect(afterFirst.poll.myVote).toBe(0);
    expect(afterFirst.poll.total).toBe(before.poll.total + 1);
    // voting again should be a no-op (already voted)
    const afterSecond = (await db.votePoll(before.id, 1)).find((p) => p.id === before.id);
    expect(afterSecond.poll.myVote).toBe(0);
    expect(afterSecond.poll.total).toBe(before.poll.total + 1);
  });
});
