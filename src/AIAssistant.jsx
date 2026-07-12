import { useState, useRef, useEffect, useMemo } from "react";
import { mapParseResultToUpdates } from "./aiIntakeParser.js";

function formatExerciseList(exercises) {
  return exercises.map(ex => {
    const dose = [
      (ex.sets && ex.reps) ? `${ex.sets}×${ex.reps}` : null,
      ex.hold ? `hold ${ex.hold}s` : null,
      ex.freq || null,
    ].filter(Boolean).join(", ");
    return ex.name ? (dose ? `${ex.name} (${dose})` : ex.name) : null;
  }).filter(Boolean).join("; ");
}

function buildPatientContext(data) {
  // Privacy: only clinical findings plus a strict demographic whitelist
  // (age / sex / dominant hand). Never include name, phone, email, address,
  // occupation, employer, GP, or any other identifying field here — this
  // string is sent verbatim to the AI backend (see api/chat.js).
  if (!data) return "";
  const lines = [];

  // ── DEMOGRAPHICS (whitelisted only) ──
  const demoBits = [];
  if (data.dem_age)            demoBits.push(`${data.dem_age}y`);
  const sex = data.dem_sex || data.dem_gender;
  if (sex)                     demoBits.push(sex);
  if (data.dem_dominant)       demoBits.push(`${data.dem_dominant}-hand dominant`);
  if (demoBits.length)         lines.push(`Demographics: ${demoBits.join(", ")}`);

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
  if (Array.isArray(data.hep_programme) && data.hep_programme.length) {
    const hepSummary = formatExerciseList(data.hep_programme);
    if (hepSummary) lines.push(`Home Exercise Programme: ${hepSummary}`);
  } else if (typeof data.hep_programme === "string" && data.hep_programme) {
    lines.push(`Home Exercise Programme: ${data.hep_programme}`);
  }
  // Exercise Prescription -- clinical library picks (ExercisePrescriptionModule),
  // kept separate from the true home-protocol list above.
  if (Array.isArray(data.tx_exercise_prescription) && data.tx_exercise_prescription.length) {
    const rxSummary = formatExerciseList(data.tx_exercise_prescription);
    if (rxSummary) lines.push(`Exercise Prescription: ${rxSummary}`);
  }
  if (data.soap_p_goals)       lines.push(`Goals: ${data.soap_p_goals}`);
  if (data.soap_p_plan)        lines.push(`Plan: ${data.soap_p_plan}`);

  return lines.join("\n");
}

const DEFAULT_SUGGESTIONS = [
  "What are the likely differential diagnoses for this patient?",
  "Suggest an evidence-based treatment plan",
  "Are there any red flags I should consider?",
  "Generate a clinical impression for the assessment section",
  "What outcome measures would be appropriate?",
  "Suggest a home exercise programme",
];

function truncate(str, n) {
  if (!str) return str;
  return str.length > n ? str.slice(0, n).trim() + "…" : str;
}

// Predefined questions, tailored to whichever patient profile is currently
// open (chief complaint / region) so the clinician sees relevant prompts
// first, falling back to general defaults when no patient is loaded.
function buildSuggestions(data) {
  if (!data) return DEFAULT_SUGGESTIONS;
  const cc = data.cc_main;
  const region = data.lx_loc || data.cx_loc || "";
  const tailored = [];
  if (cc) {
    tailored.push(`What are the likely differential diagnoses for "${truncate(cc, 60)}"?`);
    tailored.push(`What red flags should I screen for given "${truncate(cc, 60)}"?`);
  }
  if (region) tailored.push(`What special tests are most relevant for the ${region}?`);
  if (!tailored.length) return DEFAULT_SUGGESTIONS;
  return [...tailored, ...DEFAULT_SUGGESTIONS].slice(0, 6);
}

export default function AIAssistant({ data, set, PC, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const questionAnchorRef = useRef(null);
  const inputRef = useRef(null);

  const patientContext = useMemo(() => buildPatientContext(data), [data]);
  const suggestions = useMemo(() => buildSuggestions(data), [data]);
  const patientLoaded = !!patientContext;
  const [contextOpen, setContextOpen] = useState(false);
  const contextSummary = useMemo(() => {
    if (!patientContext) return "";
    if (data?.cc_main) return truncate(data.cc_main, 90);
    return patientContext.split("\n")[0] || "";
  }, [patientContext, data]);

  // When a new question is sent, scroll it to the top of the pane so the
  // answer that follows is read from where it starts -- not auto-scrolled
  // to its tail every time a (possibly long) reply comes in.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "user") {
      questionAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages]);

  // Lock background scroll while the full-screen chat is open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

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
      inputRef.current?.focus();
    }
  }

  // ── Fill patient record from a dictated/typed narrative ──────────────
  // Separate code path from send(): this never goes through /api/chat's
  // conversational reply, and never touches patientContext (the earlier
  // privacy whitelist) since /api/parse only needs the raw narrative
  // text, nothing about the existing patient. Reuses the exact same
  // extraction endpoint and field-mapping logic already proven inside
  // the Subjective tab's own dictation feature (see
  // SubjectiveObjective.jsx + aiIntakeParser.js) -- this is the same
  // capability, made reachable from the chat window the user actually
  // asked for, not a second, different implementation of it.
  async function extractToRecord(text) {
    const narrative = text || input.trim();
    if (!narrative || loading) return;
    setInput("");
    setError("");
    setMessages(prev => [...prev, { role: "user", content: narrative }]);
    setLoading(true);
    console.log("%c🤖 AI INTAKE — Stage 1: narrative captured (AI Assistant chat)", "background:#7c3aed;color:#fff;padding:2px 7px;border-radius:4px;font-weight:bold", narrative);
    try {
      console.log("🤖 AI INTAKE — Stage 2: sending to /api/parse...");
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: narrative }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        console.log("%c🤖 AI INTAKE — Stage 2 FAILED", "color:#dc2626;font-weight:bold", result);
        throw new Error(result.error || "Request failed");
      }
      console.log("🤖 AI INTAKE — Stage 2: response received", result);
      const mapped = mapParseResultToUpdates(result, data);
      setMessages(prev => [...prev, { role: "extraction", ...mapped, applied: false }]);
      console.log("🤖 AI INTAKE — Stage 4: review card shown in chat, waiting for you to confirm or discard");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function confirmExtraction(msgIndex) {
    setMessages(prev => prev.map((m, i) => {
      if (i !== msgIndex || m.role !== "extraction") return m;
      const updates = { ...m.updates };
      if (m.redFlagsToReview?.length) {
        const existingNotes = data.neuro_clinician_notes || "";
        const aiNote = "AI noticed in intake narrative, please screen: " + m.redFlagsToReview.join("; ");
        updates.neuro_clinician_notes = existingNotes ? (existingNotes + String.fromCharCode(10) + aiNote) : aiNote;
      }
      // The Subjective tab's "Review & Run Analysis" button stays disabled
      // until at least one region is in cx_selected_regions. That list is
      // ordinary local state inside SubjectiveModule, seeded once from
      // data.cx_selected_regions on mount -- this chat isn't mounted
      // alongside it, so the only way a region filled here actually shows
      // up (and unlocks analysis) once the clinician opens Subjective is
      // to merge it into the persisted field directly, same dedupe/cap-at-3
      // rule SubjectiveObjective.jsx's own applyAiResult uses.
      if (m.region) {
        let existing = [];
        try { existing = JSON.parse(data.cx_selected_regions || "[]"); } catch {}
        if (!existing.includes(m.region) && existing.length < 3) {
          updates.cx_selected_regions = JSON.stringify([...existing, m.region]);
        }
      }
      console.log("%c🤖 AI INTAKE — Stage 5: SAVING to patient record", "background:#059669;color:#fff;padding:2px 7px;border-radius:4px;font-weight:bold", updates);
      set && set(updates);
      console.log("🤖 AI INTAKE — Stage 5: saved. Check Demographics / Subjective / Red Flags tabs.");
      return { ...m, applied: true };
    }));
  }

  function clearChat() {
    setMessages([]);
    setError("");
  }

  // Colors — fallback if PC not passed
  const accent = PC?.accent || "#7c3aed";
  const a2     = PC?.a2    || "#9333ea";
  const bg     = PC?.bg    || "#F7F7F8";
  const surface= PC?.surface|| "#fff";
  const border = PC?.border || "#e5e7eb";
  const text   = PC?.text  || "#111827";
  const muted  = PC?.muted || "#6b7280";
  const isDark = PC?.isDark|| false;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100000,
      display: "flex", flexDirection: "column",
      background: bg,
    }}>
      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 10,
        padding: "10px 16px", borderBottom: `1px solid ${border}`,
        background: surface,
      }}>
        <button
          onClick={onClose}
          aria-label="Back"
          style={{
            width: 34, height: 34, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: `1px solid ${border}`,
            borderRadius: 9, color: text, fontSize: "1.1rem", cursor: "pointer",
          }}
        >←</button>
        <div style={{
          width: 34, height: 34, flexShrink: 0,
          background: `linear-gradient(135deg,${accent}25,${a2}18)`,
          border: `1px solid ${accent}35`,
          borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem",
        }}>🤖</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "0.92rem", color: accent, letterSpacing: "-0.2px" }}>
            AI Clinical Assistant
          </div>
          <div style={{ fontSize: "0.7rem", color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Powered by Groq · llama-3.3-70b
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} style={{
            padding: "6px 12px",
            background: "transparent", border: `1px solid ${border}`,
            borderRadius: 8, color: muted, fontSize: "0.75rem",
            fontWeight: 600, cursor: "pointer", flexShrink: 0,
          }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Persistent caution banner ── */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
        padding: "8px 16px",
        background: isDark ? "rgba(217,119,6,0.14)" : "#FFF7ED",
        borderBottom: `1px solid ${border}`,
        fontSize: "0.75rem", color: "#9A3412", lineHeight: 1.4,
      }}>
        <span style={{ flexShrink: 0 }}>⚠</span>
        <span>
          AI suggestions are assistive only — verify against {patientLoaded ? "this patient's" : "the"} full clinical record and your professional judgement before acting.
        </span>
      </div>

      {/* ── Patient context — collapsed to one line by default so it doesn't
           crowd out the conversation; expand to review the full summary ── */}
      {patientLoaded ? (
        <div style={{
          flexShrink: 0,
          background: isDark ? "rgba(0,0,0,0.15)" : `${accent}05`,
          borderBottom: `1px solid ${border}`,
        }}>
          <button
            onClick={() => setContextOpen(o => !o)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              background: "transparent", border: "none", cursor: "pointer",
              padding: "7px 16px", textAlign: "left", fontFamily: "inherit",
            }}
          >
            <span style={{ fontWeight: 700, color: accent, fontSize: "0.76rem", flexShrink: 0 }}>Context</span>
            {!contextOpen && (
              <span style={{
                fontSize: "0.76rem", color: muted, flex: 1, minWidth: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {contextSummary}
              </span>
            )}
            <span style={{ marginLeft: "auto", color: muted, fontSize: "0.68rem", fontWeight: 600, flexShrink: 0 }}>
              {contextOpen ? "▴ Hide" : "▾ Show all"}
            </span>
          </button>
          {contextOpen && (
            <div style={{ padding: "0 16px 10px", fontSize: "0.76rem", color: muted, lineHeight: 1.5 }}>
              {patientContext.split("\n").join(" · ")}
            </div>
          )}
        </div>
      ) : (
        <div style={{ flexShrink: 0, fontSize: "0.76rem", color: muted, padding: "7px 16px", borderBottom: `1px solid ${border}` }}>
          No patient loaded — you can still ask general clinical questions.
        </div>
      )}

      {/* ── Quick suggestion chips — pinned above the conversation ── */}
      <div style={{ flexShrink: 0, padding: "10px 16px", borderBottom: `1px solid ${border}`, background: surface }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 7 }}>
          {patientLoaded ? "Questions for this patient" : "Quick Questions"}
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
          {suggestions.map(s => (
            <button key={s} disabled={loading} onClick={() => send(s)} style={{
              whiteSpace: "nowrap", flexShrink: 0,
              padding: "6px 12px",
              background: isDark ? `${accent}15` : `${accent}08`,
              border: `1px solid ${accent}25`,
              borderRadius: 20, color: accent,
              fontSize: "0.76rem", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer", lineHeight: 1.4,
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conversation — grows to fill remaining height, scrolls independently ── */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "16px", display: "flex", flexDirection: "column", gap: 12,
      }}>
        {messages.length === 0 && !loading && (
          <div style={{ margin: "auto", textAlign: "center", color: muted, maxWidth: 380 }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>🤖</div>
            <div style={{ fontWeight: 700, color: text, marginBottom: 4, fontSize: "0.95rem" }}>Ask me anything</div>
            <div style={{ fontSize: "0.82rem", lineHeight: 1.5 }}>
              {patientLoaded
                ? "Pick a question above, ask about this patient, or ask about anything else."
                : "No patient loaded — ask any general clinical question to get started."}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          m.role === "extraction" ? (
            <div key={i} style={{
              maxWidth: "92%", alignSelf: "flex-start",
              background: surface, border: `1.5px solid ${m.applied ? "#86efac" : accent + "40"}`,
              borderRadius: "4px 12px 12px 12px", padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: "0.85rem" }}>{m.applied ? "✅" : "📋"}</span>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: m.applied ? "#166534" : accent }}>
                  {m.applied ? `Filled ${m.filledLabels.length} field${m.filledLabels.length===1?"":"s"} into the patient record` : `Found ${m.filledLabels.length} field${m.filledLabels.length===1?"":"s"} to fill`}
                </span>
              </div>
              {m.region && (
                <div style={{ fontSize: "0.74rem", color: muted, marginBottom: 6 }}>Region detected: <strong style={{ color: text }}>{m.region}</strong></div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: m.redFlagsToReview?.length ? 8 : 10 }}>
                {m.filledLabels.map((label, li) => (
                  <span key={li} style={{
                    fontSize: "0.68rem", padding: "3px 8px", borderRadius: 99,
                    background: isDark ? `${accent}18` : `${accent}0d`, color: accent,
                    border: `1px solid ${accent}30`,
                  }}>{label}</span>
                ))}
              </div>
              {m.redFlagsToReview?.length > 0 && (
                <div style={{
                  display: "flex", gap: 8, alignItems: "flex-start",
                  padding: "8px 10px", borderRadius: 8, marginBottom: 10,
                  background: isDark ? "rgba(220,38,38,0.14)" : "#FEF2F2",
                  border: "1px solid #FCA5A5",
                }}>
                  <span style={{ flexShrink: 0 }}>⚠</span>
                  <div style={{ fontSize: "0.74rem", color: "#B91C1C", lineHeight: 1.5 }}>
                    <strong>Worth screening:</strong> {m.redFlagsToReview.join("; ")}. Not auto-marked — that's your call, but it'll be noted in Red Flags for you to check.
                  </div>
                </div>
              )}
              {!m.applied ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => confirmExtraction(i)} style={{
                    flex: 1, padding: "8px", borderRadius: 8, border: "none",
                    background: `linear-gradient(135deg,${accent},${a2})`, color: "#fff",
                    fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>✓ Confirm and fill record</button>
                  <button onClick={() => setMessages(prev => prev.filter((_, idx) => idx !== i))} style={{
                    padding: "8px 12px", borderRadius: 8, border: `1px solid ${border}`,
                    background: "transparent", color: muted, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
                  }}>Discard</button>
                </div>
              ) : (
                <div style={{ fontSize: "0.72rem", color: "#166534" }}>Saved. Check Demographics and Subjective to review what was filled.</div>
              )}
            </div>
          ) : (
          <div key={i}
            ref={(i === messages.length - 1 && m.role === "user") ? questionAnchorRef : null}
            style={{
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
              maxWidth: "72%",
              background: m.role === "user"
                ? `linear-gradient(135deg,${accent},${a2})`
                : surface,
              border: m.role === "user" ? "none" : `1px solid ${border}`,
              borderRadius: m.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
              padding: "9px 13px",
              fontSize: "0.85rem",
              color: m.role === "user" ? "#fff" : text,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {m.content}
            </div>
          </div>
          )
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
              {[0, 1, 2].map(n => (
                <div key={n} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: accent,
                  animation: "aiDot 1.2s ease-in-out infinite",
                  animationDelay: `${n * 0.2}s`,
                  opacity: 0.7,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          flexShrink: 0, margin: "0 16px 10px",
          padding: "9px 12px", borderRadius: 8,
          background: "#FEF2F2", border: "1px solid #FCA5A5",
          fontSize: "0.8rem", color: "#DC2626",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Input bar — pinned to the bottom of the screen ── */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${border}`, background: surface, padding: "10px 16px" }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-end",
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
            placeholder="Ask about this patient, or ask anything else…"
            rows={2}
            autoFocus
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
        {set && (
          <button
            onClick={() => extractToRecord()}
            disabled={!input.trim() || loading}
            style={{
              width: "100%", marginTop: 7, padding: "7px", borderRadius: 8,
              border: `1px dashed ${input.trim() && !loading ? accent : border}`,
              background: "transparent",
              color: input.trim() && !loading ? accent : muted,
              fontSize: "0.75rem", fontWeight: 700,
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            📋 Fill patient record from this instead
          </button>
        )}
        <div style={{ fontSize: "0.72rem", color: muted, marginTop: 6, textAlign: "center" }}>
          Press Enter to send · Shift+Enter for new line · AI responses are assistive only
        </div>
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
