import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, X, Briefcase, FileText, BookOpen } from "lucide-react";
import Avatar from "../components/shared/Avatar.jsx";
import * as db from "../data/db.js";

// P8 (2026-09-22): one search box over the whole app. Until now each
// surface searched only itself -- the header bar filtered People, the
// Explore board filtered opportunities, and posts/evidence weren't
// searchable at all, so "shoulder" meant four different lookups in four
// places. db.searchEverything() does the matching (see its comment for why
// it filters the existing getters rather than querying separately); this
// page only renders and routes.
//
// Deliberately built from the same parts as the rest of PhysioFeed --
// PeoplePage's card, the Explore hub's chip row -- rather than a new visual
// language for one screen.
const GROUPS = [
  { key: "people", label: "People", icon: null },
  { key: "opportunities", label: "Opportunities", icon: Briefcase },
  { key: "posts", label: "Posts", icon: FileText },
  { key: "evidence", label: "Evidence", icon: BookOpen },
];

const EMPTY = { people: [], opportunities: [], posts: [], evidence: [], total: 0 };

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [group, setGroup] = useState("all");
  const navigate = useNavigate();

  // Header.jsx hands off here via ?q=..., and so does the app's own mobile
  // header icon -- keep the box in sync when the URL changes underneath us.
  useEffect(() => { setQuery(urlQuery); }, [urlQuery]);

  const trimmed = query.trim();

  // Debounced so a fast typist doesn't fire a search per keystroke, and
  // sequenced so a slow earlier search can't overwrite a newer one's
  // results.
  const runId = useRef(0);
  useEffect(() => {
    if (!trimmed) { setResults(EMPTY); setLoading(false); setError(null); return; }
    const mine = ++runId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await db.searchEverything(trimmed);
        if (runId.current === mine) { setResults(r); setError(null); }
      } catch (e) {
        if (runId.current === mine) { setResults(EMPTY); setError(e?.message || "Search failed -- please try again."); }
      } finally {
        if (runId.current === mine) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [trimmed]);

  const visibleGroups = useMemo(
    () => GROUPS.filter((g) => (group === "all" || group === g.key) && results[g.key]?.length > 0),
    [group, results]
  );

  const open = (row) => navigate(row.to, row.state ? { state: row.state } : undefined);

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Search</h1>
        <p className="text-sm text-slate-500">People, opportunities, posts and evidence — all in one place.</p>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-11 mb-4">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true })}
          onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
          placeholder="Search physios, roles, courses, papers…"
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="p-1 -mr-1 text-slate-400 hover:text-slate-600 shrink-0">
            <X size={15} />
          </button>
        )}
      </div>

      {trimmed && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-0.5">
          {[{ key: "all", label: "All" }, ...GROUPS].map((g) => {
            const count = g.key === "all" ? results.total : results[g.key]?.length || 0;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${group === g.key ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
              >
                {g.label} <span className={group === g.key ? "opacity-80" : "text-slate-400"}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-rose-600 mb-4">{error}</p>}

      {!trimmed ? (
        <p className="text-center py-14 text-slate-400 text-sm">Type to search across PhysioFeed.</p>
      ) : loading && results.total === 0 ? (
        <p className="text-center py-14 text-slate-400 text-sm">Searching…</p>
      ) : results.total === 0 ? (
        <p className="text-center py-14 text-slate-400 text-sm">No results for &ldquo;{trimmed}&rdquo;.</p>
      ) : visibleGroups.length === 0 ? (
        <p className="text-center py-14 text-slate-400 text-sm">No {GROUPS.find((g) => g.key === group)?.label.toLowerCase()} match &ldquo;{trimmed}&rdquo;.</p>
      ) : (
        <div className="space-y-6 pb-6">
          {visibleGroups.map((g) => (
            <section key={g.key}>
              <div className="flex items-center gap-1.5 mb-2.5">
                {g.icon && <g.icon size={13} className="text-slate-400" />}
                <h2 className="pf-font-head text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  {g.label} <span className="text-slate-300">({results[g.key].length})</span>
                </h2>
              </div>
              <div className="space-y-2.5">
                {results[g.key].map((row) => <ResultRow key={`${row.kind}-${row.id}`} row={row} onOpen={() => open(row)} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function ResultRow({ row, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3 hover:border-slate-300"
    >
      <Avatar size={40} grad={row.gradient} initials={row.initials} photoUrl={row.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate">{row.title}</p>
        {row.subtitle && <p className="text-xs text-slate-500 truncate">{row.subtitle}</p>}
      </div>
      {row.meta && <span className="shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">{row.meta}</span>}
    </button>
  );
}
