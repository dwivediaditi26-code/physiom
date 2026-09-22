import CommunityCard from "../components/communities/CommunityCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

export default function CommunitiesPage() {
  const { communities } = useAppData();
  const joined = communities.filter((c) => c.joined);
  const discover = communities.filter((c) => !c.joined);

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="pf-font-head text-xl font-extrabold text-[#2B2140] mb-1">Communities</h1>
        <p className="pf-font-body text-sm text-[#8A7FA3]">Topic-based groups for case discussion, resources, and mentorship.</p>
      </div>

      {joined.length > 0 && (
        <div className="mb-6">
          <p className="pf-font-head text-sm font-bold text-[#2B2140] mb-3">Your communities</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{joined.map((c) => <CommunityCard key={c.id} community={c} />)}</div>
        </div>
      )}
      <div>
        <p className="pf-font-head text-sm font-bold text-[#2B2140] mb-3">Discover</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{discover.map((c) => <CommunityCard key={c.id} community={c} />)}</div>
      </div>
    </main>
  );
}
