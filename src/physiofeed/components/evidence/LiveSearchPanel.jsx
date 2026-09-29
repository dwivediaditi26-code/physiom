import { useEffect, useState } from "react";
import { Search, ExternalLink } from "lucide-react";
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
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [showingDefault, setShowingDefault] = useState(true);

  // Seeds real results on mount and whenever the source changes, so the tab
  // never opens empty -- see the SOURCES comment above.
  useEffect(() => {
    let cancelled = false;
    setSearching(true); setError(null); setResults(null); setShowingDefault(true);
    source.search(source.defaultQuery)
      .then((r) => { if (!cancelled) setResults(r); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [source]);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true); setError(null); setResults(null); setShowingDefault(false);
    try {
      setResults(await source.search(query.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        {SOURCES.map((s) => (
          <button key={s.key} onClick={() => setSource(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${source.key === s.key ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={runSearch} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 mb-2">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search all of ${source.label}, e.g. "ACL rehabilitation"`}
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
        <button type="submit" disabled={!query.trim() || searching}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40">
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      <p className="text-xs text-slate-400 mb-4">
        {showingDefault
          ? `Recent ${source.label} results to start with -- search above for something specific.`
          : `Live results straight from ${source.label}, not reviewed by Aditi.`} Summary and Conclusion come straight from each article's own abstract.
      </p>

      {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}

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
