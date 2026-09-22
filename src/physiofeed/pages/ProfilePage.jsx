import { useState } from "react";
import { Activity, Zap } from "lucide-react";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ProfileTabs from "../components/profile/ProfileTabs.jsx";
import ProfileAboutSection from "../components/profile/ProfileAboutSection.jsx";
import ClinicalProfileTab from "../components/profile/ClinicalProfileTab.jsx";
import EvidenceContributionsTab from "../components/profile/EvidenceContributionsTab.jsx";
import RotationsCard from "../components/profile/RotationsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

// Own profile. Sticky ProfileTabs (2026-09-22 redesign, Aditi's
// "PhysioFeed Therapist Profile" spec) -- Posts | About | Clinical |
// Experience | Education | Evidence, shared with OtherProfilePage.jsx
// (see that file for the fuller reasoning). Was previously a separate,
// amber-styled 4-tab layout (About/Posts/Cases/Research) stacking
// AboutCard/ClinicalCard/AchievementsCard on its own -- unified onto the
// same components other-profile already used, per Aditi's own call when
// asked ("Both, unified").
const SHORTCUTS = [
  { label: "ACL Rehab", icon: Activity, category: "Techniques" },
  { label: "Sports Injuries", icon: Zap, category: "Case Studies" },
];

export default function ProfilePage() {
  const { posts, profile, achievements, publications } = useAppData();
  const [activeTab, setActiveTab] = useState("About");
  const [categoryFilter, setCategoryFilter] = useState(null);

  if (!profile) return null;

  const ownPosts = posts.filter((p) => p.isSelf);
  const gridPosts = activeTab === "Posts" ? (categoryFilter ? ownPosts.filter((p) => p.category === categoryFilter) : ownPosts) : [];

  const pickShortcut = (s) => {
    setActiveTab("Posts");
    setCategoryFilter((cur) => (cur === s.category ? null : s.category));
  };

  return (
    <>
      <main className="flex-1 min-w-0">
        <ProfileHeader profile={profile} postCount={ownPosts.length} isOwn />

        <ProfileTabs active={activeTab} onChange={(t) => { setActiveTab(t); setCategoryFilter(null); }} />

        {activeTab === "Posts" && (
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

        {activeTab === "About" && <ProfileAboutSection profile={profile} achievements={achievements} isOwn />}
        {activeTab === "Clinical" && <ClinicalProfileTab profile={profile} isOwn />}
        {activeTab === "Experience" && <RotationsCard />}
        {activeTab === "Education" && <EducationCard />}
        {activeTab === "Evidence" && <EvidenceContributionsTab profile={profile} posts={posts} publications={publications} isOwn />}
        {activeTab === "Posts" && (
          <div className="grid sm:grid-cols-2 gap-4">
            {gridPosts.length === 0 ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div> : gridPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        )}
      </main>

      <aside className="hidden xl:block w-72 shrink-0 space-y-4">
        <ProfileAboutSection profile={profile} achievements={achievements} isOwn />
        <RotationsCard />
        <EducationCard />
      </aside>
    </>
  );
}
