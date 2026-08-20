import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as db from "../data/db.js";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [people, setPeople] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [expertise, setExpertise] = useState([]);
  const [education, setEducation] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState(null); // null | 'post' | 'case' | 'research' | 'video' | 'photo' | 'poll'

  useEffect(() => {
    (async () => {
      const [p, st, pe, no, ev, co, ex, ed, ac, exr, pr] = await Promise.all([
        db.getPosts(), db.getStories(), db.getPeople(), db.getNotifications(),
        db.getEvidence(), db.getCommunities(), db.getExpertise(), db.getEducation(),
        db.getAchievements(), db.getExercises(), db.getProfile(),
      ]);
      setPosts(p); setStories(st); setPeople(pe); setNotifications(no);
      setEvidence(ev); setCommunities(co); setExpertise(ex); setEducation(ed);
      setAchievements(ac); setExercises(exr); setProfile(pr);
      setLoading(false);
    })();
  }, []);

  // Realtime bell (2026-08-19): re-fetches the full notifications list
  // whenever a new one is inserted for you server-side (see
  // subscribeToNotifications() in db.js), so a like/comment/follow/message
  // that happens while PhysioFeed is open shows up without navigating away
  // and back. Guarded with a `cancelled` flag + always calling the
  // returned unsubscribe in cleanup -- without both, a fast unmount right
  // after the async subscribe() call resolves would otherwise leave a
  // channel listening forever (see the leak this exact pattern avoids in
  // subscribeToMessages()'s docstring).
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    (async () => {
      unsubscribe = await db.subscribeToNotifications(async () => {
        if (cancelled) return;
        setNotifications(await db.getNotifications());
      });
      if (cancelled) unsubscribe();
    })();
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const likePost = useCallback(async (id) => { await db.toggleLike(id); setPosts(await db.getPosts()); }, []);
  const savePost = useCallback(async (id) => { await db.toggleSave(id); setPosts(await db.getPosts()); }, []);
  const followAuthor = useCallback(async (id) => { await db.toggleFollowAuthor(id); setPosts(await db.getPosts()); }, []);
  const commentOnPost = useCallback(async (id, text) => { await db.addComment(id, text); setPosts(await db.getPosts()); }, []);
  const publishPost = useCallback(async (fields) => { await db.createPost(fields); setPosts(await db.getPosts()); }, []);
  const uploadImage = useCallback((blob) => db.uploadPostImage(blob), []);
  const uploadVideo = useCallback((file) => db.uploadPostVideo(file), []);
  const votePoll = useCallback(async (id, optionIndex) => { setPosts(await db.votePoll(id, optionIndex)); }, []);
  const setCarousel = useCallback(async (id, index) => { await db.setCarouselIndex(id, index); setPosts(await db.getPosts()); }, []);
  const viewStory = useCallback(async (id) => { setStories(await db.markStorySeen(id)); }, []);
  const addStory = useCallback(async (fields) => { setStories(await db.addStory(fields)); }, []);
  const deleteStory = useCallback(async (id) => { setStories(await db.deleteStory(id)); }, []);
  const uploadStoryImage = useCallback((blob) => db.uploadStoryImage(blob), []);
  const uploadStoryVideo = useCallback((file) => db.uploadStoryVideo(file), []);
  const followPerson = useCallback(async (id) => { setPeople(await db.toggleFollowPerson(id)); }, []);
  const endorseSkill = useCallback(async (name) => { setExpertise(await db.toggleEndorse(name)); }, []);
  const saveEvidence = useCallback(async (id) => { setEvidence(await db.toggleSaveEvidence(id)); }, []);
  const joinCommunity = useCallback(async (id) => { setCommunities(await db.toggleJoinCommunity(id)); }, []);
  const reportPost = useCallback(async (id, reason) => db.reportPost(id, reason), []);
  const deletePost = useCallback(async (id) => { setPosts(await db.deletePost(id)); }, []);
  const deleteComment = useCallback(async (postId, commentId) => { setPosts(await db.deleteComment(postId, commentId)); }, []);
  const markNotificationRead = useCallback(async (id) => { setNotifications(await db.markNotificationRead(id)); }, []);
  const updateProfile = useCallback(async (fields) => { const p = await db.updateProfile(fields); setProfile(p); return p; }, []);
  const uploadProfileImage = useCallback((blob) => db.uploadProfileImage(blob), []);

  // Education & achievements editing (2026-08-19) -- each wrapper re-fetches
  // the real list from db.js and updates local state, same "await the
  // mutation, then set state from its return value" shape as every other
  // action above. Errors are NOT caught here -- they propagate to the edit
  // modal so it can show what actually went wrong instead of closing as if
  // the save worked.
  const addEducationEntry = useCallback(async (fields) => { setEducation(await db.addEducationEntry(fields)); }, []);
  const updateEducationEntry = useCallback(async (id, fields) => { setEducation(await db.updateEducationEntry(id, fields)); }, []);
  const deleteEducationEntry = useCallback(async (id) => { setEducation(await db.deleteEducationEntry(id)); }, []);
  const addAchievement = useCallback(async (fields) => { setAchievements(await db.addAchievement(fields)); }, []);
  const updateAchievement = useCallback(async (id, fields) => { setAchievements(await db.updateAchievement(id, fields)); }, []);
  const deleteAchievement = useCallback(async (id) => { setAchievements(await db.deleteAchievement(id)); }, []);

  const value = {
    loading, posts, stories, people, notifications, evidence, communities,
    expertise, education, achievements, exercises, profile,
    likePost, savePost, followAuthor, commentOnPost, publishPost, setCarousel,
    viewStory, addStory, deleteStory, uploadStoryImage, uploadStoryVideo,
    followPerson, endorseSkill, saveEvidence, joinCommunity, reportPost, deletePost, deleteComment, markNotificationRead,
    uploadImage, uploadVideo, votePoll, updateProfile, uploadProfileImage,
    addEducationEntry, updateEducationEntry, deleteEducationEntry,
    addAchievement, updateAchievement, deleteAchievement,
    composerOpen, setComposerOpen, composerType, setComposerType,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}
