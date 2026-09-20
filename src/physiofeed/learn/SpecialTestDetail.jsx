import { useMemo, useState } from "react";
import StudyImage from "./StudyImage.jsx";
import InfoBox from "./InfoBox.jsx";
import QuizTab from "./QuizTab.jsx";
import { QuickCheck } from "./QuickCheck.jsx";
import { hash, splitHow } from "./quizKit.js";
import { specialQuestions } from "./quizBuilders.js";
import { SPECIAL_TESTS_DATA } from "../../sharedClinicalData.js";
import { DetailHeader, DetailTabs, MediaFrame, VideoTab, NextButton } from "./learnTheme.jsx";

// Special Test detail screen: hero image, then Learn / Technique / Video / Quiz
// tabs (2026-09-18, Aditi's layout brief). Everything shown comes from the
// test data the app already has (structure, sensitivity/specificity, the
// how-to paragraph, positive/negative meaning); nothing is invented. The Quiz
// tab asks several questions built from that same data (see quizBuilders.js),
// plus the test's own `quickCheck` when it has one.

// QuickCheck and hash moved out (QuickCheck.jsx / quizKit.js); re-exported so
// the other Learn screens that import them from here keep working.
export { QuickCheck, hash };

const ALL_TESTS = Object.values(SPECIAL_TESTS_DATA).flatMap((r) => r.tests || []);

export default function SpecialTestDetail({ test, regionLabel, regionTests, onBack, onNext }) {
  const [tab, setTab] = useState("Learn");
  const { positions, steps } = useMemo(() => splitHow(test.how), [test.id]);
  const quiz = useMemo(() => specialQuestions(test, regionTests || [], ALL_TESTS), [test.id]);
  const nextTest = useMemo(() => {
    const list = regionTests || [];
    const i = list.findIndex((x) => x.id === test.id);
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  }, [test.id, regionTests]);

  return (
    <div>
      <DetailHeader onBack={onBack} badge={`${regionLabel} • Orthopaedic assessment`} title={test.label} subtitle={test.structure ? `Tests: ${test.structure}` : null} theme="sky"/>
      <MediaFrame><StudyImage name={test.id} full/></MediaFrame>
      <DetailTabs tab={tab} setTab={setTab}/>

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

        {tab === "Video" && <VideoTab name={test.label}/>}

        {tab === "Quiz" && <QuizTab key={test.id} quiz={quiz} onReview={() => setTab("Learn")}/>}
      </div>

      {nextTest && <NextButton label={`Next test: ${nextTest.label}`} onClick={() => onNext(nextTest)} theme="sky"/>}
    </div>
  );
}
