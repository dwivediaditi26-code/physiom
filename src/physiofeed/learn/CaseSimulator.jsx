import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, ChevronsRight, RotateCcw, Check, X, AlertCircle,
  Clock, Footprints, Leaf, PersonStanding, Eye, Move, Dumbbell, FlaskConical, Activity,
  Target, Timer, BarChart3, Star,
} from "lucide-react";
import { KNEE_CASE, SIM_PATIENTS } from "./kneeSimCase.js";
import StudyImage from "./StudyImage.jsx";
import EncounterEngine, { SANS } from "./EncounterEngine.jsx";
import { ENCOUNTER } from "./lumbarEncounter.js";

// Case Simulator (Learn). Pick a patient, then play the case: the patient
// talks, the PM bot asks what you would do next, you answer, and the bot
// reacts; then findings, a clinical-reasoning question and a summary.
// All case wording lives in kneeSimCase.js (Aditi's own mockup text, nothing
// written by the developer). Pictures: the characters are cut from her sheet
// (public/sim/); clinical pictures are the app's existing ones (Cloudinary
// ids named in kneeSimCase.js).

const img = (name) => `${import.meta.env.BASE_URL || "/"}sim/${name}.webp`;
const STORE_KEY = "pm_sim_knee_v1";

const TRACK = ["History", "Red Flags", "Symptom Behaviour", "Examination", "Findings", "Clinical Reasoning", "Summary"];

const ICONS = {
  clock: Clock, walk: Footprints, leaf: Leaf, person: PersonStanding, eye: Eye,
  move: Move, dumbbell: Dumbbell, flask: FlaskConical, knee: Activity,
};
const ICON_TINT = ["bg-rose-100 text-rose-500", "bg-sky-100 text-sky-600", "bg-emerald-100 text-emerald-600", "bg-violet-100 text-violet-600", "bg-amber-100 text-amber-600"];
function Ico({ name, i = 0, size = 18 }) {
  const I = ICONS[name] || Activity;
  return <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ICON_TINT[i % ICON_TINT.length]}`}><I size={size} strokeWidth={2}/></span>;
}

// A stage's `correct` is one option index, or a list when several answers are
// acceptable (the findings stage: ROM, strength and the functional test are all
// valid next examinations).
const isCorrect = (st, k) => (Array.isArray(st.correct) ? st.correct.includes(k) : k === st.correct);
const correctList = (st) => (Array.isArray(st.correct) ? st.correct : [st.correct]);

function readLast() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch { return null; } }
function writeLast(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* private mode */ } }

function Bubble({ children, className = "" }) {
  return <div className={`rounded-2xl bg-white/95 border border-slate-200 px-3 py-2 text-[13.5px] leading-snug text-slate-800 shadow-sm ${className}`}>{children}</div>;
}

// If a picture ever fails to load, show a plain tile instead of the browser's
// broken-image icon.
function SafeImg({ src, className, style, fallback = "🤖" }) {
  const [bad, setBad] = useState(false);
  if (bad) return <span className={`${className} flex items-center justify-center text-2xl`} style={style} aria-hidden="true">{fallback}</span>;
  return <img src={src} alt="" className={className} style={style} onError={() => setBad(true)}/>;
}

function Bot({ pose, size = 64 }) {
  return <SafeImg src={img(`bot-${pose}`)} className="shrink-0 rounded-2xl object-cover bg-sky-50 shadow-sm" style={{ width: size, height: size * 1.1 }}/>;
}

function Tracker({ current, doneThrough }) {
  return (
    <div className="flex items-start justify-between mb-3 relative" aria-label="Case progress">
      <div className="absolute left-[7%] right-[7%] top-[11px] h-[3px] bg-slate-200 rounded"/>
      <div className="absolute left-[7%] top-[11px] h-[3px] bg-emerald-500 rounded transition-all" style={{ width: `${(Math.min(doneThrough, TRACK.length - 1) / (TRACK.length - 1)) * 86}%` }}/>
      {TRACK.map((t, k) => {
        const isDone = k < doneThrough || (k === doneThrough && doneThrough >= TRACK.length - 1);
        const isNow = k === current;
        return (
          <div key={t} className="relative flex-1 flex flex-col items-center text-center min-w-0" data-state={isNow ? "now" : isDone ? "done" : "todo"}>
            <span className={`w-[24px] h-[24px] rounded-full text-[11px] font-bold flex items-center justify-center border-2 ${isNow ? "bg-blue-600 border-blue-300 text-white ring-2 ring-blue-100" : isDone ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 text-slate-400"}`}>
              {isDone && !isNow ? <Check size={13} strokeWidth={3}/> : k + 1}
            </span>
            <span className={`mt-1 text-[8.5px] leading-tight px-0.5 ${isNow ? "font-extrabold text-blue-700" : "text-slate-500"}`}>{t}</span>
          </div>
        );
      })}
    </div>
  );
}

// Big scene panel like the mockup: the patient fills the left side, speech
// bubbles sit on top of the scene on the right, and the PM bot (optional)
// stands at the bottom-right with its own bubble.
function Hero({ face, bubbles, bot, className = "" }) {
  const portrait = face === "patient-1";
  return (
    <div data-testid="sim-hero" className={`rounded-3xl overflow-hidden border border-sky-100 bg-gradient-to-b from-sky-100 via-sky-50 to-violet-50 mb-3 ${className}`}>
      <div className="relative flex" style={{ minHeight: bot ? 400 : 300 }}>
        <img src={img(face)} alt="" className={`absolute left-0 bottom-0 object-contain object-bottom ${portrait ? "h-[300px]" : "h-[230px]"} w-auto max-w-[50%]`}/>
        <div className="relative ml-auto w-[52%] pt-4 pr-3 pb-3 flex flex-col gap-2">
          {bubbles}
          {bot && (
            <div className="mt-auto flex items-end gap-1.5" data-testid="sim-hero-bot">
              <Bubble className="flex-1 !bg-emerald-50 border-emerald-200 text-[12px] !px-2.5">{bot.text}</Bubble>
              <Bot pose={bot.pose} size={60}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientList({ onPick, onBack }) {
  const last = readLast();
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <button type="button" aria-label="Back to Learn" onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-50">
          <ChevronLeft size={22} className="text-slate-600"/>
        </button>
        <div className="min-w-0">
          <h1 className="cl-display text-2xl font-extrabold text-slate-900">Choose a Patient</h1>
          <p className="text-sm text-slate-500">Real cases. Real decisions. Real learning.</p>
        </div>
      </div>
      <div className="space-y-2.5 mt-4">
        {SIM_PATIENTS.map((p) => (
          <button key={p.id} type="button" disabled={!p.live} onClick={() => onPick(p.id)}
            className={`w-full text-left flex items-center gap-3 rounded-2xl border p-2.5 bg-white transition ${p.live ? "border-sky-300 shadow-sm active:scale-[0.99]" : "border-slate-200 opacity-60 cursor-not-allowed"}`}>
            <img src={img(p.art)} alt="" className="w-[72px] h-[88px] rounded-xl object-cover bg-sky-50 shrink-0"/>
            <span className="min-w-0 flex-1">
              <span className="block cl-display font-extrabold text-[16px] text-slate-900 leading-tight">{p.title}</span>
              <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 my-1">{p.tag}</span>
              <span className="block text-xs text-slate-600">{p.sub}</span>
              <span className="block text-xs text-slate-500">{p.line}</span>
              {p.live && p.id === "knee" && last && <span data-testid="sim-last" className="block text-[11px] font-bold text-emerald-700 mt-0.5">Last attempt: {last.correct}/{last.total} ({last.pct}%)</span>}
            </span>
            {p.live ? <ChevronRight size={18} className="text-sky-500 shrink-0"/> : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">Soon</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExamPanel({ stage, exam, setExam }) {
  const ex = stage.exams.find((e) => e.id === exam);
  return (
    <div className="mb-3">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-2.5 mb-2.5">
        <div className="font-extrabold text-[13px] text-slate-900 mb-2">{stage.examTitle}</div>
        <div className="space-y-1.5">
          {stage.exams.map((e, k) => (
            <button key={e.id} type="button" onClick={() => setExam(e.id)} aria-pressed={exam === e.id}
              className={`w-full text-left flex items-center gap-2.5 rounded-xl border px-2 py-1.5 text-[13px] ${exam === e.id ? "border-blue-500 bg-blue-50 font-bold text-blue-800" : "border-slate-200 bg-white text-slate-700"}`}>
              <Ico name={e.icon} i={k} size={16}/> {e.label}
            </button>
          ))}
        </div>
      </div>
      {ex && (
        <div data-testid="sim-findings" className="rounded-2xl bg-sky-50 border border-sky-100 p-3">
          <div className="flex items-center gap-1.5 font-extrabold text-[13px] text-slate-900 mb-2"><Eye size={15} className="text-sky-600"/> Findings <span className="font-semibold text-slate-500">({ex.label})</span></div>
          <div className="flex gap-3 items-start">
            {ex.images && (
              <div className="w-[44%] shrink-0 space-y-1.5">
                {ex.images.map((id) => <div key={id} className="rounded-lg overflow-hidden bg-white border border-slate-200"><StudyImage name={id} full/></div>)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {ex.findings ? (
                <ul className="space-y-1.5">
                  {ex.findings.map((f) => <li key={f} className="flex gap-2 text-[13.5px] text-slate-800 leading-snug"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"/>{f}</li>)}
                </ul>
              ) : (
                <p className="text-[13px] text-slate-500 italic">Not available in this case yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ c, answers, score, mins, onReplay, onNext }) {
  const total = c.stages.length;
  const pct = Math.round((score / total) * 100);
  const [tab, setTab] = useState("summary");
  const tabsRef = useRef(null);
  const S = c.summary;
  const metric = (Icon, tint, value, label, tid) => (
    <div className="flex-1 min-w-0 rounded-2xl bg-white border border-slate-200 p-2.5 text-center shadow-sm">
      <span className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-1 ${tint}`}><Icon size={16}/></span>
      <div data-testid={tid} className="font-extrabold text-[15px] text-slate-900 leading-tight">{value}</div>
      <div className="text-[10.5px] text-slate-500">{label}</div>
    </div>
  );
  const TABS = [["summary", "Case Summary"], ["answers", "Your Answers"], ["learning", "Learning Points"], ["refs", "References"]];
  return (
    <div data-testid="sim-finished">
      {/* celebration scene: the patient, the PM bot and the therapist (cut from Aditi's mockup) */}
      <div data-testid="sim-celebration" className="rounded-3xl overflow-hidden border border-sky-100 mb-3">
        <img loading="lazy" decoding="async" src={img("knee-complete-scene")} alt="Case completed: the patient, the PM bot and the therapist celebrating" className="w-full h-auto block"/>
      </div>

      <div className="flex gap-2 mb-3">
        {metric(Star, "bg-amber-100 text-amber-500", `${pct}%`, "Score", "sim-pct")}
        {metric(Target, "bg-rose-100 text-rose-500", `${score}/${total}`, "Correct", "sim-correct")}
        {metric(BarChart3, "bg-violet-100 text-violet-600", S.level, "Level", "sim-level")}
        {metric(Timer, "bg-sky-100 text-sky-600", `${mins} min`, "Completion time", "sim-time")}
      </div>

      <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto mb-3" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`shrink-0 h-9 px-3 rounded-xl text-[12.5px] font-bold border ${tab === k ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>{l}</button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="space-y-2.5 mb-3">
          <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
            <div className="font-extrabold text-[13px] text-sky-800 mb-2">Clinical Summary</div>
            <div className="space-y-2">{S.clinical.map(([ic, k, v], n) => (
              <div key={k + n} className="flex items-center gap-2.5"><Ico name={ic} i={n}/><div className="text-[13px] leading-tight"><div className="font-bold text-slate-900">{k}</div><div className="text-slate-600">{v}</div></div></div>
            ))}</div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
            <div className="font-extrabold text-[13px] text-violet-800 mb-2">Examination Findings</div>
            <div className="space-y-2">{S.findings.map(([ic, k, v], n) => (
              <div key={k} className="flex items-center gap-2.5"><Ico name={ic} i={n + 1}/><div className="text-[13px] leading-tight"><div className="font-bold text-slate-900">{k}</div><div className="text-slate-600">{v}</div></div></div>
            ))}</div>
          </div>
        </div>
      )}

      {tab === "answers" && (
        <div data-testid="sim-answers" className="space-y-2.5 mb-3">
          {c.stages.map((st, n) => {
            const got = answers[n];
            const ok = got != null && isCorrect(st, got);
            return (
              <div key={n} className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white ${ok ? "bg-emerald-500" : "bg-rose-500"}`}>{ok ? <Check size={13}/> : <X size={13}/>}</span>
                  <div className="text-[13px] leading-snug">
                    <div className="font-bold text-slate-900">Question {n + 1}: {st.ask}</div>
                    <div className="text-slate-700 mt-1">Your answer: {got == null ? "—" : st.options[got]}</div>
                    {!ok && <div className="text-emerald-700 mt-0.5">{correctList(st).length > 1 ? "Right answers: " : "Right answer: "}{correctList(st).map((k) => st.options[k]).join(" / ")}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "learning" && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-[13px] text-slate-500 mb-3">{S.learningPoints ? S.learningPoints : "Learning points are not available for this case yet."}</div>
      )}
      {tab === "refs" && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-[13px] text-slate-500 mb-3">{S.references ? S.references : "References are not available for this case yet."}</div>
      )}

      <div className="flex items-start gap-3 rounded-2xl bg-sky-50 border border-sky-100 p-3 mb-3">
        <Bot pose={score === total ? "celebrating" : "correct"} size={56}/>
        <div className="text-[13px] leading-snug text-slate-800"><div className="font-extrabold text-sky-900 mb-0.5">PhysioMind Tutor</div>{S.tutor}</div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => { setTab("answers"); try { tabsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }); } catch { /* old browsers */ } }}
          className="flex-1 h-11 rounded-xl bg-white border border-blue-200 text-blue-700 font-bold text-[13px]">Review My Answers</button>
        <button type="button" onClick={onReplay} className="flex-1 h-11 rounded-xl bg-white border border-blue-200 text-blue-700 font-bold text-[13px] flex items-center justify-center gap-1"><RotateCcw size={13}/> Replay Case</button>
        <button type="button" onClick={onNext} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-bold text-[13px] flex items-center justify-center gap-1">Next Patient <ChevronRight size={14}/></button>
      </div>
    </div>
  );
}

function Play({ onExit }) {
  const c = KNEE_CASE;
  const stages = c.stages;
  const total = stages.length;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [exam, setExam] = useState(null);
  const [mins, setMins] = useState(1);
  const startRef = useRef(Date.now());
  const endRef = useRef(null);
  useEffect(() => { try { endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); } catch { /* old browsers */ } }, [i, done, finished]);

  const st = stages[i];
  const right = done && isCorrect(st, picked);
  const score = answers.filter((a, n) => a != null && isCorrect(stages[n], a)).length;

  const submit = () => { setDone(true); setAnswers((a) => { const n = [...a]; n[i] = picked; return n; }); };
  const next = () => {
    if (i + 1 >= total) {
      const m = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
      const correct = answers.filter((a, n) => a != null && isCorrect(stages[n], a)).length;
      setMins(m); setFinished(true);
      writeLast({ correct, total, pct: Math.round((correct / total) * 100), mins: m, at: Date.now() });
      return;
    }
    setI(i + 1); setPicked(null); setDone(false); setExam(null);
  };
  const restart = () => { setI(0); setPicked(null); setDone(false); setAnswers([]); setFinished(false); setExam(null); startRef.current = Date.now(); };

  const lines = done && st.reply?.patient ? st.reply.patient : st.patient;
  const face = done ? (right ? "expr-happy" : "expr-concerned") : "patient-1";
  const current = finished ? total : i;
  const doneThrough = finished ? total : i + (done ? 1 : 0);

  return (
    <div data-testid="sim-play">
      <div className="flex items-center gap-1.5 mb-2">
        <button type="button" aria-label="Back to patients" onClick={onExit} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-50">
          <ChevronLeft size={22} className="text-slate-600"/>
        </button>
        <div className="flex-1 text-center cl-display font-extrabold text-slate-900 text-[15px]">{c.title}</div>
        {!finished && <div className="text-sm font-bold text-slate-500 w-10 text-right" data-testid="sim-count">{i + 1}/{total}</div>}
        {finished && <div className="w-10"/>}
      </div>
      <Tracker current={current} doneThrough={doneThrough}/>

      {finished ? (
        <Summary c={c} answers={answers} score={score} mins={mins} onReplay={restart} onNext={onExit}/>
      ) : (
        <>
          {/* The patient and what they say */}
          {st.kind !== "findings" && st.kind !== "reasoning" && (
            <Hero
              face={face}
              bubbles={<>
                {done && right && st.goodChoice && <Bubble className="font-extrabold">{st.goodChoice} 👍</Bubble>}
                {done && right && st.goodLine && <Bubble className="text-slate-600 text-[12.5px]">{st.goodLine}</Bubble>}
                {st.historyDone && !done && <Bubble className="text-[13px]">{st.historyDone.patient}</Bubble>}
                {!st.historyDone && !(done && right && st.goodChoice) && (lines || []).map((t) => <Bubble key={t}>{t}</Bubble>)}
              </>}
              bot={st.historyDone && !done ? { pose: "talking", text: st.historyDone.bot } : null}
            />
          )}

          {st.historyDone && (
            <>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-3 mb-3">
                <div className="font-extrabold text-[13px] text-slate-900 mb-2">{st.historyDone.infoTitle}</div>
                <div className="grid grid-cols-2 gap-2">
                  {st.historyDone.info.map(([ic, k, v], n) => (
                    <div key={k} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2"><Ico name={ic} i={n} size={16}/><div className="text-[12px] leading-tight min-w-0"><div className="font-bold text-slate-900">{k}</div><div className="text-slate-600">{v}</div></div></div>
                  ))}
                </div>
              </div>
            </>
          )}

          {st.kind === "findings" && (
            <>
              <div data-testid="sim-hero" className="rounded-3xl overflow-hidden border border-sky-100 mb-3 bg-sky-50">
                <img loading="lazy" decoding="async" src={img("knee-exam-scene")} alt="The therapist examining the patient's knee" className="w-full block object-cover" style={{ maxHeight: 330, objectPosition: "50% 62%" }}/>
                <p className="text-[12.5px] font-semibold text-slate-700 px-3 py-2">Choose what to examine, then read the findings.</p>
              </div>
              <ExamPanel stage={st} exam={exam} setExam={setExam}/>
            </>
          )}

          {st.notice && !done && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-3 text-[13px] text-amber-900">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500"/> {st.notice}
            </div>
          )}

          {/* The question */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1 text-[12px] font-extrabold text-sky-800 bg-sky-100 rounded-full px-2.5 py-1"><span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center">Q</span> Question {i + 1}</span>
          </div>
          <div className="flex items-start gap-3 mb-2">
            <Bot pose={done ? (right ? "correct" : "incorrect") : "thinking"}/>
            <Bubble className="flex-1 !bg-sky-50 border-sky-100 font-semibold">{st.ask}</Bubble>
          </div>
          <div className="space-y-2 mb-3">
            {st.options.map((t, k) => {
              const isPicked = picked === k;
              const isRight = done && isCorrect(st, k);
              const isWrong = done && isPicked && !isRight;
              return (
                <button key={t} type="button" disabled={done} onClick={() => setPicked(k)}
                  className={`w-full text-left flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${isRight ? "border-emerald-400 bg-emerald-50" : isWrong ? "border-rose-300 bg-rose-50" : isPicked ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"}`}>
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${isRight ? "bg-emerald-500 text-white" : isWrong ? "bg-rose-500 text-white" : isPicked ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {isRight ? <Check size={13}/> : isWrong ? <X size={13}/> : "ABCD"[k]}
                  </span>
                  <span className="text-slate-800 leading-snug">{t}</span>
                </button>
              );
            })}
          </div>

          {!done && (
            <button type="button" disabled={picked === null} onClick={submit}
              className={`w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center ${picked !== null ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
              Submit Answer
            </button>
          )}

          {/* After answering */}
          {done && (
            <div className="space-y-3">
              <div className={`rounded-2xl p-3.5 text-sm leading-relaxed ${right ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
                <div className="font-extrabold mb-0.5 flex items-center gap-1.5">{right ? <><Check size={16}/> Correct!</> : <><X size={16}/> Not quite. {correctList(st).length > 1 ? "The right answers are" : "The right answer is"} marked in green.</>}</div>
                {st.explain && right && st.explain}
              </div>
              {st.reply?.checklist && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5">
                  <div className="font-extrabold text-emerald-900 mb-2 text-sm">{st.reply.checklistTitle}</div>
                  <ul className="space-y-1.5">
                    {st.reply.checklist.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-sm text-slate-800"><span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={12}/></span>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {st.reply?.info && (
                <div className="rounded-2xl bg-sky-50 border border-sky-100 p-3.5">
                  <div className="font-extrabold text-sky-900 mb-2 text-sm">{st.reply.infoTitle}</div>
                  <dl className="space-y-1.5">
                    {st.reply.info.map(([k, v]) => (
                      <div key={k} className="text-sm"><dt className="inline font-bold text-slate-900">{k}: </dt><dd className="inline text-slate-700">{v}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
              {st.reply?.bot && (
                <div className="flex items-start gap-3">
                  <Bot pose="talking" size={56}/>
                  <Bubble className="flex-1 !bg-emerald-50 border-emerald-200">{st.reply.bot}</Bubble>
                </div>
              )}
              <button type="button" onClick={next} className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5">
                {i + 1 >= total ? "See my summary" : "Next"} <ChevronsRight size={16}/>
              </button>
            </div>
          )}
        </>
      )}
      <div ref={endRef} className="h-6"/>
    </div>
  );
}

export default function CaseSimulator({ onBack }) {
  const [playing, setPlaying] = useState(null);
  return (
    <div data-testid="case-simulator" className="pb-10" style={{ fontFamily: SANS }}>
      {playing === "knee" && <Play onExit={() => setPlaying(null)}/>}
      {playing === "lumbar1" && <EncounterEngine data={ENCOUNTER} onExit={() => setPlaying(null)} exitLabel="Return to Lumbar Cases"/>}
      {!playing && <PatientList onPick={setPlaying} onBack={onBack}/>}
    </div>
  );
}
