import { useMemo, useState } from "react";
import StudyImage from "./StudyImage.jsx";
import InfoBox from "./InfoBox.jsx";
import QuizTab from "./QuizTab.jsx";
import { romQuestions } from "./quizBuilders.js";
import { ROM_DATA } from "../../sharedClinicalData.js";
import { DetailHeader, DetailTabs, MediaFrame, VideoTab, NextButton } from "./learnTheme.jsx";

// ROM movement detail: hero photo, then Learn / Technique / Video / Quiz tabs
// (same layout as the Special Test screen). All content is the ROM data the
// app already has; the Quiz tab asks several questions built from that same
// data (normal range, plane, axis, end feel, muscles, starting position,
// goniometer placement, compensation -- see quizBuilders.js).

const ALL_ROM = Object.values(ROM_DATA).flat();

export default function RomMovementDetail({ movement: m, region, list, onBack, onNext }) {
  const [tab, setTab] = useState("Learn");
  const quiz = useMemo(() => romQuestions(m, list || [], ALL_ROM, region), [m.id]);
  const next = useMemo(() => {
    const i = (list || []).findIndex((x) => x.id === m.id);
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  }, [m.id, list]);
  const unit = m.unit || "°";

  return (
    <div>
      <DetailHeader onBack={onBack} badge={`${region} • Range of motion`} title={m.mv} subtitle={[m.plane, m.normal != null && `Normal ${m.normal}${unit}`].filter(Boolean).join(" · ")} theme="violet"/>
      <MediaFrame><StudyImage name={m.id} full/></MediaFrame>
      <DetailTabs tab={tab} setTab={setTab}/>

      <div className="mt-4 space-y-3">
        {tab === "Learn" && (
          <>
            {m.normal != null && <InfoBox icon="📏" label="Normal range" tint="violet">{m.normal}{unit}{m.plane ? ` in the ${m.plane} plane` : ""}</InfoBox>}
            {m.muscles && <InfoBox icon="💪" label="Muscles" tint="green">{m.muscles}</InfoBox>}
            {m.endfeel && (
              <InfoBox icon="🖐" label="End feel" tint="violet">
                <div><span className="font-semibold">Normal:</span> {m.endfeel.normal}</div>
                {m.endfeel.abnormal && <div className="text-slate-500 mt-1"><span className="font-semibold">Abnormal:</span> {m.endfeel.abnormal}</div>}
              </InfoBox>
            )}
            {m.capsular && <InfoBox icon="🔵" label="Capsular pattern" tint="blue">{m.capsular}</InfoBox>}
            {m.pathology && (
              <InfoBox label="Pathology correlation" tint="gray">
                {m.pathology}
                {m.adl && <div className="mt-2"><span className="font-semibold">ADL relevance:</span> {m.adl}</div>}
              </InfoBox>
            )}
            {(m.pediatric || m.geriatric) && (
              <div className="space-y-3">
                {m.pediatric && <InfoBox icon="👶" label="Pediatric" tint="violet">{m.pediatric}</InfoBox>}
                {m.geriatric && <InfoBox icon="👴" label="Geriatric" tint="blue">{m.geriatric}</InfoBox>}
              </div>
            )}
          </>
        )}

        {tab === "Technique" && (
          <>
            {m.start && <InfoBox icon="👤" label="Starting position" tint="violet">{m.start}</InfoBox>}
            {m.gonio && <InfoBox icon="📐" label="Goniometer placement" tint="amber">{m.gonio}</InfoBox>}
            {m.compensation && <InfoBox icon="⚠️" label="Watch for compensation" tint="amber">{m.compensation}</InfoBox>}
            {m.redflag && <InfoBox icon="🚨" label="Red flags" tint="red">{m.redflag}</InfoBox>}
            {!m.start && !m.gonio && <div className="text-sm text-slate-500 py-4 text-center">Technique not added yet.</div>}
          </>
        )}

        {tab === "Video" && <VideoTab name={m.mv}/>}

        {tab === "Quiz" && <QuizTab key={m.id} quiz={quiz} onReview={() => setTab("Learn")}/>}
      </div>

      {next && <NextButton label={`Next movement: ${next.mv}`} onClick={() => onNext(next)} theme="violet"/>}
    </div>
  );
}
