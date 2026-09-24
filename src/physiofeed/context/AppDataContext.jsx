import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as db from "../data/db.js";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [feedError, setFeedError] = useState(null);
  // P9 (2026-09-22): the non-feed writes -- follow, save an article, join a
  // community, mark a notification read -- no longer fake success for a
  // signed-in user either, so they need somewhere for a failure to land.
  // One shared surface rendered by AppShell rather than an error line
  // bolted onto four different pages.
  const [actionError, setActionError] = useState(null);
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
  // P3: unread DM count for the header's message icon. Lives here rather
  // than in MessagesPage because the badge has to show on every screen --
  // that page is where you go once you already know there's something
  // waiting.
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState(null); // null | 'post' | 'case' | 'research' | 'video' | 'photo' | 'poll'

  useEffect(() => {
    (async () => {
      const [p, pe, no, ev, co, ex, ed, ac, rt, pu, exr, pr, cs, cr, um] = await Promise.all([
        db.getPosts(), db.getPeople(), db.getNotifications(),
        db.getEvidence(), db.getCommunities(), db.getExpertise(), db.getEducation(),
        db.getAchievements(), db.getRotations(), db.getPublications(), db.getExercises(), db.getProfile(),
        db.getConnectionStates(), db.getConnectionRequests(), db.getUnreadMessageCount(),
      ]);
      setPosts(p); setPeople(pe); setNotifications(no);
      setEvidence(ev); setCommunities(co); setExpertise(ex); setEducation(ed);
      setAchievements(ac); setRotations(rt); setPublications(pu); setExercises(exr); setProfile(pr);
      setConnectionStates(cs); setConnectionRequests(cr); setUnreadMessages(um);
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

  // P3: same shape as the bell's subscription above, for the envelope.
  // Every insert involving you re-counts -- cheap (a head-only count) and
  // correct whether the row is one you received (count up) or one you sent
  // from another device (unchanged).
  const refreshUnreadMessages = useCallback(async () => {
    setUnreadMessages(await db.getUnreadMessageCount());
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    (async () => {
      unsubscribe = await db.subscribeToMessages(async () => {
        if (cancelled) return;
        setUnreadMessages(await db.getUnreadMessageCount());
      });
      if (cancelled) unsubscribe();
    })();
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  // P7 (2026-09-22): db.js no longer fakes a successful like/comment/
  // delete into its demo array when a signed-in user's write fails, so
  // those writes can now reject. Each feed action runs through this: the
  // post list is re-read from the database either way (so the UI snaps
  // back to what's really stored) and the failure surfaces as `feedError`
  // instead of an unhandled promise rejection nobody sees.
  const runFeedAction = useCallback(async (fn) => {
    setFeedError(null);
    try {
      await fn();
    } catch (e) {
      setFeedError(e?.message || "That didn't save -- please try again.");
    } finally {
      setPosts(await db.getPosts());
    }
  }, []);

  // Same contract as runFeedAction above, for everything outside the feed:
  // report what went wrong, and re-read the list either way so the UI
  // shows what's really stored rather than the optimistic flip.
  const runAction = useCallback(async (fn, resync, fallback) => {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e?.message || fallback);
    } finally {
      await resync();
    }
  }, []);

  const likePost = useCallback((id) => runFeedAction(() => db.toggleLike(id)), [runFeedAction]);
  const savePost = useCallback((id) => runFeedAction(() => db.toggleSave(id)), [runFeedAction]);
  const followAuthor = useCallback((id) => runFeedAction(() => db.toggleFollowAuthor(id)), [runFeedAction]);
  const commentOnPost = useCallback((id, text, opts) => runFeedAction(() => db.addComment(id, text, opts)), [runFeedAction]);
  const publishPost = useCallback(async (fields) => { await db.createPost(fields); setPosts(await db.getPosts()); }, []);
  const uploadImage = useCallback((blob) => db.uploadPostImage(blob), []);
  const uploadVideo = useCallback((file) => db.uploadPostVideo(file), []);
  const uploadDocument = useCallback((file) => db.uploadPostDocument(file), []);
  const closeDiscussion = useCallback((id, closed) => runFeedAction(() => db.setDiscussionClosed(id, closed)), [runFeedAction]);
  const votePoll = useCallback((id, optionIndex) => runFeedAction(() => db.votePoll(id, optionIndex)), [runFeedAction]);
  const setCarousel = useCallback(async (id, index) => { await db.setCarouselIndex(id, index); setPosts(await db.getPosts()); }, []);
  const followPerson = useCallback((id) => runAction(
    () => db.toggleFollowPerson(id),
    async () => setPeople(await db.getPeople()),
    "Couldn't update that follow -- please try again.",
  ), [runAction]);
  const endorseSkill = useCallback(async (name) => { setExpertise(await db.toggleEndorse(name)); }, []);
  const saveEvidence = useCallback((id) => runAction(
    () => db.toggleSaveEvidence(id),
    async () => setEvidence(await db.getEvidence()),
    "Couldn't save that paper -- please try again.",
  ), [runAction]);
  const joinCommunity = useCallback((id) => runAction(
    () => db.toggleJoinCommunity(id),
    async () => setCommunities(await db.getCommunities()),
    "Couldn't update that group -- please try again.",
  ), [runAction]);
  const reportPost = useCallback(async (id, reason) => db.reportPost(id, reason), []);
  const deletePost = useCallback((id) => runFeedAction(() => db.deletePost(id)), [runFeedAction]);
  const deleteComment = useCallback((postId, commentId) => runFeedAction(() => db.deleteComment(postId, commentId)), [runFeedAction]);
  const markNotificationRead = useCallback((id) => runAction(
    () => db.markNotificationRead(id),
    async () => setNotifications(await db.getNotifications()),
    "Couldn't mark that as read -- please try again.",
  ), [runAction]);
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
    connectionStates, connectionRequests, unreadMessages, refreshUnreadMessages,
    connectWith, acceptConnection, ignoreConnection, cancelConnection, disconnectFrom, refreshConnections,
    likePost, savePost, followAuthor, commentOnPost, publishPost, setCarousel,
    feedError, clearFeedError: () => setFeedError(null),
    actionError, clearActionError: () => setActionError(null),
    followPerson, endorseSkill, saveEvidence, joinCommunity, reportPost, deletePost, deleteComment, markNotificationRead,
    uploadImage, uploadVideo, uploadDocument, closeDiscussion, votePoll, updateProfile, uploadProfileImage,
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
