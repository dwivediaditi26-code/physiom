import { useEffect, useRef, useState } from "react";
import { Search, ExternalLink, X, SlidersHorizontal, ChevronDown, ArrowUpDown, FileText, Bone, Brain, Activity, Dumbbell, Footprints, PersonStanding } from "lucide-react";
import * as db from "../../data/db.js";

// Live sources are PubMed and Europe PMC -- the two free public APIs that
// allow this (verified earlier: Cochrane's API needs a Wiley TDM licence and
// PEDro has no public API, so those two only open their own site's search
// outside the app). "All sources" runs both and removes duplicates.
const SOURCES = [
  { key: "all", label: "All sources" },
  { key: "pubmed", label: "PubMed" },
  { key: "europepmc", label: "Europe PMC" },
];
const DEFAULT_QUERY = "physiotherapy rehabilitation";

// Each topic card runs a real search with its own query.
const TOPICS = [
  { label: "Knee OA", query: "knee osteoarthritis exercise therapy", Icon: Bone, tone: "bg-violet-50 border-violet-100 text-violet-700" },
  { label: "Low back pain", query: "low back pain physiotherapy", Icon: Activity, tone: "bg-sky-50 border-sky-100 text-sky-700" },
  { label: "Stroke rehab", query: "stroke rehabilitation physiotherapy", Icon: Brain, tone: "bg-pink-50 border-pink-100 text-pink-700" },
  { label: "Shoulder pain", query: "shoulder pain physiotherapy", Icon: Dumbbell, tone: "bg-emerald-50 border-emerald-100 text-emerald-700" },
  { label: "ACL rehab", query: "anterior cruciate ligament reconstruction rehabilitation", Icon: Footprints, tone: "bg-amber-50 border-amber-100 text-amber-700" },
  { label: "Neck pain", query: "neck pain physiotherapy", Icon: PersonStanding, tone: "bg-teal-50 border-teal-100 text-teal-700" },
];

const EXTERNAL_SOURCES = [
  { key: "pedro", label: "PEDro", url: (q) => `https://search.pedro.org.au/search-results?abstract_with_title=${encodeURIComponent(q)}` },
  { key: "cochrane", label: "Cochrane", url: (q) => `https://www.cochranelibrary.com/search?q=${encodeURIComponent(q)}&searchBy=1` },
];

const STUDY_TYPES = [
  { key: "", label: "All study types" },
  { key: "rct", label: "Randomized trial" },
  { key: "systematic", label: "Systematic review" },
  { key: "meta", label: "Meta-analysis" },
  { key: "guideline", label: "Clinical guideline" },
  { key: "observational", label: "Observational study" },
];
const YEARS = [
  { key: "any", label: "Any year", span: null },
  { key: "5", label: "Last 5 years", span: 5 },
  { key: "10", label: "Last 10 years", span: 10 },
];
const SORTS = [
  { key: "relevance", label: "Most relevant" },
  { key: "newest", label: "Newest" },
];

// Badge text comes from the publication-type tags PubMed / Europe PMC attach
// to each record themselves -- not guessed from the title.
const TYPE_BADGES = [
  { match: ["Meta-Analysis"], label: "Meta-analysis", tone: "bg-indigo-50 text-indigo-700" },
  { match: ["Systematic Review"], label: "Systematic review", tone: "bg-violet-50 text-violet-700" },
  { match: ["Practice Guideline", "Guideline"], label: "Clinical guideline", tone: "bg-emerald-50 text-emerald-700" },
  { match: ["Randomized Controlled Trial"], label: "Randomized trial", tone: "bg-sky-50 text-sky-700" },
  { match: ["Observational Study"], label: "Observational study", tone: "bg-amber-50 text-amber-700" },
  { match: ["Review"], label: "Review", tone: "bg-slate-100 text-slate-600" },
];
function typeBadge(types) {
  const list = Array.isArray(types) ? types : [];
  return TYPE_BADGES.find((b) => b.match.some((m) => list.includes(m))) || null;
}

const RECENT_KEY = "pm_evidence_recent_searches";
function loadRecent() {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(v) ? v.slice(0, 5) : []; } catch { return []; }
}
function saveRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}

function sourceLabel(result) {
  if (result.pmid) return "PubMed";
  if (result.pmcid) return "PMC";
  if (result.doi) return "the publisher";
  return "Europe PMC";
}

const clamp2 = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };

// A live result is not a curated article (no reviewer, nothing to bookmark
// yet), so it keeps its own card. Summary and the expandable Abstract come
// straight from the article's own abstract -- no AI.
function LiveResultCard({ result }) {
  const [open, setOpen] = useState(false);
  const badge = typeBadge(result.types);
  const meta = [result.authors, result.year].filter(Boolean).join(" · ");
  return (
    <div className="bg-white rounded-2xl border border-[#ECE7F8] shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        {badge && <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full ${badge.tone}`}>{badge.label}</span>}
        <span className="text-xs text-slate-400">{result.year || "n.d."}</span>
      </div>
      <h3 className="font-extrabold text-[#2B2140] text-[15px] leading-snug mb-1">{result.title}</h3>
      <p className="text-xs text-slate-400 mb-2">{result.journal}</p>
      <p className="text-sm text-slate-600" style={open ? undefined : clamp2}>
        {open
          ? (result.abstract || result.summary || "No abstract available for this record — read the full text for details.")
          : (result.summary || "No abstract available for this record — read the full text for details.")}
      </p>
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
        <div className="min-w-0">
          <p className="text-xs font-bold text-violet-700">{sourceLabel(result)}</p>
          {meta && <p className="text-[11px] text-slate-400 truncate">{meta}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100">
            <FileText size={14} /> {open ? "Hide abstract" : "Abstract"}
          </button>
          <a href={result.url} target="_blank" rel="noopener noreferrer" aria-label={`Open on ${sourceLabel(result)}`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100">
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}

function Select({ icon, value, onChange, options, label }) {
  return (
    <label className="relative flex-1 min-w-0">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        className="appearance-none w-full h-11 pl-3 pr-8 rounded-xl border border-[#E4DDF7] bg-white text-sm font-semibold text-[#2B2140] outline-none focus:border-violet-400">
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      {icon}
    </label>
  );
}

// Runs one or both live sources for a page and merges them. "All sources"
// keeps PubMed's order first and drops Europe PMC copies of the same paper
// (same PMID or DOI).
async function fetchPage(sourceKey, params) {
  if (sourceKey !== "all") return { ...(await db.searchEvidenceLive(sourceKey, params)), notice: null };
  const [pm, ep] = await Promise.allSettled([db.searchEvidenceLive("pubmed", params), db.searchEvidenceLive("europepmc", params)]);
  if (pm.status === "rejected" && ep.status === "rejected") throw pm.reason;
  const first = pm.status === "fulfilled" ? pm.value.results : [];
  const second = ep.status === "fulfilled" ? ep.value.results : [];
  const pmids = new Set(first.map((r) => r.pmid).filter(Boolean));
  const dois = new Set(first.map((r) => (r.doi || "").toLowerCase()).filter(Boolean));
  const extra = second.filter((r) => !(r.pmid && pmids.has(r.pmid)) && !(r.doi && dois.has(r.doi.toLowerCase())));
  const failed = pm.status === "rejected" ? "PubMed" : ep.status === "rejected" ? "Europe PMC" : null;
  return { results: [...first, ...extra], total: null, notice: failed ? `${failed} didn't respond, so these results come from the other source only.` : null };
}

export default function LiveSearchPanel() {
  const [sourceKey, setSourceKey] = useState("all");
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [studyType, setStudyType] = useState("");
  const [yearKey, setYearKey] = useState("any");
  const [sort, setSort] = useState("relevance");
  const [showFilters, setShowFilters] = useState(true);
  const [results, setResults] = useState(null);
  const [total, setTotal] = useState(null);
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [showingDefault, setShowingDefault] = useState(true);
  const [recent, setRecent] = useState(loadRecent);
  const requestId = useRef(0);
  const activeRef = useRef({ q: DEFAULT_QUERY, isDefault: true });

  const paramsFor = (q, pageNum) => {
    const span = YEARS.find((y) => y.key === yearKey)?.span;
    return { query: q, studyType: studyType || undefined, yearFrom: span ? new Date().getFullYear() - span : undefined, sort, page: pageNum };
  };

  // One place runs a search, so a slower earlier request can never overwrite
  // a newer one. Any filter / source / sort change re-runs the current query.
  const run = async (q, isDefault) => {
    const id = ++requestId.current;
    activeRef.current = { q, isDefault };
    setSearching(true); setError(null); setResults(null); setTotal(null); setPage(0); setNotice(null);
    setShowingDefault(isDefault); setActiveQuery(q);
    try {
      const r = await fetchPage(sourceKey, paramsFor(q, 0));
      if (id !== requestId.current) return;
      setResults(r.results); setTotal(r.total); setNotice(r.notice);
    } catch (err) {
      if (id === requestId.current) setError(err.message || "Search failed.");
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  };

  useEffect(() => { run(activeRef.current.q, activeRef.current.isDefault); }, [sourceKey, studyType, yearKey, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const r = await fetchPage(sourceKey, paramsFor(activeRef.current.q, next));
      if (id !== requestId.current) return;
      setResults((prev) => {
        const seen = new Set(prev.map((x) => x.pmid || x.id));
        return [...prev, ...r.results.filter((x) => !seen.has(x.pmid || x.id))];
      });
      setPage(next);
      if (r.notice) setNotice(r.notice);
    } catch (err) {
      setError(err.message || "Couldn't load more.");
    } finally {
      setLoadingMore(false);
    }
  };

  const submit = (q) => {
    const text = q.trim();
    if (!text) return;
    setQuery(text);
    const next = [text, ...recent.filter((r) => r.toLowerCase() !== text.toLowerCase())].slice(0, 5);
    setRecent(next); saveRecent(next);
    run(text, false);
  };

  const filtersActive = !!studyType || yearKey !== "any";
  const clearFilters = () => { setStudyType(""); setYearKey("any"); };
  const externalQuery = query.trim() || activeQuery || DEFAULT_QUERY;
  const guidelinesOn = studyType === "guideline";
  // More pages exist when the source reports a total we haven't reached, or
  // (All sources has no single total) the last page came back full.
  const hasMore = results && results.length > 0 && (total != null ? results.length < total : results.length >= (page + 1) * 10);

  const sourceName = sourceKey === "all" ? "PubMed and Europe PMC" : SOURCES.find((s) => s.key === sourceKey).label;

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); submit(query); }}
        className="flex items-center gap-2 bg-white border-2 border-[#E4DDF7] focus-within:border-violet-400 rounded-2xl pl-4 pr-2 h-14 mb-3 shadow-sm">
        <button type="submit" aria-label="Search" disabled={!query.trim() || searching} className="shrink-0 text-violet-500 disabled:opacity-60">
          <Search size={20} />
        </button>
        <input value={query} onChange={(e) => setQuery(e.target.value)} enterKeyHint="search"
          placeholder="Search condition, treatment, clinical question, DOI…"
          aria-label="Search research"
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
        <span className="w-px h-7 bg-[#E4DDF7] shrink-0" />
        <button type="button" onClick={() => setShowFilters((v) => !v)} aria-label="Show or hide filters" aria-pressed={showFilters}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${showFilters ? "bg-violet-50 text-violet-700" : "text-violet-600 hover:bg-violet-50"}`}>
          <SlidersHorizontal size={18} />
        </button>
      </form>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-3">
        {SOURCES.map((s) => (
          <button key={s.key} onClick={() => setSourceKey(s.key)} aria-pressed={sourceKey === s.key}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${sourceKey === s.key ? "bg-violet-600 text-white" : "bg-violet-50/70 text-slate-600 hover:bg-violet-50"}`}>
            {s.label}
          </button>
        ))}
        {EXTERNAL_SOURCES.map((s) => (
          <a key={s.key} href={s.url(externalQuery)} target="_blank" rel="noopener noreferrer" title="Opens in a new tab, outside PhysioMind"
            className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold bg-violet-50/70 text-slate-600 hover:bg-violet-50">
            {s.label} <ExternalLink size={12} />
          </a>
        ))}
        <button onClick={() => setStudyType(guidelinesOn ? "" : "guideline")} aria-pressed={guidelinesOn}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${guidelinesOn ? "bg-emerald-600 text-white" : "bg-violet-50/70 text-slate-600 hover:bg-violet-50"}`}>
          Guidelines
        </button>
      </div>
      <p className="text-[11px] text-slate-400 mb-3">PEDro and Cochrane open their own search in a new tab — they can't be searched inside the app.</p>

      {showFilters && (
        <div className="flex items-center gap-2 mb-1">
          <Select label="Study type" value={studyType} onChange={setStudyType} options={STUDY_TYPES} />
          <Select label="Year" value={yearKey} onChange={setYearKey} options={YEARS} />
        </div>
      )}
      {filtersActive && (
        <button onClick={clearFilters} className="text-xs font-semibold text-violet-700 underline mt-1 mb-1">Clear filters</button>
      )}

      {recent.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <span className="text-[11px] text-slate-400">Recent:</span>
          {recent.map((r) => (
            <button key={r} onClick={() => submit(r)} className="px-2.5 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 hover:bg-slate-200">{r}</button>
          ))}
        </div>
      )}

      <h2 className="pf-font-head text-lg font-extrabold text-[#2B2140] mt-5 mb-2">Explore by clinical topic</h2>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
        {TOPICS.map(({ label, query: q, Icon, tone }) => (
          <button key={label} onClick={() => submit(q)}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-bold ${tone}`}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="pf-font-head text-lg font-extrabold text-[#2B2140]">
            {showingDefault ? "Recent & relevant evidence" : `Results for “${activeQuery}”`}
          </h2>
          <p className="text-sm text-slate-400">
            {results
              ? (total != null ? `${total.toLocaleString()} results` : `Showing ${results.length} results`)
              : searching ? "Searching…" : ""}
          </p>
        </div>
        <label className="relative shrink-0">
          <span className="sr-only">Sort results</span>
          <ArrowUpDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results"
            className="appearance-none h-11 pl-9 pr-8 rounded-xl border border-[#E4DDF7] bg-white text-sm font-semibold text-[#2B2140] outline-none focus:border-violet-400">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </label>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Live results from {sourceName}, not reviewed by Aditi. Descriptions come straight from each article's own abstract.
      </p>

      {notice && <p className="text-xs text-amber-700 mb-3">{notice}</p>}

      {error && (
        <div className="text-sm text-rose-600 mb-4 flex items-center gap-3">
          <span>{error}</span>
          <button onClick={() => run(activeRef.current.q, activeRef.current.isDefault)} className="text-xs font-semibold underline">Try again</button>
        </div>
      )}

      {searching && !results && <div className="text-center py-16 text-slate-400 text-sm">Searching {sourceName}…</div>}

      {results && results.length === 0 && !error && (
        <div className="text-center py-16 text-slate-400 text-sm">
          No results for that search{filtersActive ? " with these filters" : ""}.
          {filtersActive && <> <button onClick={clearFilters} className="underline font-semibold text-violet-700">Clear filters</button></>}
        </div>
      )}

      {results && results.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            {results.map((r) => <LiveResultCard key={r.pmid || r.id} result={r} />)}
          </div>
          {hasMore && (
            <div className="text-center mt-5">
              <button onClick={loadMore} disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-violet-50 text-violet-700 text-sm font-bold hover:bg-violet-100 disabled:opacity-50">
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
