import React from "react";

// The small 🎤 / ⏹ button beside a text field, driven by useVoiceInput()
// (src/hooks/useVoiceInput.js): <VoiceMicButton recording={v.recording} onClick={v.toggle} />.
// Shared by the Ortho, Neuro and Cardio text fields. (The New Patient form's
// Chief complaint mic keeps its own, larger button in AppModules.jsx.)
export function VoiceMicButton({ recording, onClick }) {
  return (
    <button type="button" onClick={onClick} title={recording ? "Stop recording" : "Speak"}
      style={{ flexShrink: 0, width: 34, height: 34, marginLeft: 6, borderRadius: 8, border: `1.5px solid ${recording ? "#dc2626" : "#d8ccE8"}`,
        background: recording ? "#dc2626" : "#fff", color: recording ? "#fff" : "#111", fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>
      {recording ? "⏹" : "🎤"}
    </button>
  );
}
