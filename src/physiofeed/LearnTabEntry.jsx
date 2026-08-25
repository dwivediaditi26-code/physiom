import { useState, useMemo } from "react";
import {
  Search, Bell, PersonStanding, Eye, Hand, Move,
  Dumbbell, FlaskConical, Brain, BarChart3, Footprints, Bone, Link2,
  Waves, Pill, HandMetal, GraduationCap,
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
// Everything else (Demographics, Subjective, Posture, Observation,
// Palpation, and the rest of Advanced Assessment/Treatment & Exercise)
// still has no such per-item data, so it keeps its single card as before
// -- no study mode invented for it.
const STUDY_TYPES = new Set(["rom", "mmt", "special", "neuro", "outcome", "kinetic", "fma"]);

// Real section keys, pulled straight from physiom's own ALL_TESTS (see
// src/sharedClinicalData.js) -- same labels, same navTo(key) targets the
// desktop sidebar and old bottom nav already used. Nothing fabricated:
// every card here opens the exact same real screen those did.
const ASSESSMENT_LIBRARY = [
  { key: "posture", label: "Posture Analysis", desc: "AI posture screening", icon: PersonStanding, tint: "teal" },
  { key: "observation", label: "Observation", desc: "Visual inspection", icon: Eye, tint: "amber" },
  { key: "palpation", label: "Palpation", desc: "Tissue assessment", icon: Hand, tint: "rose" },
  { key: "rom", label: "ROM", desc: "Range of motion", icon: Move, tint: "violet" },
  { key: "mmt", label: "MMT", desc: "Muscle testing", icon: Dumbbell, tint: "green" },
  { key: "special", label: "Special Tests", desc: "Orthopedic (100+)", icon: FlaskConical, tint: "blue" },
  { key: "neuro", label: "Neurological", desc: "Full neuro exam", icon: Brain, tint: "amber" },
  { key: "outcome", label: "Outcome Measures", desc: "Validated scales", icon: BarChart3, tint: "teal" },
];

const ADVANCED_ASSESSMENT = [
  { key: "fma", label: "Functional Movement", desc: "Movement analysis", icon: Footprints, tint: "violet" },
  { key: "gait", label: "Gait Analysis", desc: "Full gait assessment", icon: Footprints, tint: "green" },
  { key: "cyriax_full", label: "STTT", desc: "Selective tissue tension", icon: Bone, tint: "rose" },
  { key: "kinetic", label: "Kinetic Chain", desc: "Joint-by-joint", icon: Link2, tint: "blue" },
  { key: "nkt", label: "CPA", desc: "Compensation pattern analysis", icon: Brain, tint: "amber" },
  { key: "fascia", label: "Fascia Integration", desc: "Fascial assessment", icon: Waves, tint: "teal" },
];

const TREATMENT_EXERCISE = [
  { key: "treatment", label: "Treatment", desc: "Techniques & plan", icon: Pill, tint: "green" },
  { key: "exercise", label: "Exercise Prescription", desc: "Treatment plan", icon: Dumbbell, tint: "violet" },
  { key: "tx_techniques", label: "Tx Techniques", desc: "Manual therapy", icon: HandMetal, tint: "rose" },
];

const TINTS = {
  violet: "bg-violet-50 text-violet-600",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  teal: "bg-teal-50 text-teal-600",
};

function Card({ item, onNav, onStudy }) {
  const Icon = item.icon;
  const studyable = STUDY_TYPES.has(item.key);
  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl hover:border-violet-200 transition-colors">
      <button onClick={() => onNav(item.key)} className="text-left w-full p-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${TINTS[item.tint]}`}>
          <Icon size={20} strokeWidth={2}/>
        </div>
        <div className="font-semibold text-sm text-slate-900">{item.label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
      </button>
      {studyable && (
        <button
          onClick={(e) => { e.stopPropagation(); onStudy(item.key); }}
          className="flex items-center gap-1 mx-4 mb-3.5 -mt-1 text-[11px] font-semibold text-violet-600 bg-violet-50 rounded-full px-2.5 py-1 w-fit"
        >
          <GraduationCap size={12}/> Study mode
        </button>
      )}
    </div>
  );
}

function Section({ title, items, onNav, onStudy }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="font-semibold text-slate-900 mb-3">{title}</div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => <Card key={item.key} item={item} onNav={onNav} onStudy={onStudy}/>)}
      </div>
    </div>
  );
}

export default function LearnTabEntry({ onNav }) {
  const [query, setQuery] = useState("");
  const [studyType, setStudyType] = useState(null);

  const filter = (items) => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
  };

  const filtered = useMemo(() => ({
    assess: filter(ASSESSMENT_LIBRARY),
    adv: filter(ADVANCED_ASSESSMENT),
    tx: filter(TREATMENT_EXERCISE),
  }), [query]);

  const noResults = filtered.assess.length === 0 && filtered.adv.length === 0 && filtered.tx.length === 0;

  if (studyType) {
    return (
      <div className="physiofeed-root max-w-2xl lg:max-w-4xl mx-auto">
        <StudyMode type={studyType} onBack={() => setStudyType(null)}/>
      </div>
    );
  }

  return (
    <div className="physiofeed-root max-w-2xl lg:max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Learn</h1>
          <p className="text-sm text-slate-500">Explore. Learn. Grow.</p>
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
          placeholder="Search assessments, tests…"
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
        />
      </div>

      {noResults ? (
        <div className="text-center py-14 text-slate-400 text-sm">No matches for "{query}".</div>
      ) : (
        <>
          <Section title="Assessment Library" items={filtered.assess} onNav={onNav} onStudy={setStudyType}/>
          <Section title="Advanced Assessment" items={filtered.adv} onNav={onNav} onStudy={setStudyType}/>
          <Section title="Treatment & Exercise" items={filtered.tx} onNav={onNav} onStudy={setStudyType}/>
        </>
      )}
    </div>
  );
}
