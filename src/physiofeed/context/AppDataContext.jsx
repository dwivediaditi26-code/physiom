import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as db from "../data/db.js";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [people, setPeople] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [expertise, setExpertise] = useState([]);
  const [education, setEducation] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [publications, setPublications] = useState([]);
  const [exercises, setExercises] = useState([]);
  // P2 connections: `connectionStates` is { otherUserId: none | pending_sent
  // | pending_received | connected }, one query for everyone rather than one
  // per profile card. `connectionRequests` is the incoming pending list the
  // People page renders.
  const [connectionStates, setConnectionStates] = useState({});
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState(null); // null | 'post' | 'case' | 'research' | 'video' | 'photo' | 'poll'

  useEffect(() => {
    (async () => {
      const [p, pe, no, ev, co, ex, ed, ac, rt, pu, exr, pr, cs, cr] = await Promise.all([
        db.getPosts(), db.getPeople(), db.getNotifications(),
        db.getEvidence(), db.getCommunities(), db.getExpertise(), db.getEducation(),
        db.getAchievements(), db.getRotations(), db.getPublications(), db.getExercises(), db.getProfile(),
        db.getConnectionStates(), db.getConnectionRequests(),
      ]);
      setPosts(p); setPeople(pe); setNotifications(no);
      setEvidence(ev); setCommunities(co); setExpertise(ex); setEducation(ed);
      setAchievements(ac); setRotations(rt); setPublications(pu); setExercises(exr); setProfile(pr);
      setConnectionStates(cs); setConnectionRequests(cr);
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

  // Clinical rotations & CV (2026-09-21) -- same wrapper shape as
  // education/achievements above.
  const addRotation = useCallback(async (fields) => { setRotations(await db.addRotation(fields)); }, []);
  const updateRotation = useCallback(async (id, fields) => { setRotations(await db.updateRotation(id, fields)); }, []);
  const deleteRotation = useCallback(async (id) => { setRotations(await db.deleteRotation(id)); }, []);
  const uploadResume = useCallback((file) => db.uploadResume(file), []);

  // Connections (P2) -- each action returns the refreshed state map, and
  // also re-reads the incoming request list because accepting/ignoring one
  // removes it from there. Errors propagate to the caller (the Connect
  // button shows them) rather than being swallowed here, same as the
  // education/achievements wrappers below.
  const refreshConnections = useCallback(async () => {
    const [cs, cr] = await Promise.all([db.getConnectionStates(), db.getConnectionRequests()]);
    setConnectionStates(cs); setConnectionRequests(cr);
  }, []);
  const connectWith = useCallback(async (id) => { setConnectionStates(await db.sendConnectionRequest(id)); await refreshConnections(); }, [refreshConnections]);
  const acceptConnection = useCallback(async (id) => { setConnectionStates(await db.acceptConnectionRequest(id)); await refreshConnections(); }, [refreshConnections]);
  const ignoreConnection = useCallback(async (id) => { setConnectionStates(await db.ignoreConnectionRequest(id)); await refreshConnections(); }, [refreshConnections]);
  const cancelConnection = useCallback(async (id) => { setConnectionStates(await db.cancelConnectionRequest(id)); await refreshConnections(); }, [refreshConnections]);
  const disconnectFrom = useCallback(async (id) => { setConnectionStates(await db.disconnectFrom(id)); await refreshConnections(); }, [refreshConnections]);

  // Publications (2026-09-22, Evidence & Contributions tab) -- same wrapper
  // shape as education/achievements/rotations above.
  const addPublication = useCallback(async (fields) => { setPublications(await db.addPublication(fields)); }, []);
  const updatePublication = useCallback(async (id, fields) => { setPublications(await db.updatePublication(id, fields)); }, []);
  const deletePublication = useCallback(async (id) => { setPublications(await db.deletePublication(id)); }, []);

  const value = {
    loading, posts, people, notifications, evidence, communities,
    expertise, education, achievements, rotations, publications, exercises, profile,
    connectionStates, connectionRequests,
    connectWith, acceptConnection, ignoreConnection, cancelConnection, disconnectFrom, refreshConnections,
    likePost, savePost, followAuthor, commentOnPost, publishPost, setCarousel,
    followPerson, endorseSkill, saveEvidence, joinCommunity, reportPost, deletePost, deleteComment, markNotificationRead,
    uploadImage, uploadVideo, votePoll, updateProfile, uploadProfileImage,
    addEducationEntry, updateEducationEntry, deleteEducationEntry,
    addAchievement, updateAchievement, deleteAchievement,
    addRotation, updateRotation, deleteRotation, uploadResume,
    addPublication, updatePublication, deletePublication,
    composerOpen, setComposerOpen, composerType, setComposerType,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}
