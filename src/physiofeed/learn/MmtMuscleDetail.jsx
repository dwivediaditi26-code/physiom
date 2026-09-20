import { useMemo, useState } from "react";
import StudyImage from "./StudyImage.jsx";
import InfoBox from "./InfoBox.jsx";
import QuizTab from "./QuizTab.jsx";
import { mmtQuestions } from "./quizBuilders.js";
import { DetailHeader, DetailTabs, MediaFrame, VideoTab, NextButton } from "./learnTheme.jsx";

// MMT muscle detail: hero photo, then Learn / Technique / Video / Quiz tabs
// (same layout as Special Tests and ROM). Content is the MMT data the app
// already has. The Quiz tab asks several questions built from that same data
// (nerve, root, action, origin, insertion, testing position, resistance,
// substitution -- see quizBuilders.js).

export default function MmtMuscleDetail({ muscle: m, region, list, allMuscles, onBack, onNext }) {
  const [tab, setTab] = useState("Learn");
  const quiz = useMemo(() => mmtQuestions(m, list || [], allMuscles || []), [m.id]);
  const next = useMemo(() => {
    const i = (list || []).findIndex((x) => x.id === m.id);
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  }, [m.id, list]);

  const anatomy = [["Action", m.action], ["Nerve", m.nerve], ["Root", m.root], ["Origin", m.origin], ["Insertion", m.insertion]].filter(([, v]) => v);
  const protocol = [
    ["Patient position", m.patient, "👤"], ["Therapist", m.therapist, "🙌"],
    ["Resistance", m.resistance, "↕️"], ["Gravity eliminated", m.gravElim, "⬇️"],
    ["Palpation", m.palpation, "👆"],
  ].filter(([, v]) => v);

  return (
    <div>
      <DetailHeader onBack={onBack} badge={`${region} • Manual muscle testing`} title={m.muscle} subtitle={m.action} theme="orange"/>
      <MediaFrame><StudyImage name={m.id} full/></MediaFrame>
      <DetailTabs tab={tab} setTab={setTab}/>

      <div className="mt-4 space-y-3">
        {tab === "Learn" && (
          <>
            {anatomy.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {anatomy.map(([lbl, val]) => (
                  <div key={lbl} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{lbl}</div>
                    <div className="text-xs text-slate-700 mt-0.5">{val}</div>
                  </div>
                ))}
              </div>
            )}
            {(m.functional || m.chain) && (
              <InfoBox icon="⛓️" label="Clinical interpretation" tint="violet">
                {m.functional && <div>{m.functional}</div>}
                {m.chain && <div className="italic text-slate-500 mt-1">{m.chain}</div>}
              </InfoBox>
            )}
          </>
        )}

        {tab === "Technique" && (
          <>
            {protocol.length > 0 && (
              <InfoBox icon="📋" label="Testing protocol" tint="amber">
                <div className="space-y-2">
                  {protocol.map(([lbl, val, icon]) => (
                    <div key={lbl} className="flex gap-2 items-start">
                      <span aria-hidden="true">{icon}</span>
                      <div><span className="font-semibold text-slate-500">{lbl}: </span>{val}</div>
                    </div>
                  ))}
                </div>
              </InfoBox>
            )}
            {(m.compensation || m.substitution) && (
              <InfoBox icon="⚠️" label="Compensation / substitution" tint="red">
                {m.compensation && <div><span className="font-semibold">Compensation:</span> {m.compensation}</div>}
                {m.substitution && <div className="mt-1"><span className="font-semibold">Substitution:</span> {m.substitution}</div>}
              </InfoBox>
            )}
            {protocol.length === 0 && <div className="text-sm text-slate-500 py-4 text-center">Technique not added yet.</div>}
          </>
        )}

        {tab === "Video" && <VideoTab name={`testing ${m.muscle}`}/>}

        {tab === "Quiz" && <QuizTab key={m.id} quiz={quiz} onReview={() => setTab("Learn")}/>}
      </div>

      {next && <NextButton label={`Next muscle: ${next.muscle}`} onClick={() => onNext(next)} theme="orange"/>}
    </div>
  );
}
