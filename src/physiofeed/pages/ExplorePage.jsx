import GridPostCard from "../components/feed/GridPostCard.jsx";
import PersonCard from "../components/people/PersonCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

const TRENDING_TOPICS = ["ACL Rehabilitation", "Stroke Rehabilitation", "Shoulder Pain", "Low Back Pain", "Sports Injury", "Dry Needling", "Manual Therapy", "Exercise Prescription"];

export default function ExplorePage() {
  const { posts, people } = useAppData();
  const popularPosts = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 4);
  const suggestedPeople = people.filter((p) => !p.following).slice(0, 2);

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Explore</h1>
        <p className="text-sm text-slate-500">What's trending across the physiotherapy community.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TRENDING_TOPICS.map((t) => (
          <span key={t} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">#{t.replace(/\s/g, "")}</span>
        ))}
      </div>

      <p className="text-sm font-semibold text-slate-900 mb-3">Popular this week</p>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">{popularPosts.map((p) => <GridPostCard key={p.id} post={p} />)}</div>

      <p className="text-sm font-semibold text-slate-900 mb-3">Physiotherapists to follow</p>
      <div className="grid sm:grid-cols-2 gap-3">{suggestedPeople.map((p) => <PersonCard key={p.id} person={p} />)}</div>
    </main>
  );
}
