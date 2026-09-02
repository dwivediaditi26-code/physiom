import { useState } from "react";
import { Search, Sparkles, ExternalLink } from "lucide-react";
import * as db from "../../data/db.js";
import { GRADIENTS } from "../shared/constants.js";

const LEVEL_TONE = { "Level 1": "bg-emerald-50 text-emerald-700", "Level 2": "bg-amber-50 text-amber-700", "Level 3": "bg-slate-100 text-slate-600" };
const CATEGORY_GRADIENT = { MSK: "blue", Neuro: "teal", Sports: "violet", Cardio: "rose" };

// One live PubMed result. Deliberately NOT ResearchCard.jsx -- a live result
// has no research_articles row (no `id`, can't be bookmarked via
// research_saves' FK-constrained article_id) and isn't reviewed by anyone,
// so it gets its own lighter card that's upfront about that ("PubMed" badge
// instead of a Level badge until drafted) rather than borrowing the curated
// card's trust signals. AI summary is opt-in per card, not automatic on
// search -- pubmed-draft shares one 6/min budget across every signed-in
// user (api/_lib/rateLimit.js), so auto-drafting all ~8 results per search
// would burn most of that on one person's one search.
function LiveResultCard({ result }) {
  const [state, setState] = useState({ drafting: false, draft: null, error: null });

  const getSummary = async () => {
    if (state.drafting || state.draft) return;
    setState({ drafting: true, draft: null, error: null });
    try {
      const draft = await db.draftEvidenceFromPubMed(result);
      setState({ drafting: false, draft, error: null });
    } catch (err) {
      setState({ drafting: false, draft: null, error: err.message });
    }
  };

  const grad = state.draft ? CATEGORY_GRADIENT[state.draft.category] || "slate" : "slate";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`h-2 bg-gradient-to-r ${GRADIENTS[grad]}`} />
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          {state.draft ? (
            <>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${LEVEL_TONE[state.draft.level] || "bg-slate-100 text-slate-600"}`}>{state.draft.level}</span>
              <span className="text-[10px] font-medium text-slate-400">{state.draft.type} · {result.year || "n.d."}</span>
            </>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">PubMed · {result.year || "n.d."}</span>
          )}
        </div>

        <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1.5">{result.title}</h3>
        <p className="text-xs text-slate-400 mb-3">{result.journal}</p>

        {state.draft && (
          <>
            <div className="mb-2.5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Summary</p>
              <p className="text-sm text-slate-600">{state.draft.summary}</p>
            </div>
            <div className="mb-2.5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Conclusion</p>
              <p className="text-sm text-slate-600">{state.draft.conclusion}</p>
            </div>
            {state.draft.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {state.draft.tags.map((t) => <span key={t} className="text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md">#{t}</span>)}
              </div>
            )}
          </>
        )}

        {state.error && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mb-3">Couldn't draft a summary ({state.error}) — the link below still works.</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <a href={result.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700">
            Read on PubMed <ExternalLink size={12} />
          </a>
          {!state.draft && (
            <button onClick={getSummary} disabled={state.drafting}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50">
              <Sparkles size={12} className={state.drafting ? "animate-pulse" : ""} />
              {state.drafting ? "Drafting…" : "AI summary"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PubMedSearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true); setError(null); setResults(null);
    try {
      setResults(await db.searchPubMedForEvidence(query.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <form onSubmit={runSearch} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 mb-2">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Search all of PubMed, e.g. "ACL rehabilitation"'
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
        <button type="submit" disabled={!query.trim() || searching}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40">
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      <p className="text-xs text-slate-400 mb-4">Live results straight from PubMed, not reviewed by Aditi — tap "AI summary" on any result for a plain-language read.</p>

      {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}

      {results && results.length === 0 && !error && (
        <div className="text-center py-16 text-slate-400 text-sm">No PubMed results for that search.</div>
      )}

      {results && results.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {results.map((r) => <LiveResultCard key={r.pmid} result={r} />)}
        </div>
      )}

      {!results && !searching && !error && (
        <div className="text-center py-16 text-slate-400 text-sm">Search millions of real papers on PubMed — not just the curated list below.</div>
      )}
    </div>
  );
}
