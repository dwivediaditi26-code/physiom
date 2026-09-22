import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import ResearchCard from "../components/evidence/ResearchCard.jsx";
import LiveSearchPanel from "../components/evidence/LiveSearchPanel.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

const CATEGORIES = ["All", "MSK", "Neuro", "Sports", "Cardio"];
const SORTS = [{ key: "oldest", label: "Oldest first" }, { key: "newest", label: "Newest first" }];
const MODES = [{ key: "curated", label: "Curated" }, { key: "live", label: "Search Live" }];

export default function EvidencePage() {
  const { evidence } = useAppData();
  const [mode, setMode] = useState("curated");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("oldest");
  // Arriving here from a Home-screen article preview (PhysioFeedEntry.jsx's
  // JumpBridge) carries which article was tapped in router state, so this
  // opens straight onto its actual summary/conclusion instead of just
  // dropping the clinician on the Evidence tab to go find it themselves
  // (2026-09-17, Aditi: "opening the article means... open the article
  // about the conclusion and result").
  const highlightId = useLocation().state?.articleId;
  const cardRefs = useRef({});
  useEffect(() => {
    if (!highlightId) return;
    cardRefs.current[highlightId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, evidence]);

  const filtered = evidence
    .filter((e) => {
      const matchesCategory = category === "All" || e.category === category;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || e.title.toLowerCase().includes(q) || e.journal.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    })
    .sort((a, b) => (sort === "oldest" ? a.year - b.year : b.year - a.year));

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="pf-font-head text-xl font-extrabold text-[#2B2140] mb-1">Evidence</h1>
        <p className="pf-font-body text-sm text-[#8A7FA3]">Research and systematic reviews, curated for practicing clinicians.</p>
      </div>

      <div className="flex items-center gap-1 mb-4 bg-white border-2 border-[#F1EEFB] rounded-2xl p-1.5 shadow-sm w-fit">
        {MODES.map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`pf-font-head px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${mode === m.key ? "bg-[#FFB020] text-[#3A2A00]" : "text-[#8A7FA3] hover:bg-[#F7F5FF]"}`}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "live" ? (
        <LiveSearchPanel />
      ) : (
        <>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 mb-4">
            <Search size={16} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search research, tags…" className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
          </div>

          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`pf-font-head shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${category === c ? "bg-[#FFB020] text-[#3A2A00]" : "bg-white border-2 border-[#F1EEFB] text-[#8A7FA3] hover:bg-[#F7F5FF]"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex items-center shrink-0 bg-white border-2 border-[#F1EEFB] rounded-full p-0.5">
              {SORTS.map((s) => (
                <button key={s.key} onClick={() => setSort(s.key)}
                  className={`pf-font-head px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${sort === s.key ? "bg-[#FFB020] text-[#3A2A00]" : "text-[#8A7FA3] hover:bg-[#F7F5FF]"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <p className="pf-font-body text-xs text-[#A79CC4] mb-4">Showing {filtered.length} of {evidence.length}</p>

          {filtered.length === 0 ? (
            <div className="pf-font-body text-center py-16 text-[#A79CC4] text-sm">No research matches that search.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((a) => (
                <ResearchCard key={a.id} article={a} highlighted={a.id === highlightId} ref={(el) => { cardRefs.current[a.id] = el; }} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
