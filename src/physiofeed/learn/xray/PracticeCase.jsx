import { useState } from "react";
import { Check } from "lucide-react";
import RadiographViewer from "./RadiographViewer.jsx";
import { XRAY, Card, Pill } from "./xrayTheme.jsx";

// One practice case: an unlabeled radiograph + a fixed question. Annotations
// stay off until the learner submits an answer, then the real, verified
// labels appear alongside the explanation -- matches the reference "Practice
// Mode" flow (submit -> reveal answer -> reveal annotations -> explain).
// Not QuickCheck.jsx (violet theme, no reveal-annotations hook) -- this
// section's own green identity and the annotation reveal need a small
// dedicated component, though it consumes the same makeFixedQuestion shape.
export default function PracticeCase({ caseData, index }) {
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const { image, question: q, explanation } = caseData;
  const right = checked && picked === q.correctOptionId;

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 0" }}>
        <Pill tone="green">Case {index + 1}</Pill>
      </div>
      <div style={{ padding: 16 }}>
        <RadiographViewer image={image} forceHideAnnotations={!checked} />
      </div>
      <div style={{ padding: "0 16px 18px" }}>
        {q.topic && <div style={{ fontSize: 11.5, fontWeight: 700, color: XRAY.green, marginBottom: 4 }}>{q.topic}</div>}
        <div style={{ fontSize: 14.5, fontWeight: 700, color: XRAY.ink, marginBottom: 10 }}>{q.question}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((o) => {
            const isPicked = picked === o.id;
            const isRight = checked && o.id === q.correctOptionId;
            const isWrong = checked && isPicked && !isRight;
            return (
              <button
                key={o.id}
                type="button"
                disabled={checked}
                onClick={() => setPicked(o.id)}
                style={{
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  borderRadius: 12,
                  border: `1px solid ${isRight ? XRAY.green : isWrong ? "#FCA5A5" : isPicked ? XRAY.green : XRAY.border}`,
                  background: isRight ? XRAY.greenSoft : isWrong ? "#FEF2F2" : isPicked ? XRAY.greenSoft : "#fff",
                  padding: "10px 12px",
                  fontSize: 13.5,
                  color: XRAY.ink,
                  cursor: checked ? "default" : "pointer",
                }}
              >
                <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isRight ? XRAY.green : isWrong ? "#F87171" : XRAY.grayLight}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: isRight ? XRAY.green : isWrong ? "#DC2626" : XRAY.gray, flexShrink: 0 }}>
                  {isRight ? "✓" : isWrong ? "✕" : o.id}
                </span>
                <span>{o.text}</span>
              </button>
            );
          })}
        </div>

        {!checked ? (
          <button
            type="button"
            disabled={!picked}
            onClick={() => setChecked(true)}
            style={{ marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, border: "none", padding: "11px 0", fontSize: 13.5, fontWeight: 700, color: "#fff", background: picked ? XRAY.green : "#D6D3D1", cursor: picked ? "pointer" : "default" }}
          >
            <Check size={15} /> Submit answer
          </button>
        ) : (
          <div style={{ marginTop: 12, borderRadius: 12, border: `1px solid ${right ? XRAY.greenBorder : "#FDE68A"}`, background: right ? XRAY.greenSoft : XRAY.amberBg, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: right ? XRAY.greenDark : XRAY.amber, marginBottom: 4 }}>{right ? "Correct" : "Not quite"}</div>
            <div style={{ fontSize: 13, color: XRAY.ink, lineHeight: 1.5 }}>{q.explanation}</div>
            {explanation && <div style={{ fontSize: 12.5, color: XRAY.gray, lineHeight: 1.5, marginTop: 6 }}>{explanation}</div>}
          </div>
        )}
      </div>
    </Card>
  );
}
