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

  const likePost = useCallback(async (id) => { await db.toggleLike(id); setPosts(await db.getPosts()); }, []);
  const savePost = useCallback(async (id) => { await db.toggleSave(id); setPosts(await db.getPosts()); }, []);
  const followAuthor = useCallback(async (id) => { await db.toggleFollowAuthor(id); setPosts(await db.getPosts()); }, []);
  const commentOnPost = useCallback(async (id, text) => { await db.addComment(id, text); setPosts(await db.getPosts()); }, []);
  const publishPost = useCallback(async ({ text, category }) => { await db.createPost({ text, category }); setPosts(await db.getPosts()); }, []);
  const setCarousel = useCallback(async (id, index) => { await db.setCarouselIndex(id, index); setPosts(await db.getPosts()); }, []);
  const viewStory = useCallback(async (id) => { setStories(await db.markStorySeen(id)); }, []);
  const followPerson = useCallback(async (id) => { setPeople(await db.toggleFollowPerson(id)); }, []);
  const endorseSkill = useCallback(async (name) => { setExpertise(await db.toggleEndorse(name)); }, []);
  const saveEvidence = useCallback(async (id) => { setEvidence(await db.toggleSaveEvidence(id)); }, []);
  const joinCommunity = useCallback(async (id) => { setCommunities(await db.toggleJoinCommunity(id)); }, []);

  const value = {
    loading, posts, stories, people, notifications, evidence, communities,
    expertise, education, achievements, exercises, profile,
    likePost, savePost, followAuthor, commentOnPost, publishPost, setCarousel,
    viewStory, followPerson, endorseSkill, saveEvidence, joinCommunity,
    composerOpen, setComposerOpen,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}
