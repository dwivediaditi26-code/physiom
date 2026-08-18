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

/* ---------------- posts / feed ---------------- */

// SUPABASE: supabase.from('posts').select('*, author:profiles(*), likes(count), comments(*)').order('created_at', { ascending: false })
export async function getPosts() {
  return clone(_posts);
}

// SUPABASE: supabase.from('likes').upsert/delete matching { post_id, user_id }
export async function toggleLike(postId) {
  _posts = _posts.map((p) => (p.id === postId ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
  return clone(_posts.find((p) => p.id === postId));
}

// SUPABASE: supabase.from('saves').upsert/delete matching { post_id, user_id }
export async function toggleSave(postId) {
  _posts = _posts.map((p) => (p.id === postId ? { ...p, saved: !p.saved } : p));
  return clone(_posts.find((p) => p.id === postId));
}

// SUPABASE: supabase.from('follows').upsert/delete matching { follower_id, following_id }
export async function toggleFollowAuthor(postId) {
  _posts = _posts.map((p) => (p.id === postId ? { ...p, following: !p.following } : p));
  return clone(_posts.find((p) => p.id === postId));
}

// SUPABASE: supabase.from('comments').insert({ post_id, author_id, content })
export async function addComment(postId, text) {
  const comment = { id: `c${Date.now()}`, author: CURRENT_USER.name, text };
  _posts = _posts.map((p) => (p.id === postId ? { ...p, commentList: [...p.commentList, comment] } : p));
  return clone(_posts.find((p) => p.id === postId));
}

// SUPABASE: supabase.from('posts').insert({ author_id, content, category, media_urls })
export async function createPost({ text, category }) {
  const post = {
    id: `p${Date.now()}`, authorId: CURRENT_USER.id, author: CURRENT_USER.name, isSelf: true,
    verified: true, role: CURRENT_USER.role, time: "now", category, media: "checklist",
    gradient: "violet", iconName: "Sparkles",
    heading: text.length > 60 ? text.slice(0, 60) + "…" : text,
    checklist: [], caption: text, tags: [], likes: 0, liked: false, saved: false,
    likedByPreview: [], commentList: [],
  };
  _posts = [post, ...(_posts)];
  return clone(post);
}

// SUPABASE: supabase.from('posts').update({ media_index: n }).eq('id', postId)  -- or just client-side carousel state
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
