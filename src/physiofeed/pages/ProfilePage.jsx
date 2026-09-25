import { useState } from "react";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ProfileViewSwitch from "../components/profile/ProfileViewSwitch.jsx";
import ProfileAboutSection from "../components/profile/ProfileAboutSection.jsx";
import CurrentRoleSection from "../components/profile/CurrentRoleSection.jsx";
import RotationsCard from "../components/profile/RotationsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import CertificationsCard from "../components/profile/CertificationsCard.jsx";
import ResearchEvidenceSection from "../components/profile/ResearchEvidenceSection.jsx";
import ProfessionalContributionsSection from "../components/profile/ProfessionalContributionsSection.jsx";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

// Own profile. Two views, switched by ProfileViewSwitch.jsx (2026-09-24,
// Aditi: "that post or activity and this professional profile two
// things should be like... when we click on the activity it only shows
// the activity thing, when I click on the professional profile it only
// shows the professional profile"): "Activity" is just the post grid;
// "Professional Profile" is About -> Current Role -> Education ->
// Experience -> Certifications -> Research -> Professional Evidence, all
// in ONE continuous scroll with no further tabs inside it (that single-
// scroll requirement is the earlier same-day brief this still honors --
// only Activity got split back out, not the professional sections
// themselves). Defaults to Professional Profile: the brief's whole point
// was "immediately know who this person is," which a fresh visitor can't
// do from an empty/half-loaded Activity tab.
export default function ProfilePage() {
  const { posts, profile, rotations, achievements, publications, contributions } = useAppData();
  const [view, setView] = useState("Professional Profile");

  if (!profile) return null;

  const ownPosts = posts.filter((p) => p.isSelf);

  return (
    <main className="flex-1 min-w-0 pb-24">
      <ProfileHeader profile={profile} postCount={ownPosts.length} experience={rotations} isOwn />

      <ProfileViewSwitch active={view} onChange={setView} />

      {view === "Professional Profile" ? (
        <div className="space-y-6">
          <ProfileAboutSection profile={profile} isOwn />
          <CurrentRoleSection rotations={rotations} isOwn />
          <EducationCard />
          <RotationsCard />
          <CertificationsCard entries={achievements} />
          <ResearchEvidenceSection profile={profile} posts={posts} publications={publications} isOwn />
          <ProfessionalContributionsSection entries={contributions} isOwn />
        </div>
      ) : ownPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center text-sm text-slate-400">
          You haven't posted anything yet.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {ownPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
        </div>
      )}
    </main>
  );
}
