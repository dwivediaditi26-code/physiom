import { useState } from "react";
import { ChevronLeft, ChevronRight, Video as VideoIcon } from "lucide-react";
import { QuickCheck, hash } from "./SpecialTestDetail.jsx";

// Generic Learn / Technique / Video / Quiz detail screen for study datasets
// whose items are described by small render callbacks (used by Neurological
// study mode, whose reflexes, dermatomes, myotomes, cranial nerves and
// conditions all have different fields). Same look as the Special Test, ROM,
// MMT and Palpation detail screens.

const TABS = ["Learn", "Technique", "Video", "Quiz"];

// Builds a 4-option Quick Check from an answer and a pool of wrong answers,
// picking and ordering the distractors by a stable hash so a test always
// shows the same question.
export function makeChoiceQuiz({ id, question, answer, pool, explanation }) {
  if (!answer) return null;
  const wrong = [...new Set((pool || []).filter((x) => x && x !== answer))];
  const picks = wrong.map((v) => ({ v, k: hash(id + ":" + v) })).sort((a, b) => a.k - b.k).slice(0, 3).map((o) => o.v);
  if (picks.length < 3) return null;
  const ordered = [...picks, answer]
    .map((v, i) => ({ v, k: hash(id + "#" + v + i) }))
    .sort((a, b) => a.k - b.k)
    .map((o, i) => ({ id: "ABCD"[i], text: o.v }));
  return { question, options: ordered, correctOptionId: ordered.find((o) => o.text === answer).id, explanation };
}

export default function TabbedDetail({ badge, title, subtitle, media, learn, technique, quiz, videoName, id, next, onBack }) {
  const [tab, setTab] = useState("Learn");
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500 mb-3 -ml-1">
        <ChevronLeft size={18}/> Back
      </button>

      {badge && <span className="inline-block text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1 mb-2">{badge}</span>}
      <h2 className="text-xl font-bold text-slate-900 leading-tight">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}

      {media && <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">{media}</div>}

      <div className="flex mt-4 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === t ? "border-violet-600 text-violet-700" : "border-transparent text-slate-400"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {tab === "Learn" && (learn || <div className="text-sm text-slate-500 py-4 text-center">Nothing added yet.</div>)}
        {tab === "Technique" && (technique || <div className="text-sm text-slate-500 py-4 text-center">Technique not added yet.</div>)}
        {tab === "Video" && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 px-4 text-center">
            <VideoIcon size={28} className="mx-auto text-slate-300 mb-2"/>
            <div className="text-sm font-semibold text-slate-600">Video coming soon</div>
            <div className="text-xs text-slate-400 mt-1">A demonstration of {videoName || title} will appear here.</div>
          </div>
        )}
        {tab === "Quiz" && <QuickCheck key={id || title} quiz={quiz}/>}
      </div>

      {next && (
        <button type="button" onClick={next.onClick} className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-3 text-sm font-semibold text-violet-700">
          {next.label} <ChevronRight size={16}/>
        </button>
      )}
    </div>
  );
}
