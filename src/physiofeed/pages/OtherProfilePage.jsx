import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import GridPostCard from "../components/feed/GridPostCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";
import * as db from "../data/db.js";

// Profile page for VIEWING SOMEONE ELSE, reached by clicking a name/avatar
// in the feed or on the People page -- previously there was no route for
// this at all (see the header comments this replaced in ProfileHeader.jsx/
// EducationCard.jsx/AchievementsCard.jsx), so clicking another clinician
// anywhere in PhysioFeed just did nothing.
//
// Kept as its own page rather than folding into ProfilePage.jsx: that page
// reads posts/profile straight out of AppDataContext (always YOUR data),
// while this one has to fetch a specific other user's profile and filter
// the shared posts list by authorId -- different enough data flow that
// combining them would mean a maze of isOwn ternaries through every card.
// Education/Achievements aren't shown here (those stay owner-only for now,
// no public "other user's education" query exists yet) -- About is the
// bio/location/quote already on the profile row, which getProfileById()
// already returns.
export default function OtherProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { posts, profile: myProfile, people, followPerson } = useAppData();
  const [otherProfile, setOtherProfile] = useState(null);
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
      const p = await db.getProfileById(userId);
      if (cancelled) return;
      if (!p) setNotFound(true); else setOtherProfile(p);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, myProfile, navigate]);

  if (loading) return <main className="flex-1 min-w-0 py-14 text-center text-sm text-slate-400">Loading profile…</main>;
  if (notFound || !otherProfile) {
    return (
      <main className="flex-1 min-w-0 py-14 text-center">
        <p className="text-sm text-slate-500">This profile couldn't be found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-medium text-violet-600 hover:underline">Go back</button>
      </main>
    );
  }

  const authorPosts = posts.filter((p) => p.authorId === userId);
  // followPerson() already tracks real follow state for real profiles on
  // the People list -- fall back to false for people not in that list yet
  // (e.g. someone only ever seen via a post, never loaded into People).
  const following = people.find((p) => p.id === userId)?.following ?? false;

  return (
    <main className="flex-1 min-w-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={15} /> Back
      </button>
      <ProfileHeader
        profile={otherProfile}
        postCount={authorPosts.length}
        isOwn={false}
        following={following}
        onFollow={() => followPerson(userId)}
        onMessage={() => navigate(`/messages?with=${encodeURIComponent(userId)}`)}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        {authorPosts.length === 0
          ? <div className="col-span-2 text-center py-14 text-slate-400 text-sm">No posts here yet.</div>
          : authorPosts.map((post) => <GridPostCard key={post.id} post={post} />)}
      </div>
    </main>
  );
}
