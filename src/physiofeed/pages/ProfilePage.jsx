import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ProfileAboutSection from "../components/profile/ProfileAboutSection.jsx";
import CurrentRoleSection from "../components/profile/CurrentRoleSection.jsx";
import RotationsCard from "../components/profile/RotationsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import CertificationsCard from "../components/profile/CertificationsCard.jsx";
import ResearchEvidenceSection from "../components/profile/ResearchEvidenceSection.jsx";
import ProfessionalContributionsSection from "../components/profile/ProfessionalContributionsSection.jsx";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

// Own profile. One continuous vertical scroll (2026-09-24 redesign,
// Aditi's "clean professional clinician profile" brief): header, then
// About / Current Role / Education / Experience / Certifications /
// Research / Professional Evidence / Activity, in that order. Replaces
// the Posts | About | Experience | Education | Research tab strip
// (ProfileTabs.jsx, deleted this pass) that clipped labels at phone
// width and hid whole sections behind taps -- the brief calls out
// exactly that fragmentation as the thing to fix. The profile header
// itself is unchanged ("the profile photo area is perfect").
//
// Sections stay their own cards (ProfileAboutSection.jsx et al.) rather
// than getting inlined here -- same components as before, just stacked
// once now instead of swapped through tabs, and the desktop <aside>
// duplicate column is gone since main already renders every section.
export default function ProfilePage() {
  const { posts, profile, rotations, achievements, publications, contributions } = useAppData();

  if (!profile) return null;

  const ownPosts = posts.filter((p) => p.isSelf);

  return (
    <main className="flex-1 min-w-0 space-y-6 pb-24">
      <ProfileHeader profile={profile} postCount={ownPosts.length} experience={rotations} isOwn />

      <ProfileAboutSection profile={profile} isOwn />

      <CurrentRoleSection rotations={rotations} isOwn />

      <EducationCard />

      <RotationsCard />

      <CertificationsCard entries={achievements} />

      <ResearchEvidenceSection profile={profile} posts={posts} publications={publications} isOwn />

      <ProfessionalContributionsSection entries={contributions} isOwn />

      <section>
        <h2 className="pf-font-head text-base font-extrabold text-slate-900 mb-3 px-1">Activity</h2>
        {ownPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center text-sm text-slate-400">
            You haven't posted anything yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {ownPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        )}
      </section>
    </main>
  );
}
