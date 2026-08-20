import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Activity, Zap } from "lucide-react";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import AboutCard from "../components/profile/AboutCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import AchievementsCard from "../components/profile/AchievementsCard.jsx";
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
const TABS = ["Posts", "Cases", "Research", "About"];
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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("Posts");
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
    setActiveTab("Posts");
    setCategoryFilter(null);
    (async () => {
      const [p, ed, ac] = await Promise.all([
        db.getProfileById(userId),
        db.getEducationByUser(userId),
        db.getAchievementsByUser(userId),
      ]);
      if (cancelled) return;
      if (!p) setNotFound(true); else setOtherProfile(p);
      setEducation(ed);
      setAchievements(ac);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, myProfile, navigate]);

  if (loading) return <main className="flex-1 min-w-0 py-14 text-center text-sm text-slate-400">Loading profile…</main>;
  if (notFound || !otherProfile) {
    return (
      <main className="flex-1 min-w-0 py-14 text-center">
        <p className="text-sm text-slate-500">This profile couldn't be found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-medium text-violet-600 hover:underline">Go back</button>
      </main>
    );
  }

  const authorPosts = posts.filter((p) => p.authorId === userId);
  const gridPosts =
    activeTab === "Posts" ? (categoryFilter ? authorPosts.filter((p) => p.category === categoryFilter) : authorPosts)
    : activeTab === "Cases" ? authorPosts.filter((p) => p.category === "Case Studies")
    : activeTab === "Research" ? authorPosts.filter((p) => p.category === "Research")
    : [];
  const following = people.find((p) => p.id === userId)?.following ?? false;

  const pickShortcut = (s) => {
    setActiveTab("Posts");
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

        <div className="flex items-center gap-1 mb-4 overflow-x-auto no-scrollbar bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setCategoryFilter(null); }}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors ${activeTab === tab ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Posts" && (
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mb-5 px-1 py-1">
            {SHORTCUTS.map((s) => {
              const Icon = s.icon;
              const on = categoryFilter === s.category;
              return (
                <button key={s.label} onClick={() => pickShortcut(s)} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${on ? "bg-violet-600" : "bg-violet-50"}`}>
                    <Icon size={18} className={on ? "text-white" : "text-violet-600"} />
                  </div>
                  <span className="text-[10px] text-slate-500 text-center leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "About" ? (
          <div className="space-y-4">
            <AboutCard profile={otherProfile} readOnly />
            <EducationCard entries={education} readOnly />
            <AchievementsCard entries={achievements} readOnly />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {gridPosts.length === 0 ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div> : gridPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        )}
      </main>

      <aside className="hidden lg:block w-72 shrink-0 space-y-4">
        <AboutCard profile={otherProfile} readOnly />
        <EducationCard entries={education} readOnly />
        <AchievementsCard entries={achievements} readOnly />
      </aside>
    </>
  );
}
