import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen, UserRound, Bell, Lock, RotateCcw } from "lucide-react";
import InfoBox from "./InfoBox.jsx";
import { QuickCheck } from "./SpecialTestDetail.jsx";
import { CLINICAL_CASES, CASE_SPECIALTIES, DIFFICULTY } from "./clinicalCases.js";
import cervicalRaw from "../../cervicalConditions.json";
import thoracicRaw from "../../thoracicConditions.json";
import lumbarRaw from "../../lumbarConditions.json";
import shoulderRaw from "../../shoulderConditions.json";
import elbowRaw from "../../elbowWristHandConditions.json";
import hipRaw from "../../hipConditions.json";
import kneeRaw from "../../kneeConditions.json";
import ankleRaw from "../../ankleFootConditions.json";

// Learn -> Clinical Learning (2026-09-18, Aditi's brief): two pillars.
//   Conditions      -- learn a condition clinically, specialty-wise.
//   Clinical cases  -- learn by working through a patient, step by step.
// MSK conditions come from the app's existing orthopaedic condition library;
// the other specialties are listed but empty until content exists. Sections a
// condition has no data for yet are shown as "Not added yet" rather than
// invented.

const SPECIALTIES = [
  { key: "msk", label: "MSK" },
  { key: "neuro", label: "Neuro" },
  { key: "sports", label: "Sports" },
  { key: "cardio", label: "Cardio" },
  { key: "paeds", label: "Pediatrics" },
  { key: "geri", label: "Geriatrics" },
];

const MSK_REGIONS = [
  { key: "cervical", label: "Cervical spine", data: cervicalRaw },
  { key: "thoracic", label: "Thoracic spine", data: thoracicRaw },
  { key: "lumbar", label: "Lumbar spine", data: lumbarRaw },
  { key: "shoulder", label: "Shoulder", data: shoulderRaw },
  { key: "elbow", label: "Elbow / wrist / hand", data: elbowRaw },
  { key: "hip", label: "Hip", data: hipRaw },
  { key: "knee", label: "Knee", data: kneeRaw },
  { key: "ankle", label: "Ankle / foot", data: ankleRaw },
];

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${active ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
      {children}
    </button>
  );
}

function Header({ title, subtitle, onBack }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <button type="button" aria-label="Back" onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-50">
          <ChevronLeft size={22} className="text-slate-600"/>
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <button aria-label="Notifications" className="p-2 rounded-lg hover:bg-slate-50"><Bell size={20} className="text-slate-400"/></button>
    </div>
  );
}

function SoonNote({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 px-4 text-center">
      <Lock size={22} className="mx-auto text-slate-300 mb-2"/>
      <div className="text-sm font-semibold text-slate-600">{text}</div>
      <div className="text-xs text-slate-400 mt-1">Being added.</div>
    </div>
  );
}

/* ---------------- Conditions ---------------- */

function AccordionSection({ n, title, filled, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left">
        <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${filled ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"}`}>{n}</span>
        <span className={`flex-1 text-sm font-semibold ${filled ? "text-slate-900" : "text-slate-400"}`}>{title}</span>
        {!filled && <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">Soon</span>}
        <ChevronRight size={16} className={`text-slate-300 transition-transform ${open ? "rotate-90" : ""}`}/>
      </button>
      {open && <div className="px-3.5 pb-3.5 space-y-2.5">{filled ? children : <div className="text-xs text-slate-400">Not added yet.</div>}</div>}
    </div>
  );
}

function FindingList({ title, items, interp }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-1.5">{title}</div>
      <div className="space-y-1.5">
        {items.map((f) => {
          const i = interp?.[f];
          return (
            <div key={f} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
              <div className="text-sm font-semibold text-slate-800">{f}</div>
              {i?.text && <div className="text-xs text-slate-600 mt-1 leading-relaxed">{i.text}</div>}
              {i?.source && <div className="text-[10px] text-slate-400 mt-1">{i.source}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tags({ items }) {
  return <div className="flex flex-wrap gap-1.5">{items.map((x) => <span key={x} className="text-xs bg-violet-50 text-violet-700 rounded-full px-2.5 py-1">{x}</span>)}</div>;
}

function ConditionDetail({ c, regionLabel, onBack, onOpenCase }) {
  const fi = c.findingInterpretations || {};
  const presentation = (c.observation?.length || 0) + (c.posture?.length || 0) + (c.palpation?.length || 0) > 0;
  const stttLabels = [...(c.sttt?.resisted || []), ...(c.sttt?.passive || [])].map((f) => f.label);
  const assessed = !!(c.specialTests?.length || stttLabels.length || c.cpa?.muscles?.length || (c.kineticChain && c.kineticChain.applicable !== false) || c.functionalScreen?.name || c.outcomeMeasures?.length);
  const relatedCase = CLINICAL_CASES.find((k) => k.conditionId === c.id);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1"><ChevronLeft size={18}/> Back</button>
      <span className="inline-block text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1 mb-2">MSK • {regionLabel}</span>
      <h2 className="text-xl font-bold text-slate-900 leading-tight mb-4">{c.name}</h2>

      <div className="space-y-2.5">
        <AccordionSection n={1} title="What is it?" filled={false}/>
        <AccordionSection n={2} title="Causes" filled={false}/>
        <AccordionSection n={3} title="Signs and symptoms" filled={false}/>
        <AccordionSection n={4} title="Clinical presentation" filled={presentation} defaultOpen>
          <FindingList title="What you see" items={c.observation} interp={fi.observation}/>
          <FindingList title="Posture" items={c.posture} interp={fi.posture}/>
          <FindingList title="What you feel (palpation)" items={c.palpation} interp={fi.palpation}/>
        </AccordionSection>
        <AccordionSection n={5} title="Assessment" filled={assessed} defaultOpen>
          {c.specialTests?.length > 0 && <div><div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-1.5">Special tests</div><Tags items={c.specialTests}/></div>}
          {stttLabels.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-1.5">Resisted and passive tests</div>
              <Tags items={stttLabels}/>
              {c.sttt?.interpretation && <InfoBox icon="🧭" label="What the pattern means" tint="violet">{c.sttt.interpretation}</InfoBox>}
            </div>
          )}
          {c.cpa?.muscles?.length > 0 && (
            <InfoBox icon="🧠" label="Compensation pattern (CPA)" tint="amber">
              <ul className="space-y-1 list-none p-0 m-0">{c.cpa.muscles.map((m) => <li key={m.name}><span className="font-semibold">{m.name}:</span> {m.state}</li>)}</ul>
              {c.cpa.pattern && <div className="mt-2 text-slate-600">{c.cpa.pattern}</div>}
            </InfoBox>
          )}
          {c.kineticChain && c.kineticChain.applicable !== false && c.kineticChain.name && (
            <InfoBox icon="⛓️" label="Kinetic chain screen" tint="blue">{c.kineticChain.name}{c.kineticChain.fields?.length ? ` — ${c.kineticChain.fields.map((f) => f.label).join("; ")}` : ""}</InfoBox>
          )}
          {c.functionalScreen?.name && <InfoBox icon="🏃" label="Functional screen" tint="green">{c.functionalScreen.name}{c.functionalScreen.note ? ` — ${c.functionalScreen.note}` : ""}</InfoBox>}
          {c.outcomeMeasures?.length > 0 && <div><div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-1.5">Outcome measures</div><Tags items={c.outcomeMeasures}/></div>}
        </AccordionSection>
        <AccordionSection n={6} title="Diagnosis and classification" filled={false}/>
        <AccordionSection n={7} title="Physiotherapy management" filled={false}/>
        <AccordionSection n={8} title="Exercises" filled={false}/>
        <AccordionSection n={9} title="Patient education" filled={false}/>
        <AccordionSection n={10} title="Red flags" filled={false}/>
        <AccordionSection n={11} title="Case example" filled={!!relatedCase}>
          {relatedCase && (
            <button type="button" onClick={() => onOpenCase(relatedCase)} className="w-full text-left rounded-xl bg-violet-50 border border-violet-100 px-3 py-2.5">
              <div className="text-sm font-semibold text-violet-800">Case {relatedCase.number} — {relatedCase.title}</div>
              <div className="text-xs text-violet-700 mt-0.5">{relatedCase.stem}</div>
            </button>
          )}
        </AccordionSection>
      </div>
    </div>
  );
}

function ConditionsView({ onBack, onOpenCase }) {
  const [spec, setSpec] = useState("msk");
  const [selected, setSelected] = useState(null);
  const groups = useMemo(
    () => MSK_REGIONS.map((r) => ({ ...r, list: Object.values(r.data).filter((c) => c && c.name) })).filter((r) => r.list.length),
    []
  );
  if (selected) return <ConditionDetail c={selected.c} regionLabel={selected.regionLabel} onBack={() => setSelected(null)} onOpenCase={onOpenCase}/>;
  return (
    <div>
      <Header title="Conditions" subtitle="Learn condition-wise clinical knowledge" onBack={onBack}/>
      <div className="flex gap-2 overflow-x-auto no-scrollbar my-4">
        {SPECIALTIES.map((s) => <Chip key={s.key} active={spec === s.key} onClick={() => setSpec(s.key)}>{s.label}</Chip>)}
      </div>
      {spec !== "msk" ? (
        <SoonNote text={`${SPECIALTIES.find((s) => s.key === spec).label} conditions are coming soon`}/>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-0.5">{g.label}</div>
            {g.list.map((c) => (
              <button key={c.id} type="button" onClick={() => setSelected({ c, regionLabel: g.label })} className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-3.5 py-3 mb-2 text-left hover:border-violet-300">
                <span className="flex-1 text-sm font-semibold text-slate-900 leading-snug">{c.name}</span>
                <ChevronRight size={16} className="text-slate-300 shrink-0"/>
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

/* ---------------- Clinical cases ---------------- */

function StepCard({ step, index, isLast, onQuizDone }) {
  return (
    <div className="border border-slate-200 rounded-2xl bg-white p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold flex items-center justify-center">{index + 1}</span>
        <div className="text-sm font-bold text-slate-900">{step.title}</div>
      </div>
      {step.text && <p className="text-sm text-slate-700 leading-relaxed">{step.text}</p>}
      {step.items && (
        <div className="space-y-1.5">
          {step.items.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k}</div>
              <div className="text-sm text-slate-700 mt-0.5 leading-snug">{v}</div>
            </div>
          ))}
        </div>
      )}
      {step.quiz && <div className="mt-3 pt-3 border-t border-slate-100"><div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2">Check your reasoning</div><QuickCheck key={step.key} quiz={step.quiz}/></div>}
    </div>
  );
}

function CasePlayer({ c, onBack }) {
  const [shown, setShown] = useState(1);
  const total = c.steps.length;
  const d = DIFFICULTY[c.difficulty];
  const next = c.steps[shown];
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1"><ChevronLeft size={18}/> Back</button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1">Case {c.number}</span>
        <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${d.chip}`}>{d.label}</span>
      </div>
      <h2 className="text-xl font-bold text-slate-900 leading-tight">{c.title}</h2>
      <p className="text-sm text-slate-500 mt-1 mb-3">{c.stem}</p>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(shown / total) * 100}%` }}/></div>
        <div className="text-[11px] font-semibold text-slate-400">{shown} / {total}</div>
      </div>

      <div className="space-y-3">
        {c.steps.slice(0, shown).map((s, i) => <StepCard key={s.key} step={s} index={i} isLast={i === shown - 1}/>)}
      </div>

      {next ? (
        <button type="button" onClick={() => setShown((n) => n + 1)} className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-white py-3 text-sm font-semibold">
          Next: {next.title} <ChevronRight size={16}/>
        </button>
      ) : (
        <button type="button" onClick={() => { setShown(1); window.scrollTo({ top: 0 }); }} className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 py-3 text-sm font-semibold">
          <RotateCcw size={15}/> Restart case
        </button>
      )}
    </div>
  );
}

function CasesView({ onBack, initialCase }) {
  const [spec, setSpec] = useState("all");
  const [selected, setSelected] = useState(initialCase || null);
  if (selected) return <CasePlayer c={selected} onBack={() => setSelected(null)}/>;
  const list = CLINICAL_CASES.filter((c) => spec === "all" || c.specialty === spec);
  return (
    <div>
      <Header title="Clinical Cases" subtitle="Learn through real-life patient cases" onBack={onBack}/>
      <div className="flex gap-2 overflow-x-auto no-scrollbar my-4">
        {CASE_SPECIALTIES.map((s) => <Chip key={s.key} active={spec === s.key} onClick={() => setSpec(s.key)}>{s.label}</Chip>)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
        {Object.values(DIFFICULTY).map((d) => (
          <span key={d.label} className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className={`w-2 h-2 rounded-full ${d.dot}`}/>{d.label} — {d.hint}</span>
        ))}
      </div>
      {list.length === 0 ? (
        <SoonNote text="No cases in this specialty yet"/>
      ) : (
        list.map((c) => {
          const d = DIFFICULTY[c.difficulty];
          return (
            <button key={c.id} type="button" onClick={() => setSelected(c)} className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 mb-2.5 hover:border-violet-300">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2 py-0.5">Case {c.number}</span>
                <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${d.chip}`}>{d.label}</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{c.title}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-snug">{c.stem}</div>
            </button>
          );
        })
      )}
    </div>
  );
}

/* ---------------- Hub ---------------- */

export default function ClinicalLearning({ onBack }) {
  const [view, setView] = useState("hub");
  const [caseToOpen, setCaseToOpen] = useState(null);

  if (view === "conditions") return <ConditionsView onBack={() => setView("hub")} onOpenCase={(c) => { setCaseToOpen(c); setView("cases"); }}/>;
  if (view === "cases") return <CasesView key={caseToOpen?.id || "list"} initialCase={caseToOpen} onBack={() => { setCaseToOpen(null); setView("hub"); }}/>;

  return (
    <div>
      <Header title="Clinical Learning" subtitle="Understand the condition, then apply it to a real patient." onBack={onBack}/>
      <div className="grid grid-cols-1 gap-3 mt-4">
        <button type="button" onClick={() => setView("conditions")} className="text-left rounded-2xl bg-rose-50 p-4 flex items-center gap-3 active:scale-[0.99] transition">
          <span className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-rose-600 shrink-0"><BookOpen size={22}/></span>
          <span className="flex-1 min-w-0">
            <span className="block text-base font-bold text-slate-900">Conditions</span>
            <span className="block text-xs text-slate-600 mt-0.5">Learn condition-wise clinical knowledge</span>
            <span className="block text-[11px] text-slate-500 mt-1">MSK · Neuro · Sports · Cardio · Pediatrics · Geriatrics</span>
          </span>
          <ChevronRight size={18} className="text-slate-400 shrink-0"/>
        </button>
        <button type="button" onClick={() => setView("cases")} className="text-left rounded-2xl bg-indigo-50 p-4 flex items-center gap-3 active:scale-[0.99] transition">
          <span className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-indigo-600 shrink-0"><UserRound size={22}/></span>
          <span className="flex-1 min-w-0">
            <span className="block text-base font-bold text-slate-900">Clinical Cases</span>
            <span className="block text-xs text-slate-600 mt-0.5">Learn through real-life patient cases</span>
            <span className="block text-[11px] text-slate-500 mt-1">Beginner · Intermediate · Advanced</span>
          </span>
          <ChevronRight size={18} className="text-slate-400 shrink-0"/>
        </button>
      </div>
    </div>
  );
}
