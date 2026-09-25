import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import * as db from "../data/db.js";

// Visitor view of someone else's profile. Mirrors ProfilePage.jsx's
// single-scroll layout (2026-09-24 redesign): header, then About /
// Current Role / Education / Experience / Certifications / Research /
// Professional Evidence / Activity in order, no tabs. Sections with no
// data are hidden entirely for visitors (per the brief: "either hide
// the empty section completely OR show 'Not added yet'... Only use
// this where useful"), so a stranger sees a clean CV-shaped page
// rather than a wall of empty prompts. Professional contributions now
// come from the real per-user contributions table (2026-09-24 pass --
// see supabase/add_profile_contributions.sql), so this page shows
// them alongside everything else instead of hiding the section.
export default function OtherProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const {
    posts, profile: myProfile, connectionStates, people, followPerson,
    connectWith, acceptConnection, ignoreConnection, cancelConnection, disconnectFrom,
  } = useAppData();
  const [otherProfile, setOtherProfile] = useState(null);
  const [education, setEducation] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [otherPublications, setOtherPublications] = useState([]);
  const [otherContributions, setOtherContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
    (async () => {
      const [p, ed, ac, rt, pu, ct] = await Promise.all([
        db.getProfileById(userId),
        db.getEducationByUser(userId),
        db.getAchievementsByUser(userId),
        db.getRotationsByUser(userId),
        db.getPublicationsByUser(userId),
        db.getContributionsByUser(userId),
      ]);
      if (cancelled) return;
      if (!p) setNotFound(true); else setOtherProfile(p);
      setEducation(ed);
      setAchievements(ac);
      setRotations(rt);
      setOtherPublications(pu);
      setOtherContributions(ct);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, myProfile, navigate]);

  if (loading) return <main className="flex-1 min-w-0 py-14 text-center text-sm text-slate-400">Loading profile…</main>;
  if (notFound || !otherProfile) {
    return (
      <main className="flex-1 min-w-0 py-14 text-center">
        <p className="text-sm text-slate-500">This profile couldn't be found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-medium text-slate-700 hover:underline">Go back</button>
      </main>
    );
  }

  const authorPosts = posts.filter((p) => p.authorId === userId);
  const connectionState = connectionStates[userId] || "none";
  const person = people.find((p) => p.id === userId);

  const hasAbout = !!otherProfile.bio || !!otherProfile.resumeUrl;
  const hasCurrentRole = rotations.length > 0;
  const hasEducation = education.length > 0;
  const hasExperience = rotations.length > 0;
  const hasCertifications = achievements.length > 0;
  const hasResearch =
    (otherProfile.researchInterests || []).length > 0 ||
    otherPublications.length > 0;
  const hasContributions = otherContributions.length > 0;

  return (
    <main className="flex-1 min-w-0 space-y-6 pb-24">
      <ProfileHeader
        profile={otherProfile}
        postCount={authorPosts.length}
        experience={rotations}
        isOwn={false}
        connectionState={connectionState}
        following={person?.following ?? false}
        onFollow={() => followPerson(userId)}
        onConnect={() => connectWith(userId)}
        onAccept={() => acceptConnection(userId)}
        onIgnore={() => ignoreConnection(userId)}
        onCancel={() => cancelConnection(userId)}
        onDisconnect={() => disconnectFrom(userId)}
        onMessage={() => navigate(`/messages?with=${encodeURIComponent(userId)}`)}
      />

      {hasAbout && <ProfileAboutSection profile={otherProfile} isOwn={false} />}

      {hasCurrentRole && <CurrentRoleSection rotations={rotations} isOwn={false} />}

      {hasEducation && <EducationCard entries={education} readOnly />}

      {hasExperience && <RotationsCard entries={rotations} readOnly />}

      {hasCertifications && <CertificationsCard entries={achievements} readOnly />}

      {hasResearch && (
        <ResearchEvidenceSection profile={otherProfile} posts={posts} publications={otherPublications} isOwn={false} />
      )}

      {hasContributions && (
        <ProfessionalContributionsSection entries={otherContributions} isOwn={false} readOnly />
      )}

      <section>
        <h2 className="pf-font-head text-base font-extrabold text-slate-900 mb-3 px-1">Activity</h2>
        {authorPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center text-sm text-slate-400">
            No posts yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {authorPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        )}
      </section>
    </main>
  );
}
