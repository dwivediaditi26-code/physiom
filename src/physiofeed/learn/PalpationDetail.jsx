import { useMemo, useState } from "react";

import StudyImage from "./StudyImage.jsx";
import InfoBox from "./InfoBox.jsx";
import QuizTab from "./QuizTab.jsx";
import { palpationQuestions } from "./quizBuilders.js";
import { PALPATION_DATA } from "../../palpationData.js";
import { DetailHeader, DetailTabs, MediaFrame, VideoTab, NextButton } from "./learnTheme.jsx";

// Full detail page for one palpation structure. Same chrome as
// StudyDetail.jsx (back button, white rounded-2xl card) but with a
// 3-slot image gallery instead of one hero image -- palpation entries
// typically need an attachments illustration plus one or two technique
// photos (this book's own figures show exactly that pattern, e.g.
// "Figure 10-45" posterior view + "Figure 10-46/10-47" starting
// position/technique). All three slots render StudyImage's existing
// "no image yet" placeholder until real photos are uploaded and their
// Cloudinary ids added to palpationData.js -- nothing here is a stand-in
// photo pretending to be real content.
function Row({ label, icon, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-2 items-start bg-slate-50 rounded-lg px-2.5 py-2">
      {icon && <span aria-hidden="true">{icon}</span>}
      <div className="text-xs text-slate-700"><span className="font-semibold text-slate-500">{label}: </span>{children}</div>
    </div>
  );
}


// The Quiz tab asks several questions built from the structure's own data
// (origin, insertion, action, position, what you feel for, hand placement --
// see quizBuilders.js).
const ALL_PALPATION = Object.values(PALPATION_DATA).flat();

export default function PalpationDetail({ item, region, list, onBack, onNext }) {
  const [tab, setTab] = useState("Learn");
  const a = item.attachments || {};
  const quiz = useMemo(() => palpationQuestions(item, list || [], ALL_PALPATION), [item.id]);
  const next = useMemo(() => {
    const i = (list || []).findIndex((x) => x.id === item.id);
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  }, [item.id, list]);

  return (
    <div>
      <DetailHeader onBack={onBack} badge={region ? `${region} • Palpation` : "Palpation"} title={item.name} subtitle={`${item.type}${item.position ? ` · ${item.position}` : ""}`} theme="rose"/>
      <MediaFrame>
        <div className="grid grid-cols-3 gap-0.5 bg-slate-100 w-full">
          {(item.images || [null, null, null]).slice(0, 3).map((img, i) => (
            <StudyImage key={i} name={img} square/>
          ))}
        </div>
      </MediaFrame>
      <DetailTabs tab={tab} setTab={setTab}/>

      <div className="mt-4 space-y-3">
        {tab === "Learn" && (
          <>
            {(a.origin || a.insertion) && (
              <div className="grid grid-cols-2 gap-2">
                {a.origin && (
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Origin</div>
                    <div className="text-xs text-slate-700 mt-0.5">{a.origin}</div>
                  </div>
                )}
                {a.insertion && (
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Insertion</div>
                    <div className="text-xs text-slate-700 mt-0.5">{a.insertion}</div>
                  </div>
                )}
              </div>
            )}
            {item.actions && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Action</div>
                <div className="text-xs text-slate-700 mt-0.5">{item.actions}</div>
              </div>
            )}
            {item.feelFor && <InfoBox icon="🔎" label="What you're feeling for" tint="green">{item.feelFor}</InfoBox>}
            {item.clinicalConsiderations && <InfoBox icon="⚠️" label="Clinical considerations" tint="amber">{item.clinicalConsiderations}</InfoBox>}
          </>
        )}

        {tab === "Technique" && (
          <>
            {(item.patientPosition || item.therapistPosition || item.handPlacement) && (
              <InfoBox icon="👤" label="Starting position" tint="violet">
                <div className="space-y-1.5">
                  <Row label="Patient" icon="👤">{item.patientPosition}</Row>
                  <Row label="Therapist" icon="🙌">{item.therapistPosition}</Row>
                  <Row label="Hand placement" icon="👆">{item.handPlacement}</Row>
                </div>
              </InfoBox>
            )}
            {item.steps?.length > 0 && (
              <InfoBox icon="📋" label="How to palpate" tint="amber">
                <ol className="space-y-1.5 list-none p-0 m-0">
                  {item.steps.map((st, i) => (
                    <li key={i} className="flex gap-2"><span className="font-semibold text-amber-700 shrink-0">{i + 1}.</span><span>{st}</span></li>
                  ))}
                </ol>
              </InfoBox>
            )}
            {item.notes?.length > 0 && (
              <InfoBox icon="📝" label="Palpation notes" tint="blue">
                {item.notes.map((n, i) => <div key={i} className={i > 0 ? "mt-1" : ""}>{n}</div>)}
              </InfoBox>
            )}
            {!item.steps?.length && !item.patientPosition && <div className="text-sm text-slate-500 py-4 text-center">Technique not added yet.</div>}
          </>
        )}

        {tab === "Video" && <VideoTab name={`palpating ${item.name}`}/>}

        {tab === "Quiz" && <QuizTab key={item.id} quiz={quiz} onReview={() => setTab("Learn")}/>}
      </div>

      {next && onNext && <NextButton label={`Next structure: ${next.name}`} onClick={() => onNext(next)} theme="rose"/>}
    </div>
  );
}
