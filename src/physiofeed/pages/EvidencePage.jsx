import { useState } from "react";
import { Search } from "lucide-react";
import ResearchCard from "../components/evidence/ResearchCard.jsx";
import PubMedSearchPanel from "../components/evidence/PubMedSearchPanel.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

const CATEGORIES = ["All", "MSK", "Neuro", "Sports", "Cardio"];
const SORTS = [{ key: "oldest", label: "Oldest first" }, { key: "newest", label: "Newest first" }];
const MODES = [{ key: "curated", label: "Curated" }, { key: "live", label: "Search PubMed" }];

export default function EvidencePage() {
  const { evidence } = useAppData();
  const [mode, setMode] = useState("curated");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("oldest");

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
        <h1 className="text-xl font-bold text-slate-900 mb-1">Evidence</h1>
        <p className="text-sm text-slate-500">Research and systematic reviews, curated for practicing clinicians.</p>
      </div>

      <div className="flex items-center gap-1 mb-4 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
        {MODES.map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${mode === m.key ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "live" ? (
        <PubMedSearchPanel />
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
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${category === c ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex items-center shrink-0 bg-white border border-slate-200 rounded-full p-0.5">
              {SORTS.map((s) => (
                <button key={s.key} onClick={() => setSort(s.key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${sort === s.key ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-4">Showing {filtered.length} of {evidence.length}</p>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">No research matches that search.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">{filtered.map((a) => <ResearchCard key={a.id} article={a} />)}</div>
          )}
        </>
      )}
    </main>
  );
}
