import { ChevronLeft } from "lucide-react";
import PracticeCase from "./PracticeCase.jsx";
import { XRAY, SectionHeading } from "./xrayTheme.jsx";
import { KNEE_PRACTICE_CASES } from "./xrayContent.js";
import { markLessonDone } from "./xrayProgress.js";
import { useState } from "react";

// Chapter 8: a short set of practice cases pulled from both lessons' images
// (see PracticeCase.jsx, reused here and inside Lesson 2's own Practice tab).
export default function PracticeChapter({ chapter, courseId, onBack, onOpenChapter, prevChapter }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <button type="button" onClick={onBack} aria-label="Back to chapters" style={{ border: "none", background: "none", padding: 4, cursor: "pointer", color: XRAY.gray }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontSize: 12, color: XRAY.gray }}>X-ray Material &gt; Knee &gt; {chapter.title}</div>
      </div>

      <h1 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 800, color: XRAY.greenDark }}>Practice Cases and Revision</h1>
      <p style={{ margin: "0 0 18px", fontSize: 13.5, color: XRAY.gray, lineHeight: 1.5 }}>
        Unlabeled radiographs from what you've learned so far. Answer first, then reveal the verified findings.
      </p>

      <SectionHeading>{KNEE_PRACTICE_CASES.length} cases</SectionHeading>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        {KNEE_PRACTICE_CASES.map((c, i) => (
          <PracticeCase key={c.id} caseData={c} index={i} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => { markLessonDone(courseId, chapter.id); setDone(true); }}
        disabled={done}
        style={{ width: "100%", borderRadius: 14, border: "none", padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#fff", background: done ? "#A7D9B8" : XRAY.green, cursor: done ? "default" : "pointer", marginBottom: 12 }}
      >
        {done ? "Marked complete" : "Mark chapter complete"}
      </button>

      {prevChapter && (
        <button type="button" onClick={() => onOpenChapter(prevChapter.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 12, border: `1px solid ${XRAY.border}`, background: "#fff", padding: "10px 0", fontSize: 13, fontWeight: 700, color: XRAY.ink, cursor: "pointer" }}>
          <ChevronLeft size={15} /> {prevChapter.title}
        </button>
      )}
    </div>
  );
}
