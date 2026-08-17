import { useState } from "react";
import { Search } from "lucide-react";
import ResearchCard from "../components/evidence/ResearchCard.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

const CATEGORIES = ["All", "MSK", "Neuro", "Sports", "Pain", "Women's Health"];

export default function EvidencePage() {
  const { evidence } = useAppData();
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = evidence.filter((e) => {
    const matchesCategory = category === "All" || e.category === category;
    const matchesQuery = !query.trim() || e.title.toLowerCase().includes(query.toLowerCase()) || e.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Evidence</h1>
        <p className="text-sm text-slate-500">Research and systematic reviews, curated for practicing clinicians.</p>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 mb-4">
        <Search size={16} className="text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search research, tags…" className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
      </div>

      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${category === c ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No research matches that search.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">{filtered.map((a) => <ResearchCard key={a.id} article={a} />)}</div>
      )}
    </main>
  );
}
