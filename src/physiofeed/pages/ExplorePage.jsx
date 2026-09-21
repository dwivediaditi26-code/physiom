import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { INITIAL_OPPORTUNITIES, OPPORTUNITY_CATEGORIES } from "../data/opportunitiesMock.js";
import OpportunityCard from "../components/opportunities/OpportunityCard.jsx";
import OpportunityDetail from "../components/opportunities/OpportunityDetail.jsx";
import WorkshopDetail from "../components/opportunities/WorkshopDetail.jsx";
import OpportunityChat from "../components/opportunities/OpportunityChat.jsx";
import PostOpportunityModal from "../components/opportunities/PostOpportunityModal.jsx";

// Explore -> Opportunities board (2026-09-21, Aditi's brief + mockups: jobs,
// internships, workshops and research collaborations for physiotherapists).
// Replaces the previous "trending topics / popular posts" Explore page --
// this is what she asked to "put in Explore". Demo content only, same as
// the rest of PhysioFeed's seed data (see AppShell.jsx's "Demo content"
// banner) -- there's no opportunities table in Supabase yet, so postings
// and applications here are local state and don't survive a reload.
export default function ExplorePage() {
  const [opportunities, setOpportunities] = useState(INITIAL_OPPORTUNITIES);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null); // the opportunity object, or null = hub
  const [chatFor, setChatFor] = useState(null); // opportunity being messaged about, or null
  const [postOpen, setPostOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (category !== "all" && o.type !== category) return false;
      if (!q) return true;
      return o.title.toLowerCase().includes(q) || o.org.toLowerCase().includes(q) || (o.location || "").toLowerCase().includes(q) || o.tags?.some((t) => t.toLowerCase().includes(q));
    });
  }, [opportunities, category, query]);

  const openOpportunity = (opp) => { setChatFor(null); setActive(opp); };
  const closeDetail = () => setActive(null);
  const openChat = (opp) => setChatFor(opp);
  const closeChat = () => setChatFor(null);

  const publish = (opp) => {
    setOpportunities((prev) => [opp, ...prev]);
    setPostOpen(false);
  };

  if (chatFor) {
    return (
      <main className="flex-1 min-w-0">
        <OpportunityChat opp={chatFor} onBack={closeChat} />
      </main>
    );
  }

  if (active) {
    return (
      <main className="flex-1 min-w-0">
        {active.type === "workshop" ? (
          <WorkshopDetail opp={active} onBack={closeDetail} />
        ) : (
          <OpportunityDetail opp={active} onBack={closeDetail} onMessage={openChat} />
        )}
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 relative">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Explore</h1>
        <p className="text-sm text-slate-500">Jobs, internships, workshops and collaborations for physiotherapists.</p>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 h-11 mb-3.5">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search opportunities, clinics, cities…"
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-0.5">
        {OPPORTUNITY_CATEGORIES.map((c) => {
          const count = c.key === "all" ? opportunities.length : opportunities.filter((o) => o.type === c.key).length;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${category === c.key ? "bg-violet-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
            >
              {c.label} <span className={category === c.key ? "opacity-80" : "text-slate-400"}>{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-slate-400 text-sm">No opportunities match "{query}".</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 pb-6">
          {filtered.map((o) => <OpportunityCard key={o.id} opp={o} onOpen={openOpportunity} />)}
        </div>
      )}

      {!postOpen && (
      <button
        type="button"
        onClick={() => setPostOpen(true)}
        className="fixed sm:absolute bottom-24 lg:bottom-6 right-5 sm:right-0 z-30 flex items-center gap-1.5 text-sm font-bold text-white pl-4 pr-5 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg active:scale-[0.97] transition"
      >
        <Plus size={17} /> Post
      </button>
      )}

      {postOpen && <PostOpportunityModal onClose={() => setPostOpen(false)} onPublish={publish} />}
    </main>
  );
}
