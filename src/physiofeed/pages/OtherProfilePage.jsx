import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Activity, Zap } from "lucide-react";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ProfileAboutSummary from "../components/profile/ProfileAboutSummary.jsx";
import RotationsCard from "../components/profile/RotationsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import * as db from "../data/db.js";

// Profile page for VIEWING SOMEONE ELSE, reached by clicking a name/avatar
// in the feed or on the People page. Deliberately mirrors ProfilePage.jsx's
// layout (tabs, category shortcuts, About/Education/Achievements sidebar)
// -- the first version of this page was just a header + flat post grid,
// which looked and felt like a second-class, stripped-down profile next to
// your own full one (Aditi's feedback: "should also show same profile of
// people to everyone like insta or linkedin"). The only intentional
// omission is the Exercises tab/strip: `exercises` (ExerciseGrid.jsx) is a
// single shared, app-wide library, not per-user data, so showing it on
// every profile would just repeat identical content rather than show
// anything that's actually theirs.
//
// 3-tab "About/Feed/Cases" bar + the consolidated About card
// (ProfileAboutSummary.jsx, replacing separate AboutCard/ClinicalCard/
// AchievementsCard here) are from Aditi's 2026-09-22 reference spec for
// this page specifically -- ProfilePage.jsx (your own profile) keeps its
// existing 4-tab layout untouched. Research posts aren't gone, just not
// separately tabbed: they still show under Feed like any other post.
const TABS = ["About", "Feed", "Cases"];
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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("About");
  const [categoryFilter, setCategoryFilter] = useState(null);

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
    setActiveTab("About");
    setCategoryFilter(null);
    (async () => {
      const [p, ed, ac, rt] = await Promise.all([
        db.getProfileById(userId),
        db.getEducationByUser(userId),
        db.getAchievementsByUser(userId),
        db.getRotationsByUser(userId),
      ]);
      if (cancelled) return;
      if (!p) setNotFound(true); else setOtherProfile(p);
      setEducation(ed);
      setAchievements(ac);
      setRotations(rt);
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
  const gridPosts =
    activeTab === "Feed" ? (categoryFilter ? authorPosts.filter((p) => p.category === categoryFilter) : authorPosts)
    : activeTab === "Cases" ? authorPosts.filter((p) => p.category === "Case Studies")
    : [];
  const following = people.find((p) => p.id === userId)?.following ?? false;

  const pickShortcut = (s) => {
    setActiveTab("Feed");
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

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setCategoryFilter(null); }}
              className={`pf-font-head flex-1 text-center text-xs font-bold tracking-wide py-2 rounded-xl transition-all ${activeTab === tab ? "bg-[#7C3AED] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === "Feed" && (
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
        )}

        {activeTab === "About" ? (
          <div className="space-y-4">
            <ProfileAboutSummary profile={otherProfile} achievements={achievements} />
            <RotationsCard entries={rotations} readOnly />
            <EducationCard entries={education} readOnly />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {gridPosts.length === 0 ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div> : gridPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        )}
      </main>

      <aside className="hidden xl:block w-72 shrink-0 space-y-4">
        <ProfileAboutSummary profile={otherProfile} achievements={achievements} />
        <RotationsCard entries={rotations} readOnly />
        <EducationCard entries={education} readOnly />
      </aside>
    </>
  );
}
