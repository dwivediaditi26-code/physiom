import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, BookOpen, UserRound, Bell, Lock, RotateCcw, Bone, Brain, Trophy, HeartPulse, Baby, PersonStanding,
  MessageCircle, History, MessageSquareText, Stethoscope, ClipboardCheck, Lightbulb, ListChecks, TrendingUp, Sparkles, Check,
} from "lucide-react";
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

// Colour themes (literal class names so Tailwind picks them up).
const SPEC_THEME = {
  msk:    { label: "MSK",        Icon: Bone,           soft: "bg-violet-50", softer: "bg-violet-100", text: "text-violet-700", solid: "bg-violet-600", grad: "from-violet-600 via-violet-500 to-fuchsia-500", border: "border-violet-200", dot: "bg-violet-500", bord: "border-violet-500", ring: "ring-violet-100", line: "bg-violet-400" },
  neuro:  { label: "Neuro",      Icon: Brain,          soft: "bg-sky-50",    softer: "bg-sky-100",    text: "text-sky-700",    solid: "bg-sky-600",    grad: "from-sky-600 via-sky-500 to-indigo-500",       border: "border-sky-200",    dot: "bg-sky-500", bord: "border-sky-500", ring: "ring-sky-100", line: "bg-sky-400" },
  sports: { label: "Sports",     Icon: Trophy,         soft: "bg-orange-50", softer: "bg-orange-100", text: "text-orange-700", solid: "bg-orange-500", grad: "from-orange-500 via-orange-400 to-amber-400",  border: "border-orange-200", dot: "bg-orange-500", bord: "border-orange-500", ring: "ring-orange-100", line: "bg-orange-400" },
  cardio: { label: "Cardio",     Icon: HeartPulse,     soft: "bg-rose-50",   softer: "bg-rose-100",   text: "text-rose-700",   solid: "bg-rose-600",   grad: "from-rose-600 via-rose-500 to-pink-500",       border: "border-rose-200",   dot: "bg-rose-500", bord: "border-rose-500", ring: "ring-rose-100", line: "bg-rose-400" },
  paeds:  { label: "Pediatrics", Icon: Baby,           soft: "bg-pink-50",   softer: "bg-pink-100",   text: "text-pink-700",   solid: "bg-pink-500",   grad: "from-pink-500 via-fuchsia-500 to-purple-500",  border: "border-pink-200",   dot: "bg-pink-500", bord: "border-pink-500", ring: "ring-pink-100", line: "bg-pink-400" },
  geri:   { label: "Geriatrics", Icon: PersonStanding, soft: "bg-amber-50",  softer: "bg-amber-100",  text: "text-amber-700",  solid: "bg-amber-500",  grad: "from-amber-500 via-amber-400 to-yellow-400",   border: "border-amber-200",  dot: "bg-amber-500", bord: "border-amber-500", ring: "ring-amber-100", line: "bg-amber-400" },
};
const STEP_THEME = {
  profile:    { Icon: UserRound,         head: "bg-violet-50",  icon: "bg-violet-500",  text: "text-violet-700",  cell: "border-violet-100" },
  complaint:  { Icon: MessageCircle,     head: "bg-rose-50",    icon: "bg-rose-500",    text: "text-rose-700",    cell: "border-rose-100" },
  history:    { Icon: History,           head: "bg-amber-50",   icon: "bg-amber-500",   text: "text-amber-700",   cell: "border-amber-100" },
  subjective: { Icon: MessageSquareText, head: "bg-sky-50",     icon: "bg-sky-500",     text: "text-sky-700",     cell: "border-sky-100" },
  objective:  { Icon: Stethoscope,       head: "bg-cyan-50",    icon: "bg-cyan-500",    text: "text-cyan-700",    cell: "border-cyan-100" },
  assessment: { Icon: ClipboardCheck,    head: "bg-indigo-50",  icon: "bg-indigo-500",  text: "text-indigo-700",  cell: "border-indigo-100" },
  reasoning:  { Icon: Lightbulb,         head: "bg-fuchsia-50", icon: "bg-fuchsia-500", text: "text-fuchsia-700", cell: "border-fuchsia-100" },
  plan:       { Icon: ListChecks,        head: "bg-orange-50",  icon: "bg-orange-500",  text: "text-orange-700",  cell: "border-orange-100" },
  followup:   { Icon: TrendingUp,        head: "bg-blue-50",    icon: "bg-blue-500",    text: "text-blue-700",    cell: "border-blue-100" },
};
// Short names for the step chips in the case header (the full titles are on the cards).
const STEP_SHORT = { profile: "Patient", complaint: "Complaint", history: "History", subjective: "Subjective", objective: "Exam", assessment: "Assess", reasoning: "Reason", plan: "Plan", followup: "Follow-up" };
const LEVEL_THEME = {
  beginner:     { label: "Beginner",     chip: "bg-emerald-100 text-emerald-700", solid: "bg-emerald-500", dot: "bg-emerald-500" },
  intermediate: { label: "Intermediate", chip: "bg-amber-100 text-amber-700",     solid: "bg-amber-500",   dot: "bg-amber-500" },
  advanced:     { label: "Advanced",     chip: "bg-rose-100 text-rose-700",       solid: "bg-rose-500",    dot: "bg-rose-500" },
};

// A rounded display face for headings (body stays on the app's Inter).
function useDisplayFont() {
  useEffect(() => {
    if (document.getElementById("cl-display-font")) return;
    const l = document.createElement("link");
    l.id = "cl-display-font";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap";
    document.head.appendChild(l);
  }, []);
}
const DISPLAY_CSS = ".cl-display{font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif;letter-spacing:-0.01em}";

function Chip({ active, onClick, children, solid = "bg-violet-600" }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${active ? `${solid} text-white shadow-sm` : "bg-white border border-slate-200 text-slate-600"}`}>
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
          <h1 className="cl-display text-2xl font-extrabold text-slate-900 leading-tight">{title}</h1>
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
        {SPECIALTIES.map((sp) => <Chip key={sp.key} active={spec === sp.key} onClick={() => setSpec(sp.key)} solid={SPEC_THEME[sp.key].solid}>{sp.label}</Chip>)}
      </div>
      {spec !== "msk" ? (
        <SoonNote text={`${SPECIALTIES.find((s) => s.key === spec).label} conditions are coming soon`}/>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="mb-5">
            <div className="cl-display flex items-center gap-2 text-[13px] font-extrabold text-violet-700 mb-2 px-0.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500"/>{g.label}<span className="text-[11px] font-bold text-violet-400">{g.list.length}</span></div>
            {g.list.map((c) => (
              <button key={c.id} type="button" onClick={() => setSelected({ c, regionLabel: g.label })} className="w-full flex items-center gap-3 bg-white border border-violet-100 border-l-4 border-l-violet-500 rounded-2xl px-3.5 py-3 mb-2 text-left shadow-sm hover:shadow-md">
                <span className="cl-display flex-1 text-sm font-bold text-slate-900 leading-snug">{c.name}</span>
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

function StepCard({ step, index, total }) {
  const t = STEP_THEME[step.key] || STEP_THEME.profile;
  const Icon = t.Icon;
  return (
    <div className={`rounded-2xl bg-white border ${t.cell} shadow-sm overflow-hidden`}>
      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 ${t.head}`}>
        <span className={`w-8 h-8 rounded-xl ${t.icon} text-white flex items-center justify-center shadow-sm`}><Icon size={17} strokeWidth={2.2}/></span>
        <div className={`cl-display text-[15px] font-extrabold ${t.text}`}>{step.title}</div>
        <span className={`ml-auto text-[11px] font-bold ${t.text} opacity-60`}>Step {index + 1} of {total}</span>
      </div>
      <div className="p-3.5">
        {step.text && <p className="text-[15px] text-slate-800 leading-relaxed">{step.text}</p>}
        {step.items && (
          <div className="space-y-2">
            {step.items.map(([k, v]) => (
              <div key={k} className={`rounded-xl bg-white border ${t.cell} px-3 py-2 bg-white`}>
                <div className={`text-[10.5px] font-bold uppercase tracking-wider ${t.text}`}>{k}</div>
                <div className="text-sm text-slate-800 mt-0.5 leading-snug">{v}</div>
              </div>
            ))}
          </div>
        )}
        {step.quiz && (
          <div className="mt-3 pt-3 border-t border-dashed border-fuchsia-200">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fuchsia-600 mb-2"><Sparkles size={13}/> Check your reasoning</div>
            <QuickCheck key={step.key} quiz={step.quiz}/>
          </div>
        )}
      </div>
    </div>
  );
}

// Case player layout (2026-09-19, Aditi: "in this page i have scroll down to go
// to next ... a header should present step wise"). Before, every revealed step
// piled up as a card and the Next button sat under the pile. Now: a header
// pinned under the app bar (case, n / 9, numbered step chips), ONE step per
// screen, and a Back / Next bar fixed just above the bottom tabs -- the same
// pinned-bar pattern the Ortho / Neuro / Cardio wizards use (.topbar offset by
// --pm-mobile-hdr-h; .bottombar sitting on --pm-bnav-h). On a laptop the app
// header scrolls away, so the header pins at top:0 there.
const CASE_CSS = `
.cp-head{position:sticky;top:0;z-index:30;background:#fff;padding:4px 0 8px}
@media (max-width:1023px){.cp-head{top:var(--pm-mobile-hdr-h,64px)}}
.cp-bar{position:fixed;left:calc(50% + var(--pm-side-w,0px)/2);transform:translateX(-50%);bottom:var(--pm-bnav-h,calc(60px + env(safe-area-inset-bottom)));width:100%;max-width:672px;z-index:25;background:#fff;border-top:1px solid #e2e8f0;padding:8px 16px;display:flex;gap:10px}
@media (min-width:1024px){.cp-bar{max-width:896px}}
.cp-step{animation:cp-in .22s ease-out}
@keyframes cp-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.cp-step{animation:none}}
`;

// Which element scrolls the page depends on the layout (the viewport, <body> or
// .pm-main -- see AppFull.navTo) and window.scrollTo is a no-op against some of
// them, so scroll whichever ancestor actually moves. Only scrolls up, and only
// when the case has slid under the pinned bar -- if it is already in view,
// leave the page alone.
function keepCaseInView(root, head) {
  if (!root || !head) return;
  try {
    const pinAt = parseFloat(getComputedStyle(head).top) || 0;
    const delta = root.getBoundingClientRect().top - pinAt;
    if (delta >= 0) return;
    for (let p = root; p; p = p.parentElement) {
      const before = p.scrollTop;
      p.scrollTop = before + delta;
      if (p.scrollTop !== before) return;
    }
    window.scrollBy(0, delta);
  } catch { /* scrolling is a nicety, never break the case over it */ }
}

function CasePlayer({ c, onBack }) {
  const [cur, setCur] = useState(0);
  const [max, setMax] = useState(0);
  const rootRef = useRef(null);
  const headRef = useRef(null);
  const stripRef = useRef(null);
  const moved = useRef(false);
  const total = c.steps.length;
  const d = LEVEL_THEME[c.difficulty];
  const th = SPEC_THEME[c.specialty] || SPEC_THEME.msk;
  const step = c.steps[cur];
  const next = c.steps[cur + 1];

  // After every step change: centre its chip in the header and bring the case back into view.
  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip && strip.children[cur];
    if (strip && chip && typeof strip.scrollTo === "function") strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
    if (moved.current) keepCaseInView(rootRef.current, headRef.current);
    moved.current = true;
  }, [cur]);

  const openStep = (i) => { setCur(i); setMax((m) => Math.max(m, i)); };
  const restart = () => { setMax(0); setCur(0); };

  return (
    <div ref={rootRef}>
      <style>{CASE_CSS}</style>

      <div ref={headRef} className="cp-head">
        <div className={`rounded-2xl overflow-hidden border ${th.border} bg-white shadow-sm`}>
          <div className={`flex items-center gap-2.5 px-3 py-2.5 text-white bg-gradient-to-br ${th.grad} saturate-[.78]`}>
            <button type="button" onClick={onBack} aria-label="Back to clinical cases" className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 active:bg-white/30">
              <ChevronLeft size={19}/>
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-white/90 truncate">Case {c.number} · {d.label} · {th.label}</div>
              <div className="cl-display text-[17px] font-extrabold leading-tight truncate">{c.title}</div>
            </div>
            <span className="text-xs font-bold bg-white/20 rounded-full px-2.5 py-1 shrink-0">{cur + 1} / {total}</span>
          </div>
          <div ref={stripRef} className="relative flex overflow-x-auto no-scrollbar px-1 pt-2.5 pb-2">
            {c.steps.map((st, i) => {
              const state = i === cur ? "cur" : i <= max ? "done" : "lock";
              const label = STEP_SHORT[st.key] || st.title;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => { if (state !== "lock") openStep(i); }}
                  aria-current={state === "cur" ? "step" : undefined}
                  aria-disabled={state === "lock" ? "true" : undefined}
                  aria-label={`Step ${i + 1}: ${label}${state === "lock" ? " (locked)" : ""}`}
                  className={`relative shrink-0 grow basis-[62px] flex flex-col items-center ${state === "lock" ? "cursor-default" : ""}`}
                >
                  {i > 0 && <span aria-hidden="true" className={`absolute top-[13px] right-1/2 w-full h-[2px] ${i <= max ? th.line : "bg-slate-200"}`}/>}
                  <span className={`relative z-10 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-bold border-[1.5px] transition-colors ${
                    state === "done" ? `${th.solid} border-transparent text-white` : state === "cur" ? `bg-white ${th.bord} ${th.text} ring-4 ${th.ring}` : "bg-white border-slate-200 text-slate-400"
                  }`}>
                    {state === "done" ? <Check size={14} strokeWidth={3}/> : i + 1}
                  </span>
                  <span className={`mt-1 text-[11px] leading-none whitespace-nowrap ${state === "cur" ? `${th.text} font-bold` : state === "done" ? `${th.text} font-semibold` : "text-slate-400 font-medium"}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 pb-14">
        {cur === 0 && c.stem && (
          <div className={`rounded-2xl ${th.soft} border ${th.border} px-3.5 py-2.5 mb-3 text-[13.5px] ${th.text} leading-snug`}>
            <span className="font-bold">Scenario: </span>{c.stem}
          </div>
        )}
        <div key={step.key} className="cp-step">
          <StepCard step={step} index={cur} total={total}/>
        </div>
      </div>

      <div className="cp-bar">
        {cur > 0 && (
          <button type="button" onClick={() => openStep(cur - 1)} className={`shrink-0 flex items-center justify-center text-center gap-1 rounded-2xl border-2 ${th.border} ${th.soft} ${th.text} px-4 min-h-[46px] text-sm font-bold`}>
            <ChevronLeft size={17}/> Back
          </button>
        )}
        {next ? (
          <button type="button" onClick={() => openStep(cur + 1)} className={`flex-1 flex items-center justify-center text-center gap-1.5 rounded-2xl bg-gradient-to-r ${th.grad} text-white min-h-[46px] text-sm font-bold shadow-md active:scale-[0.99] transition saturate-[.8]`}>
            Next: {STEP_SHORT[next.key] || next.title} <ChevronRight size={17}/>
          </button>
        ) : (
          <button type="button" onClick={restart} className={`flex-1 flex items-center justify-center text-center gap-1.5 rounded-2xl border-2 ${th.border} ${th.soft} ${th.text} min-h-[46px] text-sm font-bold`}>
            <RotateCcw size={15}/> Restart case
          </button>
        )}
      </div>
    </div>
  );
}

function CasesView({ onBack, initialCase }) {
  useDisplayFont();
  const [spec, setSpec] = useState("all");
  const [level, setLevel] = useState("all");
  const [selected, setSelected] = useState(initialCase || null);
  if (selected) return <CasePlayer c={selected} onBack={() => setSelected(null)}/>;
  const list = CLINICAL_CASES.filter((c) => (spec === "all" || c.specialty === spec) && (level === "all" || c.difficulty === level));
  const countFor = (key) => CLINICAL_CASES.filter((c) => key === "all" || c.specialty === key).length;
  return (
    <div>
      <Header title="Clinical Cases" subtitle="Learn through real-life patient cases" onBack={onBack}/>
      <div className="flex gap-2 overflow-x-auto no-scrollbar my-4">
        {CASE_SPECIALTIES.map((sp) => (
          <Chip key={sp.key} active={spec === sp.key} onClick={() => setSpec(sp.key)} solid={sp.key === "all" ? "bg-slate-800" : SPEC_THEME[sp.key].solid}>
            {sp.label} <span className="opacity-70">{countFor(sp.key)}</span>
          </Chip>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
        <Chip active={level === "all"} onClick={() => setLevel("all")} solid="bg-slate-800">Any level</Chip>
        {Object.entries(LEVEL_THEME).map(([k, d]) => (
          <Chip key={k} active={level === k} onClick={() => setLevel(k)} solid={d.solid}>
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${level === k ? "bg-white" : d.dot}`}/>{d.label}
          </Chip>
        ))}
      </div>
      <div className="text-[11px] text-slate-400 mb-3">{level === "all" ? "Beginner: straightforward · Intermediate: multiple findings · Advanced: complex, conflicting findings" : DIFFICULTY[level].hint}</div>
      {list.length === 0 ? (
        <SoonNote text="No cases match these filters"/>
      ) : (
        list.map((c) => {
          const d = LEVEL_THEME[c.difficulty];
          const th = SPEC_THEME[c.specialty] || SPEC_THEME.msk;
          const SpecIcon = th.Icon;
          return (
            <button key={c.id} type="button" onClick={() => setSelected(c)} className={`w-full text-left rounded-2xl bg-white border ${th.border} mb-3 overflow-hidden flex shadow-sm hover:shadow-md active:scale-[0.99] transition`}>
              <span className={`w-16 shrink-0 bg-gradient-to-b ${th.grad} flex flex-col items-center justify-center gap-1 text-white saturate-[.78]`}>
                <SpecIcon size={22} strokeWidth={2}/>
                <span className="cl-display text-lg font-extrabold leading-none">{c.number}</span>
              </span>
              <span className="flex-1 min-w-0 p-3">
                <span className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 ${th.softer} ${th.text}`}>{th.label}</span>
                  <span className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 ${d.chip}`}>{d.label}</span>
                </span>
                <span className="cl-display block text-[15px] font-extrabold text-slate-900 leading-snug">{c.title}</span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{c.stem}</span>
              </span>
              <ChevronRight size={18} className="text-slate-300 self-center mr-2 shrink-0"/>
            </button>
          );
        })
      )}
    </div>
  );
}

/* ---------------- Hub ---------------- */

export default function ClinicalLearning({ onBack }) {
  useDisplayFont();
  const [view, setView] = useState("hub");
  const [caseToOpen, setCaseToOpen] = useState(null);

  let body;
  if (view === "conditions") body = <ConditionsView onBack={() => setView("hub")} onOpenCase={(c) => { setCaseToOpen(c); setView("cases"); }}/>;
  else if (view === "cases") body = <CasesView key={caseToOpen?.id || "list"} initialCase={caseToOpen} onBack={() => { setCaseToOpen(null); setView("hub"); }}/>;
  else {
    const conditionCount = MSK_REGIONS.reduce((n, r) => n + Object.values(r.data).filter((c) => c && c.name).length, 0);
    body = (
      <div>
        <Header title="Clinical Learning" subtitle="Understand the condition, then apply it to a real patient." onBack={onBack}/>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <button type="button" onClick={() => setView("conditions")} className="text-left rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 text-white p-5 shadow-lg relative overflow-hidden active:scale-[0.99] transition saturate-[.68]">
            <BookOpen size={110} strokeWidth={1.2} className="absolute -right-3 -bottom-4 opacity-15" aria-hidden="true"/>
            <span className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center mb-3"><BookOpen size={24}/></span>
            <span className="cl-display block text-xl font-extrabold">Conditions</span>
            <span className="block text-sm text-white/90 mt-0.5">Learn condition-wise clinical knowledge</span>
            <span className="flex flex-wrap gap-1.5 mt-3 relative">
              {Object.values(SPEC_THEME).map((t) => <span key={t.label} className="text-[10.5px] font-bold bg-white/25 rounded-full px-2.5 py-1">{t.label}</span>)}
            </span>
            <span className="block text-[11px] text-white/80 mt-2">{conditionCount} MSK conditions to start</span>
          </button>
          <button type="button" onClick={() => setView("cases")} className="text-left rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 text-white p-5 shadow-lg relative overflow-hidden active:scale-[0.99] transition saturate-[.78]">
            <UserRound size={110} strokeWidth={1.2} className="absolute -right-3 -bottom-4 opacity-15" aria-hidden="true"/>
            <span className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center mb-3"><UserRound size={24}/></span>
            <span className="cl-display block text-xl font-extrabold">Clinical Cases</span>
            <span className="block text-sm text-white/90 mt-0.5">Learn through real-life patient cases</span>
            <span className="flex flex-wrap gap-1.5 mt-3 relative">
              {Object.values(LEVEL_THEME).map((l) => <span key={l.label} className="text-[10.5px] font-bold bg-white rounded-full px-2.5 py-1 text-slate-800 flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${l.dot}`}/>{l.label}</span>)}
            </span>
            <span className="block text-[11px] text-white/80 mt-2">{CLINICAL_CASES.length} cases across {Object.keys(SPEC_THEME).length} specialties</span>
          </button>
        </div>
      </div>
    );
  }
  return <div><style>{DISPLAY_CSS}</style>{body}</div>;
}
