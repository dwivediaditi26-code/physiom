import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Activity, Zap } from "lucide-react";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ProfileTabs, { PROFILE_TABS } from "../components/profile/ProfileTabs.jsx";
import useProfileSections from "../components/profile/useProfileSections.js";
import ProfileAboutSection from "../components/profile/ProfileAboutSection.jsx";
import ClinicalProfileTab from "../components/profile/ClinicalProfileTab.jsx";
import EvidenceContributionsTab from "../components/profile/EvidenceContributionsTab.jsx";
import RotationsCard from "../components/profile/RotationsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import * as db from "../data/db.js";

// Profile page for VIEWING SOMEONE ELSE, reached by clicking a name/avatar
// in the feed or on the People page. Mirrors ProfilePage.jsx's layout --
// see that file for the shared components both pages now use.
//
// Sticky ProfileTabs (2026-09-22 redesign, Aditi's "PhysioFeed Therapist
// Profile" spec): Posts | About | Clinical | Experience | Education |
// Evidence, replacing the earlier 3-tab About/Feed/Cases bar. Experience
// and Education still show today's RotationsCard/EducationCard content
// as-is -- restructuring those into full multi-entry cards is a later
// pass (Aditi's own scoping: Clinical Profile + Evidence & Contributions
// + Opportunities first). The Exercises tab/strip stays deliberately
// omitted -- `exercises` (ExerciseGrid.jsx) is a single shared, app-wide
// library, not per-user data.
//
// All six sections render inline on one scrollable page (2026-09-22,
// Aditi: "thiis showing page wise .. i want inline wise" -- see
// ProfilePage.jsx and useProfileSections.js for the fuller reasoning).
const SHORTCUTS = [
  { label: "ACL Rehab", category: "Techniques", icon: Activity },
  { label: "Sports Injuries", category: "Case Studies", icon: Zap },
];

export default function OtherProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { posts, profile: myProfile, people, followPerson } = useAppData();
  const [otherProfile, setOtherProfile] = useState(null);
  const [education, setEducation] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [otherPublications, setOtherPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const { activeTab, register, scrollTo } = useProfileSections(PROFILE_TABS);

  useEffect(() => {
    // Viewing your own id via this route (e.g. an old link) -- just show
    // the real, editable profile page instead of a read-only copy of it.
    if (myProfile && userId === myProfile.id) {
      navigate("/profile", { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setCategoryFilter(null);
    (async () => {
      const [p, ed, ac, rt, pu] = await Promise.all([
        db.getProfileById(userId),
        db.getEducationByUser(userId),
        db.getAchievementsByUser(userId),
        db.getRotationsByUser(userId),
        db.getPublicationsByUser(userId),
      ]);
      if (cancelled) return;
      if (!p) setNotFound(true); else setOtherProfile(p);
      setEducation(ed);
      setAchievements(ac);
      setRotations(rt);
      setOtherPublications(pu);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, myProfile, navigate]);

  if (loading) return <main className="flex-1 min-w-0 py-14 text-center text-sm text-slate-400">Loading profile…</main>;
  if (notFound || !otherProfile) {
    return (
      <main className="flex-1 min-w-0 py-14 text-center">
        <p className="text-sm text-slate-500">This profile couldn't be found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-medium text-[#7C3AED] hover:underline">Go back</button>
      </main>
    );
  }

  const authorPosts = posts.filter((p) => p.authorId === userId);
  const gridPosts = categoryFilter ? authorPosts.filter((p) => p.category === categoryFilter) : authorPosts;
  const following = people.find((p) => p.id === userId)?.following ?? false;

  const pickShortcut = (s) => {
    scrollTo("Posts");
    setCategoryFilter((cur) => (cur === s.category ? null : s.category));
  };

  return (
    <>
      <main className="flex-1 min-w-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft size={15} /> Back
        </button>
        <ProfileHeader
          profile={otherProfile}
          postCount={authorPosts.length}
          isOwn={false}
          following={following}
          onFollow={() => followPerson(userId)}
          onMessage={() => navigate(`/messages?with=${encodeURIComponent(userId)}`)}
        />

        <ProfileTabs active={activeTab} onChange={scrollTo} />

        <div id="profile-section-Posts" ref={register("Posts")} className="pf-profile-section">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mb-5 px-1 py-1">
            {SHORTCUTS.map((s) => {
              const Icon = s.icon;
              const on = categoryFilter === s.category;
              return (
                <button key={s.label} onClick={() => pickShortcut(s)} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${on ? "bg-[#7C3AED]" : "bg-[#F3EEFF]"}`}>
                    <Icon size={18} className={on ? "text-white" : "text-[#7C3AED]"} />
                  </div>
                  <span className="text-[10px] text-slate-500 text-center leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {gridPosts.length === 0 ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div> : gridPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        </div>

        <div id="profile-section-About" ref={register("About")} className="pf-profile-section"><ProfileAboutSection profile={otherProfile} achievements={achievements} isOwn={false} /></div>
        <div id="profile-section-Clinical" ref={register("Clinical")} className="pf-profile-section"><ClinicalProfileTab profile={otherProfile} isOwn={false} /></div>
        <div id="profile-section-Experience" ref={register("Experience")} className="pf-profile-section"><RotationsCard entries={rotations} readOnly /></div>
        <div id="profile-section-Education" ref={register("Education")} className="pf-profile-section"><EducationCard entries={education} readOnly /></div>
        <div id="profile-section-Evidence" ref={register("Evidence")} className="pf-profile-section"><EvidenceContributionsTab profile={otherProfile} posts={posts} publications={otherPublications} isOwn={false} /></div>
      </main>

      <aside className="hidden xl:block w-72 shrink-0 space-y-4">
        <ProfileAboutSection profile={otherProfile} achievements={achievements} isOwn={false} />
        <RotationsCard entries={rotations} readOnly />
        <EducationCard entries={education} readOnly />
      </aside>
    </>
  );
}
