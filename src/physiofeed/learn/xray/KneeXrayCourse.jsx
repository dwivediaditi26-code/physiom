import { useState } from "react";
import { Clock, ChevronRight } from "lucide-react";
import { PageHeader, Card, ProgressBar, ComingSoonPill, CompleteBadge, XRAY } from "./xrayTheme.jsx";
import { KNEE_CHAPTERS } from "./xrayContent.js";
import { readCompleted } from "./xrayProgress.js";
import XrayLesson from "./XrayLesson.jsx";
import PracticeChapter from "./PracticeChapter.jsx";

const COURSE_ID = "knee";

function ChapterRow({ chapter, done, onOpen }) {
  return (
    <Card onClick={chapter.available ? onOpen : undefined} style={{ marginBottom: 10, opacity: chapter.available ? 1 : 0.6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: chapter.available ? XRAY.greenSoft : "#F5F5F4", color: chapter.available ? XRAY.greenDark : XRAY.grayLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
          {chapter.num}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: XRAY.ink }}>{chapter.title}</div>
            {!chapter.available && <ComingSoonPill />}
          </div>
          <div style={{ fontSize: 12, color: XRAY.gray, marginTop: 2 }}>{chapter.desc}</div>
          {chapter.available && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: XRAY.grayLight, marginTop: 4 }}>
              <Clock size={11} /> {chapter.minutes} min
            </div>
          )}
        </div>
        {chapter.available ? (done ? <CompleteBadge /> : <ChevronRight size={18} color={XRAY.grayLight} />) : null}
      </div>
    </Card>
  );
}

export default function KneeXrayCourse({ onBack }) {
  const [openId, setOpenId] = useState(null);
  const availableChapters = KNEE_CHAPTERS.filter((c) => c.available);

  if (openId) {
    const chapter = KNEE_CHAPTERS.find((c) => c.id === openId);
    const idx = availableChapters.findIndex((c) => c.id === openId);
    const prevChapter = availableChapters[idx - 1] || null;
    const nextChapter = availableChapters[idx + 1] || null;
    const backToList = () => setOpenId(null);

    if (chapter.id === "practice-cases") {
      return <PracticeChapter chapter={chapter} courseId={COURSE_ID} onBack={backToList} onOpenChapter={setOpenId} prevChapter={prevChapter} />;
    }
    return <XrayLesson chapter={chapter} courseId={COURSE_ID} onBack={backToList} onOpenChapter={setOpenId} prevChapter={prevChapter} nextChapter={nextChapter} />;
  }

  const completed = readCompleted(COURSE_ID);
  const doneCount = availableChapters.filter((c) => completed.has(c.id)).length;
  const pct = availableChapters.length ? (doneCount / availableChapters.length) * 100 : 0;
  const nextUp = availableChapters.find((c) => !completed.has(c.id));

  return (
    <div>
      <PageHeader title="Knee X-ray Learning" subtitle="Understand normal anatomy, recognize common abnormalities and practice systematic X-ray interpretation." onBack={onBack} />

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: XRAY.ink }}>{doneCount} of {availableChapters.length} chapters completed</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: XRAY.green }}>{Math.round(pct)}%</span>
        </div>
        <ProgressBar pct={pct} />
        {nextUp && (
          <button
            type="button"
            onClick={() => setOpenId(nextUp.id)}
            style={{ marginTop: 14, width: "100%", borderRadius: 12, border: "none", padding: "11px 0", fontSize: 13.5, fontWeight: 800, color: "#fff", background: XRAY.green, cursor: "pointer" }}
          >
            {doneCount === 0 ? "Start learning" : `Continue — ${nextUp.title}`}
          </button>
        )}
      </Card>

      {KNEE_CHAPTERS.map((c) => (
        <ChapterRow key={c.id} chapter={c} done={completed.has(c.id)} onOpen={() => setOpenId(c.id)} />
      ))}
    </div>
  );
}
