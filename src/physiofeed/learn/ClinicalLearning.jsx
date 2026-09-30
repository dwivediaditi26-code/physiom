import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, UserRound, Bell, Lock, RotateCcw, Bone, Brain, Trophy, HeartPulse, Baby, PersonStanding,
  MessageCircle, History, MessageSquareText, Stethoscope, ClipboardCheck, Lightbulb, ListChecks, TrendingUp, Sparkles, Check,
} from "lucide-react";
import { QuickCheck } from "./QuickCheck.jsx";
import { PINNED_BAR_CSS } from "./pinnedBar.js";
import { keepInView } from "./scrollKit.js";
import { CLINICAL_CASES, CASE_SPECIALTIES, DIFFICULTY } from "./clinicalCases.js";

// Learn -> Clinical Learning: Clinical Cases -- learn by working through a
// patient, step by step. The Conditions pillar (MSK condition library,
// specialty-wise) was removed 2026-09-29 (Aditi: "remove condition in
// learn").

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
${PINNED_BAR_CSS}
.cp-step{animation:cp-in .22s ease-out}
@keyframes cp-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.cp-step{animation:none}}
`;

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
    if (moved.current) keepInView(rootRef.current, parseFloat(getComputedStyle(headRef.current).top) || 0, 0);
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

      <div className="pin-bar">
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

function CasesView({ onBack }) {
  useDisplayFont();
  const [spec, setSpec] = useState("all");
  const [level, setLevel] = useState("all");
  const [selected, setSelected] = useState(null);
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

// Clinical Learning IS Clinical Cases now that Conditions is gone
// (2026-09-29) -- a hub screen with a single destination card was just an
// extra tap, so this opens straight into CasesView instead.
export default function ClinicalLearning({ onBack }) {
  useDisplayFont();
  return <div><style>{DISPLAY_CSS}</style><CasesView onBack={onBack}/></div>;
}
