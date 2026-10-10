import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronsRight, RotateCcw, Check, X, AlertCircle } from "lucide-react";
import { KNEE_CASE, SIM_PATIENTS } from "./kneeSimCase.js";

// Case Simulator (Learn). Pick a patient, then play the case: the patient
// talks, the PM bot asks what you would do next, you answer, and the bot
// reacts. The case wording lives in kneeSimCase.js (Aditi's own mockup text);
// the pictures are cut from her character sheet (public/sim/).

const img = (name) => `${import.meta.env.BASE_URL || "/"}sim/${name}.webp`;

function Bubble({ children, className = "" }) {
  return <div className={`rounded-2xl bg-white/95 border border-slate-200 px-3 py-2 text-[13.5px] leading-snug text-slate-800 shadow-sm ${className}`}>{children}</div>;
}

function Bot({ pose, size = 64 }) {
  return <img src={img(`bot-${pose}`)} alt="" className="shrink-0 rounded-2xl object-cover bg-sky-50 shadow-sm" style={{ width: size, height: size * 1.1 }}/>;
}

function PatientList({ onPick, onBack }) {
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
            </span>
            {p.live ? <ChevronRight size={18} className="text-sky-500 shrink-0"/> : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">Soon</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Play({ onExit }) {
  const stages = KNEE_CASE.stages;
  const total = stages.length;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { try { endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); } catch { /* old browsers */ } }, [i, done, finished]);

  const st = stages[i];
  const right = done && picked === st.correct;
  const progress = finished ? total : i + (done ? 1 : 0);

  const submit = () => { setDone(true); if (picked === st.correct) setScore((n) => n + 1); };
  const next = () => {
    if (i + 1 >= total) { setFinished(true); return; }
    setI(i + 1); setPicked(null); setDone(false);
  };
  const restart = () => { setI(0); setPicked(null); setDone(false); setScore(0); setFinished(false); };

  // What the patient is saying right now: the stage's own lines, or the reply
  // after answering.
  const lines = done && st.reply?.patient ? st.reply.patient : st.patient;
  const face = done ? (right ? "expr-happy" : "expr-concerned") : "patient-1";

  if (finished) {
    return (
      <div data-testid="sim-finished" className="text-center pt-6">
        <div className="flex justify-center"><Bot pose={score === total ? "celebrating" : "talking"} size={120}/></div>
        <div className="cl-display text-2xl font-extrabold text-slate-900 mt-4">Case complete</div>
        <p className="text-sm text-slate-600 mt-1">You got {score} of {total} right.</p>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={restart} className="flex-1 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5"><RotateCcw size={14}/> Play again</button>
          <button type="button" onClick={onExit} className="flex-1 h-11 rounded-xl bg-slate-900 text-white font-bold text-sm">Choose a patient</button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="sim-play">
      <div className="flex items-center gap-1.5 mb-2">
        <button type="button" aria-label="Back to patients" onClick={onExit} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-50">
          <ChevronLeft size={22} className="text-slate-600"/>
        </button>
        <div className="flex-1 text-center cl-display font-extrabold text-slate-900 text-[15px]">{KNEE_CASE.title}</div>
        <div className="text-sm font-bold text-slate-500 w-10 text-right" data-testid="sim-count">{i + 1}/{total}</div>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={progress}>
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all" style={{ width: `${(progress / total) * 100}%` }}/>
      </div>

      {/* The patient and what they say */}
      <div className="flex items-end gap-2 rounded-3xl bg-gradient-to-br from-sky-50 to-violet-50 border border-sky-100 p-3 mb-3 min-h-[150px]">
        <img src={img(face)} alt="" className={`shrink-0 object-cover bg-white/60 ${face === "patient-1" ? "w-[112px] h-[144px] rounded-2xl" : "w-[112px] h-[112px] rounded-2xl"}`}/>
        <div className="flex-1 space-y-1.5 min-w-0">
          {done && right && st.goodChoice && <Bubble className="font-extrabold">{st.goodChoice} 👍</Bubble>}
          {done && right && st.goodLine && <Bubble className="text-slate-600 text-[12.5px]">{st.goodLine}</Bubble>}
          {!(done && right && st.goodChoice) && (lines || []).map((t) => <Bubble key={t}>{t}</Bubble>)}
        </div>
      </div>

      {st.notice && !done && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-3 text-[13px] text-amber-900">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500"/> {st.notice}
        </div>
      )}

      {/* The question */}
      <div className="flex items-start gap-3 mb-2">
        <Bot pose={done ? (right ? "correct" : "incorrect") : "thinking"}/>
        <Bubble className="flex-1 !bg-sky-50 border-sky-100 font-semibold">{st.ask}</Bubble>
      </div>
      <div className="space-y-2 mb-3">
        {st.options.map((t, k) => {
          const isPicked = picked === k;
          const isRight = done && k === st.correct;
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
          Submit
        </button>
      )}

      {/* After answering */}
      {done && (
        <div className="space-y-3">
          <div className={`rounded-2xl p-3.5 text-sm leading-relaxed ${right ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
            <div className="font-extrabold mb-0.5 flex items-center gap-1.5">{right ? <><Check size={16}/> Correct!</> : <><X size={16}/> Not quite. The right answer is marked in green.</>}</div>
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
            {i + 1 >= total ? "Finish" : "Next"} <ChevronsRight size={16}/>
          </button>
        </div>
      )}
      <div ref={endRef} className="h-6"/>
    </div>
  );
}

export default function CaseSimulator({ onBack }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div data-testid="case-simulator" className="pb-10">
      {playing ? <Play onExit={() => setPlaying(false)}/> : <PatientList onPick={() => setPlaying(true)} onBack={onBack}/>}
    </div>
  );
}
