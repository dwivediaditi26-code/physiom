import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ProfileTabs from "../components/profile/ProfileTabs.jsx";
import ProfileAboutSection from "../components/profile/ProfileAboutSection.jsx";
import RotationsCard from "../components/profile/RotationsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import CertificationsCard from "../components/profile/CertificationsCard.jsx";
import ResearchEvidenceSection from "../components/profile/ResearchEvidenceSection.jsx";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import * as db from "../data/db.js";

// Profile page for VIEWING SOMEONE ELSE, reached by clicking a name/avatar
// in the feed or on the People page. Mirrors ProfilePage.jsx's layout --
// see that file for the fuller reasoning on the section list and on real
// tab-switching (each tab renders alone, not one long inline scroll --
// reverted 2026-09-22 once Aditi hit it with a profile that actually had
// posts: "about experience, education, research in a different tab").
// No ProfessionalContributionsSection here -- it's demo/own-profile-only
// data, see that component's own comment. The Exercises tab/strip stays
// deliberately omitted -- `exercises` (ExerciseGrid.jsx) is a single
// shared, app-wide library, not per-user data.
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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("Posts");

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
    setActiveTab("Posts"); // a new profile always opens back on Posts, not wherever the last one was scrolled/tabbed to
    (async () => {
      const [p, ed, ac, rt, pu] = await Promise.all([
        db.getProfileById(userId),
        db.getEducationByUser(userId),
        db.getAchievementsByUser(userId),
        db.getRotationsByUser(userId),
        db.getPublicationsByUser(userId),
      ]);
      if (cancelled) return;
      if (!p) setNotFound(true); else setOtherProfile(p);
      setEducation(ed);
      setAchievements(ac);
      setRotations(rt);
      setOtherPublications(pu);
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
  // P2: the real connections table, not the old follows-row stand-in.
  const connectionState = connectionStates[userId] || "none";
  // Follow is a separate, plain one-way follows-table row (AppDataContext's
  // followPerson()) -- unrelated to the connections state machine above.
  const person = people.find((p) => p.id === userId);

  return (
    <>
      <main className="flex-1 min-w-0">
        {/* No in-page "Back" link (2026-09-22, Aditi circled it in a
            screenshot and said to remove it) -- PhysioMind's own app header
            already has a back arrow right above this page, so the two were
            redundant. `navigate` is still used above/below (own-profile
            redirect, not-found state's "Go back"). */}
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

        <ProfileTabs active={activeTab} onChange={setActiveTab} />

        {activeTab === "Posts" && (
          <div className="grid sm:grid-cols-2 gap-4">
            {authorPosts.length === 0 ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div> : authorPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        )}
        {activeTab === "About" && <ProfileAboutSection profile={otherProfile} isOwn={false} />}
        {activeTab === "Experience" && <RotationsCard entries={rotations} readOnly />}
        {activeTab === "Education" && (
          <div className="space-y-4">
            <EducationCard entries={education} readOnly />
            <CertificationsCard entries={achievements} readOnly />
          </div>
        )}
        {activeTab === "Research" && <ResearchEvidenceSection profile={otherProfile} posts={posts} publications={otherPublications} isOwn={false} />}
      </main>

      <aside className="hidden xl:block w-72 shrink-0 space-y-4">
        <ProfileAboutSection profile={otherProfile} isOwn={false} />
        <RotationsCard entries={rotations} readOnly />
        <EducationCard entries={education} readOnly />
        <CertificationsCard entries={achievements} readOnly />
      </aside>
    </>
  );
}
