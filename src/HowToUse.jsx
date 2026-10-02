import React, { useState } from "react";
import { HOW_TO_TOPICS, HOW_TO_DISCLAIMER } from "./howToUseContent.js";

// "How to use PhysioMind" -- short guides for everything in the app, at the top
// of Settings (2026-10-02, Aditi: "i want how to use physiomind page"). The
// words live in howToUseContent.js.

// **bold** marks a button or label exactly as it is written on screen.
function Rich({ text }) {
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1
    ? <strong key={i} style={{ color: "#4c1d95", fontWeight: 700 }}>{part}</strong>
    : <React.Fragment key={i}>{part}</React.Fragment>));
}

export default function HowToUseCard({ defaultOpen = false }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [openId, setOpenId] = useState(null);

  return (
    <div style={{ margin: "16px 0", border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 16, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
      >
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontWeight: 800, fontSize: 15, color: "#0f172a" }}>📖 How to use PhysioMind</span>
          <span style={{ display: "block", fontSize: 12.5, color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>
            Short step-by-step guides: start an assessment, save it, find a patient, make a report.
          </span>
        </span>
        <span aria-hidden="true" style={{ fontSize: 18, color: "#7c3aed", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>⌄</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #eef2f7" }}>
          {HOW_TO_TOPICS.map((t) => {
            const isOpen = openId === t.id;
            return (
              <div key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : t.id)}
                  aria-expanded={isOpen}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", border: "none", background: isOpen ? "#faf5ff" : "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                >
                  <span aria-hidden="true" style={{ fontSize: 20, width: 28, textAlign: "center" }}>{t.icon}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{t.title}</span>
                    <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 2 }}>{t.summary}</span>
                  </span>
                  <span aria-hidden="true" style={{ color: "#94a3b8", fontSize: 16 }}>{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "4px 16px 16px 56px", background: "#faf5ff" }}>
                    <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                      {t.steps.map((step, i) => (
                        <li key={i} style={{ display: "flex", gap: 10, fontSize: 13.5, lineHeight: 1.55, color: "#1e293b" }}>
                          <span aria-hidden="true" style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{i + 1}</span>
                          <span><Rich text={step} /></span>
                        </li>
                      ))}
                    </ol>
                    {t.tip && (
                      <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "#fff", border: "1px solid #e9d5ff", fontSize: 12.5, lineHeight: 1.5, color: "#4c1d95" }}>
                        <strong>Good to know: </strong>{t.tip}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ padding: "12px 16px", fontSize: 11.5, color: "#94a3b8", lineHeight: 1.5 }}>{HOW_TO_DISCLAIMER}</div>
        </div>
      )}
    </div>
  );
}
