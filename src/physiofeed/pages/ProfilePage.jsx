import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ProfileTabs, { PROFILE_TABS } from "../components/profile/ProfileTabs.jsx";
import useProfileSections from "../components/profile/useProfileSections.js";
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
// All sections render inline on one scrollable page (2026-09-22, Aditi:
// "thiis showing page wise .. i want inline wise" -- tapping a tab used to
// swap which single section rendered, hiding the rest like separate
// pages). ProfileTabs now just jumps to / highlights the current section
// via useProfileSections.js, shared with OtherProfilePage.jsx.
// ProfessionalContributionsSection has no `id`/register() of its own --
// it's extra content inside the Research tab's scroll range, not a
// seventh tab (see that component's own comment on why it's demo-only and
// own-profile-only).
//
// Posts is just the posts grid, nothing else (2026-09-22, Aditi: "make the
// post setion only for all the post" -- dropped the ACL Rehab/Sports
// Injuries category-shortcut icon row that used to sit above the grid and
// filter it; that row's circular icons read too much like Instagram's own
// Stories/highlights row, which the brief explicitly says to avoid).
export default function ProfilePage() {
  const { posts, profile, rotations, achievements, publications } = useAppData();
  const { activeTab, register, scrollTo } = useProfileSections(PROFILE_TABS);

  if (!profile) return null;

  const ownPosts = posts.filter((p) => p.isSelf);

  return (
    <>
      <main className="flex-1 min-w-0">
        <ProfileHeader profile={profile} postCount={ownPosts.length} experience={rotations} isOwn />

        <ProfileTabs active={activeTab} onChange={scrollTo} />

        <div id="profile-section-Posts" ref={register("Posts")} className="pf-profile-section">
          <div className="grid sm:grid-cols-2 gap-4">
            {ownPosts.length === 0 ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div> : ownPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        </div>

        <div id="profile-section-About" ref={register("About")} className="pf-profile-section mb-5"><ProfileAboutSection profile={profile} isOwn /></div>
        <div id="profile-section-Experience" ref={register("Experience")} className="pf-profile-section mb-5"><RotationsCard /></div>
        <div id="profile-section-Education" ref={register("Education")} className="pf-profile-section mb-5 space-y-4">
          <EducationCard />
          <CertificationsCard entries={achievements} />
        </div>
        <div id="profile-section-Research" ref={register("Research")} className="pf-profile-section space-y-4">
          <ResearchEvidenceSection profile={profile} posts={posts} publications={publications} isOwn />
          <ProfessionalContributionsSection />
        </div>
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
