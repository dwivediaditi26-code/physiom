import { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Check, X, AlertTriangle, BookOpen, Eye, Move, Hand, Brain,
  Activity, Footprints, Plus, RotateCcw, ShieldAlert, Lightbulb, User, Briefcase, Clock, Heart, Home, Target,
} from "lucide-react";
import StudyImage from "./StudyImage.jsx";
import { TAGS } from "./lumbarCase1.js";

// CaseEngine: plays a clinical case from structured data (see lumbarCase1.js).
// Each screen has two pages: an info page (what the patient says, what is
// known) and a question page (the MCQ, feedback, then anything revealed by the
// answer). The engine owns navigation, MCQ behaviour (answer hidden until
// Submit, a reason for every option), saved progress and the end-of-case
// review. It adds no clinical wording of its own beyond button and label text.
// Layout follows Aditi's mockup (2026-10-11).

const img = (name) => `${import.meta.env.BASE_URL || "/"}sim/${name}.webp`;
const ICONS = { eye: Eye, move: Move, hand: Hand, neuro: Brain, nerve: Activity, walk: Footprints, plus: Plus, user: User, work: Briefcase, pain: Activity, clock: Clock, brain: Brain, heart: Heart, home: Home };
const ROW_TINTS = [
  ["bg-rose-50 border-rose-200", "bg-rose-500"], ["bg-violet-50 border-violet-200", "bg-violet-500"], ["bg-emerald-50 border-emerald-200", "bg-emerald-500"],
  ["bg-amber-50 border-amber-200", "bg-amber-500"], ["bg-sky-50 border-sky-200", "bg-sky-500"], ["bg-pink-50 border-pink-200", "bg-pink-500"], ["bg-blue-50 border-blue-200", "bg-blue-600"],
];
const ICON_BG = ["bg-blue-100 text-blue-600", "bg-amber-100 text-amber-600", "bg-rose-100 text-rose-500", "bg-emerald-100 text-emerald-600", "bg-violet-100 text-violet-600"];

function track(name, caseId, properties) {
  // Existing analytics function, loaded on demand so the case works without it.
  import("../../analytics/trackEvent.js").then((m) => m.trackEvent(name, { entityType: "case", entityId: caseId, properties })).catch(() => {});
}
// The data starts each explanation with "Correct." / "Incorrect."; the card already says so.
const plain = (why) => why.replace(/^(Correct|Incorrect)\.\s*/, "");
const storageKey = (id) => `pm_case_${id}_v2`;
function load(id) { try { return JSON.parse(localStorage.getItem(storageKey(id)) || "null"); } catch { return null; } }
function save(id, v) { try { localStorage.setItem(storageKey(id), JSON.stringify(v)); } catch { /* private mode: progress stays in this session */ } }

const TAG_STYLE = { DOCUMENTED: "bg-emerald-100 text-emerald-800", INTERPRETATION: "bg-violet-100 text-violet-800", "STILL TO CHECK": "bg-amber-100 text-amber-800" };
function TagChip({ tag }) {
  const t = TAGS[tag];
  if (!t) return null;
  return <span title={t.hint} className={`inline-block shrink-0 text-[9px] font-extrabold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${TAG_STYLE[tag]}`}>{t.label}</span>;
}
// Documented is the default for this case; only the other two labels are
// drawn on each row, and a legend above each list says so.
function Legend() {
  return <p className="text-[10.5px] text-slate-500 mb-1.5">Everything here is <span className="font-bold text-emerald-700">documented</span> in the case unless it is labelled.</p>;
}

function IconTile({ name, i = 0, size = 16 }) {
  const I = ICONS[name] || Activity;
  return <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${ICON_BG[i % ICON_BG.length]}`}><I size={size} strokeWidth={2}/></span>;
}

function Row({ item, i = 0 }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-snug text-slate-800">
      {item.icon && <IconTile name={item.icon} i={i}/>}
      <span className="min-w-0 pt-0.5">
        {item.label && <span className="block text-[11.5px] font-bold text-slate-900">{item.label}</span>}
        <span className="text-slate-700">{item.text}</span>
        {item.tag !== "DOCUMENTED" && <span className="ml-1.5 align-middle"><TagChip tag={item.tag}/></span>}
      </span>
    </li>
  );
}

function Panel({ title, children, tone = "white", testid, icon }) {
  const tones = { white: "bg-white border-slate-200", lilac: "bg-indigo-50/70 border-indigo-100", amber: "bg-amber-50 border-amber-200", red: "bg-rose-50 border-rose-200", green: "bg-emerald-50 border-emerald-200", pink: "bg-rose-50/70 border-rose-100", violet: "bg-violet-50 border-violet-200", yellow: "bg-amber-50 border-amber-200" };
  return (
    <section data-testid={testid} className={`rounded-2xl border p-3 ${tones[tone]}`}>
      {title && <h3 className="cl-display font-extrabold text-[13.5px] text-indigo-900 mb-2 flex items-center gap-1.5">{icon}{title}</h3>}
      {children}
    </section>
  );
}

// ── lumbar schematic: neutral, labelled, no lesion drawn ─────────────────────
function LumbarSchematic() {
  const bodies = [["L1", 14], ["L2", 62], ["L3", 110], ["L4", 158], ["L5", 206]];
  return (
    <svg viewBox="0 0 220 290" role="img" aria-label="Simple schematic of the lumbar spine from L1 to the sacrum, side view. L4–L5 and L5–S1 are labelled." className="w-full max-w-[200px] mx-auto">
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

// Picture + comic-style speech bubble on top of a clinic scene.
function PatientHero({ art, quote, note }) {
  return (
    <div data-testid="engine-hero" className="relative rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-b from-amber-50 to-sky-50 min-h-[230px] flex">
      <img src={img(art)} alt="Patient: a 49-year-old woman, looking uncomfortable" className="self-end w-[38%] max-h-[250px] object-contain object-bottom shrink-0"/>
      <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-center">
        <div data-testid="engine-quote" className="relative rounded-2xl border-2 border-slate-800 bg-white px-3 py-2.5 text-[13px] leading-snug text-slate-800 shadow-sm">
          <span aria-hidden="true" className="absolute -left-[9px] top-8 w-4 h-4 bg-white border-l-2 border-b-2 border-slate-800 rotate-45"/>
          “{quote}”
        </div>
        {note && <p className="text-[10px] text-slate-500 mt-1 leading-tight">{note}</p>}
      </div>
    </div>
  );
}

// ── info-page blocks ─────────────────────────────────────────────────────────
function FactsBlock({ block }) {
  return (
    <Panel title={block.title} tone="lilac">
      <Legend/>
      <ul className="space-y-2.5 list-none p-0 m-0">{block.items.map((it, n) => <Row key={n} item={it} i={n}/>)}</ul>
    </Panel>
  );
}

function GroupsBlock({ block }) {
  const iconic = block.groups.some((g) => g.icon);
  return (
    <Panel title={iconic ? "Key factors from case" : block.title} tone={iconic ? "pink" : "white"}>
      <Legend/>
      <div className="space-y-2.5">
        {block.groups.map((g, n) => (
          <div key={g.title} className="flex items-start gap-2.5">
            {g.icon && <IconTile name={g.icon} i={n}/>}
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-extrabold text-slate-900 mb-0.5">{g.title}</div>
              <ul className="space-y-1">{g.items.map((it, k) => <li key={k} className="text-[12.5px] leading-snug text-slate-700">{it.text}{it.tag !== "DOCUMENTED" && <span className="ml-1.5 align-middle"><TagChip tag={it.tag}/></span>}</li>)}</ul>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function HistoryBlock({ block }) {
  const [open, setOpen] = useState(0);
  return (
    <div>
      <p className="text-[12px] text-slate-500 mb-1.5">{block.title}</p>
      <div className="space-y-1.5">
        {block.sections.map((s, n) => {
          const isOpen = open === n;
          const [tint, dot] = ROW_TINTS[n % ROW_TINTS.length];
          return (
            <div key={s.title} className={`rounded-xl border ${tint}`}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : n)} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-[13px] font-bold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded-xl">
                <span className={`w-6 h-6 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center shrink-0 ${dot}`}>{n + 1}</span>
                <span className="flex-1">{s.title}</span>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}/>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {s.quote && <p className="text-[12.5px] italic text-slate-700 leading-snug">“{s.quote}”</p>}
                  <ul className="space-y-1.5">{s.facts.map((it, k) => <Row key={k} item={it}/>)}</ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Screen 3: Red flags / What we know / To check.
function SafetyBlock({ block, screen }) {
  const [tab, setTab] = useState("flags");
  const [open, setOpen] = useState(-1);
  const know = screen.blocks.find((b) => b.type === "facts" && /documents/i.test(b.title));
  const check = screen.blocks.find((b) => b.type === "facts" && /Still to check/i.test(b.title));
  const TABS = [["flags", "Red flags"], ["know", "What we know"], ["check", "To check"]];
  return (
    <div data-testid="safety">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 mb-2">
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-8 rounded-lg text-[12px] font-bold ${tab === k ? "bg-blue-600 text-white" : "text-slate-600"}`}>{l}</button>)}
      </div>
      {tab === "flags" && (
        <div className="space-y-1.5">
          {block.groups.map((g, n) => {
            const isOpen = open === n;
            return (
              <div key={g.title} className="rounded-xl border border-slate-200 bg-white">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : n)} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-[13px] font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded-xl">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><ShieldAlert size={16}/></span>
                  <span className="flex-1">{g.title}</span>
                  <ChevronRight size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}/>
                </button>
                {isOpen && <ul className="px-3 pb-3 space-y-1">{g.items.map((q) => <li key={q} className="flex gap-2 text-[12.5px] text-slate-700 leading-snug"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"/>{q}</li>)}</ul>}
              </div>
            );
          })}
        </div>
      )}
      {tab === "know" && know && <Panel title={know.title} tone="lilac"><ul className="space-y-2 list-none p-0 m-0">{know.items.map((it, n) => <Row key={n} item={it}/>)}</ul></Panel>}
      {tab === "check" && check && <Panel title={check.title} tone="amber"><ul className="space-y-2 list-none p-0 m-0">{check.items.map((it, n) => <Row key={n} item={it}/>)}</ul></Panel>}
      <p className="text-[11px] text-slate-500 mt-1.5">{block.footer}</p>
    </div>
  );
}

function ExamPicker({ block, picks, setPicks, locked }) {
  return (
    <div data-testid="exam-picker">
      <p className="text-[12px] text-slate-500 mb-1.5">{block.title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {block.cards.map((c, k) => {
          const on = picks.includes(c.id);
          return (
            <button key={c.id} type="button" disabled={locked} aria-pressed={on}
              onClick={() => setPicks(on ? picks.filter((x) => x !== c.id) : [...picks, c.id])}
              className={`text-left rounded-xl border p-2 flex flex-col gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${on ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"} ${locked ? "cursor-default" : ""}`}>
              <span className="flex items-center justify-center h-[84px] rounded-lg bg-slate-50 overflow-hidden relative">
                {c.images ? <span className={`grid gap-0.5 w-full h-full ${c.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>{c.images.slice(0, 4).map((id) => <span key={id} className="min-w-0 overflow-hidden flex items-center"><StudyImage name={id} full/></span>)}</span>
                  : <IconTile name={c.icon} i={k} size={22}/>}
                {on && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center"><Check size={12}/></span>}
              </span>
              <span className="text-[11.5px] font-bold text-slate-900 leading-tight">{c.label}</span>
              {locked && <span className={`text-[10.5px] font-semibold leading-tight ${c.relevant ? "text-emerald-700" : "text-slate-500"}`}>{c.relevant ? (on ? "Relevant — you chose it" : "Relevant — you did not choose it") : c.note}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ImagingBlock({ block }) {
  return (
    <Panel title={block.title} tone="lilac">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
        <div className="space-y-2">
          {block.cards.map((c) => (
            <div key={c.title} className="rounded-xl bg-white border border-slate-200 p-2.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{c.title}</div>
              <p className="text-[13px] text-slate-800 mt-0.5">{c.text}</p>
            </div>
          ))}
        </div>
        <div>
          <LumbarSchematic/>
          <p className="text-[10px] text-slate-500 text-center mt-1">Schematic only — not the patient's scan.</p>
        </div>
      </div>
    </Panel>
  );
}

function PrioritiesBlock({ block }) {
  return (
    <div>
      <p className="text-[12px] text-slate-500 mb-1.5">{block.title}</p>
      <div className="space-y-1.5">
        {block.items.map(([t, list], n) => (
          <details key={t} className={`rounded-xl border px-2.5 py-2 ${ROW_TINTS[n % ROW_TINTS.length][0]}`}>
            <summary className="text-[13px] font-bold text-slate-900 cursor-pointer">{t}</summary>
            <ul className="mt-1.5 space-y-1">{list.map((x) => <li key={x} className="flex gap-2 text-[12.5px] text-slate-700 leading-snug"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"/>{x}</li>)}</ul>
          </details>
        ))}
      </div>
    </div>
  );
}

function PlanBuilder({ block, picks, setPicks, why, setWhy }) {
  const chosen = block.options.filter((o) => picks.includes(o.id));
  return (
    <Panel title={block.title} tone="lilac" testid="plan-builder">
      <p className="text-[12.5px] text-slate-700 mb-1.5">{block.prompt}</p>
      <p className="text-[12px] font-bold text-blue-800 mb-2" data-testid="plan-count">{picks.length} of {block.picks} chosen</p>
      <div className="space-y-1.5">
        {block.options.map((o) => {
          const on = picks.includes(o.id);
          const full = !on && picks.length >= block.picks;
          return (
            <button key={o.id} type="button" aria-pressed={on} disabled={full}
              onClick={() => setPicks(on ? picks.filter((x) => x !== o.id) : [...picks, o.id])}
              className={`w-full text-left flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${on ? "border-blue-500 bg-white font-bold text-blue-900" : "border-slate-200 bg-white text-slate-800"} ${full ? "opacity-50" : ""}`}>
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"}`}>{on && <Check size={13}/>}</span>
              {o.label}
            </button>
          );
        })}
      </div>
      <label className="block mt-3 text-[12px] font-bold text-slate-800" htmlFor="plan-why">Why these three? (optional, for your own reflection)</label>
      <textarea id="plan-why" value={why} onChange={(e) => setWhy(e.target.value)} rows={3} className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-[13px] text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" placeholder="Write your reasoning here."/>
      {picks.length === block.picks && (
        <div className="mt-3 space-y-2" data-testid="plan-feedback">
          {chosen.map((o) => <div key={o.id} className="rounded-xl bg-white border border-emerald-200 px-3 py-2 text-[12.5px]"><div className="font-bold text-slate-900">{o.label}</div><div className="text-slate-700 mt-0.5">{o.link}</div></div>)}
          <p className="text-[12px] text-slate-700 rounded-xl bg-white/70 border border-slate-200 px-3 py-2">{block.afterNote}</p>
        </div>
      )}
    </Panel>
  );
}

function ImpressionBlock({ block }) {
  return (
    <Panel title={block.title} tone="green" testid="impression">
      {block.paragraphs.map((p) => <p key={p} className="text-[13px] leading-relaxed text-slate-800 mb-2">{p}</p>)}
      <div className="grid sm:grid-cols-3 gap-2 mt-1">
        {block.lists.map(([t, l]) => (
          <div key={t} className="rounded-xl bg-white border border-emerald-100 p-2.5">
            <div className="text-[11.5px] font-extrabold text-emerald-900 mb-1">{t}</div>
            <ul className="space-y-1">{l.map((x) => <li key={x} className="text-[12px] text-slate-700 leading-snug">• {x}</li>)}</ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ReportBlock({ block }) {
  return (
    <Panel title={block.title} tone="lilac" testid="case-report">
      <dl className="space-y-2">{block.rows.map(([k, v]) => <div key={k} className="text-[13px] leading-snug"><dt className="font-extrabold text-slate-900">{k}</dt><dd className="text-slate-700">{v}</dd></div>)}</dl>
      <div className="mt-3 rounded-xl bg-white border border-indigo-100 p-3">
        <div className="text-[12px] font-extrabold text-indigo-900 mb-1">{block.listTitle}</div>
        <ul className="space-y-1">{block.list.map((x) => <li key={x} className="text-[12.5px] text-slate-700">• {x}</li>)}</ul>
      </div>
    </Panel>
  );
}

// Findings (and similar reveal groups) as the mockup's icon rows.
function FindingsBlock({ block }) {
  const ICON_FOR = ["eye", "hand", "move", "nerve", "neuro"];
  return (
    <Panel title={block.title} tone="violet" testid="findings">
      <Legend/>
      <ul className="space-y-2.5 list-none p-0 m-0">
        {block.groups.map((g, n) => (
          <li key={g.title} className="flex items-start gap-2.5">
            <IconTile name={ICON_FOR[n % ICON_FOR.length]} i={n}/>
            <span className="min-w-0 text-[12.5px] leading-snug">
              <span className="font-bold text-slate-900">{g.title}: </span>
              {g.items.map((it, k) => <span key={k} className="text-slate-700">{it.text}{it.tag !== "DOCUMENTED" && <span className="mx-1 align-middle"><TagChip tag={it.tag}/></span>}{k < g.items.length - 1 ? " " : ""}</span>)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Block({ block, ctx, screen, reveal }) {
  switch (block.type) {
    case "facts": return screen.blocks.some((b) => b.type === "safety") && !reveal ? null : <FactsBlock block={block}/>;
    case "groups": return reveal && /findings/i.test(block.title) ? <FindingsBlock block={block}/> : <GroupsBlock block={block}/>;
    case "history": return <HistoryBlock block={block}/>;
    case "safety": return <SafetyBlock block={block} screen={screen}/>;
    case "note": return <div role="note" className={`flex items-start gap-2 rounded-xl border p-2.5 text-[12.5px] leading-snug ${block.tone === "red" ? "bg-rose-50 border-rose-300 text-rose-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}><AlertTriangle size={15} className="mt-0.5 shrink-0"/>{block.text}</div>;
    case "terms": return <Panel title={block.title} tone="white"><dl className="space-y-2">{block.terms.map(([t, d]) => <div key={t} className="text-[12.5px] leading-snug"><dt className="font-extrabold text-slate-900">{t}</dt><dd className="text-slate-700">{d}</dd></div>)}</dl></Panel>;
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
function Mcq({ mcq, number, state, onPick, onSubmit }) {
  const submitted = !!state?.submitted;
  const picked = state?.picked ?? null;
  const right = submitted && picked === mcq.correct;
  const correctOpt = mcq.options.find((o) => o.id === mcq.correct);
  const others = mcq.options.filter((o) => o.id !== mcq.correct);
  return (
    <section data-testid={`mcq-${mcq.id}`} className="rounded-2xl border border-rose-100 bg-white overflow-hidden">
      <div className="bg-rose-50 px-3 py-2 flex items-center gap-2 border-b border-rose-100">
        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold flex items-center justify-center">!</span>
        <span className="text-[12.5px] font-extrabold text-rose-700">Question {number}</span>
      </div>
      <div className="p-3">
        <h3 id={`q-${mcq.id}`} className="text-[14.5px] font-bold text-slate-900 leading-snug mb-2.5">{mcq.q}</h3>
        <div role="radiogroup" aria-labelledby={`q-${mcq.id}`} className="space-y-2">
          {mcq.options.map((o) => {
            const isPicked = picked === o.id;
            const isRight = submitted && o.id === mcq.correct;
            const isWrong = submitted && isPicked && !isRight;
            return (
              <button key={o.id} type="button" role="radio" aria-checked={isPicked} disabled={submitted} onClick={() => onPick(o.id)}
                className={`w-full text-left flex items-start gap-2.5 rounded-xl border px-2.5 py-2 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${isRight ? "border-emerald-400 bg-emerald-50" : isWrong ? "border-rose-300 bg-rose-50" : isPicked ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${isRight ? "border-emerald-500 bg-emerald-500" : isWrong ? "border-rose-500 bg-rose-500" : isPicked ? "border-blue-600" : "border-slate-300"}`}>
                  {isRight && <Check size={10} className="text-white" strokeWidth={4}/>}{isWrong && <X size={10} className="text-white" strokeWidth={4}/>}{isPicked && !submitted && <span className="w-2 h-2 rounded-full bg-blue-600"/>}
                </span>
                <span className="font-bold text-slate-500 shrink-0">{o.id}.</span>
                <span className="text-slate-800 leading-snug">{o.text}</span>
              </button>
            );
          })}
        </div>
        {!submitted && (
          <button type="button" disabled={picked === null} onClick={onSubmit}
            className={`w-full h-11 mt-3 rounded-xl font-bold text-sm flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${picked !== null ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
            Submit Answer
          </button>
        )}
        {submitted && (
          <div className="mt-3 space-y-2.5" data-testid={`feedback-${mcq.id}`}>
            <div role="status" className={`rounded-xl border p-3 ${right ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
              <div className={`flex items-center gap-2 font-extrabold text-[15px] ${right ? "text-emerald-800" : "text-rose-800"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${right ? "bg-emerald-500" : "bg-rose-500"}`}>{right ? <Check size={14}/> : <X size={14}/>}</span>
                {right ? "Correct!" : `Not quite — the right answer is ${mcq.correct}.`}
              </div>
              <p data-testid={`why-${mcq.id}-${correctOpt.id}`} className="text-[12.5px] leading-snug text-slate-700 mt-1.5">{plain(correctOpt.why)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-[12.5px] font-extrabold text-slate-900 mb-1.5">Why other options are incorrect:</div>
              <ul className="space-y-1.5 list-none p-0 m-0">
                {others.map((o) => <li key={o.id} data-testid={`why-${mcq.id}-${o.id}`} className="text-[12.5px] leading-snug text-slate-700"><span className="font-extrabold text-rose-600">{o.id}.</span> {plain(o.why)}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
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
  const [step, setStep] = useState(saved?.step === "q" ? "q" : "info");
  const [answers, setAnswers] = useState(saved?.answers ?? {});
  const [examPicks, setExamPicks] = useState(saved?.examPicks ?? []);
  const [planPicks, setPlanPicks] = useState(saved?.planPicks ?? []);
  const [planWhy, setPlanWhy] = useState(saved?.planWhy ?? "");
  const [showRefs, setShowRefs] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const topRef = useRef(null);

  useEffect(() => { save(data.id, { idx, step, answers, examPicks, planPicks, planWhy }); }, [data.id, idx, step, answers, examPicks, planPicks, planWhy]);
  useEffect(() => { try { topRef.current?.scrollIntoView?.({ block: "start" }); } catch { /* old browsers */ } }, [idx, step]);

  const screen = screens[idx];
  const mcqsDone = screen.mcqs.every((q) => answers[q.id]?.submitted);
  const needsOk = screen.needs === "planBuilder" ? planPicks.length === 3 : true;
  const canContinue = mcqsDone && needsOk;
  const completed = screens.map((s) => s.mcqs.every((q) => answers[q.id]?.submitted));
  const qNumber = (id) => screens.flatMap((s) => s.mcqs).findIndex((q) => q.id === id) + 1;

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
  function toQuestion() { setStep("q"); }
  function nextScreen() {
    if (!canContinue) return;
    track("case_screen_completed", data.id, { screen: screen.id });
    if (idx + 1 < total) { setIdx(idx + 1); setStep("info"); }
  }
  function back() {
    if (step === "q") setStep("info");
    else if (idx > 0) { setIdx(idx - 1); setStep("q"); }
  }
  function restart() { setAnswers({}); setExamPicks([]); setPlanPicks([]); setPlanWhy(""); setIdx(0); setStep("info"); setConfirmRestart(false); setOnlyWrong(false); }

  const all = screens.flatMap((s) => s.mcqs.map((q) => ({ q, screen: s })));
  const score = all.filter(({ q }) => answers[q.id]?.submitted && answers[q.id]?.picked === q.correct).length;
  const caseDone = completed.every(Boolean);
  useEffect(() => { if (idx === total - 1 && caseDone) track("case_completed", data.id, { correct: score, total: all.length }); /* eslint-disable-next-line */ }, [idx, caseDone]);

  const ctx = { examPicks, setExamPicks, planPicks, setPlanPicks, planWhy, setPlanWhy, mcqsDone };
  const isLast = idx === total - 1;
  const infoBlocks = screen.blocks;
  const qNote = screen.needs === "planBuilder" && mcqsDone && !needsOk;

  return (
    <div data-testid="case-engine" className="pb-10">
      <div ref={topRef}/>
      {/* top bar */}
      <div className="flex items-center gap-2 mb-2.5">
        <button type="button" aria-label="Back to cases" onClick={onExit} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-50"><ChevronLeft size={22} className="text-slate-600"/></button>
        <span className="cl-display font-extrabold text-[13px] text-indigo-900 whitespace-nowrap">{data.title}</span>
        <div className="flex-1 flex gap-[3px]" aria-label="Case progress">
          {screens.map((s, n) => (
            <button key={s.id} type="button" aria-label={`Screen ${n + 1}: ${s.title}`} aria-current={n === idx ? "step" : undefined}
              disabled={n > idx && !completed.slice(0, n).every(Boolean)} onClick={() => { setIdx(n); setStep("info"); }}
              className={`h-2 flex-1 rounded-full ${n < idx || completed[n] ? "bg-emerald-500" : n === idx ? "bg-emerald-300" : "bg-slate-200"} disabled:cursor-not-allowed`}/>
          ))}
        </div>
        <span className="text-[12px] font-bold text-slate-500 tabular-nums" data-testid="engine-count">{idx + 1}/{total}</span>
        <button type="button" onClick={() => setShowRefs((v) => !v)} aria-expanded={showRefs} aria-label="References" className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1"><BookOpen size={13}/> Refs</button>
      </div>

      {showRefs && <References refs={data.references} onClose={() => setShowRefs(false)}/>}

      <div className="space-y-3 min-w-0">
        {step === "info" ? (
          <>
            <div>
              <h2 className="cl-display text-[20px] font-extrabold text-indigo-950 leading-tight" data-testid="engine-title">{idx + 1}. {screen.title.replace(/^Lumbar Case 1: /, "")}</h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5 leading-snug" data-testid="engine-task">{screen.task}</p>
            </div>
            {screen.art && screen.quote && <PatientHero art={screen.art} quote={screen.quote} note={screen.quoteNote}/>}
            {infoBlocks.map((b, n) => <Block key={n} block={b} ctx={ctx} screen={screen}/>)}
            <section className="rounded-2xl border border-violet-200 bg-violet-50 p-3 flex gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0"><Target size={16}/></span>
              <div><div className="text-[12.5px] font-extrabold text-violet-900">Learning objective</div><p className="text-[12.5px] text-slate-700 leading-snug">{screen.objective}</p></div>
            </section>
            <div className="flex gap-2">
              {idx > 0 && <button type="button" onClick={back} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center gap-1"><ChevronLeft size={16}/> Back</button>}
              <button type="button" onClick={toQuestion} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
                Next: Answer a question <ChevronRight size={16}/>
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="cl-display text-[17px] font-extrabold text-indigo-950 leading-tight" data-testid="engine-title">{idx + 1}. {screen.title.replace(/^Lumbar Case 1: /, "")}</h2>
            {screen.mcqs.map((q) => <Mcq key={q.id} mcq={q} number={qNumber(q.id)} state={answers[q.id]} onPick={(id) => pick(q, id)} onSubmit={() => submit(q)}/>)}

            {mcqsDone && screen.reveal.map((b, n) => <Block key={`r${n}`} block={b} ctx={ctx} screen={screen} reveal/>)}

            {mcqsDone && (
              <section data-testid="takeaway" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><Lightbulb size={16}/></span>
                <div><div className="text-[12.5px] font-extrabold text-amber-900">Clinical takeaway</div><p className="text-[12.5px] text-slate-800 leading-snug">{screen.takeaway}</p></div>
              </section>
            )}

            {isLast && caseDone && (
              <FinalReview data={data} answers={answers} score={score} totalQ={all.length} onlyWrong={onlyWrong} setOnlyWrong={setOnlyWrong}
                confirmRestart={confirmRestart} setConfirmRestart={setConfirmRestart} restart={restart} onExit={onExit} exitLabel={exitLabel}/>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={back} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center gap-1"><ChevronLeft size={16}/> Back</button>
              {!isLast && (
                <button type="button" disabled={!canContinue} onClick={nextScreen}
                  className={`flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${canContinue ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  {screen.nextLabel || "Continue"} <ChevronRight size={16}/>
                </button>
              )}
            </div>
            {qNote && <p className="text-[12px] text-amber-800">Choose three priorities to continue.</p>}
          </>
        )}

        <details className="rounded-2xl border border-slate-200 bg-white p-3">
          <summary className="cl-display font-extrabold text-[12.5px] text-slate-800 cursor-pointer">About this case</summary>
          <dl className="mt-2 space-y-1.5">{data.caseFile.map(([k, v]) => <div key={k} className="text-[12px] leading-snug"><dt className="font-bold text-slate-900">{k}</dt><dd className="text-slate-600">{v}</dd></div>)}</dl>
          <p className="text-[11px] text-slate-500 mt-2">{data.difficulty} · {data.subtitle}</p>
          <p className="text-[10.5px] text-slate-400 mt-1">{data.sourceNote}</p>
          <div className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">What the labels mean</div>
          <ul className="mt-1 space-y-1.5">{Object.keys(TAGS).map((t) => <li key={t} className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-snug"><TagChip tag={t}/><span>{TAGS[t].hint}</span></li>)}</ul>
          <div className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Learning outcomes</div>
          <ul className="mt-1 space-y-1">{data.outcomes.map((o) => <li key={o} className="text-[11.5px] text-slate-600 leading-snug">• {o}</li>)}</ul>
        </details>
      </div>
    </div>
  );
}

function FinalReview({ data, answers, score, totalQ, onlyWrong, setOnlyWrong, confirmRestart, setConfirmRestart, restart, onExit, exitLabel }) {
  const rows = data.screens.flatMap((s) => s.mcqs.map((q) => ({ q, s }))).filter(({ q }) => !onlyWrong || answers[q.id]?.picked !== q.correct);
  return (
    <section data-testid="final-review" className="rounded-2xl border border-slate-200 bg-white p-3">
      <h3 className="cl-display font-extrabold text-[14px] text-indigo-950">Review your answers</h3>
      <p className="text-[12.5px] text-slate-600 mt-0.5" data-testid="final-score">You answered {score} of {totalQ} questions correctly on your first submission. This is a record of this attempt, not a measure of mastery.</p>
      <label className="flex items-center gap-2 text-[12px] text-slate-700 mt-2"><input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)}/> Show only the ones I got wrong</label>
      <ul className="mt-2 space-y-2">
        {rows.length === 0 && <li className="text-[12.5px] text-emerald-800">Nothing to review — every answer was correct.</li>}
        {rows.map(({ q, s }) => {
          const a = answers[q.id];
          const ok = a?.picked === q.correct;
          const mine = q.options.find((o) => o.id === a?.picked);
          const right = q.options.find((o) => o.id === q.correct);
          return (
            <li key={q.id} className="rounded-xl border border-slate-200 p-2.5 text-[12.5px] leading-snug">
              <div className="flex items-start gap-2"><span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${ok ? "bg-emerald-500" : "bg-rose-500"}`}>{ok ? <Check size={12}/> : <X size={12}/>}</span>
                <div><div className="text-[10.5px] text-slate-500">{s.title}</div><div className="font-bold text-slate-900">{q.q}</div>
                  <div className="text-slate-700 mt-1">Your answer: {mine ? `${mine.id}. ${mine.text}` : "—"}</div>
                  {!ok && <div className="text-emerald-800 mt-0.5">Right answer: {right.id}. {right.text}</div>}
                  <div className="text-slate-600 mt-0.5">{plain((ok ? right : mine)?.why || "")}</div>
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
