import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Video as VideoIcon } from "lucide-react";
import StudyImage from "./StudyImage.jsx";
import InfoBox from "./InfoBox.jsx";

// Special Test detail screen: hero image, then Learn / Technique / Video / Quiz
// tabs (2026-09-18, Aditi's layout brief). Everything shown comes from the
// test data the app already has (structure, sensitivity/specificity, the
// how-to paragraph, positive/negative meaning); nothing is invented. The Quick
// Check uses a test's own `quickCheck` when it has one (same shape as the
// content-generation JSON) and otherwise builds a structure-identification
// question from the region's own tests.

const TABS = ["Learn", "Technique", "Video", "Quiz"];

function sentences(text) {
  return (String(text || "").match(/[^.!?]+(?:[.!?]+|$)/g) || []).map((x) => x.trim()).filter(Boolean);
}

// Splits the how-to paragraph into the position sentences (Patient…/
// Therapist…) and the remaining execution steps.
function splitHow(how) {
  const all = sentences(how);
  const positions = [];
  const steps = [];
  all.forEach((s) => {
    if (/^\W*(patient|therapist|examiner)\b/i.test(s) && steps.length === 0) positions.push(s);
    else steps.push(s);
  });
  return { positions, steps };
}

export function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildQuiz(test, regionTests) {
  if (test.quickCheck?.question) return test.quickCheck;
  if (!test.structure) return null;
  const others = [...new Set(regionTests.filter((x) => x.id !== test.id && x.structure && x.structure !== test.structure).map((x) => x.structure))];
  if (others.length < 3) return null;
  const seed = hash(test.id);
  const picks = others.map((v) => ({ v, k: hash(test.id + ":" + v) })).sort((a, b) => a.k - b.k).slice(0, 3).map((o) => o.v);
  if (picks.length < 3) return null;
  const options = [...picks, test.structure];
  const ordered = options.map((text, i) => ({ text, k: (seed + i * 13) % 97 })).sort((a, b) => a.k - b.k).map((o, i) => ({ id: "ABCD"[i], text: o.text }));
  const correct = ordered.find((o) => o.text === test.structure).id;
  return {
    question: `Which structure does the ${test.label} primarily assess?`,
    options: ordered,
    correctOptionId: correct,
    explanation: `${test.label} stresses ${test.structure}.${test.positive ? ` A positive test: ${test.positive.replace(/\.$/, "")}.` : ""}`,
  };
}

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

export default function SpecialTestDetail({ test, regionLabel, regionTests, onBack, onNext }) {
  const [tab, setTab] = useState("Learn");
  const { positions, steps } = useMemo(() => splitHow(test.how), [test.id]);
  const quiz = useMemo(() => buildQuiz(test, regionTests || []), [test.id]);
  const nextTest = useMemo(() => {
    const list = regionTests || [];
    const i = list.findIndex((x) => x.id === test.id);
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  }, [test.id, regionTests]);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>

      <span className="inline-block text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1 mb-2">{regionLabel} • Orthopaedic assessment</span>
      <h2 className="text-xl font-bold text-slate-900 leading-tight">{test.label}</h2>
      {test.structure && <p className="text-sm text-slate-500 mt-1">Tests: {test.structure}</p>}

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
        <StudyImage name={test.id} full/>
      </div>

      <div className="flex mt-4 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === t ? "border-violet-600 text-violet-700" : "border-transparent text-slate-400"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {tab === "Learn" && (
          <>
            {test.structure && <InfoBox icon="🎯" label="What it tests" tint="violet">{test.structure}</InfoBox>}
            {(test.sensitivity || test.specificity) && (
              <InfoBox icon="📊" label="How reliable is it" tint="blue">Sensitivity: {test.sensitivity || "—"} · Specificity: {test.specificity || "—"}</InfoBox>
            )}
            {test.positive && <InfoBox icon="⚠" label="Positive means" tint="red">{test.positive}</InfoBox>}
            {test.negative && <InfoBox icon="✓" label="Negative means" tint="green">{test.negative}</InfoBox>}
          </>
        )}

        {tab === "Technique" && (
          <>
            {positions.length > 0 && (
              <InfoBox icon="👤" label="Positions" tint="violet">
                <ul className="space-y-1 list-none p-0 m-0">{positions.map((p, i) => <li key={i} className="flex gap-2"><span aria-hidden="true">•</span><span>{p}</span></li>)}</ul>
              </InfoBox>
            )}
            {steps.length > 0 && (
              <InfoBox icon="📋" label="Execution steps" tint="amber">
                <ol className="space-y-1.5 list-none p-0 m-0">
                  {steps.map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="font-semibold text-amber-700 shrink-0">{i + 1}.</span><span>{s}</span></li>
                  ))}
                </ol>
              </InfoBox>
            )}
            {test.positive && <InfoBox icon="👁" label="What to observe (positive finding)" tint="red">{test.positive}</InfoBox>}
            {!test.how && <div className="text-sm text-slate-500 py-4 text-center">Technique not added yet.</div>}
          </>
        )}

        {tab === "Video" && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 px-4 text-center">
            <VideoIcon size={28} className="mx-auto text-slate-300 mb-2"/>
            <div className="text-sm font-semibold text-slate-600">Video coming soon</div>
            <div className="text-xs text-slate-400 mt-1">A demonstration of {test.label} will appear here.</div>
          </div>
        )}

        {tab === "Quiz" && <QuickCheck key={test.id} quiz={quiz}/>}
      </div>

      {nextTest && (
        <button type="button" onClick={() => onNext(nextTest)} className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-3 text-sm font-semibold text-violet-700">
          Next test: {nextTest.label} <ChevronRight size={16}/>
        </button>
      )}
    </div>
  );
}
