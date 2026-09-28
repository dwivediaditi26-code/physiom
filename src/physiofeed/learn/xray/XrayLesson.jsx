import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, AlertTriangle, BookOpen } from "lucide-react";
import RadiographViewer from "./RadiographViewer.jsx";
import ComparePanel from "./ComparePanel.jsx";
import PracticeCase from "./PracticeCase.jsx";
import { XRAY, Card, SectionHeading } from "./xrayTheme.jsx";
import { KNEE_PRACTICE_CASES } from "./xrayContent.js";
import { markLessonDone } from "./xrayProgress.js";
import QuizTab from "../QuizTab.jsx";

function Block({ block }) {
  switch (block.type) {
    case "heading":
      return <SectionHeading style={{ marginTop: 22 }}>{block.text}</SectionHeading>;
    case "paragraph":
      return <p style={{ fontSize: 14, color: XRAY.ink, lineHeight: 1.65, margin: "0 0 12px" }}>{block.text}</p>;
    case "list":
      return (
        <ul style={{ margin: "0 0 12px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          {block.items.map((it, i) => (
            <li key={i} style={{ fontSize: 14, color: XRAY.ink, lineHeight: 1.55 }}>{it}</li>
          ))}
        </ul>
      );
    case "image":
      return (
        <div style={{ margin: "8px 0 18px" }}>
          <RadiographViewer image={block.image} />
          {block.caption && <div style={{ fontSize: 12, color: XRAY.gray, marginTop: 6, textAlign: "center" }}>{block.caption}</div>}
        </div>
      );
    case "findings":
      return <FindingsPanel items={block.items} />;
    default:
      return null;
  }
}

function FindingsPanel({ items }) {
  const [open, setOpen] = useState(items[0]?.id ?? null);
  return (
    <div style={{ margin: "8px 0 18px" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {items.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setOpen(f.id)}
            style={{
              borderRadius: 999,
              border: `1px solid ${open === f.id ? XRAY.green : XRAY.border}`,
              background: open === f.id ? XRAY.green : "#fff",
              color: open === f.id ? "#fff" : XRAY.ink,
              fontSize: 12.5,
              fontWeight: 700,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            {f.id} · {f.label}
          </button>
        ))}
      </div>
      {items
        .filter((f) => f.id === open)
        .map((f) => (
          <Card key={f.id} style={{ padding: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="What to look at" value={f.lookAt} />
              <Row label="What is visible" value={f.visible} />
              <Row label="How it differs from normal" value={f.difference} />
              <Row label="Clinical relevance" value={f.relevance} />
              <Row label="Limitations" value={f.limitations} />
            </div>
          </Card>
        ))}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: XRAY.green, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: XRAY.ink, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

export default function XrayLesson({ chapter, courseId, onBack, onOpenChapter, prevChapter, nextChapter }) {
  const lesson = chapter.lesson;
  const hasModes = !!lesson.compare;
  const [mode, setMode] = useState("learn");
  const [done, setDone] = useState(false);

  const practiceCases = chapter.id === "osteoarthritis" ? KNEE_PRACTICE_CASES.filter((c) => c.id === "case-2") : [];

  const markComplete = () => {
    markLessonDone(courseId, chapter.id);
    setDone(true);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <button type="button" onClick={onBack} aria-label="Back to chapters" style={{ border: "none", background: "none", padding: 4, cursor: "pointer", color: XRAY.gray }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontSize: 12, color: XRAY.gray }}>X-ray Material &gt; Knee &gt; {chapter.title}</div>
      </div>

      <h1 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 800, color: XRAY.greenDark, lineHeight: 1.25 }}>{lesson.title}</h1>
      <p style={{ margin: "0 0 16px", fontSize: 13.5, color: XRAY.gray, lineHeight: 1.5 }}>{lesson.subtitle}</p>

      {hasModes && (
        <div style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: `1px solid ${XRAY.border}`, paddingBottom: 10 }}>
          {[
            { id: "learn", label: "Learn" },
            { id: "compare", label: "Compare" },
            { id: "practice", label: "Practice" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              style={{
                borderRadius: 999,
                border: "none",
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: mode === t.id ? XRAY.green : "#F5F5F4",
                color: mode === t.id ? "#fff" : XRAY.gray,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {(!hasModes || mode === "learn") && (
        <>
          <Card style={{ background: XRAY.greenSoft, border: `1px solid ${XRAY.greenBorder}`, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: XRAY.greenDark, marginBottom: 8 }}>
              <BookOpen size={14} /> Learning objectives
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {lesson.objectives.map((o, i) => (
                <li key={i} style={{ fontSize: 13, color: XRAY.ink, lineHeight: 1.5 }}>{o}</li>
              ))}
            </ul>
          </Card>

          {lesson.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}

          {lesson.commonMistakes?.length > 0 && (
            <Card style={{ background: XRAY.amberBg, border: "1px solid #FDE68A", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: XRAY.amber, marginBottom: 8 }}>
                <AlertTriangle size={14} /> Common mistakes
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                {lesson.commonMistakes.map((m, i) => (
                  <li key={i} style={{ fontSize: 13, color: XRAY.ink, lineHeight: 1.5 }}>{m}</li>
                ))}
              </ul>
            </Card>
          )}

          {lesson.quiz?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionHeading>Knowledge check</SectionHeading>
              <div style={{ background: "#fff", border: `1px solid ${XRAY.border}`, borderRadius: 16, padding: 14 }}>
                <QuizTab quiz={lesson.quiz} />
              </div>
            </div>
          )}

          {lesson.references?.length > 0 && (
            <div style={{ fontSize: 11.5, color: XRAY.grayLight, lineHeight: 1.6, marginBottom: 20 }}>
              {lesson.references.map((r, i) => (
                <div key={i}>{r.text}</div>
              ))}
            </div>
          )}
        </>
      )}

      {hasModes && mode === "compare" && <div style={{ marginBottom: 20 }}><ComparePanel compare={lesson.compare} /></div>}

      {hasModes && mode === "practice" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          {practiceCases.map((c, i) => (
            <PracticeCase key={c.id} caseData={c} index={i} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={markComplete}
        disabled={done}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 14,
          border: "none",
          padding: "13px 0",
          fontSize: 14,
          fontWeight: 800,
          color: "#fff",
          background: done ? "#A7D9B8" : XRAY.green,
          cursor: done ? "default" : "pointer",
          marginBottom: 12,
        }}
      >
        <Check size={16} /> {done ? "Marked complete" : "Mark chapter complete"}
      </button>

      <div style={{ display: "flex", gap: 10 }}>
        {prevChapter && (
          <button type="button" onClick={() => onOpenChapter(prevChapter.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 12, border: `1px solid ${XRAY.border}`, background: "#fff", padding: "10px 0", fontSize: 13, fontWeight: 700, color: XRAY.ink, cursor: "pointer" }}>
            <ChevronLeft size={15} /> {prevChapter.title}
          </button>
        )}
        {nextChapter && (
          <button type="button" onClick={() => onOpenChapter(nextChapter.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 12, border: `1px solid ${XRAY.border}`, background: "#fff", padding: "10px 0", fontSize: 13, fontWeight: 700, color: XRAY.ink, cursor: "pointer" }}>
            {nextChapter.title} <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
