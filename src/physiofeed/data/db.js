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
import { initialsOf } from "../components/shared/constants.js";

let _posts = INITIAL_POSTS.map((p) => ({ ...p }));
// Cosmetic-only fallback for the Stories bar (see the real getStories()
// below) -- these five never had real media behind them, so "viewing" one
// just flips its ring gray locally instead of opening anything.
let _demoStories = STORIES.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));
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
      .select("id, author_id, category, heading, caption, media_type, media, media_urls, tags, post_type, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!posts || posts.length === 0) return clone(_posts); // no real posts yet -- keep the demo feed visible

    const postIds = posts.map((p) => p.id);
    const pollPostIds = posts.filter((p) => p.post_type === "poll").map((p) => p.id);
    const [likesRes, commentsRes, savesRes, followsRes, pollVotesRes] = await Promise.all([
      supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
      supabase.from("comments").select("id, post_id, author_id, text, created_at").in("post_id", postIds).order("created_at", { ascending: true }),
      uid ? supabase.from("saved_posts").select("post_id").eq("user_id", uid) : Promise.resolve({ data: [] }),
      uid ? supabase.from("follows").select("following_id").eq("follower_id", uid) : Promise.resolve({ data: [] }),
      pollPostIds.length ? supabase.from("poll_votes").select("post_id, user_id, option_index").in("post_id", pollPostIds) : Promise.resolve({ data: [] }),
    ]);
    const likes = likesRes.data || [], comments = commentsRes.data || [], saves = savesRes.data || [], follows = followsRes.data || [];
    const pollVotes = pollVotesRes.data || [];

    // One batched profiles lookup covering every post author, comment
    // author, and liker we're about to need a name/avatar for -- instead
    // of a query per post.
    const profileIds = new Set(posts.map((p) => p.author_id));
    comments.forEach((c) => profileIds.add(c.author_id));
    likes.forEach((l) => profileIds.add(l.user_id));
    const { data: profiles } = profileIds.size
      // select("*") rather than a named column list on purpose: an unknown
      // column in an explicit list makes the WHOLE query fail (every post's
      // author would blank out to "Unknown"), so adding avatar_url here
      // would have broken every author's name/role/gradient too until
      // add_profile_avatar.sql is run. select("*") just picks up avatar_url
      // once it exists and costs nothing meaningful at this app's scale.
      ? await supabase.from("profiles").select("*").in("id", [...profileIds])
      : { data: [] };
    const profileById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const savedSet = new Set(saves.map((s) => s.post_id));
    const followingSet = new Set(follows.map((f) => f.following_id));

    return posts.map((p) => {
      const author = profileById[p.author_id];
      const postLikes = likes.filter((l) => l.post_id === p.id);
      const postComments = comments.filter((c) => c.post_id === p.id);
      const media = p.media || {};
      const postType = p.post_type || "post";

      let poll = null;
      if (postType === "poll") {
        const votesForPost = pollVotes.filter((v) => v.post_id === p.id);
        const options = media.poll?.options || [];
        const counts = options.map((_, i) => votesForPost.filter((v) => v.option_index === i).length);
        const myVote = uid ? votesForPost.find((v) => v.user_id === uid)?.option_index ?? null : null;
        poll = { options, counts, total: votesForPost.length, myVote };
      }

      return {
        id: p.id, authorId: p.author_id, author: author?.name || "Unknown",
        authorAvatarUrl: author?.avatar_url || null,
        isSelf: p.author_id === uid, verified: !!author?.verified, following: followingSet.has(p.author_id),
        role: author?.role || "", time: timeAgo(p.created_at), category: p.category,
        media: p.media_type, gradient: media.gradient || author?.gradient || "violet", iconName: media.iconName || "Sparkles",
        heading: p.heading, caption: p.caption,
        checklist: media.checklist || [], images: media.images || [], duration: media.duration, phases: media.phases || [],
        mediaUrls: p.media_urls || [],
        tags: p.tags || [],
        postType, case: media.case || null, research: media.research || null, poll,
        likes: postLikes.length, liked: uid ? postLikes.some((l) => l.user_id === uid) : false, saved: savedSet.has(p.id),
        likedByPreview: postLikes.slice(0, 2).map((l) => profileById[l.user_id]?.name).filter(Boolean),
        commentList: postComments.map((c) => ({ id: String(c.id), author: profileById[c.author_id]?.name || "Unknown", text: c.text, isSelf: uid ? c.author_id === uid : false })),
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
  // BUG FIX (2026-08-18): this used to `return clone(_posts.find(...)) || null`,
  // which crashed with a SyntaxError for any REAL post (not present in the
  // local demo array, so .find() returns undefined and
  // JSON.parse(JSON.stringify(undefined)) throws). That crash happened
  // AFTER the real like/unlike had already saved to Supabase, so the click
  // silently did nothing on screen even though the like actually went
  // through -- exactly what "likes aren't working" looks like. getPosts()
  // always reflects the current state correctly for both real and demo posts.
  return getPosts();
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
  return getPosts(); // see the BUG FIX comment in toggleLike() above -- same crash, same fix
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
  return getPosts(); // see the BUG FIX comment in toggleLike() above -- same crash, same fix
}

export async function addComment(postId, text) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: uid, text });
    if (error) throw error;
  } catch (e) {
    const comment = { id: `c${Date.now()}`, author: CURRENT_USER.name, text, isSelf: true };
    _posts = _posts.map((p) => (p.id === postId ? { ...p, commentList: [...p.commentList, comment] } : p));
  }
  return getPosts(); // see the BUG FIX comment in toggleLike() above -- same crash, same fix
}

// Added 2026-08-18 for the delete post/comment feature. Both mirror the
// "try the real table, fall back to the local mock array" shape every
// other mutation in this file uses -- a demo post/comment id never exists
// in the real table, so it naturally falls into the catch and gets
// removed from the local array instead. RLS (posts_delete_own /
// comments_delete_own, see add_social_tables.sql) is the real guard
// against deleting someone else's post/comment; the extra .eq() here is
// belt-and-braces, not the only thing stopping it.
export async function deletePost(postId) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", uid);
    if (error) throw error;
  } catch (e) {
    _posts = _posts.filter((p) => p.id !== postId);
  }
  return getPosts();
}

export async function deleteComment(postId, commentId) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("author_id", uid);
    if (error) throw error;
  } catch (e) {
    _posts = _posts.map((p) => (p.id === postId ? { ...p, commentList: p.commentList.filter((c) => c.id !== commentId) } : p));
  }
  return getPosts();
}

// `media` is optional: { type: "photo" | "video", urls: string[], duration?: number }
// built by Composer.jsx after it's already compressed/validated/uploaded
// the real files via uploadPostImage()/uploadPostVideo() below. When
// omitted, posts stay text-only ("checklist" media_type with no items --
// matches how a plain text post already rendered before this feature
// existed, just via PostMedia's empty-checklist branch instead of a
// special "no media" case).
// `postType` ('post' | 'case' | 'research' | 'poll', default 'post') plus
// its matching structured fields (caseFields/researchFields/pollOptions)
// are the Phase 7 addition (see supabase/add_content_types.sql) -- see
// that file's header comment for why Case/Research/Poll are the only
// types that need a real post_type (Video/Photo are still plain 'post'
// rows, just with a required media attachment).
export async function createPost({ text, category, media, postType = "post", title, caseFields, researchFields, pollOptions }) {
  const heading = title ? title : (text.length > 60 ? text.slice(0, 60) + "…" : text);
  const mediaType = media?.type || "checklist";
  const mediaUrls = media?.urls || [];
  const mediaJson = {
    ...(media?.type === "video" && media?.duration ? { duration: Math.round(media.duration) } : {}),
    ...(postType === "case" && caseFields ? { case: caseFields } : {}),
    ...(postType === "research" && researchFields ? { research: researchFields } : {}),
    ...(postType === "poll" && pollOptions ? { poll: { options: pollOptions } } : {}),
  };
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { data, error } = await supabase.from("posts")
      .insert({ author_id: uid, category, heading, caption: text, media_type: mediaType, media: mediaJson, media_urls: mediaUrls, tags: [], post_type: postType })
      .select().single();
    if (error) throw error;
    return clone(data);
  } catch (e) {
    console.error("createPost(): falling back to local mock post --", e?.message || e);
    const post = {
      id: `p${Date.now()}`, authorId: CURRENT_USER.id, author: CURRENT_USER.name, isSelf: true,
      verified: true, role: CURRENT_USER.role, time: "now", category, media: mediaType,
      gradient: "violet", iconName: "Sparkles", heading,
      checklist: [], caption: text, tags: [], likes: 0, liked: false, saved: false,
      likedByPreview: [], commentList: [], mediaUrls, duration: mediaJson.duration,
      postType, case: mediaJson.case || null, research: mediaJson.research || null,
      poll: postType === "poll" && pollOptions ? { options: pollOptions, counts: pollOptions.map(() => 0), total: 0, myVote: null } : null,
    };
    _posts = [post, ...(_posts)];
    return clone(post);
  }
}

// One vote per person per poll, cast as yourself, final (no changing your
// vote in V1 -- see add_content_types.sql). Falls back to a local counter
// bump for demo polls, same fallback shape as every other mutation here.
export async function votePoll(postId, optionIndex) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { error } = await supabase.from("poll_votes").insert({ post_id: postId, user_id: uid, option_index: optionIndex });
    if (error) throw error;
  } catch (e) {
    _posts = _posts.map((p) => {
      if (p.id !== postId || !p.poll || p.poll.myVote !== null) return p;
      const counts = p.poll.counts.slice();
      counts[optionIndex] = (counts[optionIndex] || 0) + 1;
      return { ...p, poll: { ...p.poll, counts, total: p.poll.total + 1, myVote: optionIndex } };
    });
  }
  return getPosts();
}

/* ---------------- media upload ---------------- */
//
// Phase 6 (see supabase/add_media_storage.sql). Pure Storage I/O -- file
// validation/compression lives in lib/media.js (browser-only, no Supabase
// import), Composer.jsx wires the two together. No local/demo fallback
// here, same reasoning as moderation: there's nothing sensible to fall
// back to for "upload this photo" when signed out or the bucket doesn't
// exist yet, so these throw a real, user-facing error instead of quietly
// pretending an upload worked when it didn't.

async function uploadToBucket(bucket, uid, fileOrBlob, ext) {
  const path = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, fileOrBlob, { contentType: fileOrBlob.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPostImage(blob) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to upload photos.");
  return uploadToBucket("post-images", uid, blob, "jpg");
}

export async function uploadPostVideo(file) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to upload videos.");
  const ext = (file.name?.split(".").pop() || "mp4").toLowerCase();
  return uploadToBucket("post-videos", uid, file, ext);
}

// Added 2026-08-18 for real profile-photo upload -- uses the
// profile-images bucket add_media_storage.sql already created (RLS: your
// own folder, public read, same as post-images/post-videos).
export async function uploadProfileImage(blob) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to upload a profile photo.");
  return uploadToBucket("profile-images", uid, blob, "jpg");
}

// Feature (2026-08-19): real stories -- uses the story-media bucket
// supabase/add_stories.sql creates (RLS: your own folder, public read,
// same shape as every other bucket here).
export async function uploadStoryImage(blob) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to add a story.");
  return uploadToBucket("story-media", uid, blob, "jpg");
}
export async function uploadStoryVideo(file) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to add a story.");
  const ext = (file.name?.split(".").pop() || "mp4").toLowerCase();
  return uploadToBucket("story-media", uid, file, ext);
}

// Local-only mutation -- mediaIndex ("which photo am I looking at") is
// pure viewer navigation state, never written to Supabase for either demo
// carousel posts or real multi-photo posts. NOTE: since real multi-photo
// posts (post.mediaUrls.length > 1, added in the real-media-upload phase)
// don't exist in the local `_posts` array, this is currently a no-op for
// them -- the prev/next arrows won't visibly move for a real multi-photo
// post yet. Guarded against the crash the other mutations in this file
// had (see the BUG FIX comment on toggleLike()) so it fails silently
// instead of throwing, but the underlying "real carousels don't navigate"
// gap is still open; the real fix is to make mediaIndex local component
// state in FeedPostCard.jsx instead of routing it through db.js at all.
export async function setCarouselIndex(postId, index) {
  _posts = _posts.map((p) => (p.id === postId ? { ...p, mediaIndex: index } : p));
  const found = _posts.find((p) => p.id === postId);
  return found ? clone(found) : null;
}

/* ---------------- stories ---------------- */

// Feature (2026-08-19): real stories (photo/video, 24h expiry), backed by
// supabase/add_stories.sql. Before this, StoriesBar.jsx was pure
// decoration -- five fixed fake names, "seen" was a local-only toggle,
// and there was nothing behind a tap. This groups real story rows by
// author (one ring per person, like Instagram, even if they've posted
// several) and marks a group "seen" only once the current viewer has
// watched EVERY item in it -- a new story from someone you'd already
// seen today should light their ring back up.
//
// Same real-first/demo-fallback shape as getPosts(): if no real stories
// exist yet (or the migration hasn't run), the old five-name placeholder
// bar keeps showing so the feed never looks empty or broken. Unlike
// getPosts() this doesn't personalize by uid on the read itself (public,
// time-boxed by the stories_select_active RLS policy) -- uid is only
// needed to know which of the real stories THIS viewer has already seen,
// same "uid ? real query : empty" pattern posts uses for saved_posts/follows.
export async function getStories() {
  try {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("stories")
      .select("id, author_id, media_url, media_type, duration, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return clone(_demoStories); // nobody's posted a real story yet

    const authorIds = [...new Set(data.map((s) => s.author_id))];
    const [profilesRes, viewsRes] = await Promise.all([
      supabase.from("profiles").select("id, name, gradient, initials, avatar_url").in("id", authorIds),
      uid ? supabase.from("story_views").select("story_id").eq("viewer_id", uid) : Promise.resolve({ data: [] }),
    ]);
    const profiles = profilesRes.data || [];
    const seenIds = new Set((viewsRes.data || []).map((v) => v.story_id));

    const groups = new Map();
    for (const row of data) {
      if (!groups.has(row.author_id)) groups.set(row.author_id, []);
      groups.get(row.author_id).push(row);
    }

    const result = [...groups.entries()].map(([authorId, items]) => {
      const p = profiles.find((pr) => pr.id === authorId);
      return {
        authorId,
        name: p?.name || "PhysioFeed user",
        grad: p?.gradient || "violet",
        initials: p?.initials || "P",
        avatarUrl: p?.avatar_url || null,
        isDemo: false,
        seen: items.every((it) => seenIds.has(it.id)),
        items: items.map((it) => ({ id: it.id, mediaUrl: it.media_url, mediaType: it.media_type, duration: it.duration, createdAt: it.created_at })),
      };
    });

    // Your own reel first (Instagram convention), then unseen authors
    // before already-seen ones.
    result.sort((a, b) => {
      if (a.authorId === uid) return -1;
      if (b.authorId === uid) return 1;
      if (a.seen !== b.seen) return a.seen ? 1 : -1;
      return 0;
    });
    return result;
  } catch (e) {
    console.error("getStories(): falling back to demo list --", e?.message || e);
    return clone(_demoStories);
  }
}

// Adding is NOT given the silent-fallback treatment above -- same
// reasoning as createPost() for real media: a failed upload/insert should
// surface as a real error in the create-story modal, not pretend to post.
export async function addStory({ mediaUrl, mediaType, duration }) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to add a story.");
  const { error } = await supabase.from("stories").insert({
    author_id: uid, media_url: mediaUrl, media_type: mediaType, duration: duration ? Math.round(duration) : null,
  });
  if (error) throw error;
  return getStories();
}

// Records that the current viewer has watched one story item. Upserts
// with ON CONFLICT DO NOTHING (verified locally against story_views'
// unique(story_id, viewer_id) constraint -- this only needs INSERT
// privileges, not UPDATE, so re-viewing a story you've already seen today
// never errors and never needs a story_views update policy at all.
//
// Falls back to the old cosmetic-only toggle for "demo-" story ids (see
// mockData.js) or when nobody's signed in (a guest can still watch a real
// story, there's just no viewer id to record a view against).
export async function markStorySeen(storyItemId) {
  try {
    const uid = await currentUserId();
    if (!uid) return getStories();
    const { error } = await supabase
      .from("story_views")
      .upsert({ story_id: storyItemId, viewer_id: uid }, { onConflict: "story_id,viewer_id", ignoreDuplicates: true });
    if (error) throw error;
    return getStories();
  } catch (e) {
    _demoStories = _demoStories.map((s) => (s.items.some((it) => it.id === storyItemId) ? { ...s, seen: true } : s));
    return clone(_demoStories);
  }
}

// Manual early delete (Instagram lets you take your own story down before
// it expires too) -- owner-only via stories_delete_own RLS.
export async function deleteStory(storyItemId) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to manage your story.");
  const { error } = await supabase.from("stories").delete().eq("id", storyItemId).eq("author_id", uid);
  if (error) throw error;
  return getStories();
}

/* ---------------- profile ---------------- */

// Phase 1: real per-user identity. See the file header comment above for
// why this one function is wired to Supabase already while everything
// else still runs on the in-memory mock store.

// Real, live counts from the `follows` table -- profiles.followers_count/
// following_count exist as columns (add_profiles_table.sql) but NOTHING
// ever writes to them (see add_social_tables.sql's header comment: syncing
// them via triggers vs. computing live was deliberately deferred). Left
// as-is, every real clinician's profile would show a frozen "0" forever
// regardless of how many people actually follow them -- exactly the kind
// of hardcoded-looking number this pass is fixing. `head: true` makes
// Supabase return just the count, not the matched rows.
async function getFollowCounts(userId) {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followersRes.count || 0, following: followingRes.count || 0 };
}

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
        // About-card fields (2026-08-19) -- deliberately blank/false, not
        // the old hardcoded "5+ years of experience" placeholder text. See
        // add_profile_about_fields.sql's header comment for why.
        experience: "",
        languages: "",
        memberships: "",
        available_for_consults: false,
      };
      const { data: inserted } = await supabase.from("profiles").insert(defaults).select().single();
      row = inserted || defaults;
    }

    const { followers, following } = await getFollowCounts(row.id);

    // Map DB column names to the shape every PhysioFeed screen already
    // expects (ProfileHeader.jsx etc.) -- zero UI changes needed for this step.
    // isAdmin defaults to false on rows from before the moderation
    // migration (or if that migration hasn't run yet) since row.is_admin
    // would just be undefined -- nobody accidentally becomes an admin.
    return clone({
      id: row.id, name: row.name, role: row.role, verified: row.verified,
      gradient: row.gradient, initials: row.initials, location: row.location,
      bio: row.bio, quote: row.quote,
      followers, following, // live counts from the follows table, NOT row.followers_count/following_count -- see getFollowCounts()
      isAdmin: !!row.is_admin,
      // undefined (not null) on rows from before add_profile_avatar.sql runs
      // -- Avatar.jsx treats any falsy photoUrl as "show the gradient instead".
      avatarUrl: row.avatar_url || null,
      // "" (not undefined) on rows from before add_profile_about_fields.sql
      // runs -- AboutCard.jsx already treats an empty string as "don't show
      // this row", same as it would for a real user who just hasn't filled
      // it in yet.
      experience: row.experience || "",
      languages: row.languages || "",
      memberships: row.memberships || "",
      availableForConsults: !!row.available_for_consults,
    });
  } catch (e) {
    console.error("getProfile(): falling back to demo profile --", e?.message || e);
    return clone(CURRENT_USER); // `profiles` table not created yet, or any other failure
  }
}

// Read-only lookup for VIEWING SOMEONE ELSE'S profile (PersonCard "Message"
// used to be the only way to reach another clinician -- there was no
// profile page to click into at all, see ProfilePage.jsx). Unlike
// getProfile() this never creates a row -- you only ever auto-provision
// your OWN profile on first visit, never someone else's.
export async function getProfileById(userId) {
  if (!userId || userId === "u-self") return clone(CURRENT_USER);

  // Demo people (PEOPLE in mockData.js) never had real `profiles` rows --
  // same reasoning as every other fallback in this file: a demo id will
  // always miss in Supabase, so check the local list first and skip the
  // network round-trip we know will fail.
  const demoPerson = _people.find((p) => p.id === userId);
  if (demoPerson) {
    return clone({
      id: demoPerson.id, name: demoPerson.name, role: demoPerson.role, verified: false,
      gradient: demoPerson.grad, initials: initialsOf(demoPerson.name), location: demoPerson.location,
      bio: "", quote: "", followers: 0, following: 0, avatarUrl: demoPerson.avatarUrl || null,
      experience: "", languages: "", memberships: "", availableForConsults: false,
    });
  }

  try {
    const { data: row, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    if (!row) return null; // real uuid, but no profiles row -- genuinely doesn't exist
    const { followers, following } = await getFollowCounts(userId);
    return clone({
      id: row.id, name: row.name, role: row.role, verified: row.verified,
      gradient: row.gradient, initials: row.initials, location: row.location,
      bio: row.bio, quote: row.quote, followers, following, // live counts, not row.followers_count/following_count -- see getFollowCounts()
      avatarUrl: row.avatar_url || null,
      experience: row.experience || "", languages: row.languages || "", memberships: row.memberships || "",
      availableForConsults: !!row.available_for_consults,
    });
  } catch (e) {
    console.error("getProfileById(): --", e?.message || e);
    return null;
  }
}

// Bug fix (2026-08-18): there was previously no way to edit your profile
// at all after the auto-created default row from your first PhysioFeed
// visit -- ProfileHeader.jsx now has a real "Edit Profile" form that calls
// this. Unlike likes/comments/etc, a failed save here is NOT silently
// swallowed -- it re-throws so the edit form can show a real error instead
// of closing as if it worked when it didn't (that exact silent-failure
// shape is what made the like/comment bug so confusing to track down).
export async function updateProfile(fields) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to edit your profile.");
  const patch = {};
  for (const key of ["name", "role", "location", "bio", "quote", "gradient", "experience", "languages", "memberships"]) {
    if (fields[key] !== undefined) patch[key] = fields[key];
  }
  if (fields.avatarUrl !== undefined) patch.avatar_url = fields.avatarUrl;
  // Boolean, so this has to check `!== undefined` rather than truthiness --
  // `false` is a real, meaningful value here (not "field omitted").
  if (fields.availableForConsults !== undefined) patch.available_for_consults = fields.availableForConsults;
  if (fields.name) {
    patch.initials = fields.name.split(" ").map((w) => w[0]).join("").replace(/[.,]/g, "").slice(0, 2).toUpperCase();
  }
  // Deliberately NOT setting updated_at here (2026-08-18 fix): Supabase's
  // API layer caches the table schema, and right after a column is added
  // via SQL that cache can lag behind reality -- this showed up as "could
  // not find the updated_at column of profiles in the schema cache" even
  // though the column genuinely exists (add_profiles_table.sql created
  // it). updated_at isn't read anywhere in the app, so there's nothing to
  // lose by not touching it here -- avoids depending on a column whose
  // cache-visibility can't be guaranteed at save time.
  const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
  if (error) throw error;
  return getProfile();
}

// SUPABASE: supabase.from('skill_endorsements').upsert/delete matching { skill, endorser_id, profile_id }
export async function toggleEndorse(skillName) {
  _expertise = _expertise.map((s) => (s.name === skillName ? { ...s, endorsed: !s.endorsed, count: s.count + (s.endorsed ? -1 : 1) } : s));
  return clone(_expertise);
}
export async function getExpertise() { return clone(_expertise); }

// Feature (2026-08-19): real education/certification + achievements
// editing, backed by supabase/add_profile_education_achievements.sql.
// Same "real query first, fall back to the old placeholder list on ANY
// failure" shape as getProfile() -- not signed in, table not created yet,
// or a network blip all land on the same demo EDUCATION/ACHIEVEMENTS
// list this card has always shown, so the About tab never looks empty or
// broken before the migration runs. Once a clinician is signed in AND the
// table exists, this switches to their real (possibly empty) list -- an
// empty real list is a legitimate state (they just haven't added
// anything yet), unlike the demo list which is placeholder text nobody
// actually wrote.
export async function getEducation() {
  try {
    const uid = await currentUserId();
    if (!uid) return clone(EDUCATION); // signed out / guest mode -- keep the demo list
    const { data, error } = await supabase
      .from("education_entries")
      .select("id, title, subtitle, icon_name")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data.map((r) => ({ id: r.id, title: r.title, subtitle: r.subtitle, iconName: r.icon_name }));
  } catch (e) {
    console.error("getEducation(): falling back to demo list --", e?.message || e);
    return clone(EDUCATION);
  }
}

// Read-only variant for VIEWING SOMEONE ELSE's About tab (OtherProfilePage.jsx)
// -- education_entries_select_all lets anyone read anyone's real rows, so
// this is a plain query with no auth-gating, and no demo fallback: a demo
// person (id not in the real profiles table) genuinely has no education
// rows, which is just an empty list, not an error.
export async function getEducationByUser(userId) {
  try {
    const { data, error } = await supabase
      .from("education_entries")
      .select("id, title, subtitle, icon_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => ({ id: r.id, title: r.title, subtitle: r.subtitle, iconName: r.icon_name }));
  } catch (e) {
    console.error("getEducationByUser(): --", e?.message || e);
    return [];
  }
}

// Adding/editing/deleting is NOT given the same silent-fallback treatment
// as the read above -- same reasoning as updateProfile(): if a save here
// silently failed and pretended to work, a clinician could walk away
// thinking their real credentials were saved when they weren't. Errors
// (not signed in, migration not run yet, RLS block) surface for real so
// the edit modal can show them instead of quietly closing.
export async function addEducationEntry({ title, subtitle, iconName }) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to edit your education & certifications.");
  const { error } = await supabase.from("education_entries").insert({
    user_id: uid, title: title.trim(), subtitle: (subtitle || "").trim(), icon_name: iconName || "GraduationCap",
  });
  if (error) throw error;
  return getEducation();
}
export async function updateEducationEntry(id, { title, subtitle, iconName }) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to edit your education & certifications.");
  const patch = {};
  if (title !== undefined) patch.title = title.trim();
  if (subtitle !== undefined) patch.subtitle = subtitle.trim();
  if (iconName !== undefined) patch.icon_name = iconName;
  const { error } = await supabase.from("education_entries").update(patch).eq("id", id).eq("user_id", uid);
  if (error) throw error;
  return getEducation();
}
export async function deleteEducationEntry(id) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to edit your education & certifications.");
  const { error } = await supabase.from("education_entries").delete().eq("id", id).eq("user_id", uid);
  if (error) throw error;
  return getEducation();
}

// Same real-first/demo-fallback shape as getEducation() above.
export async function getAchievements() {
  try {
    const uid = await currentUserId();
    if (!uid) return clone(ACHIEVEMENTS);
    const { data, error } = await supabase
      .from("achievements")
      .select("id, title, subtitle, icon_name, tone")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data.map((r) => ({ id: r.id, title: r.title, subtitle: r.subtitle, iconName: r.icon_name, tone: r.tone }));
  } catch (e) {
    console.error("getAchievements(): falling back to demo list --", e?.message || e);
    return clone(ACHIEVEMENTS);
  }
}

// Read-only variant for VIEWING SOMEONE ELSE's About tab -- same reasoning
// as getEducationByUser() above (achievements_select_all RLS policy, no
// demo fallback, empty is a real answer not an error).
export async function getAchievementsByUser(userId) {
  try {
    const { data, error } = await supabase
      .from("achievements")
      .select("id, title, subtitle, icon_name, tone")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => ({ id: r.id, title: r.title, subtitle: r.subtitle, iconName: r.icon_name, tone: r.tone }));
  } catch (e) {
    console.error("getAchievementsByUser(): --", e?.message || e);
    return [];
  }
}

export async function addAchievement({ title, subtitle, iconName, tone }) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to edit your achievements.");
  const { error } = await supabase.from("achievements").insert({
    user_id: uid, title: title.trim(), subtitle: (subtitle || "").trim(),
    icon_name: iconName || "Trophy", tone: tone || "text-amber-500",
  });
  if (error) throw error;
  return getAchievements();
}
export async function updateAchievement(id, { title, subtitle, iconName, tone }) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to edit your achievements.");
  const patch = {};
  if (title !== undefined) patch.title = title.trim();
  if (subtitle !== undefined) patch.subtitle = subtitle.trim();
  if (iconName !== undefined) patch.icon_name = iconName;
  if (tone !== undefined) patch.tone = tone;
  const { error } = await supabase.from("achievements").update(patch).eq("id", id).eq("user_id", uid);
  if (error) throw error;
  return getAchievements();
}
export async function deleteAchievement(id) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to edit your achievements.");
  const { error } = await supabase.from("achievements").delete().eq("id", id).eq("user_id", uid);
  if (error) throw error;
  return getAchievements();
}

export async function getExercises() { return clone(EXERCISES); }

/* ---------------- people ---------------- */

// Phase 3a: reuses the profiles + follows tables Phase 1/2 already created --
// no new schema needed for this one. Same rules as everything else in this
// file: try the real query, fall back to the mock PEOPLE list on any
// failure (not signed in, tables not created yet, etc). Once real
// clinicians exist as profiles rows, they show up here automatically
// alongside (never replacing) the demo people, since the demo entries
// aren't real auth users and can never collide with a real profile id.
//
// "mutual" (mutual connections) is left at 0 for real profiles -- it needs
// its own intersection query (people you and they both follow) that's a
// real design decision on its own, not something to bolt on here. Every
// other field maps directly.
export async function getPeople() {
  try {
    const uid = await currentUserId();
    // select("*") rather than a named list -- see the matching comment in
    // getPosts() above. Avoids the whole real People list vanishing back to
    // demo content if avatar_url doesn't exist yet on this database.
    let query = supabase.from("profiles").select("*");
    if (uid) query = query.neq("id", uid);
    const { data: profiles, error } = await query;
    if (error) throw error;
    if (!profiles || profiles.length === 0) return clone(_people);

    const { data: follows } = uid
      ? await supabase.from("follows").select("following_id").eq("follower_id", uid)
      : { data: [] };
    const followingSet = new Set((follows || []).map((f) => f.following_id));

    const real = profiles.map((p) => ({
      id: p.id, name: p.name, role: p.role || "", location: p.location || "",
      mutual: 0, grad: p.gradient || "violet", avatarUrl: p.avatar_url || null,
      following: followingSet.has(p.id),
    }));
    // Demo people stay visible alongside real ones so the People tab never
    // looks sparse while PhysioFeed only has a handful of real clinicians.
    return clone([...real, ..._people]);
  } catch (e) {
    console.error("getPeople(): falling back to demo people --", e?.message || e);
    return clone(_people);
  }
}

export async function toggleFollowPerson(id) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { data: existing, error: selErr } = await supabase.from("follows").select("follower_id").eq("follower_id", uid).eq("following_id", id).maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", uid).eq("following_id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: uid, following_id: id });
      if (error) throw error;
    }
  } catch (e) {
    // Covers both "not signed in" and "id is a demo person, not a real
    // profile" (foreign key violation) -- same fallback shape as posts.
    _people = _people.map((p) => (p.id === id ? { ...p, following: !p.following } : p));
  }
  return getPeople();
}

/* ---------------- evidence ---------------- */

// Phase 3b (see supabase/add_evidence_communities.sql). research_articles is
// admin-curated content -- there's no "submit an article" flow in the app
// yet, so this table starts out empty and getEvidence() keeps showing the
// demo library (same "don't look empty" rule as getPosts()) until an admin
// adds real rows via SQL/a future admin panel.
export async function getEvidence() {
  try {
    const uid = await currentUserId();
    // select("*") deliberately, not a named column list -- source_url/
    // source_name/summary/conclusion (add_evidence_source_and_summary.sql)
    // may not have run in production yet, and an unknown column in a named
    // select fails the whole query (see the file-level comment above and
    // getPosts()/getPeople() for the same rule elsewhere in this file).
    const { data: articles, error } = await supabase
      .from("research_articles")
      .select("*")
      .order("year", { ascending: false });
    if (error) throw error;
    if (!articles || articles.length === 0) return clone(_evidence);

    const { data: saves } = uid
      ? await supabase.from("research_saves").select("article_id").eq("user_id", uid)
      : { data: [] };
    const savedSet = new Set((saves || []).map((s) => s.article_id));

    return articles.map((a) => ({
      id: a.id, title: a.title, journal: a.journal, type: a.type, year: a.year,
      level: a.level, category: a.category, tags: a.tags || [], grad: a.gradient,
      sourceUrl: a.source_url || "", sourceName: a.source_name || "",
      summary: a.summary || "", conclusion: a.conclusion || "",
      saved: savedSet.has(a.id),
    }));
  } catch (e) {
    console.error("getEvidence(): falling back to demo evidence --", e?.message || e);
    return clone(_evidence);
  }
}

export async function toggleSaveEvidence(id) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { data: existing, error: selErr } = await supabase.from("research_saves").select("article_id").eq("article_id", id).eq("user_id", uid).maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      const { error } = await supabase.from("research_saves").delete().eq("article_id", id).eq("user_id", uid);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("research_saves").insert({ article_id: id, user_id: uid });
      if (error) throw error;
    }
  } catch (e) {
    _evidence = _evidence.map((ev) => (ev.id === id ? { ...ev, saved: !ev.saved } : ev));
  }
  return getEvidence();
}

/* ---------------- communities ---------------- */

// Phase 3b. Same "admin-curated, starts empty, demo list shows until real
// rows exist" pattern as evidence above. Member counts are computed live
// via Supabase's embedded count (`community_members(count)`) rather than a
// stored counter -- see the migration file's comment for why.
export async function getCommunities() {
  try {
    const uid = await currentUserId();
    const { data: communities, error } = await supabase
      .from("communities")
      .select("id, name, description, gradient, community_members(count)");
    if (error) throw error;
    if (!communities || communities.length === 0) return clone(_communities);

    const { data: memberships } = uid
      ? await supabase.from("community_members").select("community_id").eq("user_id", uid)
      : { data: [] };
    const joinedSet = new Set((memberships || []).map((m) => m.community_id));

    return communities.map((c) => ({
      id: c.id, name: c.name, desc: c.description, grad: c.gradient,
      members: c.community_members?.[0]?.count || 0,
      joined: joinedSet.has(c.id),
    }));
  } catch (e) {
    console.error("getCommunities(): falling back to demo communities --", e?.message || e);
    return clone(_communities);
  }
}

export async function toggleJoinCommunity(id) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { data: existing, error: selErr } = await supabase.from("community_members").select("community_id").eq("community_id", id).eq("user_id", uid).maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      const { error } = await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", uid);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("community_members").insert({ community_id: id, user_id: uid });
      if (error) throw error;
    }
  } catch (e) {
    _communities = _communities.map((c) => (c.id === id ? { ...c, joined: !c.joined, members: c.members + (c.joined ? -1 : 1) } : c));
  }
  return getCommunities();
}

/* ---------------- notifications ---------------- */

// Phase 4 (see supabase/add_notifications.sql + add_notification_links.sql
// + add_notification_post_id.sql). Notifications are written server-side by
// SECURITY DEFINER triggers the instant a like/comment/follow/message
// happens -- this function only ever reads. Falls back to the demo
// NOTIFICATIONS list only when signed out or the table genuinely doesn't
// exist yet (a real query error) -- deliberately NOT on an empty real
// result. A signed-in user with zero real notifications is a real, valid
// state (nobody's interacted with them yet) and must see an honest empty
// list, not canned demo notifications that don't belong to them and can
// never be marked read.
//
// `link` is derived here, not stored as a URL in the database. Like/comment
// (2026-08-27, "like how it happens in Insta") now jump straight to the
// post itself via /feed?post=<id> -- FeedPage.jsx reads that query param
// and opens PostDetailModal.jsx for it, same modal GridPostCard.jsx already
// uses on the Profile/Saved/Explore grids. Falls back to the actor's
// profile when post_id is null (older rows written before this migration,
// or the post's since been deleted). Follow still goes to the actor's
// profile and message still goes to the thread -- neither of those is
// about a specific post.
export async function getNotifications() {
  const uid = await currentUserId();
  if (!uid) return clone(NOTIFICATIONS); // signed out / guest mode -- keep the demo list
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, icon_name, text, tone, read, created_at, actor_id, kind, post_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((n) => ({
      id: String(n.id), iconName: n.icon_name, text: n.text, time: timeAgo(n.created_at), tone: n.tone, read: n.read,
      link: n.kind === "message" ? (n.actor_id ? `/messages?with=${n.actor_id}` : null)
          : n.kind === "like" || n.kind === "comment" ? (n.post_id ? `/feed?post=${n.post_id}` : n.actor_id ? `/profile/${n.actor_id}` : null)
          : n.kind === "follow" ? (n.actor_id ? `/profile/${n.actor_id}` : null)
          : null,
    }));
  } catch (e) {
    console.error("getNotifications(): falling back to demo notifications --", e?.message || e);
    return clone(NOTIFICATIONS);
  }
}

export async function markNotificationRead(id) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", uid);
    if (error) throw error;
  } catch (e) {
    console.error("markNotificationRead(): no-op --", e?.message || e);
  }
  return getNotifications();
}

// Realtime (2026-08-19): the bell previously only refreshed on mount --
// a like/comment/follow/message that happened while you had PhysioFeed
// open never showed up until you navigated away and back. Subscribes to
// every insert into YOUR notifications row (RLS already scopes this to
// rows you're allowed to select) and calls `onChange` with the fresh
// notification whenever the trigger functions in add_notifications.sql /
// add_notification_links.sql write one -- Header.jsx just refetches the
// full list on any event rather than trying to splice one row in by hand,
// since getNotifications() is a single cheap indexed query.
//
// Same unsubscribe-on-unmount contract as subscribeToMessages() above.
export async function subscribeToNotifications(onChange) {
  const uid = await currentUserId();
  if (!uid) return () => {};
  const channel = supabase
    .channel(`notifications:${uid}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, (payload) => onChange(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------------- moderation ---------------- */
//
// Phase 5 (see supabase/add_moderation.sql). There's no local mock
// fallback for any of this -- reports are a purely real-backend feature
// with no demo-mode equivalent (there's nothing to fall back to before the
// migration runs, so these quietly no-op instead of throwing, same
// "never break the UI" rule as everywhere else in this file).

export async function reportPost(postId, reason) {
  try {
    const uid = await currentUserId();
    if (!uid) throw new Error("not signed in");
    const { error } = await supabase.from("reports").insert({ post_id: postId, reporter_id: uid, reason });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("reportPost(): no-op --", e?.message || e);
    return false;
  }
}

// Admin-only (RLS enforces this server-side too -- a non-admin calling
// this just gets an empty list back, not an error).
export async function getReports() {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("id, post_id, reason, status, created_at, posts(heading, caption), profiles(name)")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id, postId: r.post_id, reason: r.reason, status: r.status, createdAt: r.created_at,
      postHeading: r.posts?.heading || "(post removed)", postCaption: r.posts?.caption || "",
      reporterName: r.profiles?.name || "Unknown",
    }));
  } catch (e) {
    console.error("getReports(): --", e?.message || e);
    return [];
  }
}

export async function dismissReport(id) {
  try {
    const { error } = await supabase.from("reports").update({ status: "dismissed" }).eq("id", id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("dismissReport(): --", e?.message || e);
    return false;
  }
}

// Removes the reported post outright (admin-only delete policy on posts)
// and marks the report resolved.
export async function removeReportedPost(reportId, postId) {
  try {
    const { error: delErr } = await supabase.from("posts").delete().eq("id", postId);
    if (delErr) throw delErr;
    const { error: updErr } = await supabase.from("reports").update({ status: "removed" }).eq("id", reportId);
    if (updErr) throw updErr;
    return true;
  } catch (e) {
    console.error("removeReportedPost(): --", e?.message || e);
    return false;
  }
}

/* ---------------- direct messages ---------------- */
//
// Phase 8 (see supabase/add_direct_messages.sql). Like moderation, DMs are
// a purely real-backend feature -- there's no sensible "demo conversation"
// to fall back to -- so these throw a real, user-facing error on failure
// instead of quietly pretending it worked. A "conversation" is derived
// client-side from the flat direct_messages table (every row where you're
// either party, grouped by the other person) rather than needing its own
// conversations table.

// One entry per person you've ever exchanged a message with -- most
// recent message text/time and how many of THEIR messages to you are
// still unread. MessagesPage.jsx's inbox list.
export async function getConversations() {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, text, created_at, read")
    .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const byOther = new Map();
  for (const m of data) {
    const otherId = m.sender_id === uid ? m.recipient_id : m.sender_id;
    if (!byOther.has(otherId)) byOther.set(otherId, { lastText: m.text, lastAt: m.created_at, unread: 0 });
    if (m.recipient_id === uid && !m.read) byOther.get(otherId).unread += 1;
  }
  const otherIds = [...byOther.keys()];
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", otherIds);
  const profileById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  return otherIds
    .map((id) => {
      const c = byOther.get(id);
      const p = profileById[id];
      return {
        userId: id, name: p?.name || "Unknown", role: p?.role || "",
        gradient: p?.gradient || "violet", initials: p?.initials || "?", avatarUrl: p?.avatar_url || null,
        lastText: c.lastText, lastAt: c.lastAt, unread: c.unread,
      };
    })
    .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
}

// Full thread with one other person, oldest first (chat reading order).
export async function getMessages(otherUserId) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to view messages.");
  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, text, created_at, read")
    .or(`and(sender_id.eq.${uid},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${uid})`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((m) => ({ id: m.id, text: m.text, isSelf: m.sender_id === uid, createdAt: m.created_at }));
}

export async function sendMessage(otherUserId, text) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to send a message.");
  const { error } = await supabase.from("direct_messages").insert({ sender_id: uid, recipient_id: otherUserId, text });
  if (error) throw error;
  return getMessages(otherUserId);
}

// Marks every unread message FROM otherUserId TO you as read. Deliberately
// swallows errors (no-op, like markNotificationRead) -- this fires as a
// side effect of opening a conversation, not a user-initiated action with
// its own error UI to show.
export async function markConversationRead(otherUserId) {
  try {
    const uid = await currentUserId();
    if (!uid) return;
    const { error } = await supabase.from("direct_messages").update({ read: true }).eq("sender_id", otherUserId).eq("recipient_id", uid).eq("read", false);
    if (error) throw error;
  } catch (e) {
    console.error("markConversationRead(): no-op --", e?.message || e);
  }
}

// Realtime (2026-08-19): chat previously only ever refetched on
// mount/navigation -- a message sent to you didn't appear until you
// closed and reopened the thread. Subscribes to INSERTs on
// direct_messages involving you (RLS already restricts what a Postgres
// changes feed will ever deliver to your own rows, same guarantee as any
// select) and calls `onChange` for every relevant insert -- MessagesPage.jsx
// decides whether that's "append to the open thread" or "bump the
// conversation list". Two separate .on() filters (not one OR) because
// postgres_changes filters are single-column equality only.
//
// Returns an unsubscribe function. Caller MUST call it on unmount / before
// resubscribing (e.g. when `otherUserId`/route changes) -- an orphaned
// channel keeps its socket listener alive and fires the stale closure's
// `onChange` forever, which both leaks and can double-append messages
// once a second subscription is added for a new conversation.
export async function subscribeToMessages(onChange) {
  const uid = await currentUserId();
  if (!uid) return () => {};
  const channel = supabase
    .channel(`direct_messages:${uid}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${uid}` }, (payload) => onChange(payload.new))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `sender_id=eq.${uid}` }, (payload) => onChange(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}
