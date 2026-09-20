import { useState } from "react";
import QuizTab from "./QuizTab.jsx";
import { hash } from "./quizKit.js";
import { DetailHeader, DetailTabs, MediaFrame, VideoTab, NextButton } from "./learnTheme.jsx";

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

export default function TabbedDetail({ badge, title, subtitle, media, learn, technique, quiz, videoName, id, next, onBack, theme = "cyan" }) {
  const [tab, setTab] = useState("Learn");
  return (
    <div>
      <DetailHeader onBack={onBack} badge={badge} title={title} subtitle={subtitle} theme={theme}/>
      {media && <MediaFrame>{media}</MediaFrame>}
      <DetailTabs tab={tab} setTab={setTab}/>

      <div className="mt-4 space-y-3">
        {tab === "Learn" && (learn || <div className="text-sm text-slate-500 py-4 text-center">Nothing added yet.</div>)}
        {tab === "Technique" && (technique || <div className="text-sm text-slate-500 py-4 text-center">Technique not added yet.</div>)}
        {tab === "Video" && <VideoTab name={videoName || title}/>}
        {tab === "Quiz" && <QuizTab key={id || title} quiz={quiz} onReview={() => setTab("Learn")}/>}
      </div>

      {next && <NextButton label={next.label} onClick={next.onClick} theme={theme}/>}
    </div>
  );
}
