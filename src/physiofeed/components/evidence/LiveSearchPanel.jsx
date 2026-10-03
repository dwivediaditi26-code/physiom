import { useEffect, useRef, useState } from "react";
import { Search, ExternalLink, X } from "lucide-react";
import * as db from "../../data/db.js";

// Two free, public, no-key sources -- see api/pubmedSearch.js and
// api/europepmcSearch.js for why these two specifically (both verified
// against real API docs; PEDro and Cochrane's own API were checked too
// and don't offer this kind of open access -- Cochrane's real API needs
// a Wiley Text-and-Data-Mining license, PEDro has no public API at all).
// Only one source searched at a time -- switching clears results rather
// than merging two differently-shaped result sets into one list.
//
// `defaultQuery` seeds the panel with real results the moment it opens
// (2026-09-28, Aditi: "it should show some results without even
// searching") instead of an empty "search millions of papers" placeholder.
const SOURCES = [
  { key: "pubmed", label: "PubMed", search: db.searchPubMedForEvidence, defaultQuery: "physiotherapy rehabilitation" },
  { key: "europepmc", label: "Europe PMC", search: db.searchEuropePMCForEvidence, defaultQuery: "physiotherapy rehabilitation" },
];

// Each topic card runs a real search with its own query -- not decorative.
const TOPICS = [
  { label: "Knee OA", query: "knee osteoarthritis exercise therapy" },
  { label: "Low back pain", query: "low back pain physiotherapy" },
  { label: "Stroke rehabilitation", query: "stroke rehabilitation physiotherapy" },
  { label: "Shoulder pain", query: "shoulder pain physiotherapy" },
  { label: "ACL rehabilitation", query: "anterior cruciate ligament reconstruction rehabilitation" },
  { label: "Neck pain", query: "neck pain physiotherapy" },
];

// PEDro and Cochrane have no open search API (see the SOURCES comment), so
// these open their own site's search in a new tab. Labelled as external so
// nobody mistakes them for results inside PhysioMind.
const EXTERNAL_SOURCES = [
  { key: "pedro", label: "PEDro", url: (q) => `https://search.pedro.org.au/search-results?abstract_with_title=${encodeURIComponent(q)}` },
  { key: "cochrane", label: "Cochrane", url: (q) => `https://www.cochranelibrary.com/search?q=${encodeURIComponent(q)}&searchBy=1` },
];

const RECENT_KEY = "pm_evidence_recent_searches";
function loadRecent() {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(v) ? v.slice(0, 5) : []; } catch { return []; }
}
function saveRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}

// Where a result's link actually points decides its label, regardless of
// which source tab found it -- Europe PMC results are frequently also
// MEDLINE-indexed (pmid present) and should say "PubMed" since that's
// where the link goes, not "Europe PMC".
function sourceLabel(result) {
  if (result.pmid) return "PubMed";
  if (result.pmcid) return "PMC";
  if (result.doi) return "the publisher";
  return "Europe PMC";
}

// One live result. Deliberately not ResearchCard.jsx -- a live result has
// no research_articles row to bookmark and isn't reviewed by anyone, so it
// gets its own lighter card (a plain source badge instead of a Level badge)
// rather than borrowing the curated card's trust signals.
//
// Summary/Conclusion are pulled straight from the article's own abstract
// server-side (api/_lib/abstractSplit.js) -- no AI call, always present,
// no "AI summary" button to tap anymore (2026-09-28, Aditi: "remove the AI
// initiation in the evidences ... it will cost too much" -- the old button
// spent real Groq tokens per result, per search, for every clinician using
// this tab).
function LiveResultCard({ result }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{sourceLabel(result)} · {result.year || "n.d."}</span>
        </div>

        <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1.5">{result.title}</h3>
        <p className="text-xs text-slate-400 mb-3">{result.journal}</p>

        <div className="mb-2.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Summary</p>
          <p className="text-sm text-slate-600">{result.summary || "No abstract available for this article -- read the full text for details."}</p>
        </div>
        {result.conclusion && (
          <div className="mb-2.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Conclusion</p>
            <p className="text-sm text-slate-600">{result.conclusion}</p>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100">
          <a href={result.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700">
            Read on {sourceLabel(result)} <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LiveSearchPanel() {
  const [source, setSource] = useState(SOURCES[0]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [showingDefault, setShowingDefault] = useState(true);
  const [recent, setRecent] = useState(loadRecent);
  const requestId = useRef(0);

  // One place that runs a search, so a slower earlier request can never
  // overwrite the results of a newer one.
  const run = async (src, q, isDefault) => {
    const id = ++requestId.current;
    setSearching(true); setError(null); setResults(null); setShowingDefault(isDefault); setActiveQuery(q);
    try {
      const r = await src.search(q);
      if (id === requestId.current) setResults(r);
    } catch (err) {
      if (id === requestId.current) setError(err.message || "Search failed.");
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  };

  // Seeds real results on mount and whenever the source changes, so the tab
  // never opens empty -- see the SOURCES comment above.
  useEffect(() => { run(source, source.defaultQuery, true); }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (q) => {
    const text = q.trim();
    if (!text) return;
    setQuery(text);
    const next = [text, ...recent.filter((r) => r.toLowerCase() !== text.toLowerCase())].slice(0, 5);
    setRecent(next); saveRecent(next);
    run(source, text, false);
  };

  const externalQuery = query.trim() || activeQuery || source.defaultQuery;

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); submit(query); }}
        className="flex items-center gap-2 bg-white border-2 border-[#E4DDF7] focus-within:border-violet-400 rounded-2xl px-4 h-12 mb-3 shadow-sm">
        <Search size={18} className="text-violet-400 shrink-0" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} enterKeyHint="search"
          placeholder="Search a condition, treatment or clinical question"
          aria-label="Search research"
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
        <button type="submit" disabled={!query.trim() || searching}
          className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-xl bg-violet-600 text-white disabled:opacity-40">
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {SOURCES.map((s) => (
          <button key={s.key} onClick={() => setSource(s)} aria-pressed={source.key === s.key}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${source.key === s.key ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {s.label}
          </button>
        ))}
        <span className="text-[11px] text-slate-400 ml-1">Also search (opens outside the app):</span>
        {EXTERNAL_SOURCES.map((s) => (
          <a key={s.key} href={s.url(externalQuery)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
            {s.label} <ExternalLink size={11} />
          </a>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-[11px] text-slate-400">Recent:</span>
          {recent.map((r) => (
            <button key={r} onClick={() => submit(r)} className="px-2.5 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 hover:bg-slate-200">{r}</button>
          ))}
        </div>
      )}

      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Explore by clinical topic</p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
        {TOPICS.map((t) => (
          <button key={t.label} onClick={() => submit(t.query)}
            className="shrink-0 px-4 py-2.5 rounded-2xl bg-violet-50 border border-violet-100 text-sm font-semibold text-violet-700 hover:bg-violet-100">
            {t.label}
          </button>
        ))}
      </div>

      <h2 className="pf-font-head text-base font-extrabold text-[#2B2140] mb-1">
        {showingDefault ? "Recent & relevant evidence" : `Results for “${activeQuery}”`}
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        {showingDefault
          ? `Recent ${source.label} results to start with -- search above for something specific.`
          : `Live results straight from ${source.label}${results ? ` · showing ${results.length}` : ""}, not reviewed by Aditi.`} Summary and Conclusion come straight from each article's own abstract.
      </p>

      {error && (
        <div className="text-sm text-rose-600 mb-4 flex items-center gap-3">
          <span>{error}</span>
          <button onClick={() => run(source, activeQuery, showingDefault)} className="text-xs font-semibold underline">Try again</button>
        </div>
      )}

      {searching && !results && <div className="text-center py-16 text-slate-400 text-sm">Searching {source.label}…</div>}

      {results && results.length === 0 && !error && (
        <div className="text-center py-16 text-slate-400 text-sm">No {source.label} results for that search.</div>
      )}

      {results && results.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {results.map((r) => <LiveResultCard key={r.pmid || r.id} result={r} />)}
        </div>
      )}
    </div>
  );
}
