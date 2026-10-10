import { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Check, X, AlertTriangle, BookOpen, UserRound, Eye, Move, Hand, Brain,
  Activity, Footprints, Plus, Target, RotateCcw, ListChecks, ShieldAlert, Info,
} from "lucide-react";
import StudyImage from "./StudyImage.jsx";
import { TAGS } from "./lumbarCase1.js";

// CaseEngine: plays a screen-by-screen clinical case from structured data
// (see lumbarCase1.js for the shape). The engine owns navigation, MCQ
// behaviour (answer hidden until Submit, a reason for every option), saved
// progress and the end-of-case review. It adds no clinical wording of its own
// beyond button and label text.

const img = (name) => `${import.meta.env.BASE_URL || "/"}sim/${name}.webp`;
const ICONS = { eye: Eye, move: Move, hand: Hand, neuro: Brain, nerve: Activity, walk: Footprints, plus: Plus };

function track(name, caseId, properties) {
  // Existing analytics function, loaded on demand so the case works without it.
  import("../../analytics/trackEvent.js").then((m) => m.trackEvent(name, { entityType: "case", entityId: caseId, properties })).catch(() => {});
}

function storageKey(id) { return `pm_case_${id}_v1`; }
function load(id) { try { return JSON.parse(localStorage.getItem(storageKey(id)) || "null"); } catch { return null; } }
function save(id, v) { try { localStorage.setItem(storageKey(id), JSON.stringify(v)); } catch { /* private mode: progress stays in this session */ } }

const TAG_STYLE = {
  DOCUMENTED: "bg-emerald-100 text-emerald-800",
  INTERPRETATION: "bg-violet-100 text-violet-800",
  "STILL TO CHECK": "bg-amber-100 text-amber-800",
};
function TagChip({ tag }) {
  const t = TAGS[tag];
  if (!t) return null;
  return <span title={t.hint} className={`inline-block shrink-0 text-[9.5px] font-extrabold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${TAG_STYLE[tag]}`}>{t.label}</span>;
}

function Fact({ item }) {
  return (
    <li className="flex items-start gap-2 text-[13.5px] leading-snug text-slate-800">
      <span className="mt-0.5"><TagChip tag={item.tag}/></span>
      <span className="min-w-0">{item.label && <span className="font-bold text-slate-900">{item.label}: </span>}{item.text}</span>
    </li>
  );
}

function Card({ title, children, tone = "white", testid }) {
  const tones = { white: "bg-white border-slate-200", sky: "bg-sky-50 border-sky-100", amber: "bg-amber-50 border-amber-200", red: "bg-rose-50 border-rose-200", green: "bg-emerald-50 border-emerald-200" };
  return (
    <section data-testid={testid} className={`rounded-2xl border p-3.5 shadow-sm ${tones[tone]}`}>
      {title && <h3 className="cl-display font-extrabold text-[14px] text-slate-900 mb-2">{title}</h3>}
      {children}
    </section>
  );
}

// ── lumbar schematic: neutral, labelled, no lesion drawn ─────────────────────
function LumbarSchematic() {
  const bodies = [["L1", 14], ["L2", 62], ["L3", 110], ["L4", 158], ["L5", 206]];
  return (
    <svg viewBox="0 0 220 290" role="img" aria-label="Simple schematic of the lumbar spine from L1 to the sacrum, side view. L4–L5 and L5–S1 are labelled." className="w-full max-w-[220px] mx-auto">
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

function Hero({ screen }) {
  return (
    <div data-testid="engine-hero" className="rounded-3xl border border-sky-100 bg-gradient-to-b from-sky-100 via-sky-50 to-violet-50 p-3.5 mb-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex flex-col items-center gap-1 w-[64px]">
          <span className="w-14 h-14 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shadow-sm"><UserRound size={30} strokeWidth={1.7}/></span>
          <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">{screen.mood}</span>
        </div>
        {screen.quote ? (
          <div className="flex-1 min-w-0">
            <div data-testid="engine-quote" className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-3 py-2.5 text-[14px] leading-relaxed text-slate-800 shadow-sm">“{screen.quote}”</div>
            {screen.quoteNote && <p className="text-[11px] text-slate-500 mt-1">{screen.quoteNote}</p>}
          </div>
        ) : (
          <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm bg-white/90 border border-slate-200 px-3 py-2.5 text-[13.5px] leading-snug text-slate-700 shadow-sm">{screen.task}</div>
        )}
      </div>
      {screen.quote && <p className="text-[13px] text-slate-700 mt-2.5 leading-snug"><span className="font-bold">Your task: </span>{screen.task}</p>}
      <p className="text-[12.5px] text-sky-900 mt-2 rounded-xl bg-white/70 border border-sky-100 px-2.5 py-1.5 leading-snug"><span className="font-extrabold">Learning objective: </span>{screen.objective}</p>
    </div>
  );
}

// ── blocks ───────────────────────────────────────────────────────────────────
function GroupsBlock({ block }) {
  return (
    <Card title={block.title}>
      <div className="space-y-3">
        {block.groups.map((g) => (
          <div key={g.title}>
            <div className="text-[12px] font-extrabold text-slate-600 mb-1">{g.title}</div>
            <ul className="space-y-1.5">{g.items.map((it, n) => <Fact key={n} item={it}/>)}</ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HistoryBlock({ block }) {
  const [open, setOpen] = useState(0);
  return (
    <Card title={block.title}>
      <div className="space-y-1.5">
        {block.sections.map((s, n) => {
          const isOpen = open === n;
          return (
            <div key={s.title} className="rounded-xl border border-slate-200 bg-white">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : n)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[13.5px] font-bold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded-xl">
                <span><span className="text-slate-400 mr-1.5">{n + 1}.</span>{s.title}</span>
                <ChevronRight size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}/>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {s.quote && <p className="rounded-xl bg-sky-50 border border-sky-100 px-2.5 py-2 text-[13px] italic text-slate-700">“{s.quote}”</p>}
                  <ul className="space-y-1.5">{s.facts.map((it, k) => <Fact key={k} item={it}/>)}</ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SafetyBlock({ block }) {
  return (
    <Card title={block.title} tone="amber">
      <div className="space-y-3">
        {block.groups.map((g) => (
          <div key={g.title}>
            <div className="text-[12px] font-extrabold text-amber-900 mb-1 flex items-center gap-1.5"><ShieldAlert size={14}/> {g.title}</div>
            <ul className="space-y-1">{g.items.map((q) => <li key={q} className="flex items-start gap-2 text-[13px] text-slate-800 leading-snug"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"/>{q} <span className="ml-auto"><TagChip tag="STILL TO CHECK"/></span></li>)}</ul>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-amber-900 mt-3">{block.footer}</p>
    </Card>
  );
}

function ExamPicker({ block, picks, setPicks, locked }) {
  return (
    <Card title={block.title} testid="exam-picker">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {block.cards.map((c) => {
          const on = picks.includes(c.id);
          const I = ICONS[c.icon] || Eye;
          const relevantNow = locked && (c.relevant ? "relevant" : "none");
          return (
            <button key={c.id} type="button" disabled={locked} aria-pressed={on}
              onClick={() => setPicks(on ? picks.filter((x) => x !== c.id) : [...picks, c.id])}
              className={`text-left rounded-xl border p-2.5 flex flex-col gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${on ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"} ${locked ? "cursor-default" : ""}`}>
              <span className="flex items-center gap-2.5">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{on ? <Check size={17}/> : <I size={17}/>}</span>
                <span className="text-[13px] font-bold text-slate-900 leading-tight">{c.label}</span>
              </span>
              {c.images && (
                <span className={`grid gap-1 ${c.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>{c.images.map((id) => <span key={id} className="min-w-0 rounded-md overflow-hidden bg-slate-50 border border-slate-200"><StudyImage name={id} full/></span>)}</span>
              )}
              {locked && (
                <span className={`text-[11.5px] font-semibold ${relevantNow === "relevant" ? "text-emerald-700" : "text-slate-500"}`}>
                  {relevantNow === "relevant" ? (on ? "Relevant — you chose it" : "Relevant — you did not choose it") : c.note}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function ImagingBlock({ block }) {
  return (
    <Card title={block.title}>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
        <div className="space-y-2">
          {block.cards.map((c) => (
            <div key={c.title} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{c.title}</div>
              <p className="text-[14px] text-slate-800 mt-0.5">{c.text}</p>
            </div>
          ))}
        </div>
        <div>
          <LumbarSchematic/>
          <p className="text-[10.5px] text-slate-500 text-center mt-1">Schematic only — not the patient's scan.</p>
        </div>
      </div>
    </Card>
  );
}

function PrioritiesBlock({ block }) {
  return (
    <Card title={block.title}>
      <div className="space-y-2">
        {block.items.map(([t, list]) => (
          <details key={t} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <summary className="text-[13.5px] font-bold text-slate-900 cursor-pointer">{t}</summary>
            <ul className="mt-1.5 space-y-1">{list.map((x) => <li key={x} className="flex gap-2 text-[13px] text-slate-700 leading-snug"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"/>{x}</li>)}</ul>
          </details>
        ))}
      </div>
    </Card>
  );
}

function PlanBuilder({ block, picks, setPicks, why, setWhy }) {
  const chosen = block.options.filter((o) => picks.includes(o.id));
  return (
    <Card title={block.title} tone="sky" testid="plan-builder">
      <p className="text-[13px] text-slate-700 mb-2">{block.prompt}</p>
      <p className="text-[12px] font-bold text-sky-900 mb-2" data-testid="plan-count">{picks.length} of {block.picks} chosen</p>
      <div className="space-y-1.5">
        {block.options.map((o) => {
          const on = picks.includes(o.id);
          const full = !on && picks.length >= block.picks;
          return (
            <button key={o.id} type="button" aria-pressed={on} disabled={full}
              onClick={() => setPicks(on ? picks.filter((x) => x !== o.id) : [...picks, o.id])}
              className={`w-full text-left flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${on ? "border-blue-500 bg-white font-bold text-blue-900" : "border-slate-200 bg-white text-slate-800"} ${full ? "opacity-50" : ""}`}>
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"}`}>{on && <Check size={13}/>}</span>
              {o.label}
            </button>
          );
        })}
      </div>
      <label className="block mt-3 text-[12.5px] font-bold text-slate-800" htmlFor="plan-why">Why these three? (optional, for your own reflection)</label>
      <textarea id="plan-why" value={why} onChange={(e) => setWhy(e.target.value)} rows={3} className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-[13px] text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" placeholder="Write your reasoning here."/>
      {picks.length === block.picks && (
        <div className="mt-3 space-y-2" data-testid="plan-feedback">
          {chosen.map((o) => <div key={o.id} className="rounded-xl bg-white border border-emerald-200 px-3 py-2 text-[13px]"><div className="font-bold text-slate-900">{o.label}</div><div className="text-slate-700 mt-0.5">{o.link}</div></div>)}
          <p className="text-[12.5px] text-slate-700 rounded-xl bg-white/70 border border-slate-200 px-3 py-2">{block.afterNote}</p>
        </div>
      )}
    </Card>
  );
}

function ImpressionBlock({ block }) {
  return (
    <Card title={block.title} tone="green" testid="impression">
      {block.paragraphs.map((p) => <p key={p} className="text-[13.5px] leading-relaxed text-slate-800 mb-2">{p}</p>)}
      <div className="grid sm:grid-cols-3 gap-2 mt-1">
        {block.lists.map(([t, l]) => (
          <div key={t} className="rounded-xl bg-white border border-emerald-100 p-2.5">
            <div className="text-[12px] font-extrabold text-emerald-900 mb-1">{t}</div>
            <ul className="space-y-1">{l.map((x) => <li key={x} className="text-[12.5px] text-slate-700 leading-snug">• {x}</li>)}</ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReportBlock({ block }) {
  return (
    <Card title={block.title} tone="sky" testid="case-report">
      <dl className="space-y-2">
        {block.rows.map(([k, v]) => <div key={k} className="text-[13.5px] leading-snug"><dt className="font-extrabold text-slate-900">{k}</dt><dd className="text-slate-700">{v}</dd></div>)}
      </dl>
      <div className="mt-3 rounded-xl bg-white border border-sky-100 p-3">
        <div className="text-[12.5px] font-extrabold text-sky-900 mb-1">{block.listTitle}</div>
        <ul className="space-y-1">{block.list.map((x) => <li key={x} className="text-[13px] text-slate-700">• {x}</li>)}</ul>
      </div>
    </Card>
  );
}

function Block({ block, ctx }) {
  switch (block.type) {
    case "facts": return <Card title={block.title}><ul className="space-y-1.5">{block.items.map((it, n) => <Fact key={n} item={it}/>)}</ul></Card>;
    case "groups": return <GroupsBlock block={block}/>;
    case "history": return <HistoryBlock block={block}/>;
    case "safety": return <SafetyBlock block={block}/>;
    case "note": return <div role="note" className={`flex items-start gap-2 rounded-2xl border p-3 text-[13px] leading-snug ${block.tone === "red" ? "bg-rose-50 border-rose-300 text-rose-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}><AlertTriangle size={16} className="mt-0.5 shrink-0"/>{block.text}</div>;
    case "terms": return <Card title={block.title}><dl className="space-y-2">{block.terms.map(([t, d]) => <div key={t} className="text-[13px] leading-snug"><dt className="font-extrabold text-slate-900">{t}</dt><dd className="text-slate-700">{d}</dd></div>)}</dl></Card>;
    case "examPicker": return <ExamPicker block={block} picks={ctx.examPicks} setPicks={ctx.setExamPicks} locked={ctx.mcqsDone}/>;
    case "imaging": return <ImagingBlock block={block}/>;
    case "priorities": return <PrioritiesBlock block={block}/>;
    case "planBuilder": return <PlanBuilder block={block} picks={ctx.planPicks} setPicks={ctx.setPlanPicks} why={ctx.planWhy} setWhy={ctx.setPlanWhy}/>;
    case "impression": return <ImpressionBlock block={block}/>;
    case "report": return <ReportBlock block={block}/>;
    default: return null;
  }
}

// ── MCQ ──────────────────────────────────────────────────────────────────────
function Mcq({ mcq, state, onPick, onSubmit, canSubmitExtra = true, extraHint }) {
  const submitted = !!state?.submitted;
  const picked = state?.picked ?? null;
  const right = submitted && picked === mcq.correct;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm" data-testid={`mcq-${mcq.id}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-extrabold flex items-center justify-center">Q</span>
        <h3 id={`q-${mcq.id}`} className="text-[15px] font-semibold text-slate-900 leading-snug">{mcq.q}</h3>
      </div>
      <div role="radiogroup" aria-labelledby={`q-${mcq.id}`} className="space-y-2">
        {mcq.options.map((o) => {
          const isPicked = picked === o.id;
          const isRight = submitted && o.id === mcq.correct;
          const isWrong = submitted && isPicked && !isRight;
          return (
            <div key={o.id}>
              <button type="button" role="radio" aria-checked={isPicked} disabled={submitted} onClick={() => onPick(o.id)}
                className={`w-full text-left flex items-start gap-3 rounded-xl border px-3 py-2.5 text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${isRight ? "border-emerald-400 bg-emerald-50" : isWrong ? "border-rose-300 bg-rose-50" : isPicked ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"}`}>
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${isRight ? "bg-emerald-500 text-white" : isWrong ? "bg-rose-500 text-white" : isPicked ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {isRight ? <Check size={13}/> : isWrong ? <X size={13}/> : o.id}
                </span>
                <span className="text-slate-800 leading-snug">{o.text}</span>
              </button>
              {submitted && <p data-testid={`why-${mcq.id}-${o.id}`} className={`text-[12.5px] leading-snug mt-1 ml-9 ${o.id === mcq.correct ? "text-emerald-800" : "text-slate-600"}`}>{o.why}</p>}
            </div>
          );
        })}
      </div>
      {!submitted && (
        <>
          <button type="button" disabled={picked === null || !canSubmitExtra} onClick={onSubmit}
            className={`w-full h-11 mt-3 rounded-xl font-bold text-sm flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${picked !== null && canSubmitExtra ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
            Submit Answer
          </button>
          {picked !== null && !canSubmitExtra && extraHint && <p className="text-[12px] text-amber-800 mt-1.5">{extraHint}</p>}
        </>
      )}
      {submitted && (
        <div role="status" className={`mt-3 rounded-xl px-3 py-2 text-[13.5px] font-extrabold flex items-center gap-1.5 ${right ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
          {right ? <><Check size={16}/> Correct</> : <><X size={16}/> Not quite — the right answer is {mcq.correct}.</>}
        </div>
      )}
    </section>
  );
}

function References({ refs, onClose }) {
  return (
    <div role="dialog" aria-label="Clinical references" className="rounded-2xl border border-sky-200 bg-white p-3.5 shadow-md mb-3" data-testid="references-panel">
      <div className="flex items-center justify-between mb-2">
        <h3 className="cl-display font-extrabold text-[14px] text-slate-900 flex items-center gap-1.5"><BookOpen size={15}/> Clinical references</h3>
        <button type="button" onClick={onClose} aria-label="Close references" className="p-1 rounded-lg hover:bg-slate-100"><X size={16}/></button>
      </div>
      <div className="space-y-3">
        {refs.map((r) => (
          <div key={r.title} className="text-[12.5px] leading-snug">
            <div className="font-bold text-slate-900">{r.title}</div>
            {r.url && <a className="text-blue-700 underline break-all block" href={r.url} target="_blank" rel="noreferrer noopener">{r.url}</a>}
            {r.url2 && <a className="text-blue-700 underline break-all block" href={r.url2} target="_blank" rel="noreferrer noopener">{r.url2}</a>}
            <ul className="mt-1 space-y-0.5 text-slate-600">{r.points.map((p) => <li key={p}>• {p}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── the engine ───────────────────────────────────────────────────────────────
export default function CaseEngine({ data, onExit, exitLabel = "Return to Lumbar Cases" }) {
  const screens = data.screens;
  const total = screens.length;
  const saved = useMemo(() => load(data.id), [data.id]);
  const [idx, setIdx] = useState(Math.min(saved?.idx ?? 0, total - 1));
  const [answers, setAnswers] = useState(saved?.answers ?? {});
  const [examPicks, setExamPicks] = useState(saved?.examPicks ?? []);
  const [planPicks, setPlanPicks] = useState(saved?.planPicks ?? []);
  const [planWhy, setPlanWhy] = useState(saved?.planWhy ?? "");
  const [showRefs, setShowRefs] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const topRef = useRef(null);

  useEffect(() => { save(data.id, { idx, answers, examPicks, planPicks, planWhy }); }, [data.id, idx, answers, examPicks, planPicks, planWhy]);
  useEffect(() => { try { topRef.current?.scrollIntoView?.({ block: "start" }); } catch { /* old browsers */ } }, [idx]);

  const screen = screens[idx];
  const mcqsDone = screen.mcqs.every((q) => answers[q.id]?.submitted);
  const needsOk = screen.needs === "planBuilder" ? planPicks.length === 3 : true;
  const canContinue = mcqsDone && needsOk;
  const examOk = screen.needs === "examPicker" ? examPicks.length >= 1 : true;
  const completed = screens.map((s) => s.mcqs.every((q) => answers[q.id]?.submitted));

  function pick(q, id) { setAnswers((a) => (a[q.id]?.submitted ? a : { ...a, [q.id]: { ...a[q.id], picked: id } })); }
  function submit(q) {
    setAnswers((a) => {
      const cur = a[q.id];
      if (!cur || cur.picked == null || cur.submitted) return a; // no double submission
      const attempts = (cur.attempts || 0) + 1;
      track("case_mcq_submitted", data.id, { screen: screen.id, question: q.id, selected: cur.picked, correct: cur.picked === q.correct, attempt: attempts });
      return { ...a, [q.id]: { ...cur, submitted: true, attempts } };
    });
  }
  function next() {
    if (!canContinue) return;
    track("case_screen_completed", data.id, { screen: screen.id });
    if (idx + 1 < total) setIdx(idx + 1);
  }
  const prev = () => setIdx(Math.max(0, idx - 1));
  function restart() {
    setAnswers({}); setExamPicks([]); setPlanPicks([]); setPlanWhy(""); setIdx(0); setConfirmRestart(false); setOnlyWrong(false);
  }

  const all = screens.flatMap((s) => s.mcqs.map((q) => ({ q, screen: s })));
  const score = all.filter(({ q }) => answers[q.id]?.picked === q.correct && answers[q.id]?.submitted).length;
  const caseDone = completed.every(Boolean);
  useEffect(() => { if (idx === total - 1 && caseDone) track("case_completed", data.id, { correct: score, total: all.length }); /* eslint-disable-next-line */ }, [idx, caseDone]);

  const ctx = { examPicks, setExamPicks, planPicks, setPlanPicks, planWhy, setPlanWhy, mcqsDone };
  const isLast = idx === total - 1;

  return (
    <div data-testid="case-engine" className="pb-10">
      <div ref={topRef}/>
      <div className="flex items-center gap-1.5 mb-1">
        <button type="button" aria-label="Back to cases" onClick={onExit} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-50"><ChevronLeft size={22} className="text-slate-600"/></button>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] text-slate-500 truncate">{data.crumbs.join(" › ")}</div>
          <h1 className="cl-display text-xl font-extrabold text-slate-900 leading-tight">{data.title}</h1>
        </div>
        <button type="button" onClick={() => setShowRefs((v) => !v)} aria-expanded={showRefs} className="h-9 px-2.5 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-700 flex items-center gap-1"><BookOpen size={14}/> References</button>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
        <span className="font-bold text-violet-700 bg-violet-100 rounded-full px-2 py-0.5">{data.difficulty}</span>
        <span>{data.subtitle}</span>
      </div>

      <div className="mb-3" aria-label="Case progress">
        <div className="flex justify-between text-[11.5px] font-bold text-slate-600 mb-1"><span data-testid="engine-count">Screen {idx + 1} of {total}</span><span>{completed.filter(Boolean).length} completed</span></div>
        <div className="flex gap-1">
          {screens.map((s, n) => (
            <button key={s.id} type="button" aria-label={`Screen ${n + 1}: ${s.title}`} aria-current={n === idx ? "step" : undefined}
              disabled={n > idx && !completed.slice(0, n).every(Boolean)} onClick={() => setIdx(n)}
              className={`h-2 flex-1 rounded-full ${n === idx ? "bg-blue-600" : completed[n] ? "bg-emerald-500" : "bg-slate-200"} disabled:cursor-not-allowed`}/>
          ))}
        </div>
      </div>

      {showRefs && <References refs={data.references} onClose={() => setShowRefs(false)}/>}

      <div className="lg:grid lg:grid-cols-[1fr_250px] lg:gap-4 lg:items-start">
        <div className="space-y-3 min-w-0">
          <h2 className="cl-display text-[19px] font-extrabold text-slate-900 leading-tight" data-testid="engine-title">{screen.title}</h2>
          <Hero screen={screen}/>

          {screen.blocks.map((b, n) => <Block key={n} block={b} ctx={ctx}/>)}

          {screen.mcqs.map((q) => (
            <Mcq key={q.id} mcq={q} state={answers[q.id]} onPick={(id) => pick(q, id)} onSubmit={() => submit(q)}
              canSubmitExtra={examOk} extraHint="Choose at least one examination above before you submit." />
          ))}

          {mcqsDone && screen.reveal.map((b, n) => <Block key={`r${n}`} block={b} ctx={ctx}/>)}

          {mcqsDone && (
            <Card tone="sky" testid="takeaway"><div className="flex items-start gap-2"><Info size={16} className="text-sky-600 mt-0.5 shrink-0"/><div><div className="text-[12px] font-extrabold uppercase tracking-wide text-sky-800">Clinical takeaway</div><p className="text-[13.5px] text-slate-800 leading-relaxed">{screen.takeaway}</p></div></div></Card>
          )}

          {isLast && caseDone && (
            <FinalReview data={data} answers={answers} score={score} totalQ={all.length} onlyWrong={onlyWrong} setOnlyWrong={setOnlyWrong}
              confirmRestart={confirmRestart} setConfirmRestart={setConfirmRestart} restart={restart} onExit={onExit} exitLabel={exitLabel}/>
          )}

          <div className="flex gap-2 pt-1">
            {idx > 0 && <button type="button" onClick={prev} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center gap-1"><ChevronLeft size={16}/> Back</button>}
            {!isLast && (
              <button type="button" disabled={!canContinue} onClick={next}
                className={`flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${canContinue ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                {screen.nextLabel || "Continue"} <ChevronRight size={16}/>
              </button>
            )}
          </div>
          {!canContinue && mcqsDone && !needsOk && <p className="text-[12px] text-amber-800">Choose three priorities to continue.</p>}
        </div>

        <aside className="mt-3 lg:mt-0" aria-label="Case file">
          <details className="lg:open rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" open>
            <summary className="cl-display font-extrabold text-[13px] text-slate-900 cursor-pointer lg:cursor-default flex items-center gap-1.5"><ListChecks size={14}/> Case file</summary>
            <dl className="mt-2 space-y-1.5">{data.caseFile.map(([k, v]) => <div key={k} className="text-[12.5px] leading-snug"><dt className="font-bold text-slate-900">{k}</dt><dd className="text-slate-600">{v}</dd></div>)}</dl>
            <p className="text-[10.5px] text-slate-400 mt-2">{data.sourceNote}</p>
          </details>
          <details className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <summary className="cl-display font-extrabold text-[13px] text-slate-900 cursor-pointer flex items-center gap-1.5"><Target size={14}/> Learning outcomes</summary>
            <ul className="mt-2 space-y-1">{data.outcomes.map((o) => <li key={o} className="text-[12px] text-slate-600 leading-snug">• {o}</li>)}</ul>
          </details>
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-1.5">What the labels mean</div>
            <ul className="space-y-1.5">{Object.keys(TAGS).map((t) => <li key={t} className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-snug"><TagChip tag={t}/><span>{TAGS[t].hint}</span></li>)}</ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FinalReview({ data, answers, score, totalQ, onlyWrong, setOnlyWrong, confirmRestart, setConfirmRestart, restart, onExit, exitLabel }) {
  const rows = data.screens.flatMap((s) => s.mcqs.map((q) => ({ q, s }))).filter(({ q }) => !onlyWrong || answers[q.id]?.picked !== q.correct);
  return (
    <section data-testid="final-review" className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <h3 className="cl-display font-extrabold text-[15px] text-slate-900">Review your answers</h3>
      <p className="text-[13px] text-slate-600 mt-0.5" data-testid="final-score">You answered {score} of {totalQ} questions correctly on your first submission. This is a record of this attempt, not a measure of mastery.</p>
      <label className="flex items-center gap-2 text-[12.5px] text-slate-700 mt-2"><input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)}/> Show only the ones I got wrong</label>
      <ul className="mt-2 space-y-2">
        {rows.length === 0 && <li className="text-[13px] text-emerald-800">Nothing to review — every answer was correct.</li>}
        {rows.map(({ q, s }) => {
          const a = answers[q.id];
          const ok = a?.picked === q.correct;
          const mine = q.options.find((o) => o.id === a?.picked);
          const right = q.options.find((o) => o.id === q.correct);
          return (
            <li key={q.id} className="rounded-xl border border-slate-200 p-2.5 text-[13px] leading-snug">
              <div className="flex items-start gap-2"><span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${ok ? "bg-emerald-500" : "bg-rose-500"}`}>{ok ? <Check size={12}/> : <X size={12}/>}</span>
                <div><div className="text-[11px] text-slate-500">{s.title}</div><div className="font-bold text-slate-900">{q.q}</div>
                  <div className="text-slate-700 mt-1">Your answer: {mine ? `${mine.id}. ${mine.text}` : "—"}</div>
                  {!ok && <div className="text-emerald-800 mt-0.5">Right answer: {right.id}. {right.text}</div>}
                  <div className="text-slate-600 mt-0.5">{(ok ? right : mine)?.why}</div>
                </div></div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        {!confirmRestart ? (
          <button type="button" onClick={() => setConfirmRestart(true)} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-[13px] flex items-center justify-center gap-1.5"><RotateCcw size={14}/> Restart Lumbar Case 1</button>
        ) : (
          <div role="alertdialog" aria-label="Confirm restart" className="flex-1 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[12.5px] text-amber-900">
            Restarting clears all your answers and choices for this case.
            <div className="flex gap-2 mt-2"><button type="button" onClick={restart} className="h-9 px-3 rounded-lg bg-amber-600 text-white font-bold text-[12.5px]">Yes, restart</button><button type="button" onClick={() => setConfirmRestart(false)} className="h-9 px-3 rounded-lg bg-white border border-slate-200 font-bold text-[12.5px]">Keep my answers</button></div>
          </div>
        )}
        <button type="button" onClick={onExit} className="h-11 px-4 rounded-xl bg-blue-600 text-white font-bold text-[13px]">{exitLabel}</button>
      </div>
    </section>
  );
}
