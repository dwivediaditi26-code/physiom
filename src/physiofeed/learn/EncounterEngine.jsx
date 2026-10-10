import { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Check, X, BookOpen, Eye, Move, Hand, Brain, Activity, Footprints, User, Briefcase,
  Clock, Heart, MapPin, History, HeartPulse, Lightbulb, HelpCircle, RotateCcw, ShieldAlert, AlertTriangle, ListChecks,
} from "lucide-react";
import { TAGS, allQuestions } from "./lumbarEncounter.js";

// EncounterEngine: plays a clinical case as one continuous consultation (see
// lumbarEncounter.js). The student chooses what to ask or examine; the patient
// answers with only the documented response; the clinical record fills up with
// only what was asked; a reasoning question then checks what the student does
// with it; a feedback page explains the answer. The engine adds no clinical
// wording of its own beyond button and label text. Layout follows Aditi's
// mockup of the encounter (2026-10-11).

// The mockup is clean sans-serif; set it here so the case never falls back to a serif face.
export const SANS = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const img = (name) => `${import.meta.env.BASE_URL || "/"}sim/${name}.webp`;
const ICONS = { user: User, work: Briefcase, pain: Activity, clock: Clock, walk: Footprints, heal: HeartPulse, pin: MapPin, history: History, heart: Heart, eye: Eye, move: Move, hand: Hand, neuro: Brain, nerve: Activity, shield: ShieldAlert };
const ICON_BG = ["bg-blue-100 text-blue-600", "bg-amber-100 text-amber-600", "bg-rose-100 text-rose-500", "bg-emerald-100 text-emerald-600", "bg-violet-100 text-violet-600"];

function track(name, caseId, properties) {
  // The existing analytics function, loaded on demand so the case works without it.
  import("../../analytics/trackEvent.js").then((m) => m.trackEvent(name, { entityType: "case", entityId: caseId, properties })).catch(() => {});
}
// The data starts each explanation with "Correct." / "Incorrect."; the card already says so.
const plain = (why = "") => why.replace(/^(Correct|Incorrect)\.\s*/, "");
const storageKey = (id) => `pm_case_${id}_v3`;
function load(id) { try { return JSON.parse(localStorage.getItem(storageKey(id)) || "null"); } catch { return null; } }
function save(id, v) { try { localStorage.setItem(storageKey(id), JSON.stringify(v)); } catch { /* private mode: progress stays in this session */ } }

const TAG_STYLE = { DOCUMENTED: "bg-emerald-100 text-emerald-800", INTERPRETATION: "bg-violet-100 text-violet-800", "STILL TO CHECK": "bg-amber-100 text-amber-800" };
function TagChip({ tag }) {
  const t = TAGS[tag];
  if (!t || tag === "DOCUMENTED") return null;
  return <span title={t.hint} className={`ml-1.5 align-middle inline-block text-[9px] font-extrabold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${TAG_STYLE[tag]}`}>{t.label}</span>;
}

function IconTile({ name, i = 0, size = 16 }) {
  const I = ICONS[name] || Activity;
  return <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${ICON_BG[i % ICON_BG.length]}`}><I size={size} strokeWidth={2}/></span>;
}

function SafeImg({ src, className, alt = "", fallback = false }) {
  const [bad, setBad] = useState(false);
  if (bad && fallback) return null;
  if (bad) return <span aria-hidden="true" className={`${className} flex items-center justify-center text-4xl bg-slate-100`}>🧑</span>;
  return <img src={src} alt={alt} className={className} onError={() => setBad(true)}/>;
}

function Panel({ title, children, tone = "white", testid }) {
  const tones = { white: "bg-white border-slate-200", lilac: "bg-indigo-50/70 border-indigo-100", amber: "bg-amber-50 border-amber-200", green: "bg-emerald-50 border-emerald-200", violet: "bg-violet-50 border-violet-200", sky: "bg-sky-50 border-sky-100" };
  return (
    <section data-testid={testid} className={`rounded-2xl border p-3 ${tones[tone]}`}>
      {title && <h3 className="cl-display font-extrabold text-[13px] text-indigo-900 mb-2">{title}</h3>}
      {children}
    </section>
  );
}

// Picture + comic-style speech bubble on top of a clinic scene.
function Hero({ art, quote, small = false }) {
  return (
    <div data-testid="engine-hero" className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-b from-sky-50 to-amber-50 flex ${small ? "min-h-[170px]" : "min-h-[250px]"}`}>
      <SafeImg src={img(art)} alt="The patient" className={`self-end shrink-0 object-contain object-bottom ${small ? "w-[40%] max-h-[190px]" : "w-[46%] max-h-[270px]"}`}/>
      <div className="flex-1 min-w-0 p-2.5 flex items-center">
        <div data-testid="engine-quote" className="relative w-full rounded-2xl border-2 border-slate-800 bg-white px-3 py-2.5 text-[12.5px] leading-snug text-slate-800 shadow-sm">
          <span aria-hidden="true" className="absolute -left-[9px] top-8 w-4 h-4 bg-white border-l-2 border-b-2 border-slate-800 rotate-45"/>
          {quote}
        </div>
      </div>
    </div>
  );
}

function RecordAdded({ items, title = "Information added to your clinical record" }) {
  return (
    <Panel title={title} tone="sky" testid="record-added">
      <ul className="space-y-1.5 list-none p-0 m-0">
        {items.map((it, n) => (
          <li key={n} className="flex items-start gap-2 text-[12.5px] text-slate-800 leading-snug">
            <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={10} strokeWidth={4}/></span>
            <span>{it.text}<TagChip tag={it.tag}/></span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ── radio list used for "what would you like to ask / examine" ───────────────
function ChoiceList({ items, value, onChange, doneIds = [], plain = false }) {
  return (
    <div role="radiogroup" aria-label="Choices" className="space-y-1.5">
      {items.map((it, n) => {
        const on = value === it.id;
        const done = doneIds.includes(it.id);
        return (
          <button key={it.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(it.id)}
            className={`w-full text-left flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${on ? "border-blue-500 bg-blue-50 font-bold text-blue-900" : "border-slate-200 bg-white text-slate-800"}`}>
            {it.icon && !plain ? <IconTile name={it.icon} i={n}/> : <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${on ? "border-blue-600" : "border-slate-300"}`}>{on && <span className="w-2 h-2 rounded-full bg-blue-600"/>}</span>}
            <span className="flex-1 leading-snug">{it.label}</span>
            {done && <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={12} strokeWidth={4}/></span>}
          </button>
        );
      })}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, testid }) {
  return (
    <button type="button" data-testid={testid} disabled={disabled} onClick={onClick}
      className={`w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${disabled ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white"}`}>
      {children}
    </button>
  );
}

// ── the reasoning question ───────────────────────────────────────────────────
function Question({ mcq, state, onPick, onSubmit }) {
  const submitted = !!state?.submitted;
  const picked = state?.picked ?? null;
  return (
    <section data-testid={`mcq-${mcq.id}`} className="rounded-2xl border border-violet-200 bg-white overflow-hidden">
      <div className="bg-violet-50 px-3 py-2 flex items-start gap-2 border-b border-violet-100">
        <span className="mt-0.5 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0"><HelpCircle size={13}/></span>
        <div><div className="text-[11.5px] font-extrabold text-rose-600">Your next task</div><h3 id={`q-${mcq.id}`} className="text-[14px] font-bold text-indigo-950 leading-snug">{mcq.q}</h3></div>
      </div>
      <div className="p-3">
        <div role="radiogroup" aria-labelledby={`q-${mcq.id}`} className="space-y-2">
          {mcq.options.map((o) => {
            const isPicked = picked === o.id;
            return (
              <button key={o.id} type="button" role="radio" aria-checked={isPicked} disabled={submitted} onClick={() => onPick(o.id)}
                className={`w-full text-left flex items-start gap-2.5 rounded-xl border px-2.5 py-2 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${isPicked ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${isPicked ? "border-blue-600" : "border-slate-300"}`}>{isPicked && <span className="w-2 h-2 rounded-full bg-blue-600"/>}</span>
                <span className="font-bold text-slate-500 shrink-0">{o.id}.</span>
                <span className="text-slate-800 leading-snug">{o.text}</span>
              </button>
            );
          })}
        </div>
        {!submitted && <div className="mt-3"><PrimaryButton disabled={picked === null} onClick={onSubmit}>Submit Answer</PrimaryButton></div>}
      </div>
    </section>
  );
}

// ── the feedback page ────────────────────────────────────────────────────────
function Feedback({ mcq, state, keyPoint, children, onContinue, continueLabel = "Continue", continueDisabled }) {
  const right = state?.picked === mcq.correct;
  const best = mcq.options.find((o) => o.id === mcq.correct);
  const others = mcq.options.filter((o) => o.id !== mcq.correct);
  return (
    <div className="space-y-3" data-testid="feedback">
      <div role="status" className={`rounded-2xl border p-3 ${right ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
        <div className={`flex items-center gap-2 font-extrabold text-[16px] ${right ? "text-emerald-800" : "text-rose-800"}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${right ? "bg-emerald-500" : "bg-rose-500"}`}>{right ? <Check size={16}/> : <X size={16}/>}</span>
          {right ? "Correct" : "Not quite"}
        </div>
        {!right && <p className="text-[12.5px] text-slate-800 mt-1.5"><span className="font-bold">The best answer is {best.id}:</span> {best.text}</p>}
        <p data-testid={`why-${mcq.id}-${best.id}`} className="text-[12.5px] leading-snug text-slate-700 mt-1.5">{plain(best.why)}</p>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-3">
        <div className="text-[12.5px] font-extrabold text-indigo-950 mb-2">Why the other options are incorrect:</div>
        <ul className="space-y-2 list-none p-0 m-0">
          {others.map((o) => (
            <li key={o.id} data-testid={`why-${mcq.id}-${o.id}`} className="flex items-start gap-2 text-[12.5px] leading-snug text-slate-700">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"><X size={10} strokeWidth={4}/></span>
              <span><span className="font-bold text-slate-900">{o.id}.</span> {plain(o.why)}{state?.picked === o.id && <span className="ml-1 font-bold text-rose-600">(your choice)</span>}</span>
            </li>
          ))}
        </ul>
      </div>
      {children}
      {keyPoint && (
        <section data-testid="takeaway" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
          <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><Lightbulb size={16}/></span>
          <div><div className="text-[12.5px] font-extrabold text-amber-900">Key learning point</div><p className="text-[12.5px] text-slate-800 leading-snug">{keyPoint}</p></div>
        </section>
      )}
      <PrimaryButton onClick={onContinue} disabled={continueDisabled}>{continueLabel} <ChevronRight size={16}/></PrimaryButton>
    </div>
  );
}

function LumbarSchematic() {
  const bodies = [["L1", 14], ["L2", 62], ["L3", 110], ["L4", 158], ["L5", 206]];
  return (
    <svg viewBox="0 0 220 290" role="img" aria-label="Simple schematic of the lumbar spine from L1 to the sacrum, side view. L4–L5 and L5–S1 are labelled." className="w-full max-w-[190px] mx-auto">
      <title>Lumbar spine schematic</title>
      {bodies.map(([n, y], k) => (
        <g key={n}>
          <rect x={70 + (k === 4 ? 2 : 0)} y={y} width="64" height="36" rx="9" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5"/>
          <text x="102" y={y + 23} textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">{n}</text>
          <rect x="132" y={y + 6} width="26" height="10" rx="5" fill="#f1f5f9" stroke="#cbd5e1"/>
        </g>
      ))}
      {[0, 1, 2, 3].map((k) => <rect key={k} x="74" y={50 + k * 48} width="56" height="12" rx="6" fill="#bfdbfe" stroke="#93c5fd"/>)}
      <rect x="76" y="242" width="56" height="12" rx="6" fill="#bfdbfe" stroke="#93c5fd"/>
      <path d="M74 256 L136 256 L146 286 L88 286 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5"/>
      <text x="112" y="277" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">Sacrum</text>
      <line x1="10" y1="200" x2="64" y2="200" stroke="#2563eb" strokeWidth="1.5"/><text x="8" y="194" fontSize="10.5" fontWeight="700" fill="#1d4ed8">L4–L5</text>
      <line x1="10" y1="248" x2="70" y2="248" stroke="#2563eb" strokeWidth="1.5"/><text x="8" y="242" fontSize="10.5" fontWeight="700" fill="#1d4ed8">L5–S1</text>
      <text x="164" y="30" fontSize="10" fill="#64748b">Facet</text><text x="164" y="42" fontSize="10" fill="#64748b">joints</text>
      <text x="14" y="128" fontSize="10" fill="#64748b">Discs</text>
    </svg>
  );
}

function References({ refs, onClose }) {
  return (
    <div role="dialog" aria-label="Clinical references" className="rounded-2xl border border-sky-200 bg-white p-3 shadow-md mb-3" data-testid="references-panel">
      <div className="flex items-center justify-between mb-2">
        <h3 className="cl-display font-extrabold text-[13.5px] text-slate-900 flex items-center gap-1.5"><BookOpen size={15}/> Clinical references</h3>
        <button type="button" onClick={onClose} aria-label="Close references" className="p-1 rounded-lg hover:bg-slate-100"><X size={16}/></button>
      </div>
      <div className="space-y-3">
        {refs.map((r) => (
          <div key={r.title} className="text-[12px] leading-snug">
            <div className="font-bold text-slate-900">{r.title}</div>
            {r.url && <a className="text-blue-700 underline break-all block" href={r.url} target="_blank" rel="noreferrer noopener">{r.url}</a>}
            {r.url2 && <a className="text-blue-700 underline break-all block" href={r.url2} target="_blank" rel="noreferrer noopener">{r.url2}</a>}
            <ul className="mt-1 space-y-0.5 text-slate-600 list-none p-0 m-0">{r.points.map((p) => <li key={p}>• {p}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── the engine ───────────────────────────────────────────────────────────────
const FRESH = { view: { name: "hub" }, asked: [], answers: {}, safetyViewed: [], examViewed: [], planPicks: [], planWhy: "", imgTab: "xray" };

export default function EncounterEngine({ data, onExit, exitLabel = "Return to Lumbar Cases" }) {
  const saved = useMemo(() => load(data.id), [data.id]);
  const [st, setSt] = useState({ ...FRESH, ...(saved || {}) });
  const [pick, setPick] = useState(null);          // selection in the current choice list
  const [safetyOpen, setSafetyOpen] = useState(null);
  const [showRefs, setShowRefs] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const topRef = useRef(null);
  const set = (patch) => setSt((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  const go = (view) => { setPick(null); set({ view }); };

  useEffect(() => { save(data.id, st); }, [data.id, st]);
  useEffect(() => { try { topRef.current?.scrollIntoView?.({ block: "start" }); } catch { /* old browsers */ } }, [st.view.name, st.view.id]);

  const { view, answers } = st;
  const reportTracked = useRef(false);
  useEffect(() => { if (view.name === "report" && !reportTracked.current) { reportTracked.current = true; track("case_completed", data.id, {}); } }, [view.name, data.id]);
  const done = (q) => !!answers[q.id]?.submitted;
  const topicsLeft = data.topics.filter((t) => !done(t.mcq));
  const safetyDone = done(data.safety.mcq);
  const examDone = data.exam.domains.every((d) => st.examViewed.includes(d.id) && (!d.mcq || done(d.mcq)));
  const historyLeft = topicsLeft.length + (safetyDone ? 0 : 1);

  const milestonesDone = data.topics.filter((t) => done(t.mcq)).length + (safetyDone ? 1 : 0) + (examDone ? 1 : 0)
    + (done(data.imaging.mcq) ? 1 : 0) + (done(data.impression.mcq) ? 1 : 0) + (done(data.management.mcq) && st.planPicks.length === data.management.plan.picks ? 1 : 0) + (view.name === "report" ? 1 : 0);
  const total = data.milestones.length;
  const step = Math.min(total, milestonesDone + 1);

  function choose(q, id) { setSt((s) => (s.answers[q.id]?.submitted ? s : { ...s, answers: { ...s.answers, [q.id]: { ...s.answers[q.id], picked: id } } })); }
  function submit(q, next) {
    setSt((s) => {
      const cur = s.answers[q.id];
      if (!cur || cur.picked == null || cur.submitted) return s; // no double submission
      const attempts = (cur.attempts || 0) + 1;
      track("case_mcq_submitted", data.id, { question: q.id, selected: cur.picked, correct: cur.picked === q.correct, attempt: attempts });
      return { ...s, answers: { ...s.answers, [q.id]: { ...cur, submitted: true, attempts } }, view: next };
    });
    setPick(null);
  }
  function restart() { setSt({ ...FRESH }); setPick(null); setSafetyOpen(null); setConfirmRestart(false); setOnlyWrong(false); }

  // The cumulative clinical record: only what the student has actually asked / examined.
  const record = [];
  st.asked.forEach((id) => { const t = data.topics.find((x) => x.id === id); if (t && st.answers[t.mcq.id]?.submitted) record.push({ heading: t.label, items: t.record }); });
  if (st.safetyViewed.length) record.push({ heading: "Safety screening", items: st.safetyViewed.map((id) => ({ text: `${data.safety.topics.find((x) => x.id === id).label}: answer not provided in the supplied case — ask and document it.`, tag: "STILL TO CHECK" })) });
  st.examViewed.forEach((id) => { const d = data.exam.domains.find((x) => x.id === id); if (d) record.push({ heading: d.label, items: d.findings }); });
  if (st.answers[data.imaging.mcq.id]?.submitted) record.push({ heading: "Imaging", items: data.imaging.tabs.map((t) => ({ text: `${t.label}: ${t.caption}`, tag: "DOCUMENTED" })) });

  const RecordSoFar = () => (record.length === 0 ? null : (
    <details data-testid="record-so-far" className="rounded-2xl border border-slate-200 bg-white p-3">
      <summary className="cl-display font-extrabold text-[12.5px] text-slate-800 cursor-pointer flex items-center gap-1.5"><ListChecks size={14} className="inline"/> Your clinical record so far</summary>
      <div className="mt-2 space-y-2">{record.map((g) => (
        <div key={g.heading}><div className="text-[11.5px] font-extrabold text-slate-700">{g.heading}</div>
          <ul className="list-none p-0 m-0 space-y-0.5">{g.items.map((it, n) => <li key={n} className="text-[12px] text-slate-600 leading-snug">• {it.text}<TagChip tag={it.tag}/></li>)}</ul></div>
      ))}</div>
    </details>
  ));

  const header = (
    <div className="mb-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <button type="button" aria-label="Back to cases" onClick={onExit} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-50"><ChevronLeft size={22} className="text-slate-600"/></button>
        <SafeImg src={`${import.meta.env.BASE_URL || "/"}logo-icon.svg`} className="w-5 h-5 object-contain" fallback/>
        <span className="font-extrabold text-[14px] text-indigo-950">PhysioMind</span>
        <span className="flex-1"/>
        <button type="button" onClick={() => setShowRefs((v) => !v)} aria-expanded={showRefs} aria-label="References" className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1"><BookOpen size={13}/> Refs</button>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-[13px] text-indigo-900 whitespace-nowrap">{data.title}</span>
        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label="Case progress">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(step / total) * 100}%` }}/>
        </div>
        <span className="text-[12px] font-bold text-slate-500 tabular-nums" data-testid="engine-count">{step}/{total}</span>
      </div>
    </div>
  );

  const BackLink = ({ to }) => <button type="button" onClick={() => go(to)} className="text-[12px] font-bold text-slate-500 flex items-center gap-0.5 -mb-1"><ChevronLeft size={14}/> Back</button>;
  const Title = ({ children }) => <h2 className="cl-display text-[19px] font-extrabold text-indigo-950 leading-tight" data-testid="engine-title">{children}</h2>;
  let body = null;

  // ── hub: what would you like to ask? ──
  if (view.name === "hub") {
    const first = st.asked.length === 0 && !safetyDone;
    if (historyLeft === 0) {
      body = (
        <>
          <Title>History complete</Title>
          <p className="text-[12.5px] text-slate-500">You have covered the history. Review your clinical record, then examine the patient.</p>
          <RecordSoFar/>
          <PrimaryButton onClick={() => go({ name: "examHub" })}>Move to the physical examination <ChevronRight size={16}/></PrimaryButton>
        </>
      );
    } else {
      const items = [...topicsLeft.map((t) => ({ id: t.id, label: t.label, icon: t.icon })), ...(safetyDone ? [] : [{ id: "safety", label: data.safety.label, icon: "shield" }])];
      body = (
        <>
          <Title>{first ? "1. Meet Your Patient" : "What would you like to ask next?"}</Title>
          {first && <p className="text-[12.5px] text-slate-500 leading-snug">{data.intro.instruction}</p>}
          <Hero art={data.intro.art} quote={first ? data.intro.quote : "What else would you like to know about my pain?"} small={!first}/>
          {first && (
            <Panel title="Patient information" tone="lilac"><ul className="space-y-2 list-none p-0 m-0">{data.intro.info.map(([ic, k, v], n) => <li key={k} className="flex items-center gap-2.5"><IconTile name={ic} i={n}/><span className="text-[12.5px]"><span className="font-bold text-slate-900">{k}: </span><span className="text-slate-700">{v}</span></span></li>)}</ul></Panel>
          )}
          <div className="text-[12.5px] font-extrabold text-indigo-950">{first ? "What would you like to do first?" : "Choose your next question"}</div>
          <ChoiceList items={items} value={pick} onChange={setPick} plain={first}/>
          <PrimaryButton disabled={!pick} onClick={() => {
            if (pick === "safety") go({ name: "safety" });
            else { set((s) => ({ asked: s.asked.includes(pick) ? s.asked : [...s.asked, pick] })); go({ name: "topic", id: pick }); }
          }}>Ask this question</PrimaryButton>
          <RecordSoFar/>
        </>
      );
    }
  }

  // ── a history topic: the patient answers, then the reasoning question ──
  if (view.name === "topic") {
    const t = data.topics.find((x) => x.id === view.id);
    body = (
      <>
        {!done(t.mcq) && <BackLink to={{ name: "hub" }}/>}
        <Title>Patient's Response</Title>
        <Hero art={t.art || data.intro.art} quote={`“${t.quote}”`}/>
        <RecordAdded items={t.record}/>
        <Question mcq={t.mcq} state={answers[t.mcq.id]} onPick={(id) => choose(t.mcq, id)} onSubmit={() => submit(t.mcq, { name: "feedback", id: t.mcq.id, kind: "topic", of: t.id })}/>
      </>
    );
  }

  // ── safety screening ──
  if (view.name === "safety") {
    const sf = data.safety;
    const open = sf.topics.find((x) => x.id === safetyOpen);
    body = (
      <>
        {!safetyDone && <BackLink to={{ name: "hub" }}/>}
        <Title>Safety Screening</Title>
        <Hero art={data.intro.art} quote={sf.bubble} small/>
        <ChoiceList items={sf.topics.map((x) => ({ id: x.id, label: x.label, icon: "shield" }))} value={pick} onChange={setPick} doneIds={st.safetyViewed}/>
        <PrimaryButton disabled={!pick} onClick={() => { set((s) => ({ safetyViewed: s.safetyViewed.includes(pick) ? s.safetyViewed : [...s.safetyViewed, pick] })); setSafetyOpen(pick); }}>Ask this question</PrimaryButton>
        {open && (
          <Panel title={sf.note.title} tone="amber" testid="safety-note">
            <p className="text-[12.5px] font-bold text-amber-900 flex items-start gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0"/>{sf.note.warning}</p>
            <p className="text-[12.5px] text-slate-800 mt-1">{sf.note.body}</p>
            <div className="mt-2 text-[11.5px] font-extrabold text-slate-700">Questions to ask in a real consultation</div>
            <ul className="list-none p-0 m-0 space-y-0.5 mt-0.5">{open.questions.map((q) => <li key={q} className="text-[12.5px] text-slate-700">• {q}</li>)}</ul>
            <div className="mt-2 text-[11.5px] font-extrabold text-slate-700">Why this matters</div>
            <ul className="list-none p-0 m-0 space-y-0.5 mt-0.5">{sf.note.why.map((q) => <li key={q} className="text-[12.5px] text-slate-700">• {q}</li>)}</ul>
          </Panel>
        )}
        <Panel title="What the case does document" tone="lilac">
          <ul className="list-none p-0 m-0 space-y-1">{sf.documented.map((it, n) => <li key={n} className="text-[12.5px] text-slate-700">• {it.text}</li>)}</ul>
          <div className="mt-2 text-[11.5px] font-extrabold text-amber-800">Still to check</div>
          <ul className="list-none p-0 m-0 space-y-1 mt-0.5">{sf.stillToCheck.map((it, n) => <li key={n} className="text-[12.5px] text-slate-700">• {it.text}<TagChip tag={it.tag}/></li>)}</ul>
        </Panel>
        {st.safetyViewed.length > 0
          ? <Question mcq={sf.mcq} state={answers[sf.mcq.id]} onPick={(id) => choose(sf.mcq, id)} onSubmit={() => submit(sf.mcq, { name: "feedback", id: sf.mcq.id, kind: "safety" })}/>
          : <p className="text-[12px] text-slate-500">Choose at least one safety topic to continue.</p>}
      </>
    );
  }

  // ── examination hub ──
  if (view.name === "examHub") {
    const ex = data.exam;
    const doneIds = ex.domains.filter((d) => st.examViewed.includes(d.id) && (!d.mcq || done(d.mcq))).map((d) => d.id);
    body = (
      <>
        <Title>{ex.title}</Title>
        <p className="text-[12.5px] text-slate-500">{ex.prompt}</p>
        <ChoiceList items={ex.domains.map((d) => ({ id: d.id, label: d.label, icon: d.icon }))} value={pick} onChange={setPick} doneIds={doneIds}/>
        {!examDone && <PrimaryButton disabled={!pick || doneIds.includes(pick)} onClick={() => { set((s) => ({ examViewed: s.examViewed.includes(pick) ? s.examViewed : [...s.examViewed, pick] })); go({ name: "exam", id: pick }); }}>Perform this examination</PrimaryButton>}
        {examDone && <PrimaryButton onClick={() => go({ name: "imaging" })}>Continue to the imaging <ChevronRight size={16}/></PrimaryButton>}
        <RecordSoFar/>
      </>
    );
  }

  if (view.name === "exam") {
    const d = data.exam.domains.find((x) => x.id === view.id);
    body = (
      <>
        {!(d.mcq && done(d.mcq)) && <BackLink to={{ name: "examHub" }}/>}
        <Title>{d.findingsTitle}</Title>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 to-amber-50 flex overflow-hidden min-h-[170px]">
          <SafeImg src={img(d.art || data.intro.art)} alt="The patient" className="self-end w-[36%] max-h-[200px] object-contain object-bottom shrink-0"/>
          <div className="flex-1 p-3 flex items-center"><ul data-testid="exam-findings" className="list-none p-0 m-0 space-y-1.5">{d.findings.map((f, n) => <li key={n} className="flex gap-2 text-[13px] text-slate-800 leading-snug"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"/><span>{f.text}<TagChip tag={f.tag}/></span></li>)}</ul></div>
        </div>
        {d.mcq ? (
          <Question mcq={d.mcq} state={answers[d.mcq.id]} onPick={(id) => choose(d.mcq, id)} onSubmit={() => submit(d.mcq, { name: "feedback", id: d.mcq.id, kind: "exam", of: d.id })}/>
        ) : (
          <>
            <section data-testid="takeaway" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><Lightbulb size={16}/></span>
              <div><div className="text-[12.5px] font-extrabold text-amber-900">Teaching point</div><p className="text-[12.5px] text-slate-800 leading-snug">{d.teaching}</p></div>
            </section>
            <PrimaryButton onClick={() => go({ name: "examHub" })}>Back to the examinations <ChevronRight size={16}/></PrimaryButton>
          </>
        )}
      </>
    );
  }

  if (view.name === "imaging") {
    const im = data.imaging;
    const tab = im.tabs.find((x) => x.id === st.imgTab) || im.tabs[0];
    body = (
      <>
        <Title>{im.title}</Title>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {im.tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab.id === t.id} onClick={() => set({ imgTab: t.id })} className={`h-8 rounded-lg text-[12.5px] font-bold ${tab.id === t.id ? "bg-blue-600 text-white" : "text-slate-600"}`}>{t.label}</button>)}
        </div>
        <Panel tone="lilac"><div className="grid sm:grid-cols-[1fr_auto] gap-3 items-center"><div><div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{tab.label}</div><p className="text-[14px] text-slate-800 mt-0.5">{tab.caption}</p></div><div><LumbarSchematic/><p className="text-[10px] text-slate-500 text-center mt-1">Schematic only — not the patient's scan.</p></div></div></Panel>
        <Question mcq={im.mcq} state={answers[im.mcq.id]} onPick={(id) => choose(im.mcq, id)} onSubmit={() => submit(im.mcq, { name: "feedback", id: im.mcq.id, kind: "imaging" })}/>
      </>
    );
  }

  if (view.name === "impression") {
    const im = data.impression;
    body = (
      <>
        <Title>{im.title}</Title>
        <p className="text-[12.5px] text-slate-500">This is the record you built. Only what you asked and examined is here.</p>
        <Panel title="Your clinical record" tone="lilac" testid="full-record">
          {record.length === 0 ? <p className="text-[12.5px] text-slate-500">Nothing recorded yet.</p> : (
            <div className="space-y-2">{record.map((g) => <div key={g.heading}><div className="text-[11.5px] font-extrabold text-indigo-900">{g.heading}</div><ul className="list-none p-0 m-0 space-y-0.5">{g.items.map((it, n) => <li key={n} className="text-[12.5px] text-slate-700 leading-snug">• {it.text}<TagChip tag={it.tag}/></li>)}</ul></div>)}</div>
          )}
        </Panel>
        <Question mcq={im.mcq} state={answers[im.mcq.id]} onPick={(id) => choose(im.mcq, id)} onSubmit={() => submit(im.mcq, { name: "feedback", id: im.mcq.id, kind: "impression" })}/>
      </>
    );
  }

  if (view.name === "management") {
    const mg = data.management;
    body = (
      <>
        <Title>{mg.title}</Title>
        <Hero art={data.intro.art} quote={mg.bubble} small/>
        <Question mcq={mg.mcq} state={answers[mg.mcq.id]} onPick={(id) => choose(mg.mcq, id)} onSubmit={() => submit(mg.mcq, { name: "feedback", id: mg.mcq.id, kind: "management" })}/>
      </>
    );
  }

  // ── feedback ──
  if (view.name === "feedback") {
    const q = allQuestions(data).find((x) => x.id === view.id);
    const kind = view.kind;
    const meta = kind === "topic" ? data.topics.find((t) => t.id === view.of) : kind === "safety" ? data.safety : kind === "exam" ? data.exam.domains.find((d) => d.id === view.of) : kind === "imaging" ? data.imaging : kind === "impression" ? data.impression : data.management;
    const next = kind === "topic" || kind === "safety" ? { name: "hub" } : kind === "exam" ? { name: "examHub" } : kind === "imaging" ? { name: "impression" } : kind === "impression" ? { name: "management" } : { name: "report" };
    const planOk = kind !== "management" || st.planPicks.length === data.management.plan.picks;
    const label = kind === "management" ? "See my case report" : "Continue";
    body = (
      <>
        <Title>Feedback</Title>
        <Feedback mcq={q} state={answers[q.id]} keyPoint={meta.keyPoint} onContinue={() => { track("case_step_completed", data.id, { step: kind, id: view.of || kind }); go(next); }} continueLabel={label} continueDisabled={!planOk}>
          {kind === "safety" && <div role="note" className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-[12.5px] leading-snug text-rose-900"><AlertTriangle size={15} className="mt-0.5 shrink-0"/>{data.safety.escalation}</div>}
          {kind === "impression" && (
            <Panel title="Model clinical impression" tone="green" testid="impression">{data.impression.model.map((p) => <p key={p} className="text-[12.5px] leading-relaxed text-slate-800 mb-1.5">{p}</p>)}</Panel>
          )}
          {kind === "management" && (
            <Panel title={data.management.plan.title} tone="lilac" testid="plan-builder">
              <p className="text-[12.5px] text-slate-700 mb-1.5">{data.management.plan.prompt}</p>
              <p className="text-[12px] font-bold text-blue-800 mb-2" data-testid="plan-count">{st.planPicks.length} of {data.management.plan.picks} chosen</p>
              <div className="space-y-1.5">
                {data.management.plan.options.map((p) => {
                  const on = st.planPicks.includes(p.id);
                  const full = !on && st.planPicks.length >= data.management.plan.picks;
                  return (
                    <button key={p.id} type="button" aria-pressed={on} disabled={full} onClick={() => set((s) => ({ planPicks: on ? s.planPicks.filter((x) => x !== p.id) : [...s.planPicks, p.id] }))}
                      className={`w-full text-left flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${on ? "border-blue-500 bg-white font-bold text-blue-900" : "border-slate-200 bg-white text-slate-800"} ${full ? "opacity-50" : ""}`}>
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"}`}>{on && <Check size={13}/>}</span>{p.label}
                    </button>
                  );
                })}
              </div>
              <label className="block mt-3 text-[12px] font-bold text-slate-800" htmlFor="plan-why">Why these three? (optional, for your own reflection)</label>
              <textarea id="plan-why" value={st.planWhy} onChange={(e) => set({ planWhy: e.target.value })} rows={3} className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-[13px] text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" placeholder="Write your reasoning here."/>
              {st.planPicks.length === data.management.plan.picks && (
                <div className="mt-3 space-y-2" data-testid="plan-feedback">
                  {data.management.plan.options.filter((p) => st.planPicks.includes(p.id)).map((p) => <div key={p.id} className="rounded-xl bg-white border border-emerald-200 px-3 py-2 text-[12.5px]"><div className="font-bold text-slate-900">{p.label}</div><div className="text-slate-700 mt-0.5">{p.link}</div></div>)}
                  <p className="text-[12px] text-slate-700 rounded-xl bg-white/70 border border-slate-200 px-3 py-2">{data.management.plan.afterNote}</p>
                </div>
              )}
              {st.planPicks.length !== data.management.plan.picks && <p className="text-[12px] text-amber-800 mt-2">Choose three priorities to continue.</p>}
            </Panel>
          )}
        </Feedback>
      </>
    );
  }

  // ── final report ──
  if (view.name === "report") {
    const qs = allQuestions(data);
    const correctN = qs.filter((q) => answers[q.id]?.submitted && answers[q.id]?.picked === q.correct).length;
    const wrong = qs.filter((q) => answers[q.id]?.submitted && answers[q.id]?.picked !== q.correct);
    const rows = qs.filter((q) => answers[q.id]?.submitted && (!onlyWrong || answers[q.id].picked !== q.correct));
    const askedTopics = st.asked.map((id) => data.topics.find((t) => t.id === id)).filter(Boolean);
    const unaskedSafety = data.safety.topics.filter((x) => !st.safetyViewed.includes(x.id));
    const impAns = answers[data.impression.mcq.id]; const impOpt = data.impression.mcq.options.find((o) => o.id === impAns?.picked);
    const plan = data.management.plan.options.filter((p) => st.planPicks.includes(p.id));
    body = (
      <>
        <Title>Case report</Title>
        <p data-testid="completion" className="text-[13px] text-slate-700 leading-snug rounded-2xl bg-emerald-50 border border-emerald-200 p-3">{data.completion}</p>
        <Panel title="The questions you asked" tone="lilac" testid="rep-asked"><ol className="list-decimal pl-5 m-0 space-y-0.5">{askedTopics.map((t) => <li key={t.id} className="text-[12.5px] text-slate-700">{t.label}</li>)}{st.safetyViewed.map((id) => <li key={id} className="text-[12.5px] text-slate-700">Safety: {data.safety.topics.find((x) => x.id === id).label}</li>)}</ol></Panel>
        <Panel title="Documented answers you discovered" tone="lilac" testid="rep-record">
          <div className="space-y-2">{record.map((g) => <div key={g.heading}><div className="text-[11.5px] font-extrabold text-indigo-900">{g.heading}</div><ul className="list-none p-0 m-0 space-y-0.5">{g.items.map((it, n) => <li key={n} className="text-[12.5px] text-slate-700 leading-snug">• {it.text}<TagChip tag={it.tag}/></li>)}</ul></div>)}</div>
        </Panel>
        <Panel title="Safety questions you still need to ask" tone="amber" testid="rep-safety">
          <p className="text-[12px] text-slate-700 mb-1">The case gives no answers to any safety question. In a real consultation ask them all and record the actual responses.</p>
          <ul className="list-none p-0 m-0 space-y-0.5">{(unaskedSafety.length ? unaskedSafety : data.safety.topics).map((x) => <li key={x.id} className="text-[12.5px] text-slate-700">• {x.label}{unaskedSafety.length ? "" : " (you opened this; the answer still has to come from the patient)"}</li>)}</ul>
        </Panel>
        <Panel title="Your reasoning" tone="white" testid="rep-score">
          <p className="text-[12.5px] text-slate-700" data-testid="final-score">You answered {correctN} of {qs.length} reasoning questions correctly on your first submission. This is a record of this attempt, not a measure of mastery.</p>
          {wrong.length > 0 && <div className="mt-2"><div className="text-[11.5px] font-extrabold text-rose-700">Conclusions to revisit</div><ul className="list-none p-0 m-0 space-y-0.5">{wrong.map((q) => <li key={q.id} className="text-[12.5px] text-slate-700">• {q.q}</li>)}</ul></div>}
        </Panel>
        <Panel title="Your clinical impression" tone="green"><p className="text-[12.5px] text-slate-800">{impOpt ? impOpt.text : "—"}</p><div className="mt-2 text-[11.5px] font-extrabold text-emerald-900">Model clinical impression</div>{data.impression.model.map((p) => <p key={p} className="text-[12.5px] text-slate-800 mt-0.5">{p}</p>)}</Panel>
        <Panel title="Your management priorities" tone="lilac" testid="rep-plan"><ul className="list-none p-0 m-0 space-y-1">{plan.map((p) => <li key={p.id} className="text-[12.5px] text-slate-700">• {p.label}</li>)}</ul>{st.planWhy && <p className="text-[12px] text-slate-600 mt-2 italic">Your reasoning: {st.planWhy}</p>}</Panel>
        <Panel title="Model clinical approach" tone="white"><p className="text-[12.5px] text-slate-700 mb-2">{data.management.keyPoint}</p><button type="button" onClick={() => setShowRefs(true)} className="h-9 px-3 rounded-lg border border-blue-200 text-blue-700 text-[12.5px] font-bold">Open clinical references</button></Panel>
        <section data-testid="final-review" className="rounded-2xl border border-slate-200 bg-white p-3">
          <h3 className="cl-display font-extrabold text-[14px] text-indigo-950">Review your answers</h3>
          <label className="flex items-center gap-2 text-[12px] text-slate-700 mt-1"><input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)}/> Show only the ones I got wrong</label>
          <ul className="mt-2 space-y-2 list-none p-0 m-0">
            {rows.length === 0 && <li className="text-[12.5px] text-emerald-800">Nothing to review — every answer was correct.</li>}
            {rows.map((q) => {
              const a = answers[q.id]; const ok = a.picked === q.correct;
              const mine = q.options.find((o) => o.id === a.picked); const right = q.options.find((o) => o.id === q.correct);
              return (
                <li key={q.id} className="rounded-xl border border-slate-200 p-2.5 text-[12.5px] leading-snug">
                  <div className="flex items-start gap-2"><span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${ok ? "bg-emerald-500" : "bg-rose-500"}`}>{ok ? <Check size={12}/> : <X size={12}/>}</span>
                    <div><div className="font-bold text-slate-900">{q.q}</div><div className="text-slate-700 mt-1">Your answer: {mine.id}. {mine.text}</div>{!ok && <div className="text-emerald-800 mt-0.5">Best answer: {right.id}. {right.text}</div>}<div className="text-slate-600 mt-0.5">{plain((ok ? right : mine).why)}</div></div></div>
                </li>
              );
            })}
          </ul>
        </section>
        <div className="flex flex-col sm:flex-row gap-2">
          {!confirmRestart ? (
            <button type="button" onClick={() => setConfirmRestart(true)} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-[13px] flex items-center justify-center gap-1.5"><RotateCcw size={14}/> Restart Lumbar Case 1</button>
          ) : (
            <div role="alertdialog" aria-label="Confirm restart" className="flex-1 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[12.5px] text-amber-900">
              Restarting clears all your answers, choices and clinical record for this case.
              <div className="flex gap-2 mt-2"><button type="button" onClick={restart} className="h-9 px-3 rounded-lg bg-amber-600 text-white font-bold text-[12.5px]">Yes, restart</button><button type="button" onClick={() => setConfirmRestart(false)} className="h-9 px-3 rounded-lg bg-white border border-slate-200 font-bold text-[12.5px]">Keep my answers</button></div>
            </div>
          )}
          <button type="button" onClick={onExit} className="h-11 px-4 rounded-xl bg-blue-600 text-white font-bold text-[13px]">{exitLabel}</button>
        </div>
      </>
    );
    // the report is reached once; count the case as completed
  }

  return (
    <div data-testid="case-engine" className="pb-10" style={{ fontFamily: SANS }}>
      <div ref={topRef}/>
      {header}
      {showRefs && <References refs={data.references} onClose={() => setShowRefs(false)}/>}
      <div className="space-y-3 min-w-0">{body}</div>
      <details className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
        <summary className="cl-display font-extrabold text-[12.5px] text-slate-800 cursor-pointer">About this case</summary>
        <p className="text-[11.5px] text-slate-500 mt-2">{data.difficulty} · {data.subtitle}</p>
        <p className="text-[10.5px] text-slate-400 mt-1">{data.sourceNote}</p>
        <div className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">What the labels mean</div>
        <ul className="mt-1 space-y-1.5 list-none p-0 m-0">{Object.keys(TAGS).map((t) => <li key={t} className="text-[11.5px] text-slate-600 leading-snug"><b>{TAGS[t].label}.</b> {TAGS[t].hint}</li>)}</ul>
      </details>
    </div>
  );
}
