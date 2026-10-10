import { useState, useMemo, useEffect } from "react";
import { trackEvent } from "../analytics/trackEvent.js";
import {
  Search, Bell, Hand, Move,
  Dumbbell, FlaskConical, Brain, BarChart3, Footprints, Link2,
  Activity, ChevronLeft, ChevronRight,
  BookOpen, ClipboardCheck, Stethoscope, Target, Gamepad2,
} from "lucide-react";
import StudyMode from "./learn/StudyMode.jsx";
import ClinicalLearning from "./learn/ClinicalLearning.jsx";
import CaseSimulator from "./learn/CaseSimulator.jsx";
import { DisplayFont } from "./learn/learnTheme.jsx";
import "./physiofeed.css";
import { usePreviewFeaturesForCurrentUser } from "../featureFlags.js";

// These Assessment Library / Advanced Assessment items have real,
// structured per-item data (technique/position/finding fields in
// sharedClinicalData.js or RegionalFunctionalScreens.jsx), so their Learn row
// opens the read-only big-image study mode.
// Outcome Measures/Kinetic Chain/Functional Movement joined ROM/MMT/
// Special/Neuro here 2026-08-19 (Aditi's request: same grid treatment).
// Palpation joined 2026-08-29 (Aditi: "Learn -> Palpation should be a
// complete teaching library, not just a little 'How to palpate' popup"),
// backed by real per-structure data OCR'd from the uploaded textbook --
// see src/palpationData.js for how that content was sourced.
// Everything else (Demographics, Subjective, and the rest of Advanced
// Assessment/Treatment & Exercise) still has no such per-item data, so
// it keeps its single card as before -- no study mode invented for it.
const STUDY_TYPES = new Set(["rom", "mmt", "special", "neuro", "outcome", "kinetic", "fma", "cardio", "palpation", "nkt", "exercise"]);

// Real section keys, pulled straight from physiom's own ALL_TESTS (see
// src/sharedClinicalData.js) -- same labels, same navTo(key) targets the
// desktop sidebar and old bottom nav already used. Nothing fabricated. Rows
// with no study mode (Exercise Prescription) still open that real screen. STTT
// has no row here any more -- it is a fixed step of the Outpatient ortho
// assessment, and its old standalone page is no longer linked from Learn or
// the Objective hub (2026-09-19).
const ASSESSMENT_LIBRARY = [
  { key: "palpation", label: "Palpation", desc: "Tissue assessment", icon: Hand, tint: "rose" },
  { key: "rom", label: "ROM", desc: "Range of motion", icon: Move, tint: "violet" },
  { key: "mmt", label: "MMT", desc: "Muscle testing", icon: Dumbbell, tint: "green" },
  { key: "special", label: "Special Tests", desc: "Orthopedic (100+)", icon: FlaskConical, tint: "blue" },
  { key: "neuro", label: "Neurological", desc: "Full neuro exam", icon: Brain, tint: "amber" },
  { key: "outcome", label: "Outcome Measures", desc: "Validated scales", icon: BarChart3, tint: "teal" },
  // Cardio has no single-screen navTo() target of its own (the real
  // Cardiopulmonary Assessment is reached via the Clinical tab's specialty
  // picker, not a direct ALL_TESTS key), so study mode is its only entry --
  // same reference library CardiopulmonaryAssessment.jsx's own ⓘ InfoCards
  // already pull from.
  { key: "cardio", label: "Cardio & Respiratory", desc: "Cardiopulmonary reference library", icon: Activity, tint: "rose" },
];

const ADVANCED_ASSESSMENT = [
  { key: "fma", label: "Functional Movement", desc: "Movement analysis", icon: Footprints, tint: "violet" },
  { key: "kinetic", label: "Kinetic Chain", desc: "Joint-by-joint", icon: Link2, tint: "blue" },
  { key: "nkt", label: "CPA", desc: "Compensation pattern analysis", icon: Brain, tint: "amber" },
];

const EXERCISE = [
  { key: "exercise", label: "Exercise Learn", desc: "Learn • Practice • Apply", icon: Dumbbell, tint: "violet" },
];


// Solid gradient badges for list rows and home cards (literal class names).
const TINT_GRAD = {
  violet: "from-violet-600 to-fuchsia-500", blue: "from-sky-600 to-indigo-500", green: "from-cyan-500 to-blue-500",
  amber: "from-amber-500 to-orange-400", rose: "from-rose-600 to-pink-500", teal: "from-cyan-500 to-sky-500", indigo: "from-indigo-600 to-violet-500",
  emerald: "from-emerald-600 to-green-500",
};
const TINT_BORDER = {
  violet: "border-violet-200", blue: "border-sky-200", green: "border-cyan-200", amber: "border-amber-200", rose: "border-rose-200", teal: "border-cyan-200", indigo: "border-indigo-200",
  emerald: "border-emerald-200",
};

// Grouped list rows (2026-09-18, Aditi: "build as shown") -- a coloured icon,
// name, short description, and a Study pill. Tapping the row opens study mode
// when the item has one (Learn is for learning), otherwise the real tool.
// The small "Tool" link that used to sit beside the Study pill, opening the
// live assessment screen from here, was removed (2026-09-19, Aditi: "when we
// click on tool written it opens... so normal study mode open").
// Small medical illustration on the right of a row (public/learn/*.png). Rows with no
// picture here (Palpation, CPA, Exercise Prescription) are unchanged.
const CARD_ART = {
  rom: "rom", mmt: "mmt", special: "special-tests", neuro: "neurological", outcome: "outcome-measures",
  cardio: "cardio-respiratory", fma: "functional-movement", kinetic: "kinetic-chain",
};

// Soft card colour per tint, so each card carries its own pastel.
const TINT_CARD = {
  violet: "from-violet-50 to-white", blue: "from-sky-50 to-white", green: "from-cyan-50 to-white",
  amber: "from-amber-50 to-white", rose: "from-rose-50 to-white", teal: "from-cyan-50 to-white", indigo: "from-indigo-50 to-white",
  emerald: "from-emerald-50 to-white",
};

// A grid card (2026-10-06, Aditi): the picture top left (where the coloured icon used to be; rows
// with no picture keep their icon), title and subtitle beside it, a chevron at the top right.
// The whole card is the button; there is no separate "Study" pill any more.
function Row({ item, onNav, onStudy }) {
  const Icon = item.icon;
  const art = CARD_ART[item.key];
  const studyable = STUDY_TYPES.has(item.key);
  const main = () => (studyable ? onStudy(item.key) : onNav(item.key));
  return (
    <button type="button" onClick={main} data-testid={`learn-card-${item.key}`}
      className={`relative flex flex-col text-left h-full min-w-0 bg-gradient-to-br ${TINT_CARD[item.tint]} border ${TINT_BORDER[item.tint]} rounded-3xl p-2.5 min-[400px]:p-3 shadow-sm hover:shadow-md transition overflow-hidden`}>
      <span className="flex flex-col min-[350px]:flex-row items-start gap-2 min-w-0 w-full">
        {art ? (
          <img src={`${import.meta.env.BASE_URL}learn/${art}.png`} alt="" aria-hidden="true" loading="lazy" decoding="async"
            data-testid={`learn-art-${item.key}`} className="w-10 h-10 min-[400px]:w-12 min-[400px]:h-12 object-contain shrink-0 pointer-events-none" />
        ) : (
          <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br ${TINT_GRAD[item.tint]} text-white shadow-sm`}>
            <Icon size={20} strokeWidth={2.2}/>
          </span>
        )}
        <span className="min-w-0 w-full flex-1 break-words">
          <span className="cl-display block font-extrabold text-[13px] min-[400px]:text-[14px] text-slate-900 leading-tight pr-3">{item.label}</span>
          <span className="block text-[11px] min-[400px]:text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</span>
        </span>
      </span>
      <ChevronRight size={16} className="absolute top-3 right-2.5 text-slate-400"/>
    </button>
  );
}

function Section({ title, items, onNav, onStudy }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="cl-display flex items-center gap-2 text-[13px] font-extrabold text-slate-700 mb-2.5 px-0.5"><span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500"/>{title}</div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => <Row key={item.key} item={item} onNav={onNav} onStudy={onStudy}/>)}
      </div>
    </div>
  );
}

// Learn Home: five entry cards in a grid (2026-09-18, Aditi's design brief:
// "make it grid wise and not green"). Only Practical Skills and Clinical
// Learning have real content today -- they open the existing study/
// assessment library, filtered; BPT / Test / Exam Ready are marked Soon
// instead of pretending to have content.
// Palpation is shown to admin accounts only for now (Aditi, 2026-10-06); everyone else
// does not see the row, the card count or the study screen.
const ADMIN_ONLY_KEYS = new Set(["palpation"]);
const ALL_ITEMS = [...ASSESSMENT_LIBRARY, ...ADVANCED_ASSESSMENT, ...EXERCISE];
const HOME_CARDS = [
  { id: "practical", label: "Practical Skills", desc: "ROM • MMT • Assessment", icon: Hand, tint: "amber", count: ALL_ITEMS.length },
  { id: "clinical", label: "Clinical Cases", desc: "Learn through real-life patient cases", icon: Stethoscope, tint: "rose" },
  { id: "sim", label: "Case Simulator", desc: "Meet the patient • Answer • Learn", icon: Gamepad2, tint: "violet" },
  { id: "test", label: "Test", desc: "MCQs • Image questions", icon: ClipboardCheck, tint: "blue", soon: true },
  { id: "bpt", label: "BPT", desc: "1st–4th year subjects", icon: BookOpen, tint: "violet", soon: true },
  { id: "exam", label: "Exam Ready", desc: "Revision • Mock tests", icon: Target, tint: "indigo", soon: true },
];


function HomeCard({ card, onOpen, wide }) {
  const Icon = card.icon;
  return (
    <button
      type="button"
      disabled={card.soon}
      onClick={() => onOpen(card.id)}
      className={`relative text-left rounded-3xl p-4 transition overflow-hidden text-white bg-gradient-to-br ${TINT_GRAD[card.tint]} shadow-md ${card.tint === "amber" || card.tint === "rose" ? "saturate-[.68]" : ""} ${card.soon ? "opacity-70 cursor-not-allowed" : "active:scale-[0.98] hover:shadow-lg"} ${wide ? "col-span-2 flex items-center gap-3" : "flex flex-col justify-start items-stretch min-h-[132px]"}`}
    >
      <Icon size={90} strokeWidth={1.2} className="absolute -right-3 -bottom-3 opacity-15" aria-hidden="true"/>
      {card.soon && <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25">Soon</span>}
      {card.count != null && <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700">{card.count} topics</span>}
      <span className={`w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center shrink-0 ${wide ? "" : "mb-3"}`}>
        <Icon size={22} strokeWidth={2.2}/>
      </span>
      <span className="min-w-0 relative">
        <span className="cl-display block font-extrabold text-[17px] leading-tight">{card.label}</span>
        <span className="block text-xs text-white/90 mt-0.5 leading-snug">{card.desc}</span>
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
  useEffect(() => { trackEvent("learn_viewed"); }, []);
  const { enabled: isAdmin } = usePreviewFeaturesForCurrentUser();
  const visibleKeys = (item) => isAdmin || !ADMIN_ONLY_KEYS.has(item.key);
  const [view, setView] = useState("home");
  const [query, setQuery] = useState("");
  const [studyType, setStudyType] = useState(null);
  const [last, setLast] = useState(readLast);
  const openStudy = (key) => { saveLast(key); setLast({ key }); setStudyType(key); trackEvent("module_viewed", { entityType: "module", entityId: key }); };
  const lastItem = last && ALL_ITEMS.filter(visibleKeys).find((i) => i.key === last.key);

  const filter = (items) => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
  };

  const filtered = useMemo(() => ({
    assess: filter(ASSESSMENT_LIBRARY.filter(visibleKeys)),
    adv: filter(ADVANCED_ASSESSMENT),
    exercise: filter(EXERCISE),
  }), [query, isAdmin]);

  const noResults = filtered.assess.length === 0 && filtered.adv.length === 0 && filtered.exercise.length === 0;

  if (view === "clinical") {
    return (
      <div className="physiofeed-root max-w-2xl lg:max-w-4xl mx-auto">
        <style>{".pm-shell{background:#fff !important}"}</style>
      <DisplayFont/>
        <ClinicalLearning onBack={() => setView("home")}/>
      </div>
    );
  }

  if (view === "sim") {
    return (
      <div className="physiofeed-root max-w-2xl lg:max-w-4xl mx-auto">
        <style>{".pm-shell{background:#fff !important}"}</style>
        <DisplayFont/>
        <CaseSimulator onBack={() => setView("home")}/>
      </div>
    );
  }

  if (studyType) {
    return (
      <div className="physiofeed-root max-w-2xl lg:max-w-4xl mx-auto">
        <style>{".pm-shell{background:#fff !important}"}</style>
      <DisplayFont/>
        <StudyMode type={studyType} onBack={() => setStudyType(null)}/>
      </div>
    );
  }

  const atHome = view === "home";
  const title = view === "practical" ? "Practical Skills" : "Learn";
  const subtitle = atHome ? `${greeting()} — what do you want to learn today?` : "Hands-on skills for real practice.";
  const showCards = atHome && !query.trim();

  return (
    <div className="physiofeed-root max-w-2xl lg:max-w-4xl mx-auto">
      <style>{".pm-shell{background:#fff !important}"}</style>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {!atHome && (
            <button type="button" aria-label="Back to Learn" onClick={() => { setView("home"); setQuery(""); }} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-50">
              <ChevronLeft size={22} className="text-slate-600"/>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="cl-display text-2xl font-extrabold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        <button aria-label="Notifications" className="p-2 rounded-lg hover:bg-slate-50">
          <Bell size={20} className="text-slate-400"/>
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 h-11 my-4">
        <Search size={16} className="text-slate-400 shrink-0"/>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics, skills, tests…"
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
        />
      </div>

      {showCards && lastItem && (
        <button type="button" onClick={() => openStudy(lastItem.key)} className="w-full flex items-center justify-between gap-3 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-2xl px-4 py-3 mb-3 text-left shadow-md">
          <span className="min-w-0">
            <span className="cl-display block text-[14px] font-extrabold">Pick up where you left off</span>
            <span className="block text-xs text-white/85 truncate">{lastItem.label} · {lastItem.desc}</span>
          </span>
          <span className="text-[11px] font-bold bg-white text-violet-700 rounded-full px-3 py-1.5 shrink-0">Continue</span>
        </button>
      )}
      {showCards ? (
        <>
          {/* Practical Skills and Clinical Cases are live. Test, BPT and Exam Ready are shown as disabled
              "Soon" cards (restored 2026-10-07, Aditi), so students can see what is coming. */}
          <div className="grid grid-cols-2 gap-3">
            {HOME_CARDS.map((c, i) => (
              <HomeCard key={c.id} card={c.count != null ? { ...c, count: ALL_ITEMS.filter(visibleKeys).length } : c} wide={HOME_CARDS.length % 2 === 1 && i === HOME_CARDS.length - 1} onOpen={setView}/>
            ))}
          </div>
        </>
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
