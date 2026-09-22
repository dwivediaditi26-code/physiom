import { useState } from "react";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ProfileTabs from "../components/profile/ProfileTabs.jsx";
import ProfileAboutSection from "../components/profile/ProfileAboutSection.jsx";
import RotationsCard from "../components/profile/RotationsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import CertificationsCard from "../components/profile/CertificationsCard.jsx";
import ResearchEvidenceSection from "../components/profile/ResearchEvidenceSection.jsx";
import ProfessionalContributionsSection from "../components/profile/ProfessionalContributionsSection.jsx";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

// Own profile. Sticky ProfileTabs (2026-09-22 "LinkedIn for
// physiotherapists" redesign, Aditi's brief) -- Posts | About | Experience
// | Education | Research, shared with OtherProfilePage.jsx (see that file
// for the fuller reasoning). Dropped the standalone Clinical tab this pass
// (ClinicalProfileTab.jsx deleted) and split the old combined Evidence &
// Contributions tab into Research & Evidence (ResearchEvidenceSection.jsx)
// plus a separate Certifications card and Professional Contributions
// section, matching the brief's own section list.
//
// Back to real tab-switching, not inline scroll (2026-09-22, Aditi: a real
// profile with ~10 posts pushed About/Experience/Education/Research so far
// down the page that reaching them meant scrolling past every post first
// -- "I want whole post thing different... about experience, education,
// research in a different tab". Only the active tab's section renders; the
// same-day "inline wise"/useProfileSections.js scroll-jump experiment this
// replaces didn't scale once Posts had real content. ProfessionalContributionsSection
// renders alongside Research, not as its own sixth tab (see that
// component's own comment on why it's demo-only and own-profile-only).
export default function ProfilePage() {
  const { posts, profile, rotations, achievements, publications } = useAppData();
  const [activeTab, setActiveTab] = useState("Posts");

  if (!profile) return null;

  const ownPosts = posts.filter((p) => p.isSelf);

  return (
    <>
      <main className="flex-1 min-w-0">
        <ProfileHeader profile={profile} postCount={ownPosts.length} experience={rotations} isOwn />

        <ProfileTabs active={activeTab} onChange={setActiveTab} />

        {activeTab === "Posts" && (
          <div className="grid sm:grid-cols-2 gap-4">
            {ownPosts.length === 0 ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div> : ownPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        )}
        {activeTab === "About" && <ProfileAboutSection profile={profile} isOwn />}
        {activeTab === "Experience" && <RotationsCard />}
        {activeTab === "Education" && (
          <div className="space-y-4">
            <EducationCard />
            <CertificationsCard entries={achievements} />
          </div>
        )}
        {activeTab === "Research" && (
          <div className="space-y-4">
            <ResearchEvidenceSection profile={profile} posts={posts} publications={publications} isOwn />
            <ProfessionalContributionsSection />
          </div>
        )}
      </main>

      <aside className="hidden xl:block w-72 shrink-0 space-y-4">
        <ProfileAboutSection profile={profile} isOwn />
        <RotationsCard />
        <EducationCard />
        <CertificationsCard entries={achievements} />
      </aside>
    </>
  );
}
