import { useState, useRef } from "react";

// Plain browser speech-to-text (Web Speech API), no AI parsing -- dictates
// straight into whichever field passes `voice`. Used by the per-field mic on
// the Ortho, Neuro and Cardio text fields (orthoFieldKit.jsx,
// NeurologicalAssessment.jsx, CardiopulmonaryAssessment.jsx) and the Chief
// complaint mic on the New Patient form (AppModules.jsx). Before this file
// the same hook was copy-pasted into each of those four.
//
// Returns { recording, toggle }. Dictated words are appended to whatever was
// in the field when recording started (`baseValue`) and sent to `onChange`.
export function useVoiceInput(baseValue, onChange) {
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires the Chrome browser."); return; }
    const base = baseValue || "";
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    // Re-summing e.results[0..length] on every event double-counts on a
    // long dictation: continuous mode periodically re-segments and can hand
    // back already-finalized entries again alongside new ones. Starting the
    // loop at e.resultIndex (the one index the API guarantees is where THIS
    // event's new/changed results begin) and accumulating into a plain
    // closure variable -- one per recording session, since `start` runs
    // fresh each press -- means an already-committed index is never re-
    // summed no matter how the engine re-emits it (2026-09-25, Aditi: voice
    // dictation repeating itself, see OrthoAIIntakePanel.jsx's matching fix).
    let finalTranscript = "";
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + " ";
      }
      if (finalTranscript) onChange((base + " " + finalTranscript).trim());
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };
  const stop = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
    setRecording(false);
  };
  return { recording, toggle: () => (recording ? stop() : start()) };
}
