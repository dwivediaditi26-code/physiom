import { useState } from "react";
import { Activity, Zap } from "lucide-react";
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

// Own profile. Sticky ProfileTabs (2026-09-22 redesign, Aditi's
// "PhysioFeed Therapist Profile" spec) -- Posts | About | Clinical |
// Experience | Education | Evidence, shared with OtherProfilePage.jsx
// (see that file for the fuller reasoning). Was previously a separate,
// amber-styled 4-tab layout (About/Posts/Cases/Research) stacking
// AboutCard/ClinicalCard/AchievementsCard on its own -- unified onto the
// same components other-profile already used, per Aditi's own call when
// asked ("Both, unified").
//
// All six sections render inline on one scrollable page (2026-09-22,
// Aditi: "thiis showing page wise .. i want inline wise" -- tapping a tab
// used to swap which single section rendered, hiding the rest like
// separate pages). ProfileTabs now just jumps to / highlights the current
// section via useProfileSections.js, shared with OtherProfilePage.jsx.
const SHORTCUTS = [
  { label: "ACL Rehab", icon: Activity, category: "Techniques" },
  { label: "Sports Injuries", icon: Zap, category: "Case Studies" },
];

export default function ProfilePage() {
  const { posts, profile, achievements, publications } = useAppData();
  const [categoryFilter, setCategoryFilter] = useState(null);
  const { activeTab, register, scrollTo } = useProfileSections(PROFILE_TABS);

  if (!profile) return null;

  const ownPosts = posts.filter((p) => p.isSelf);
  const gridPosts = categoryFilter ? ownPosts.filter((p) => p.category === categoryFilter) : ownPosts;

  const pickShortcut = (s) => {
    scrollTo("Posts");
    setCategoryFilter((cur) => (cur === s.category ? null : s.category));
  };

  return (
    <>
      <main className="flex-1 min-w-0">
        <ProfileHeader profile={profile} postCount={ownPosts.length} isOwn />

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

        <div id="profile-section-About" ref={register("About")} className="pf-profile-section"><ProfileAboutSection profile={profile} achievements={achievements} isOwn /></div>
        <div id="profile-section-Clinical" ref={register("Clinical")} className="pf-profile-section"><ClinicalProfileTab profile={profile} isOwn /></div>
        <div id="profile-section-Experience" ref={register("Experience")} className="pf-profile-section"><RotationsCard /></div>
        <div id="profile-section-Education" ref={register("Education")} className="pf-profile-section"><EducationCard /></div>
        <div id="profile-section-Evidence" ref={register("Evidence")} className="pf-profile-section"><EvidenceContributionsTab profile={profile} posts={posts} publications={publications} isOwn /></div>
      </main>

      <aside className="hidden xl:block w-72 shrink-0 space-y-4">
        <ProfileAboutSection profile={profile} achievements={achievements} isOwn />
        <RotationsCard />
        <EducationCard />
      </aside>
    </>
  );
}
