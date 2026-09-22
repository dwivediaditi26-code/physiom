import { useState } from "react";
import { Activity, Zap, GraduationCap } from "lucide-react";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import AboutCard from "../components/profile/AboutCard.jsx";
import ClinicalCard from "../components/profile/ClinicalCard.jsx";
import RotationsCard from "../components/profile/RotationsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import AchievementsCard from "../components/profile/AchievementsCard.jsx";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

const TABS = ["About", "Posts", "Cases", "Research"];
const SHORTCUTS = [
  { label: "ACL Rehab", icon: Activity, category: "Techniques" },
  { label: "Sports Injuries", icon: Zap, category: "Case Studies" },
  { label: "Workshops", icon: GraduationCap, category: "Education" },
];

export default function ProfilePage() {
  const { posts, profile } = useAppData();
  const [activeTab, setActiveTab] = useState("About");
  const [categoryFilter, setCategoryFilter] = useState(null);

  if (!profile) return null;

  const ownPosts = posts.filter((p) => p.isSelf);
  const gridPosts =
    activeTab === "Posts" ? (categoryFilter ? ownPosts.filter((p) => p.category === categoryFilter) : ownPosts)
    : activeTab === "Cases" ? ownPosts.filter((p) => p.category === "Case Studies")
    : activeTab === "Research" ? ownPosts.filter((p) => p.category === "Research")
    : [];

  const pickShortcut = (s) => {
    setActiveTab("Posts");
    setCategoryFilter((cur) => (cur === s.category ? null : s.category));
  };

  return (
    <>
      <main className="flex-1 min-w-0">
        <ProfileHeader profile={profile} postCount={ownPosts.length} />

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
          <div className="space-y-4"><AboutCard /><ClinicalCard /><RotationsCard /><EducationCard /><AchievementsCard /></div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {gridPosts.length === 0 ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div> : gridPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        )}
      </main>

      <aside className="hidden xl:block w-72 shrink-0 space-y-4">
        <AboutCard /><ClinicalCard /><RotationsCard /><EducationCard /><AchievementsCard />
      </aside>
    </>
  );
}
