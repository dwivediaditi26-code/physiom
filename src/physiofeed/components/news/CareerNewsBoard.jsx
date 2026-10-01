import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw, ShieldCheck } from "lucide-react";
import * as db from "../../data/db.js";
import NewsCard from "./NewsCard.jsx";
import NewsBriefingCard from "./NewsBriefingCard.jsx";
import NewsDetailModal from "./NewsDetailModal.jsx";
import JobSearchLinks from "./JobSearchLinks.jsx";

// Explore -> News (2026-09-30 redesign, Aditi's Google-News-style brief).
// One fetch for the whole active list; every tab/search filters that same
// data in memory rather than re-querying per tab (her instruction:
// "filter existing news data; do not create separate hardcoded content
// for each tab"). See supabase/add_career_news.sql for the table this
// reads and api/cron/fetchCareerNews.js for what writes it daily.
const FILTERS = [
  { key: "all", label: "For You" },
  { key: "job_india", label: "India jobs" },
  { key: "job_international", label: "International" },
  { key: "conference", label: "Conferences" },
  { key: "regulation", label: "Rules & Licensing" },
  { key: "research", label: "Research" },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3 animate-pulse">
      <div className="w-20 h-20 rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-20 bg-slate-100 rounded-full" />
        <div className="h-3.5 w-full bg-slate-100 rounded" />
        <div className="h-3.5 w-2/3 bg-slate-100 rounded" />
        <div className="h-2.5 w-1/2 bg-slate-100 rounded mt-3" />
      </div>
    </div>
  );
}

function timeLabel(iso) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 0)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CareerNewsBoard() {
  const [items, setItems] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const listRef = useRef(null);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [rows, saves, updated] = await Promise.all([db.getCareerNews(), db.getSavedNewsIds(), db.getCareerNewsLastUpdated()]);
      setItems(rows);
      setSavedIds(saves);
      setLastUpdated(updated);
      setError(null);
    } catch (e) {
      // Real error (table missing, network) -- keep whatever was already
      // loaded on screen rather than blanking it out (Aditi's brief,
      // section 10: "keep previously loaded valid stories visible").
      setError(e.message || "Couldn't refresh news right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const term = query.trim().toLowerCase();
  const filtered = useMemo(() => items.filter((n) => {
    if (category !== "all" && n.category !== category) return false;
    if (!term) return true;
    return `${n.title} ${n.summary || ""} ${n.source_name} ${n.location || ""}`.toLowerCase().includes(term);
  }), [items, category, term]);

  const toggleSave = async (item) => {
    const wasSaved = savedIds.includes(String(item.id));
    setSavedIds((ids) => (wasSaved ? ids.filter((id) => id !== String(item.id)) : [...ids, String(item.id)]));
    try {
      await db.toggleSaveNews(item.id);
    } catch (e) {
      setSavedIds((ids) => (wasSaved ? [...ids, String(item.id)] : ids.filter((id) => id !== String(item.id))));
      setError(e.message || "Couldn't save that -- sign in to bookmark news.");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-semibold text-slate-400">
          {lastUpdated ? `Updated ${timeLabel(lastUpdated)}` : loading ? "Loading…" : "Not updated yet"}
        </span>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          aria-label="Refresh news list"
          className="ml-auto p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 disabled:opacity-50"
        >
          <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex items-center gap-2 bg-[#EFF6FF] border-2 border-[#DBEAFE] rounded-2xl px-3.5 h-11 mb-3.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search jobs, conferences, rules…"
          className="pf-font-body bg-transparent text-sm outline-none w-full placeholder:text-[#A79CC4] text-[#2B2140]"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-[#A79CC4] text-xs font-bold">✕</button>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setCategory(f.key)}
            className={`pf-font-head shrink-0 px-2.5 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${category === f.key ? "bg-[#2563EB] text-white" : "bg-white border border-slate-200 text-[#8995AA] hover:bg-[#EFF6FF]"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 mb-3.5">
          <p className="text-xs text-rose-700 flex-1">{error}</p>
          <button type="button" onClick={() => load()} className="text-xs font-bold text-rose-700 shrink-0">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <>
          {category === "all" && !term && items.length > 0 && (
            <div className="mb-4">
              <NewsBriefingCard items={items} onReadBriefing={() => listRef.current?.scrollIntoView({ behavior: "smooth" })} />
            </div>
          )}

          <p ref={listRef} className="pf-font-head text-sm font-extrabold text-[#2B2140] mb-3">Latest Updates</p>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              {term || category !== "all" ? (
                <>No news in this category yet.<br />Try another category or check back later.</>
              ) : (
                "Nothing here yet. This section refreshes once a day from official sources."
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <NewsCard key={item.id} item={item} saved={savedIds.includes(String(item.id))} onToggleSave={toggleSave} onOpen={setOpenItem} />
              ))}
            </div>
          )}

          {/* Naukri/Indeed/LinkedIn/NHS Jobs don't allow scraping without a
              partnership (2026-09-30, Aditi: "search link cards for now",
              then "put the all job boards job list here" -- shown on every
              tab, not just the job filters) -- real live-search links,
              visually separate from the verified news cards above so
              they're never mistaken for one. */}
          <JobSearchLinks />

          {items.length > 0 && (
            <div className="flex items-start gap-2 mt-4 px-1">
              <ShieldCheck size={13} className="text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                AI-organized summaries from trusted sources. Always check the original notice for complete and current information.
              </p>
            </div>
          )}
        </>
      )}

      {openItem && (
        <NewsDetailModal
          item={openItem}
          saved={savedIds.includes(String(openItem.id))}
          onToggleSave={toggleSave}
          onClose={() => setOpenItem(null)}
        />
      )}
    </div>
  );
}
