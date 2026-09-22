import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ProfileTabs, { PROFILE_TABS } from "../components/profile/ProfileTabs.jsx";
import useProfileSections from "../components/profile/useProfileSections.js";
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
// see that file for the shared components both pages now use.
//
// Sticky ProfileTabs (2026-09-22 "LinkedIn for physiotherapists" redesign,
// Aditi's brief): Posts | About | Experience | Education | Research,
// replacing the earlier 6-tab bar that had standalone Clinical and
// Evidence tabs (see ProfileTabs.jsx/ProfilePage.jsx for the fuller
// reasoning). No ProfessionalContributionsSection here -- it's demo/
// own-profile-only data, see that component's own comment. The Exercises
// tab/strip stays deliberately omitted -- `exercises` (ExerciseGrid.jsx)
// is a single shared, app-wide library, not per-user data.
//
// All sections render inline on one scrollable page (2026-09-22, Aditi:
// "thiis showing page wise .. i want inline wise" -- see ProfilePage.jsx
// and useProfileSections.js for the fuller reasoning).
//
// Posts is just the posts grid, nothing else (2026-09-22, Aditi: "make the
// post setion only for all the post" -- see ProfilePage.jsx's own comment,
// same reasoning shared here).
export default function OtherProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { posts, profile: myProfile, people, followPerson } = useAppData();
  const [otherProfile, setOtherProfile] = useState(null);
  const [education, setEducation] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [otherPublications, setOtherPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { activeTab, register, scrollTo } = useProfileSections(PROFILE_TABS);

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
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-medium text-[#7C3AED] hover:underline">Go back</button>
      </main>
    );
  }

  const authorPosts = posts.filter((p) => p.authorId === userId);
  const following = people.find((p) => p.id === userId)?.following ?? false;

  return (
    <>
      <main className="flex-1 min-w-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft size={15} /> Back
        </button>
        <ProfileHeader
          profile={otherProfile}
          postCount={authorPosts.length}
          experience={rotations}
          isOwn={false}
          following={following}
          onFollow={() => followPerson(userId)}
          onMessage={() => navigate(`/messages?with=${encodeURIComponent(userId)}`)}
        />

        <ProfileTabs active={activeTab} onChange={scrollTo} />

        <div id="profile-section-Posts" ref={register("Posts")} className="pf-profile-section">
          <div className="grid sm:grid-cols-2 gap-4">
            {authorPosts.length === 0 ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div> : authorPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
          </div>
        </div>

        <div id="profile-section-About" ref={register("About")} className="pf-profile-section mb-5"><ProfileAboutSection profile={otherProfile} isOwn={false} /></div>
        <div id="profile-section-Experience" ref={register("Experience")} className="pf-profile-section mb-5"><RotationsCard entries={rotations} readOnly /></div>
        <div id="profile-section-Education" ref={register("Education")} className="pf-profile-section mb-5 space-y-4">
          <EducationCard entries={education} readOnly />
          <CertificationsCard entries={achievements} readOnly />
        </div>
        <div id="profile-section-Research" ref={register("Research")} className="pf-profile-section">
          <ResearchEvidenceSection profile={otherProfile} posts={posts} publications={otherPublications} isOwn={false} />
        </div>
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
