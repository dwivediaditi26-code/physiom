import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, RotateCcw, Trophy, BookOpen } from "lucide-react";
import { QuickCheck } from "./QuickCheck.jsx";
import { trackEvent } from "../../analytics/trackEvent.js";
import { PINNED_BAR_CSS } from "./pinnedBar.js";
import { alignTo, appBarBottom, keepInView } from "./scrollKit.js";

// The Quiz tab of every Learn detail screen (2026-09-20, Aditi: "in quiz have
// more ques ... so that student learn fully"). `quiz` is one question, or a list
// of them (see quizBuilders.js). One question shows as the plain Quick Check; two
// or more run as a short quiz: one question at a time with a progress bar, the
// answer explained straight away, a score at the end, and a way to retry just the
// ones you missed. Submit / Next sits in a bar pinned above the bottom tabs so
// it is always in reach, however long the options are.

function Option({ o, picked, checked, correctId, onPick }) {
  const isPicked = picked === o.id;
  const isRight = checked && o.id === correctId;
  const isWrong = checked && isPicked && !isRight;
  return (
    <button
      type="button"
      disabled={checked}
      onClick={() => onPick(o.id)}
      className={`w-full text-left flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
        isRight ? "border-emerald-400 bg-emerald-50" : isWrong ? "border-rose-300 bg-rose-50" : isPicked ? "border-fuchsia-400 bg-fuchsia-50" : "border-slate-200 bg-white"
      }`}
    >
      <span className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold ${isPicked || isRight ? "border-current" : "border-slate-300"} ${isRight ? "text-emerald-600" : isWrong ? "text-rose-500" : isPicked ? "text-fuchsia-600" : "text-slate-400"}`}>
        {isRight ? "✓" : isWrong ? "✕" : o.id}
      </span>
      <span className="text-slate-800 leading-snug">{o.text}</span>
    </button>
  );
}

const PRIMARY = "bg-gradient-to-r from-fuchsia-600 to-violet-500 text-white shadow-md active:scale-[0.99]";
const BTN = "flex items-center justify-center text-center gap-1.5 rounded-2xl min-h-[46px] text-sm font-bold transition";

export function QuizSet({ questions, onReview }) {
  const total = questions.length;
  const all = questions.map((_, i) => i);
  const [round, setRound] = useState(all);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const rootRef = useRef(null);
  const feedbackRef = useRef(null);
  const moved = useRef(false);

  const qi = round[pos];
  const q = questions[qi];
  const score = all.filter((i) => answers[i]?.right).length;
  const missed = all.filter((i) => answers[i] && !answers[i].right);
  const retrying = round.length < total;

  useEffect(() => { trackEvent("quiz_started", { properties: { total } }); }, []);

  // Opening the tab: the hero photo above pushes the quiz below the fold, so
  // scroll it up to sit just under the tab strip (~70px = tabs + their margin).
  useEffect(() => { alignTo(rootRef.current, appBarBottom(), 70); }, []);

  // A new question, or the results, replaces the old content: bring the top back into view.
  useEffect(() => {
    if (!moved.current) { moved.current = true; return; }
    keepInView(rootRef.current);
  }, [pos, finished, round]);

  // Once answered, make sure the explanation is not hidden behind the pinned bar.
  useEffect(() => {
    const el = feedbackRef.current;
    if (checked && el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [checked]);

  const submit = () => {
    if (!picked) return;
    const right = picked === q.correctOptionId;
    setAnswers((a) => ({ ...a, [qi]: { pick: picked, right } }));
    setChecked(true);
    trackEvent("mcq_answered", { entityType: "question", entityId: qi, properties: { correct: right } });
  };
  const next = () => {
    setPicked(null);
    setChecked(false);
    if (pos + 1 < round.length) setPos(pos + 1);
    else { setFinished(true); trackEvent("quiz_completed", { properties: { score, total } }); }
  };
  const restart = () => { setRound(all); setPos(0); setPicked(null); setChecked(false); setAnswers({}); setFinished(false); };
  const retryMissed = () => {
    setAnswers((a) => { const n = { ...a }; missed.forEach((i) => delete n[i]); return n; });
    setRound(missed); setPos(0); setPicked(null); setChecked(false); setFinished(false);
  };

  const dotClass = (idx, p) => {
    const a = answers[idx];
    if (a) return a.right ? "bg-emerald-500" : "bg-rose-400";
    return !finished && p === pos ? "bg-fuchsia-500" : "bg-slate-200";
  };

  let body;
  if (finished) {
    const pct = Math.round((score / total) * 100);
    const message = pct === 100 ? "Perfect — you know this one." : pct >= 70 ? "Good work. Revise the ones you missed." : "Keep going. Read the Learn tab again, then retry.";
    body = (
      <div>
        <div className="text-center">
          <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white flex items-center justify-center mx-auto mb-2 shadow-sm"><Trophy size={26}/></span>
          <div className="cl-display text-3xl font-extrabold text-slate-900">{score} / {total}</div>
          <div className="text-sm text-slate-600 mt-1">{message}</div>
        </div>
        <div className="mt-4 space-y-2">
          {questions.map((qq, i) => {
            const a = answers[i];
            const right = !!a?.right;
            const answer = qq.options.find((o) => o.id === qq.correctOptionId)?.text;
            return (
              <div key={qq.id || i} className={`rounded-xl border px-3 py-2.5 ${right ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[11px] font-bold text-white ${right ? "bg-emerald-500" : "bg-rose-500"}`}>{right ? "✓" : "✕"}</span>
                  <div className="min-w-0">
                    <div className={`text-[11px] font-bold ${right ? "text-emerald-700" : "text-rose-700"}`}>{qq.topic || `Question ${i + 1}`}</div>
                    <div className="text-[13px] text-slate-800 leading-snug">{qq.question}</div>
                    {!right && <div className="text-[13px] text-slate-700 leading-snug mt-1"><span className="font-semibold">Answer: </span>{answer}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {missed.length > 0 && onReview && (
          <button type="button" onClick={onReview} className="mt-3 w-full flex items-center justify-center text-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 py-2.5 text-[13px] font-bold">
            <BookOpen size={15}/> Revise in the Learn tab
          </button>
        )}
      </div>
    );
  } else {
    const right = checked && answers[qi]?.right;
    body = (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold text-fuchsia-700">Question {pos + 1} of {round.length}{retrying ? " · retrying missed" : ""}</span>
          <span className="text-[12px] font-bold text-slate-500">{score} correct</span>
        </div>
        <div className="flex gap-1 mb-3" aria-hidden="true">
          {round.map((idx, p) => <span key={idx} className={`flex-1 h-1.5 rounded-full ${dotClass(idx, p)}`}/>)}
        </div>
        {q.topic && <span className="inline-block text-[11px] font-bold rounded-full bg-fuchsia-50 text-fuchsia-700 px-2.5 py-1 mb-2">{q.topic}</span>}
        <div className="text-[15px] font-semibold text-slate-900 leading-snug mb-3">{q.question}</div>
        <div className="space-y-2">
          {q.options.map((o) => <Option key={`${qi}-${o.id}`} o={o} picked={picked} checked={checked} correctId={q.correctOptionId} onPick={setPicked}/>)}
        </div>
        {checked && (
          <div ref={feedbackRef} role="status" className={`mt-3 scroll-mb-24 rounded-xl border p-3 ${right ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className={`text-sm font-semibold mb-1 ${right ? "text-emerald-700" : "text-amber-700"}`}>{right ? "Correct" : "Not quite"}</div>
            {q.explanation && <div className="text-sm text-slate-700 leading-relaxed">{q.explanation}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="pb-16">
      <style>{PINNED_BAR_CSS}</style>
      {body}
      <div className="pin-bar">
        {finished ? (
          <>
            <button type="button" onClick={restart} className={`${BTN} ${missed.length > 0 ? "shrink-0 px-4 border-2 border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" : `flex-1 ${PRIMARY}`}`}>
              <RotateCcw size={15}/> Restart quiz
            </button>
            {missed.length > 0 && (
              <button type="button" onClick={retryMissed} className={`${BTN} flex-1 ${PRIMARY}`}>Retry missed ({missed.length}) <ChevronRight size={17}/></button>
            )}
          </>
        ) : !checked ? (
          <button type="button" onClick={submit} aria-disabled={!picked} className={`${BTN} flex-1 ${picked ? PRIMARY : "bg-slate-100 text-slate-400"}`}>
            <Check size={16}/> Submit answer
          </button>
        ) : (
          <button type="button" onClick={next} className={`${BTN} flex-1 ${PRIMARY}`}>
            {pos + 1 < round.length ? "Next question" : "See results"} <ChevronRight size={17}/>
          </button>
        )}
      </div>
    </div>
  );
}

export default function QuizTab({ quiz, onReview }) {
  const list = (Array.isArray(quiz) ? quiz : quiz ? [quiz] : []).filter(Boolean);
  if (list.length === 0) return <div className="text-sm text-slate-500 py-6 text-center">No quiz for this item yet.</div>;
  if (list.length === 1) return <QuickCheck quiz={list[0]}/>;
  return <QuizSet questions={list} onReview={onReview}/>;
}
