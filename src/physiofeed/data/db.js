// -----------------------------------------------------------------------
// Data access layer. Every screen in the app calls ONLY the functions in
// this file -- never mockData.js or supabase.js directly. That means
// swapping the backend later is a one-file job.
//
// Right now everything is backed by an in-memory store seeded from
// mockData.js, so the app is fully interactive with zero configuration.
// Each function has a comment showing the Supabase query it becomes in
// Phase 6 (see /supabase/schema.sql for the matching table definitions).
//
// getProfile() is the one exception (Phase 1 of the real-world rollout,
// done first because nothing else -- posts/likes/follows -- means anything
// without real per-user identity underneath it). It reuses the SAME
// Supabase client the clinical app already signs clinicians in with
// (src/supabase.js), so the real signed-in clinician's session is picked
// up automatically -- no separate PhysioFeed login, no new env vars.
// Deliberately defensive: if the `profiles` table doesn't exist yet (SQL
// not run), or the user isn't signed in, or anything else goes wrong, it
// falls back to the old shared demo CURRENT_USER instead of breaking the
// app. Safe to ship before or after the SQL migration runs.
// -----------------------------------------------------------------------
import {
  INITIAL_POSTS, STORIES, PEOPLE, NOTIFICATIONS, EXERCISES, EDUCATION,
  ACHIEVEMENTS, EXPERTISE, EVIDENCE, COMMUNITIES, CURRENT_USER,
} from "./mockData.js";
import { supabase } from "../../supabase.js";

let _posts = INITIAL_POSTS.map((p) => ({ ...p }));
let _stories = STORIES.map((s) => ({ ...s }));
let _people = PEOPLE.map((p) => ({ ...p }));
let _evidence = EVIDENCE.map((e) => ({ ...e }));
let _communities = COMMUNITIES.map((c) => ({ ...c }));
let _expertise = EXPERTISE.map((e) => ({ ...e }));

const clone = (v) => JSON.parse(JSON.stringify(v));

// Shared by every posts/likes/comments/follows/saves function below.
async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// Matches the "2h" / "1d" / "1w" style already used throughout mockData.js
// -- no library, just enough granularity for a feed timestamp.
function timeAgo(iso) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

/* ---------------- posts / feed ---------------- */
//
// Phase 2 of the real-world rollout (see supabase/add_social_tables.sql):
// posts/post_likes/comments/follows/saved_posts are real tables now. Every
// function below tries the real Supabase query first; if it throws for ANY
// reason -- not signed in, a network blip, or (the common case right now)
// the postId being one of the original demo posts that only ever existed
// in the local mock array, not the real posts table -- it falls back to
// the exact same local-array mutation this file always had. That fallback
// is why the demo feed still works today even though it was never written
// to Supabase: a like/comment/follow on a demo post always fails the real
// DB call (foreign key violation, since that post id doesn't exist in
// `posts`) and silently lands on the old mock toggle instead.
//
// getPosts() itself only switches over once there's at least one REAL
// post in Supabase -- until someone actually publishes one, it keeps
// returning the demo feed so PhysioFeed never looks empty. The moment the
// first real post exists, the whole feed becomes 100% real (mixing real
// and demo posts in one feed would mean some posts can be liked for real
// and others can't, which is more confusing than switching over cleanly).

export async function getPosts() {
  try {
    const uid = await currentUserId();
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, author_id, category, heading, caption, media_type, media, tags, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!posts || posts.length === 0) return clone(_posts); // no real posts yet -- keep the demo feed visible

    const postIds = posts.map((p) => p.id);
    const [likesRes, commentsRes, savesRes, followsRes] = await Promise.all([
      supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
      supabase.from("comments").select("id, post_id, author_id, text, created_at").in("post_id", postIds).order("created_at", { ascending: true }),
      uid ? supabase.from("saved_posts").select("post_id").eq("user_id", uid) : Promise.resolve({ data: [] }),
      uid ? supabase.from("follows").select("following_id").eq("follower_id", uid) : Promise.resolve({ data: [] }),
    ]);
    const likes = likesRes.data || [], comments = commentsRes.data || [], saves = savesRes.data || [], follows = followsRes.data || [];

    // One batched profiles lookup covering every post author, comment
    // author, and liker we're about to need a name/avatar for -- instead
    // of a query per post.
    const profileIds = new Set(posts.map((p) => p.author_id));
    comments.forEach((c) => profileIds.add(c.author_id));
    likes.forEach((l) => profileIds.add(l.user_id));
    const { data: profiles } = profileIds.size
      ? await supabase.from("profiles").select("id, name, role, verified, gradient, initials").in("id", [...profileIds])
      : { data: [] };
    const profileById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const savedSet = new Set(saves.map((s) => s.post_id));
    const followingSet = new Set(follows.map((f) => f.following_id));

    return posts.map((p) => {
      const author = profileById[p.author_id];
      const postLikes = likes.filter((l) => l.post_id === p.id);
      const postComments = comments.filter((c) => c.post_id === p.id);
      const media = p.media || {};
      return {
        id: p.id, authorId: p.author_id, author: author?.name || "Unknown",
        isSelf: p.author_id === uid, verified: !!author?.verified, following: followingSet.has(p.author_id),
        role: author?.role || "", time: timeAgo(p.created_at), category: p.category,
        media: p.media_type, gradient: media.gradient || author?.gradient || "violet", iconName: media.iconName || "Sparkles",
        heading: p.heading, caption: p.caption,
        checklist: media.checklist || [], images: media.images || [], duration: media.duration, phases: media.phases || [],
        tags: p.tags || [],
        likes: postLikes.length, liked: uid ? postLikes.some((l) => l.user_id === uid) : false, saved: savedSet.has(p.id),
        likedByPreview: postLikes.slice(0, 2).map((l) => profileById[l.user_id]?.name).filter(Boolean),
        commentList: postComments.map((c) => ({ id: String(c.id), author: profileById[c.author_id]?.name || "Unknown", text: c.text })),
      };
    });
  } catch (e) {
    console.error("getPosts(): falling back to demo posts --", e?.message || e);
    return clone(_posts);
  }
}

export async function toggleLike(postId) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { data: existing, error: selErr } = await supabase.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", uid).maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", uid);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: uid });
      if (error) throw error;
    }
  } catch (e) {
    _posts = _posts.map((p) => (p.id === postId ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
  }
  return clone(_posts.find((p) => p.id === postId)) || null; // callers always re-fetch getPosts() right after; this is just for anything reading the return value directly
}

export async function toggleSave(postId) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { data: existing, error: selErr } = await supabase.from("saved_posts").select("post_id").eq("post_id", postId).eq("user_id", uid).maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      const { error } = await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", uid);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("saved_posts").insert({ post_id: postId, user_id: uid });
      if (error) throw error;
    }
  } catch (e) {
    _posts = _posts.map((p) => (p.id === postId ? { ...p, saved: !p.saved } : p));
  }
  return clone(_posts.find((p) => p.id === postId)) || null;
}

export async function toggleFollowAuthor(postId) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { data: post, error: postErr } = await supabase.from("posts").select("author_id").eq("id", postId).maybeSingle();
    if (postErr) throw postErr;
    if (!post) throw new Error("not a real post yet");
    if (post.author_id === uid) throw new Error("can't follow yourself");
    const { data: existing, error: selErr } = await supabase.from("follows").select("follower_id").eq("follower_id", uid).eq("following_id", post.author_id).maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", uid).eq("following_id", post.author_id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: uid, following_id: post.author_id });
      if (error) throw error;
    }
  } catch (e) {
    _posts = _posts.map((p) => (p.id === postId ? { ...p, following: !p.following } : p));
  }
  return clone(_posts.find((p) => p.id === postId)) || null;
}

export async function addComment(postId, text) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: uid, text });
    if (error) throw error;
  } catch (e) {
    const comment = { id: `c${Date.now()}`, author: CURRENT_USER.name, text };
    _posts = _posts.map((p) => (p.id === postId ? { ...p, commentList: [...p.commentList, comment] } : p));
  }
  return clone(_posts.find((p) => p.id === postId)) || null;
}

export async function createPost({ text, category }) {
  const heading = text.length > 60 ? text.slice(0, 60) + "…" : text;
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { data, error } = await supabase.from("posts")
      .insert({ author_id: uid, category, heading, caption: text, media_type: "checklist", media: {}, tags: [] })
      .select().single();
    if (error) throw error;
    return clone(data);
  } catch (e) {
    console.error("createPost(): falling back to local mock post --", e?.message || e);
    const post = {
      id: `p${Date.now()}`, authorId: CURRENT_USER.id, author: CURRENT_USER.name, isSelf: true,
      verified: true, role: CURRENT_USER.role, time: "now", category, media: "checklist",
      gradient: "violet", iconName: "Sparkles", heading,
      checklist: [], caption: text, tags: [], likes: 0, liked: false, saved: false,
      likedByPreview: [], commentList: [],
    };
    _posts = [post, ...(_posts)];
    return clone(post);
  }
}

// Real posts can't be carousel-type yet -- Composer.jsx only takes text +
// category (no real media upload exists yet, see the PhysioFeed rollout
// plan's "V1 step 4"), so this only ever needs to handle demo carousel
// posts from mockData.js. Left as a local-only mutation on purpose --
// revisit once real image/carousel posting exists.
export async function setCarouselIndex(postId, index) {
  _posts = _posts.map((p) => (p.id === postId ? { ...p, mediaIndex: index } : p));
  return clone(_posts.find((p) => p.id === postId));
}

/* ---------------- stories ---------------- */

// SUPABASE: supabase.from('stories').select('*, author:profiles(*)').gt('expires_at', now())
export async function getStories() {
  return clone(_stories);
}
// SUPABASE: supabase.from('story_views').insert({ story_id, user_id })
export async function markStorySeen(id) {
  _stories = _stories.map((s) => (s.id === id ? { ...s, seen: true } : s));
  return clone(_stories);
}

/* ---------------- profile ---------------- */

// Phase 1: real per-user identity. See the file header comment above for
// why this one function is wired to Supabase already while everything
// else still runs on the in-memory mock store.
export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return clone(CURRENT_USER); // signed out / guest mode -- keep the demo profile

    let { data: row } = await supabase.from("profiles").select("*").eq("id", user.id).single();

    if (!row) {
      // First time this clinician has opened PhysioFeed -- create their
      // real row now instead of leaving them on the shared demo identity.
      const defaults = {
        id: user.id,
        name: user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : "New Physiotherapist"),
        role: "Physiotherapist",
        verified: false,
        gradient: "violet",
        initials: (user.email ? user.email[0] : "P").toUpperCase(),
        location: "",
        bio: "",
        quote: "Welcome to PhysioFeed.",
        followers_count: 0,
        following_count: 0,
      };
      const { data: inserted } = await supabase.from("profiles").insert(defaults).select().single();
      row = inserted || defaults;
    }

    // Map DB column names to the shape every PhysioFeed screen already
    // expects (ProfileHeader.jsx etc.) -- zero UI changes needed for this step.
    return clone({
      id: row.id, name: row.name, role: row.role, verified: row.verified,
      gradient: row.gradient, initials: row.initials, location: row.location,
      bio: row.bio, quote: row.quote,
      followers: row.followers_count, following: row.following_count,
    });
  } catch (e) {
    console.error("getProfile(): falling back to demo profile --", e?.message || e);
    return clone(CURRENT_USER); // `profiles` table not created yet, or any other failure
  }
}

// SUPABASE: supabase.from('skill_endorsements').upsert/delete matching { skill, endorser_id, profile_id }
export async function toggleEndorse(skillName) {
  _expertise = _expertise.map((s) => (s.name === skillName ? { ...s, endorsed: !s.endorsed, count: s.count + (s.endorsed ? -1 : 1) } : s));
  return clone(_expertise);
}
export async function getExpertise() { return clone(_expertise); }
export async function getEducation() { return clone(EDUCATION); }
export async function getAchievements() { return clone(ACHIEVEMENTS); }
export async function getExercises() { return clone(EXERCISES); }

/* ---------------- people ---------------- */

// SUPABASE: supabase.from('profiles').select('*').neq('id', userId)
export async function getPeople() {
  return clone(_people);
}
// SUPABASE: supabase.from('follows').upsert/delete matching { follower_id, following_id }
export async function toggleFollowPerson(id) {
  _people = _people.map((p) => (p.id === id ? { ...p, following: !p.following } : p));
  return clone(_people);
}

/* ---------------- notifications ---------------- */

// SUPABASE: supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false })
export async function getNotifications() {
  return clone(NOTIFICATIONS);
}

/* ---------------- evidence ---------------- */

// SUPABASE: supabase.from('research_articles').select('*').order('year', { ascending: false })
export async function getEvidence() {
  return clone(_evidence);
}
// SUPABASE: supabase.from('research_saves').upsert/delete matching { article_id, user_id }
export async function toggleSaveEvidence(id) {
  _evidence = _evidence.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e));
  return clone(_evidence);
}

/* ---------------- communities ---------------- */

// SUPABASE: supabase.from('communities').select('*, community_members(count)')
export async function getCommunities() {
  return clone(_communities);
}
// SUPABASE: supabase.from('community_members').upsert/delete matching { community_id, user_id }
export async function toggleJoinCommunity(id) {
  _communities = _communities.map((c) => (c.id === id ? { ...c, joined: !c.joined, members: c.members + (c.joined ? -1 : 1) } : c));
  return clone(_communities);
}
