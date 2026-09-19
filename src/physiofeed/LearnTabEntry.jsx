import { useState, useMemo } from "react";
import {
  Search, Bell, Hand, Move,
  Dumbbell, FlaskConical, Brain, BarChart3, Footprints, Bone, Link2,
  GraduationCap, Activity, ChevronLeft, ChevronRight,
  BookOpen, ClipboardCheck, Stethoscope, Target,
} from "lucide-react";
import StudyMode from "./learn/StudyMode.jsx";
import "./physiofeed.css";

// These 7 Assessment Library / Advanced Assessment items have real,
// structured per-item data (technique/position/finding fields in
// sharedClinicalData.js or RegionalFunctionalScreens.jsx), so they get a
// second "Study" entry point into the read-only big-image study mode,
// alongside their existing card that opens the real clinical screen.
// Outcome Measures/Kinetic Chain/Functional Movement joined ROM/MMT/
// Special/Neuro here 2026-08-19 (Aditi's request: same grid treatment).
// Palpation joined 2026-08-29 (Aditi: "Learn -> Palpation should be a
// complete teaching library, not just a little 'How to palpate' popup"),
// backed by real per-structure data OCR'd from the uploaded textbook --
// see src/palpationData.js for how that content was sourced.
// Everything else (Demographics, Subjective, and the rest of Advanced
// Assessment/Treatment & Exercise) still has no such per-item data, so
// it keeps its single card as before -- no study mode invented for it.
const STUDY_TYPES = new Set(["rom", "mmt", "special", "neuro", "outcome", "kinetic", "fma", "cardio", "palpation", "nkt"]);

// Real section keys, pulled straight from physiom's own ALL_TESTS (see
// src/sharedClinicalData.js) -- same labels, same navTo(key) targets the
// desktop sidebar and old bottom nav already used. Nothing fabricated:
// every card here opens the exact same real screen those did.
const ASSESSMENT_LIBRARY = [
  { key: "palpation", label: "Palpation", desc: "Tissue assessment", icon: Hand, tint: "rose" },
  { key: "rom", label: "ROM", desc: "Range of motion", icon: Move, tint: "violet" },
  { key: "mmt", label: "MMT", desc: "Muscle testing", icon: Dumbbell, tint: "green" },
  { key: "special", label: "Special Tests", desc: "Orthopedic (100+)", icon: FlaskConical, tint: "blue" },
  { key: "neuro", label: "Neurological", desc: "Full neuro exam", icon: Brain, tint: "amber" },
  { key: "outcome", label: "Outcome Measures", desc: "Validated scales", icon: BarChart3, tint: "teal" },
  // Cardio has no single-screen navTo() target of its own (the real
  // Cardiopulmonary Assessment is reached via the Clinical tab's specialty
  // picker, not a direct ALL_TESTS key) -- studyOnly routes its whole card
  // straight into study mode instead of onNav, same reference library
  // CardiopulmonaryAssessment.jsx's own ⓘ InfoCards already pull from.
  { key: "cardio", label: "Cardio & Respiratory", desc: "Cardiopulmonary reference library", icon: Activity, tint: "rose", studyOnly: true },
];

const ADVANCED_ASSESSMENT = [
  { key: "fma", label: "Functional Movement", desc: "Movement analysis", icon: Footprints, tint: "violet" },
  { key: "cyriax_full", label: "STTT", desc: "Selective tissue tension", icon: Bone, tint: "rose" },
  { key: "kinetic", label: "Kinetic Chain", desc: "Joint-by-joint", icon: Link2, tint: "blue" },
  { key: "nkt", label: "CPA", desc: "Compensation pattern analysis", icon: Brain, tint: "amber" },
];

const EXERCISE = [
  { key: "exercise", label: "Exercise Prescription", desc: "Treatment plan", icon: Dumbbell, tint: "violet" },
];

const TINTS = {
  violet: "bg-violet-50 text-violet-600",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  teal: "bg-teal-50 text-teal-600",
  indigo: "bg-indigo-50 text-indigo-600",
};

// Grouped list rows (2026-09-18, Aditi: "build as shown") -- a coloured icon,
// name, short description, and a Study pill. Tapping the row opens study mode
// when the item has one (Learn is for learning), otherwise the real tool;
// "Tool" opens the real tool for items that have both.
function Row({ item, onNav, onStudy }) {
  const Icon = item.icon;
  const studyable = STUDY_TYPES.has(item.key);
  const main = () => (studyable ? onStudy(item.key) : onNav(item.key));
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-3 py-2.5 mb-2 hover:border-violet-300 transition-colors">
      <button type="button" onClick={main} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TINTS[item.tint]}`}>
          <Icon size={19} strokeWidth={2}/>
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-sm text-slate-900 leading-tight">{item.label}</span>
          <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</span>
        </span>
      </button>
      {studyable && !item.studyOnly && (
        <button type="button" onClick={() => onNav(item.key)} className="text-[11px] font-medium text-slate-500 hover:text-violet-700 px-1.5 shrink-0">Tool</button>
      )}
      {studyable
        ? <button type="button" onClick={() => onStudy(item.key)} className="flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1 shrink-0"><GraduationCap size={12}/> Study</button>
        : <ChevronRight size={16} className="text-slate-300 shrink-0"/>}
    </div>
  );
}

function Section({ title, items, onNav, onStudy }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-0.5">{title}</div>
      {items.map((item) => <Row key={item.key} item={item} onNav={onNav} onStudy={onStudy}/>)}
    </div>
  );
}

// Learn Home: five entry cards in a grid (2026-09-18, Aditi's design brief:
// "make it grid wise and not green"). Only Practical Skills and Clinical
// Learning have real content today -- they open the existing study/
// assessment library, filtered; BPT / Test / Exam Ready are marked Soon
// instead of pretending to have content.
const CLINICAL_KEYS = new Set(["neuro", "cardio", "special", "outcome", "kinetic", "nkt"]);
const ALL_ITEMS = [...ASSESSMENT_LIBRARY, ...ADVANCED_ASSESSMENT, ...EXERCISE];
const HOME_CARDS = [
  { id: "bpt", label: "BPT", desc: "1st–4th year subjects", icon: BookOpen, tint: "violet", soon: true },
  { id: "test", label: "Test", desc: "MCQs • Image questions", icon: ClipboardCheck, tint: "blue", soon: true },
  { id: "clinical", label: "Clinical Learning", desc: "Neuro • Cardio • Special tests", icon: Stethoscope, tint: "rose", count: ALL_ITEMS.filter((i) => CLINICAL_KEYS.has(i.key)).length },
  { id: "practical", label: "Practical Skills", desc: "ROM • MMT • Assessment", icon: Hand, tint: "amber", count: ALL_ITEMS.length },
  { id: "exam", label: "Exam Ready", desc: "Revision • Mock tests", icon: Target, tint: "indigo", soon: true },
];

const PASTEL = {
  violet: "bg-violet-50", blue: "bg-blue-50", rose: "bg-rose-50", amber: "bg-amber-50", indigo: "bg-indigo-50", teal: "bg-teal-50",
};

function HomeCard({ card, onOpen, wide }) {
  const Icon = card.icon;
  return (
    <button
      type="button"
      disabled={card.soon}
      onClick={() => onOpen(card.id)}
      className={`relative text-left rounded-2xl p-3.5 transition ${PASTEL[card.tint]} ${card.soon ? "opacity-75 cursor-not-allowed" : "active:scale-[0.98] hover:shadow-sm"} ${wide ? "col-span-2 flex items-center gap-3" : "flex flex-col justify-start items-stretch min-h-[108px]"}`}
    >
      {card.soon && <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70 text-slate-500">Soon</span>}
      {card.count != null && <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-700">{card.count} topics</span>}
      <span className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 ${wide ? "" : "mb-2.5"} ${TINTS[card.tint].split(" ")[1]}`}>
        <Icon size={20} strokeWidth={2}/>
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-[15px] text-slate-900 leading-tight">{card.label}</span>
        <span className="block text-xs text-slate-600 mt-0.5 leading-snug">{card.desc}</span>
      </span>
    </button>
  );
}

const LAST_KEY = "physiom_learn_last_study";
function readLast() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || "null"); } catch { return null; }
}
function saveLast(key) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ key, at: Date.now() })); } catch { /* storage blocked */ }
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function LearnTabEntry({ onNav }) {
  const [view, setView] = useState("home");
  const [query, setQuery] = useState("");
  const [studyType, setStudyType] = useState(null);
  const [last, setLast] = useState(readLast);
  const openStudy = (key) => { saveLast(key); setLast({ key }); setStudyType(key); };
  const lastItem = last && ALL_ITEMS.find((i) => i.key === last.key);

  const filter = (items) => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
  };

  const inView = (items) => (view === "clinical" ? items.filter((i) => CLINICAL_KEYS.has(i.key)) : items);
  const filtered = useMemo(() => ({
    assess: filter(inView(ASSESSMENT_LIBRARY)),
    adv: filter(inView(ADVANCED_ASSESSMENT)),
    exercise: filter(view === "clinical" ? [] : EXERCISE),
  }), [query, view]);

  const noResults = filtered.assess.length === 0 && filtered.adv.length === 0 && filtered.exercise.length === 0;

  if (studyType) {
    return (
      <div className="physiofeed-root max-w-2xl lg:max-w-4xl mx-auto">
        <StudyMode type={studyType} onBack={() => setStudyType(null)}/>
      </div>
    );
  }

  const atHome = view === "home";
  const title = view === "clinical" ? "Clinical Learning" : view === "practical" ? "Practical Skills" : "Learn";
  const subtitle = atHome ? `${greeting()} — what do you want to learn today?` : view === "clinical" ? "Learn from real cases. Build clinical confidence." : "Hands-on skills for real practice.";
  const showCards = atHome && !query.trim();

  return (
    <div className="physiofeed-root max-w-2xl lg:max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {!atHome && (
            <button type="button" aria-label="Back to Learn" onClick={() => { setView("home"); setQuery(""); }} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-50">
              <ChevronLeft size={22} className="text-slate-600"/>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        <button aria-label="Notifications" className="p-2 rounded-lg hover:bg-slate-50">
          <Bell size={20} className="text-slate-400"/>
        </button>
      </div>

      <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3.5 h-11 my-4">
        <Search size={16} className="text-slate-400 shrink-0"/>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics, skills, tests…"
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
        />
      </div>

      {showCards && lastItem && (
        <button type="button" onClick={() => openStudy(lastItem.key)} className="w-full flex items-center justify-between gap-3 bg-violet-50 rounded-2xl px-4 py-3 mb-3 text-left">
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-violet-900">Pick up where you left off</span>
            <span className="block text-xs text-violet-700 truncate">{lastItem.label} · {lastItem.desc}</span>
          </span>
          <span className="text-[11px] font-semibold bg-white text-violet-800 rounded-full px-3 py-1.5 shrink-0">Continue</span>
        </button>
      )}
      {showCards ? (
        <div className="grid grid-cols-2 gap-3">
          {HOME_CARDS.map((c, i) => (
            <HomeCard key={c.id} card={c} wide={i === HOME_CARDS.length - 1} onOpen={setView}/>
          ))}
        </div>
      ) : noResults ? (
        <div className="text-center py-14 text-slate-400 text-sm">No matches for "{query}".</div>
      ) : (
        <>
          <Section title="Assessment" items={filtered.assess} onNav={onNav} onStudy={openStudy}/>
          <Section title="Advanced" items={filtered.adv} onNav={onNav} onStudy={openStudy}/>
          <Section title="Exercise" items={filtered.exercise} onNav={onNav} onStudy={openStudy}/>
        </>
      )}
    </div>
  );
}
