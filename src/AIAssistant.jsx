import { useState, useRef, useEffect } from "react";

function buildPatientContext(data) {
  // Privacy: only clinical data — no demographics (name, age, sex, occupation)
  if (!data) return "";
  const lines = [];

  // ── SUBJECTIVE ──
  if (data.cc_main)            lines.push(`Chief Complaint: ${data.cc_main}`);
  if (data.cc_onset)           lines.push(`Onset: ${data.cc_onset}`);
  if (data.cc_duration)        lines.push(`Duration: ${data.cc_duration}`);
  if (data.cc_vas_now)         lines.push(`Pain (NRS now): ${data.cc_vas_now}/10`);
  if (data.cc_vas_worst)       lines.push(`Pain (NRS worst): ${data.cc_vas_worst}/10`);
  if (data.cc_vas_best)        lines.push(`Pain (NRS best): ${data.cc_vas_best}/10`);
  if (data.lx_loc)             lines.push(`Lumbar region: ${data.lx_loc}`);
  if (data.cx_loc)             lines.push(`Cervical region: ${data.cx_loc}`);
  if (data.cc_agg)             lines.push(`Aggravating: ${data.cc_agg}`);
  if (data.cc_rel)             lines.push(`Relieving: ${data.cc_rel}`);
  if (data.cc_24h)             lines.push(`24-hour behaviour: ${data.cc_24h}`);
  if (data.hx_pmh)             lines.push(`Past medical history: ${data.hx_pmh}`);
  if (data.hx_medications)     lines.push(`Medications: ${data.hx_medications}`);
  if (data.hx_imaging)         lines.push(`Imaging: ${data.hx_imaging}`);

  // ── OBJECTIVE ──
  const romEntries = Object.entries(data).filter(([k]) => k.startsWith("rom_") && data[k]);
  if (romEntries.length) {
    const romSummary = romEntries.map(([k, v]) => `${k.replace("rom_", "").replace(/_/g, " ")}: ${v}`).join(", ");
    lines.push(`ROM: ${romSummary}`);
  }
  const mmtEntries = Object.entries(data).filter(([k]) => k.startsWith("mmt_") && data[k]);
  if (mmtEntries.length) {
    const mmtSummary = mmtEntries.map(([k, v]) => `${k.replace("mmt_", "").replace(/_/g, " ")}: ${v}`).join(", ");
    lines.push(`MMT: ${mmtSummary}`);
  }
  const stEntries = Object.entries(data).filter(([k]) => k.startsWith("st_") && data[k]);
  if (stEntries.length) {
    const stSummary = stEntries.map(([k, v]) => `${k.replace("st_", "").replace(/_/g, " ")}: ${v}`).join(", ");
    lines.push(`Special Tests: ${stSummary}`);
  }
  if (data.posture_notes)      lines.push(`Posture: ${data.posture_notes}`);
  if (data.palpation_notes)    lines.push(`Palpation: ${data.palpation_notes}`);

  // ── ASSESSMENT / TREATMENT ──
  if (data.soap_a_diagnosis || data.soap_assessment)
    lines.push(`Working Diagnosis: ${data.soap_a_diagnosis || data.soap_assessment}`);
  if (data.soap_icd10)         lines.push(`ICD-10: ${data.soap_icd10}`);
  if (data.soap_modalities)    lines.push(`Treatment/Modalities: ${data.soap_modalities}`);
  if (data.hep_programme)      lines.push(`Home Exercise Programme: ${data.hep_programme}`);
  if (data.soap_p_goals)       lines.push(`Goals: ${data.soap_p_goals}`);
  if (data.soap_p_plan)        lines.push(`Plan: ${data.soap_p_plan}`);

  return lines.join("\n");
}

const SUGGESTIONS = [
  "What are the likely differential diagnoses for this patient?",
  "Suggest an evidence-based treatment plan",
  "Are there any red flags I should consider?",
  "Generate a clinical impression for the assessment section",
  "What outcome measures would be appropriate?",
  "Suggest a home exercise programme",
];

export default function AIAssistant({ data, PC }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const patientContext = buildPatientContext(data);
  const patientName = data?.dem_name || "this patient";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    setError("");
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          patientContext,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Request failed");
      setMessages(prev => [...prev, { role: "assistant", content: json.reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setError("");
  }

  // Colors — fallback if PC not passed
  const accent = PC?.accent || "#7c3aed";
  const a2     = PC?.a2    || "#9333ea";
  const surface= PC?.surface|| "#fff";
  const border = PC?.border || "#e5e7eb";
  const text   = PC?.text  || "#111827";
  const muted  = PC?.muted || "#6b7280";
  const isDark = PC?.isDark|| false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Header banner ── */}
      <div style={{
        background: `linear-gradient(135deg,${accent}14,${a2}08)`,
        border: `1.5px solid ${accent}30`,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36,
            background: `linear-gradient(135deg,${accent}25,${a2}18)`,
            border: `1px solid ${accent}35`,
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", flexShrink: 0,
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: accent, letterSpacing: "-0.2px" }}>
              AI Clinical Assistant
            </div>
            <div style={{ fontSize: "0.75rem", color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>
              Powered by Groq · llama-3.3-70b
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} style={{
              marginLeft: "auto", padding: "4px 10px",
              background: "transparent", border: `1px solid ${border}`,
              borderRadius: 7, color: muted, fontSize: "0.75rem",
              fontWeight: 600, cursor: "pointer",
            }}>
              Clear
            </button>
          )}
        </div>
        {patientContext ? (
          <div style={{
            fontSize: "0.78rem", color: muted,
            background: isDark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.6)",
            border: `1px solid ${border}`,
            borderRadius: 8, padding: "6px 10px",
            lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 700, color: accent }}>Context: </span>
            {patientContext.split("\n").join(" · ")}
          </div>
        ) : (
          <div style={{ fontSize: "0.78rem", color: muted }}>
            No patient loaded — you can still ask general clinical questions.
          </div>
        )}
      </div>

      {/* ── Quick suggestion chips ── */}
      {messages.length === 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
            Quick Questions
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} style={{
                padding: "6px 12px",
                background: isDark ? `${accent}15` : `${accent}08`,
                border: `1px solid ${accent}25`,
                borderRadius: 20, color: accent,
                fontSize: "0.78rem", fontWeight: 600,
                cursor: "pointer", lineHeight: 1.4,
                textAlign: "left",
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Chat messages ── */}
      {messages.length > 0 && (
        <div style={{
          background: isDark ? "rgba(0,0,0,0.12)" : `${accent}04`,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 12,
          maxHeight: 420,
          overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              flexDirection: m.role === "user" ? "row-reverse" : "row",
              gap: 8, alignItems: "flex-start",
            }}>
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, flexShrink: 0,
                borderRadius: "50%",
                background: m.role === "user"
                  ? `linear-gradient(135deg,${accent},${a2})`
                  : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 800,
                color: m.role === "user" ? "#fff" : accent,
              }}>
                {m.role === "user" ? "U" : "🤖"}
              </div>
              {/* Bubble */}
              <div style={{
                maxWidth: "82%",
                background: m.role === "user"
                  ? `linear-gradient(135deg,${accent},${a2})`
                  : surface,
                border: m.role === "user" ? "none" : `1px solid ${border}`,
                borderRadius: m.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                padding: "9px 13px",
                fontSize: "0.82rem",
                color: m.role === "user" ? "#fff" : text,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, flexShrink: 0, borderRadius: "50%",
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem",
              }}>🤖</div>
              <div style={{
                background: surface, border: `1px solid ${border}`,
                borderRadius: "4px 12px 12px 12px",
                padding: "9px 16px",
                display: "flex", gap: 5, alignItems: "center",
              }}>
                {[0,1,2].map(n => (
                  <div key={n} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: accent,
                    animation: "aiDot 1.2s ease-in-out infinite",
                    animationDelay: `${n * 0.2}s`,
                    opacity: 0.7,
                  }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: "9px 12px", borderRadius: 8, marginBottom: 10,
          background: "#FEF2F2", border: "1px solid #FCA5A5",
          fontSize: "0.8rem", color: "#DC2626",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        display: "flex", gap: 8, alignItems: "flex-end",
        background: surface,
        border: `1.5px solid ${accent}30`,
        borderRadius: 12,
        padding: "8px 10px",
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder={`Ask anything about ${patientName}…`}
          rows={2}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            resize: "none", fontSize: "0.85rem", color: text,
            fontFamily: "inherit", lineHeight: 1.5,
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            padding: "8px 16px", flexShrink: 0,
            background: input.trim() && !loading
              ? `linear-gradient(135deg,${accent},${a2})`
              : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            border: "none", borderRadius: 9,
            color: input.trim() && !loading ? "#fff" : muted,
            fontSize: "0.82rem", fontWeight: 700,
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            transition: "all 0.15s",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
      <div style={{ fontSize: "0.72rem", color: muted, marginTop: 6, textAlign: "center" }}>
        Press Enter to send · Shift+Enter for new line · AI responses are assistive only
      </div>

      <style>{`
        @keyframes aiDot {
          0%,80%,100% { transform: scale(0.7); opacity:0.4; }
          40% { transform: scale(1.1); opacity:1; }
        }
      `}</style>
    </div>
  );
}
