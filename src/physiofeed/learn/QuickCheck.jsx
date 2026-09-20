import { useState } from "react";
import { Check } from "lucide-react";

// One multiple-choice question with an explanation. Moved out of
// SpecialTestDetail.jsx (which still re-exports it) so the multi-question quiz
// can use it without a circular import. Used on its own for items with a single
// question (and by the Clinical Cases reasoning step); QuizTab.jsx shows several.
export function QuickCheck({ quiz }) {
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  if (!quiz) return <div className="text-sm text-slate-500 py-6 text-center">No quick check for this test yet.</div>;
  const right = done && picked === quiz.correctOptionId;
  return (
    <div className="space-y-3">
      <div className="text-[15px] font-semibold text-slate-900 leading-snug">{quiz.question}</div>
      <div className="space-y-2">
        {quiz.options.map((o) => {
          const isPicked = picked === o.id;
          const isRight = done && o.id === quiz.correctOptionId;
          const isWrong = done && isPicked && !isRight;
          return (
            <button
              key={o.id}
              type="button"
              disabled={done}
              onClick={() => setPicked(o.id)}
              className={`w-full text-left flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                isRight ? "border-emerald-400 bg-emerald-50" : isWrong ? "border-rose-300 bg-rose-50" : isPicked ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"
              }`}
            >
              <span className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold ${isPicked || isRight ? "border-current" : "border-slate-300"} ${isRight ? "text-emerald-600" : isWrong ? "text-rose-500" : isPicked ? "text-violet-600" : "text-slate-400"}`}>
                {isRight ? "✓" : isWrong ? "✕" : o.id}
              </span>
              <span className="text-slate-800 leading-snug">{o.text}</span>
            </button>
          );
        })}
      </div>
      {!done ? (
        <button type="button" disabled={!picked} onClick={() => setDone(true)} className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-center transition-colors ${picked ? "bg-violet-600 text-white shadow-sm active:scale-[0.99]" : "bg-slate-100 text-slate-400"}`}>
          <Check size={16}/> Submit answer
        </button>
      ) : (
        <div className={`rounded-xl border p-3 ${right ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className={`text-sm font-semibold mb-1 ${right ? "text-emerald-700" : "text-amber-700"}`}>{right ? "Correct" : "Not quite"}</div>
          {quiz.explanation && <div className="text-sm text-slate-700 leading-relaxed">{quiz.explanation}</div>}
          <button type="button" onClick={() => { setPicked(null); setDone(false); }} className="mt-2 text-xs font-semibold text-violet-700">Try again</button>
        </div>
      )}
    </div>
  );
}

export default QuickCheck;
