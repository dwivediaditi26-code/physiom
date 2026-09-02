import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Search, Sparkles, ExternalLink, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAppData } from "../context/AppDataContext.jsx";
import * as db from "../data/db.js";
import ResearchCard from "../components/evidence/ResearchCard.jsx";

const CATEGORIES = ["MSK", "Neuro", "Sports", "Cardio"];
const LEVELS = ["Level 1", "Level 2", "Level 3"];
const CATEGORY_GRADIENT = { MSK: "blue", Neuro: "teal", Sports: "violet", Cardio: "rose" };

const FIELD = "w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300 outline-none";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";

function StepDot({ n, current, label }) {
  const state = n < current ? "done" : n === current ? "active" : "pending";
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold ${state === "pending" ? "text-slate-300" : state === "done" ? "text-emerald-600" : "text-slate-900"}`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
        state === "active" ? "bg-violet-600 text-white" : state === "done" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
      }`}>{state === "done" ? "✓" : n}</span>
      {label}
    </div>
  );
}

// Real replacement for "ask Claude for copy-paste SQL": search PubMed,
// pick a result, review an AI-drafted Summary/Conclusion, publish straight
// to research_articles. See db.js's "add evidence (admin)" section and
// api/pubmedSearch.js / api/pubmedDraft.js for the plumbing. Same
// profile?.isAdmin gate as AdminReportsPage.jsx.
export default function AdminAddEvidencePage() {
  const { profile } = useAppData();
  const [step, setStep] = useState(1);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [category, setCategory] = useState("MSK");
  const [level, setLevel] = useState("Level 2");
  const [type, setType] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [summary, setSummary] = useState("");
  const [conclusion, setConclusion] = useState("");

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [published, setPublished] = useState(null);

  if (!profile?.isAdmin) return <Navigate to="/feed" replace />;

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true); setSearchError(null); setResults(null);
    try {
      setResults(await db.searchPubMedForEvidence(query.trim()));
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const pick = async (result) => {
    setSelected(result); setStep(2); setDrafting(true); setDraftError(null);
    setSummary(""); setConclusion(""); setTagsText("");
    try {
      const draft = await db.draftEvidenceFromPubMed(result);
      setCategory(draft.category); setLevel(draft.level); setType(draft.type);
      setTagsText(draft.tags.join(", "));
      setSummary(draft.summary); setConclusion(draft.conclusion);
    } catch (err) {
      setDraftError(err.message);
      setType("Narrative Review");
    } finally {
      setDrafting(false);
    }
  };

  const publish = async () => {
    if (publishing) return;
    setPublishing(true); setPublishError(null);
    try {
      const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      const article = await db.addEvidence({
        title: selected.title, journal: selected.journal, year: selected.year,
        type, level, category, tags, gradient: CATEGORY_GRADIENT[category],
        sourceUrl: selected.url, sourceName: "PubMed",
        summary: summary.trim(), conclusion: conclusion.trim(),
      });
      setPublished(article);
      setStep(3);
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const startOver = () => {
    setStep(1); setQuery(""); setResults(null); setSearchError(null);
    setSelected(null); setDraftError(null); setPublishError(null); setPublished(null);
  };

  return (
    <main className="flex-1 min-w-0 max-w-2xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Add Evidence</h1>
        <p className="text-sm text-slate-500">Search PubMed, review the draft, publish — no SQL.</p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <StepDot n={1} current={step} label="Search" />
        <div className="w-6 h-px bg-slate-200" />
        <StepDot n={2} current={step} label="Preview" />
        <div className="w-6 h-px bg-slate-200" />
        <StepDot n={3} current={step} label="Done" />
      </div>

      {step === 1 && (
        <div>
          <form onSubmit={runSearch} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-11 mb-4">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search PubMed, e.g. “ACL rehabilitation”"
              className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
            <button type="submit" disabled={!query.trim() || searching}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40">
              {searching ? "Searching…" : "Search"}
            </button>
          </form>

          {searchError && <p className="text-sm text-rose-600 mb-4">{searchError}</p>}

          {results && results.length === 0 && !searchError && (
            <div className="text-center py-12 text-slate-400 text-sm">No PubMed results for that search.</div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400">{results.length} result{results.length === 1 ? "" : "s"}</p>
              {results.map((r) => (
                <div key={r.pmid} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">PubMed · {r.year || "n.d."}</p>
                    <p className="font-semibold text-slate-900 text-sm leading-snug">{r.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{r.journal}</p>
                  </div>
                  <button onClick={() => pick(r)} className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700">
                    + Use this
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && selected && (
        <div>
          {drafting ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">
              <Sparkles size={18} className="mx-auto mb-2 text-violet-400 animate-pulse" />
              Drafting a summary from the PubMed record…
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
              {draftError && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                  Couldn't auto-draft a summary ({draftError}) — fill in Summary and Conclusion by hand below.
                </p>
              )}

              <label className={LABEL}>Title</label>
              <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 mb-3">{selected.title}</div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className={LABEL}>Journal · Year</label>
                  <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">{selected.journal} · {selected.year || "n.d."}</div>
                </div>
                <div>
                  <label className={LABEL}>Source link</label>
                  <a href={selected.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-violet-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 truncate">
                    <ExternalLink size={12} className="shrink-0" /> <span className="truncate">{selected.url}</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className={LABEL}>Subject</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Level</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className={FIELD}>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Type</label>
                  <input value={type} onChange={(e) => setType(e.target.value)} className={FIELD} />
                </div>
              </div>

              <label className={LABEL}>Tags (comma-separated)</label>
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className={`${FIELD} mb-3`} />

              <label className={LABEL}>Summary {!draftError && <span className="text-amber-600 normal-case font-medium">✨ drafted — review</span>}</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className={`${FIELD} mb-3 resize-none`} />

              <label className={LABEL}>Conclusion {!draftError && <span className="text-amber-600 normal-case font-medium">✨ drafted — review</span>}</label>
              <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={2} className={`${FIELD} mb-4 resize-none`} />

              {publishError && <p className="text-sm text-rose-600 mb-3">{publishError}</p>}

              <div className="flex items-center gap-2">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                  <ArrowLeft size={13} /> Back to search
                </button>
                <button onClick={publish} disabled={publishing || !summary.trim() || !conclusion.trim()}
                  className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40">
                  {publishing ? "Publishing…" : "Publish to Evidence tab"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && published && (
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={26} />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">Added to your Evidence library</h2>
          <p className="text-sm text-slate-500 mb-5">This is exactly how it looks on the Evidence tab now.</p>
          <div className="max-w-sm mx-auto text-left mb-6"><ResearchCard article={published} /></div>
          <button onClick={startOver} className="text-xs font-semibold px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
            + Add another
          </button>
        </div>
      )}
    </main>
  );
}
