import { useEffect, useState } from "react";
import * as db from "../../data/db.js";
import NewsCard from "./NewsCard.jsx";

// Explore -> News tab (beside Opportunities, 2026-09-30). Reads
// career_news, written daily by api/cron/fetchCareerNews.js from outside
// RSS sources -- see supabase/add_career_news.sql for why this is a
// separate table from the community-posted `opportunities` board.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "job_india", label: "India jobs" },
  { key: "job_international", label: "International" },
  { key: "conference", label: "Conferences" },
  { key: "regulation", label: "Regulations" },
  { key: "research", label: "Research" },
];

export default function CareerNewsBoard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    db.getCareerNews({ category, search: query })
      .then((rows) => { if (!cancelled) { setItems(rows); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e.message || "Couldn't load news."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category, query]);

  return (
    <div>
      <div className="flex items-center gap-2 bg-[#F7F5FF] border-2 border-[#EFE9FF] rounded-2xl px-3.5 h-11 mb-3.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search news, jobs, conferences…"
          className="pf-font-body bg-transparent text-sm outline-none w-full placeholder:text-[#A79CC4] text-[#2B2140]"
        />
      </div>

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setCategory(f.key)}
            className={`pf-font-head shrink-0 px-2.5 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${category === f.key ? "bg-[#F0E8FF] text-[#6D28D9]" : "bg-white border border-slate-200 text-[#8995AA] hover:bg-[#F7F5FF]"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Nothing here yet. This section refreshes once a day from official sources.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => <NewsCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
