import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { DisplayFont } from "./learnTheme.jsx";
import StudyImage from "./StudyImage.jsx";
import PhotoSlots from "../../PhotoSlots.jsx";
import { kcImageIds } from "../../kcImages.js";
import {
  EXERCISE_GROUPS, REGION_ART, TIERS, allExercises, regionList, searchExercises, filterExercises,
} from "./exerciseLearnData.js";

const artUrl = (file) => `${import.meta.env.BASE_URL}anatomy/${file}.png`;

function RegionArt({ regionKey, icon, size = 44 }) {
  const file = REGION_ART[regionKey];
  return file
    ? <img src={artUrl(file)} alt="" aria-hidden="true" loading="lazy" decoding="async" style={{ width: size, height: size }} className="object-contain shrink-0"/>
    : <span style={{ width: size, height: size, fontSize: size * 0.6 }} className="flex items-center justify-center shrink-0" aria-hidden="true">{icon}</span>;
}

function Chip({ active, onClick, children, small }) {
  return (
    <button type="button" onClick={onClick}
      className={`shrink-0 rounded-full font-semibold whitespace-nowrap ${small ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"} ${
        active ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}>
      {children}
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative mb-4">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        style={{ paddingLeft: 40 }}
        className="w-full rounded-2xl border border-slate-200 bg-white pr-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400"/>
    </div>
  );
}

function ExerciseCard({ ex, view, onOpen, showRegion }) {
  const meta = [showRegion ? ex.regionLabel : null, ex.category, ex.phase].filter(Boolean).join(" • ");
  return (
    <button type="button" data-testid={`exercise-card-${ex.id}`} onClick={() => onOpen(ex)}
      className={`text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition w-full ${view === "list" ? "flex items-center gap-3 p-2.5" : "flex flex-col"}`}>
      <div className={view === "list" ? "w-16 h-16 shrink-0 rounded-xl overflow-hidden" : "w-full"} style={view === "grid" ? { aspectRatio: "4 / 3" } : undefined}>
        <StudyImage name={ex.id} square fallback={<RegionArt regionKey={ex.regionKey} icon="🏋" size={view === "list" ? 36 : 56}/>}/>
      </div>
      <div className={`min-w-0 flex-1 ${view === "list" ? "" : "p-3"}`}>
        <div className="cl-display font-extrabold text-[14px] text-slate-900 leading-tight">{ex.name}</div>
        {ex.target && <div className="text-xs text-slate-500 mt-0.5 leading-snug">{ex.target}</div>}
        <div className="text-[11px] text-violet-600 font-semibold mt-1">{meta}</div>
      </div>
      {view === "list" && <ChevronRight size={16} className="text-slate-300 shrink-0 mr-1"/>}
    </button>
  );
}

function ExerciseList({ list, view, onOpen, showRegion }) {
  if (list.length === 0) return <p data-testid="exercise-empty" className="text-sm text-slate-500 text-center py-10">No exercises match. Try clearing a filter or the search.</p>;
  return (
    <div className={view === "grid" ? "grid grid-cols-2 gap-3" : "space-y-2.5"}>
      {list.map((ex) => <ExerciseCard key={ex.id} ex={ex} view={view} onOpen={onOpen} showRegion={showRegion}/>)}
    </div>
  );
}

function Section({ title, children, tint = "slate" }) {
  const tone = { slate: "bg-white border-slate-200", violet: "bg-violet-50 border-violet-100", green: "bg-emerald-50 border-emerald-100", amber: "bg-amber-50 border-amber-100" }[tint];
  return (
    <div className={`rounded-2xl border p-3.5 ${tone}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-violet-600 mb-1.5">{title}</div>
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
    </div>
  );
}

// Detail page: only fields the exercise really has. A section with no data is left out.
function ExerciseDetail({ ex, onBack }) {
  const dosage = [
    ex.sets && ex.reps ? `${ex.sets} sets × ${ex.reps} reps` : null,
    ex.hold ? `${ex.hold} s hold` : null,
    ex.freq ? ex.freq : null,
  ].filter(Boolean);
  return (
    <div>
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-3"><PhotoSlots ids={kcImageIds(ex.id)} label="Exercise photos"/></div>
        <div className="px-4 pb-4">
          <h2 className="cl-display text-xl font-extrabold text-slate-900">{ex.name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-2" data-testid="exercise-tags">
            {[ex.regionLabel, ex.category, ex.phase, ex.tier && `${ex.tier} evidence`].filter(Boolean).map((t) => (
              <span key={t} className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-violet-100 text-violet-700">{t}</span>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {ex.desc && <Section title="Purpose">{ex.desc}</Section>}
            {ex.target && <Section title="Target">{ex.target}</Section>}
            {ex.cues && <Section title="How to perform (cues)" tint="violet">{ex.cues}</Section>}
            {dosage.length > 0 && (
              <Section title="Dosage" tint="amber">
                <div className="font-semibold text-slate-800">{dosage.join(" • ")}</div>
                <div className="text-xs text-slate-500 mt-1">Example from the app's exercise library, for learning. It is not one dose for every patient; adjust to the person and the stage.</div>
              </Section>
            )}
            {ex.progression && <Section title="Progression" tint="green">{ex.progression}</Section>}
            <Section title="Evidence">
              {ex.evidence ? <div><span className="font-semibold">Evidence label in the app:</span> {ex.evidence}</div> : null}
              <div data-testid="exercise-no-refs" className="text-slate-500 mt-1">No evidence references added yet.</div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterRow({ label, value, options, onChange }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[11px] font-semibold text-slate-400 w-14 shrink-0">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <Chip small active={!value} onClick={() => onChange("")}>All</Chip>
        {options.map((o) => <Chip small key={o} active={value === o} onClick={() => onChange(value === o ? "" : o)}>{o}</Chip>)}
      </div>
    </div>
  );
}

export default function ExerciseStudy({ onBack }) {
  const [view, setView] = useState("home");       // home | list
  const [listKey, setListKey] = useState(null);    // region key | "group:<key>" | "collection:<key>"
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ category: "", phase: "", tier: "" });
  const [layout, setLayout] = useState("list");
  const [open, setOpen] = useState(null);

  const all = useMemo(() => allExercises(), []);
  const regions = useMemo(() => regionList(), []);

  if (open) return <ExerciseDetail ex={open} onBack={() => setOpen(null)}/>;

  const resetFilters = () => setFilters({ category: "", phase: "", tier: "" });
  const goList = (key) => { setListKey(key); setQuery(""); resetFilters(); setView("list"); };
  const goHome = () => { setView("home"); setListKey(null); setQuery(""); resetFilters(); };

  const searching = query.trim().length > 0;

  // ---- Home -------------------------------------------------------------------------------
  if (view === "home") {
    const hits = searching ? searchExercises(all, query) : [];
    const strong = all.filter((e) => e.tier === "Strongest" || e.tier === "Strong").length;
    const phase1 = all.filter((e) => e.phase === "Phase 1").length;
    return (
      <div>
        <DisplayFont/>
        <div className="flex items-center gap-2 mb-1">
          <button type="button" onClick={onBack} aria-label="Back to Learn" className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={20}/></button>
          <div>
            <h2 className="cl-display text-xl font-extrabold text-slate-900 leading-tight">Exercise Learn</h2>
            <div className="text-xs text-slate-500">Learn • Practice • Apply</div>
          </div>
        </div>
        <div className="mt-4"><SearchBox value={query} onChange={setQuery} placeholder="Search exercises, muscles, conditions…"/></div>

        {searching ? (
          <div>
            <div className="text-xs text-slate-500 mb-2" data-testid="exercise-search-count">{hits.length} {hits.length === 1 ? "exercise" : "exercises"}</div>
            <ExerciseList list={hits} view="list" onOpen={setOpen} showRegion/>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {EXERCISE_GROUPS.map((g) => {
                const n = all.filter((e) => g.regions.includes(e.regionKey)).length;
                return (
                  <button key={g.key} type="button" data-testid={`exercise-group-${g.key}`} onClick={() => goList(`group:${g.key}`)}
                    className="text-left bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-2xl px-3 py-3">
                    <div className="cl-display font-extrabold text-[14px] text-slate-900 leading-tight">{g.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{n} exercises</div>
                  </button>
                );
              })}
            </div>

            <div className="cl-display text-[13px] font-extrabold text-slate-700 mb-2.5 px-0.5">Browse by region</div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {regions.map((r) => (
                <button key={r.key} type="button" data-testid={`exercise-region-${r.key}`} onClick={() => goList(r.key)}
                  className="text-left bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2.5 min-w-0">
                  <RegionArt regionKey={r.key} icon={r.icon} size={44}/>
                  <div className="min-w-0">
                    <div className="cl-display font-extrabold text-[13.5px] text-slate-900 leading-tight break-words">{r.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{r.count} exercises</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="cl-display text-[13px] font-extrabold text-slate-700 mb-2.5 px-0.5">Collections</div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" data-testid="exercise-collection-evidence" onClick={() => goList("collection:evidence")} className="text-left bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
                <div className="cl-display font-extrabold text-[13.5px] text-slate-900 leading-tight">Strongest or Strong evidence</div>
                <div className="text-xs text-slate-500 mt-0.5">{strong} exercises, by the app's evidence label</div>
              </button>
              <button type="button" data-testid="exercise-collection-phase1" onClick={() => goList("collection:phase1")} className="text-left bg-sky-50 border border-sky-100 rounded-2xl p-3">
                <div className="cl-display font-extrabold text-[13.5px] text-slate-900 leading-tight">Phase 1 (early stage)</div>
                <div className="text-xs text-slate-500 mt-0.5">{phase1} exercises</div>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---- List -------------------------------------------------------------------------------
  let title = "Exercises"; let base = all; let regionKey = null; let categories = [];
  if (listKey?.startsWith("group:")) {
    const g = EXERCISE_GROUPS.find((x) => `group:${x.key}` === listKey);
    title = g?.label || title; base = all.filter((e) => g?.regions.includes(e.regionKey));
  } else if (listKey === "collection:evidence") {
    title = "Strongest or Strong evidence"; base = all.filter((e) => e.tier === "Strongest" || e.tier === "Strong");
  } else if (listKey === "collection:phase1") {
    title = "Phase 1 (early stage)"; base = all.filter((e) => e.phase === "Phase 1");
  } else {
    const r = regions.find((x) => x.key === listKey);
    regionKey = r?.key || null; title = r ? `${r.label} Exercises` : title; base = all.filter((e) => e.regionKey === listKey); categories = r?.categories || [];
  }
  const found = filterExercises(searchExercises(base, query), filters);
  const phases = [...new Set(base.map((e) => e.phase))].filter(Boolean).sort();
  const tiers = TIERS.filter((t) => base.some((e) => e.tier === t));

  return (
    <div>
      <DisplayFont/>
      <div className="flex items-center gap-2 mb-3">
        <button type="button" onClick={goHome} aria-label="Back to Exercise Learn" className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={20}/></button>
        {regionKey && <RegionArt regionKey={regionKey} icon={regions.find((r) => r.key === regionKey)?.icon} size={40}/>}
        <div className="min-w-0">
          <h2 className="cl-display text-xl font-extrabold text-slate-900 leading-tight">{title}</h2>
          <div className="text-xs text-slate-500" data-testid="exercise-list-count">{found.length} of {base.length} exercises</div>
        </div>
        <div className="ml-auto flex shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button type="button" aria-label="List view" aria-pressed={layout === "list"} onClick={() => setLayout("list")} className={`p-2 ${layout === "list" ? "bg-violet-100 text-violet-700" : "text-slate-400"}`}><List size={16}/></button>
          <button type="button" aria-label="Grid view" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} className={`p-2 ${layout === "grid" ? "bg-violet-100 text-violet-700" : "text-slate-400"}`}><LayoutGrid size={16}/></button>
        </div>
      </div>
      <SearchBox value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()}…`}/>
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 pb-0.5">
          <Chip active={!filters.category} onClick={() => setFilters((f) => ({ ...f, category: "" }))}>All</Chip>
          {categories.map((c) => <Chip key={c} active={filters.category === c} onClick={() => setFilters((f) => ({ ...f, category: f.category === c ? "" : c }))}>{c}</Chip>)}
        </div>
      )}
      {phases.length > 1 && <FilterRow label="Phase" value={filters.phase} options={phases} onChange={(v) => setFilters((f) => ({ ...f, phase: v }))}/>}
      {tiers.length > 1 && <FilterRow label="Evidence" value={filters.tier} options={tiers} onChange={(v) => setFilters((f) => ({ ...f, tier: v }))}/>}
      <div className="mt-3">
        <ExerciseList list={found} view={layout} onOpen={setOpen} showRegion={!regionKey}/>
      </div>
    </div>
  );
}
