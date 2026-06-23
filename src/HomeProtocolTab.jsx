import { useState, useMemo } from "react";
import { ALL_EXERCISES, EXERCISE_DB } from "./ClinicalModules.jsx";

function buildWAText(programme, precautions, clinicName, therapistName, phone, patientName) {
  if (!programme.length) return "";
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const lines = [];
  lines.push(`🏥 ${clinicName || "Physio Clinic"}`);
  if (therapistName) lines.push(`${therapistName}${phone ? " · " + phone : ""}`);
  lines.push("");
  lines.push(`*Home Exercise Programme*`);
  if (patientName) lines.push(`Patient: ${patientName}`);
  lines.push(`Date: ${date}`);
  lines.push("");
  programme.forEach((ex, i) => {
    const sets = ex.customSets || ex.sets || "";
    const reps = ex.customReps || ex.reps || "";
    const hold = ex.customHold || ex.hold || "";
    const freq = ex.customFreq || ex.freq || "";
    lines.push(`*${i + 1}. ${ex.name}*`);
    let dose = `   ${sets} sets × ${reps} reps`;
    if (hold) dose += ` · hold ${hold}s`;
    if (freq) dose += ` · ${freq}`;
    lines.push(dose);
    const instr = ex.hepInstruction || ex.desc || "";
    if (instr) {
      instr.split(". ").filter(Boolean).forEach(s => lines.push(`   → ${s.trim()}`));
    }
    lines.push("");
  });
  if (precautions && precautions.trim()) {
    lines.push(`⚠️ *Precautions*`);
    lines.push(precautions.trim());
    lines.push("");
  }
  lines.push(`📞 Questions? Call or WhatsApp us anytime.`);
  if (phone) lines.push(phone);
  return lines.join("\n");
}

export default function HomeProtocolTab({ data, set, PC }) {
  const programme = Array.isArray(data.hep_programme) ? data.hep_programme : [];
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [precautions, setPrecautions] = useState(data.hep_precautions || "");
  const [clinicName, setClinicName] = useState(data.soap_clinic || data.clinic_name || "");
  const [therapistName, setTherapistName] = useState(data.soap_clinician || "");
  const [phone, setPhone] = useState(data.dem_phone_clinic || data.soap_clinic_phone || "");

  const patientName = data.dem_name || "Patient";
  const patientPhone = String(data.dem_phone || data.dem_mobile || "").replace(/[^0-9]/g, "");

  const allExercises = useMemo(() => ALL_EXERCISES || [], []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allExercises.slice(0, 30);
    const q = search.toLowerCase();
    return allExercises.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.target?.toLowerCase().includes(q) ||
      e.id?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [search, allExercises]);

  const isSelected = (id) => programme.some(p => p.id === id);

  function toggleExercise(ex) {
    if (isSelected(ex.id)) {
      set("hep_programme", programme.filter(p => p.id !== ex.id));
      if (expandedId === ex.id) setExpandedId(null);
    } else {
      set("hep_programme", [...programme, {
        ...ex,
        customSets: ex.sets,
        customReps: ex.reps,
        customHold: ex.hold,
        customFreq: ex.freq,
        hepInstruction: ex.desc || "",
        addedDate: new Date().toISOString(),
      }]);
    }
  }

  function updateField(id, field, value) {
    set("hep_programme", programme.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  function saveMeta() {
    set("hep_precautions", precautions);
    set("soap_clinic", clinicName);
    set("soap_clinician", therapistName);
    set("soap_clinic_phone", phone);
  }

  const waText = buildWAText(programme, precautions, clinicName, therapistName, phone, patientName);

  function sendWhatsApp() {
    if (!waText) { alert("Add at least one exercise to the protocol first."); return; }
    const url = patientPhone.length >= 10
      ? `https://wa.me/${patientPhone}?text=${encodeURIComponent(waText)}`
      : `https://wa.me/?text=${encodeURIComponent(waText)}`;
    window.open(url, "_blank");
  }

  const acc = PC?.accent || "#7c3aed";
  const a2 = PC?.a2 || "#9333ea";
  const surf = PC?.surface || "#fff";
  const s2 = PC?.s2 || "#f9fafb";
  const s3 = PC?.s3 || "#f3f4f6";
  const bdr = PC?.border || "#e5e7eb";
  const txt = PC?.text || "#111827";
  const mut = PC?.muted || "#6b7280";
  const isDark = PC?.isDark || false;

  const card = (extra = {}) => ({
    background: surf,
    border: `1px solid ${bdr}`,
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 12,
    ...extra,
  });

  const inp = {
    width: "100%",
    background: s3,
    border: `1px solid ${bdr}`,
    borderRadius: 8,
    color: txt,
    fontFamily: "inherit",
    outline: "none",
    padding: "7px 10px",
    fontSize: "0.82rem",
  };

  const lbl = {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: mut,
    display: "block",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 14, alignItems: "flex-start" }}>

      {/* ── LEFT: Exercise selector ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Search + library */}
        <div style={card()}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: acc, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
            🏋 Select exercises
          </div>
          <input
            style={{ ...inp, marginBottom: 10 }}
            placeholder="Search exercise library..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {programme.length > 0 && (
            <div style={{ fontSize: "0.75rem", color: acc, fontWeight: 700, marginBottom: 8 }}>
              {programme.length} exercise{programme.length !== 1 ? "s" : ""} selected
            </div>
          )}

          {/* Selected exercises first */}
          {programme.map(ex => (
            <div key={ex.id} style={{ marginBottom: 6 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px",
                borderRadius: 10,
                border: `1.5px solid ${acc}`,
                background: isDark ? `${acc}15` : `${acc}08`,
              }}>
                <div
                  onClick={() => toggleExercise(ex)}
                  style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: "pointer",
                    background: acc, border: `1.5px solid ${acc}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "0.7rem", fontWeight: 800,
                  }}
                >✓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</div>
                  <div style={{ fontSize: "0.72rem", color: mut }}>
                    {ex.customSets}×{ex.customReps}{ex.customHold ? ` · ${ex.customHold}s` : ""}{ex.customFreq ? ` · ${ex.customFreq}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
                  style={{
                    padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700,
                    color: acc, background: `${acc}12`, border: `1px solid ${acc}25`,
                    borderRadius: 6, cursor: "pointer", flexShrink: 0,
                  }}
                >{expandedId === ex.id ? "▲ Close" : "✏ Edit"}</button>
              </div>

              {/* Expanded edit panel */}
              {expandedId === ex.id && (
                <div style={{
                  background: isDark ? `${acc}10` : `${acc}05`,
                  border: `1.5px solid ${acc}30`,
                  borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                  padding: "10px 12px",
                  marginTop: -2,
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
                    {[
                      ["Sets", "customSets"],
                      ["Reps", "customReps"],
                      ["Hold (s)", "customHold"],
                      ["Frequency", "customFreq"],
                    ].map(([label, field]) => (
                      <div key={field}>
                        <div style={{ ...lbl, marginBottom: 3 }}>{label}</div>
                        <input
                          style={{ ...inp, textAlign: "center" }}
                          value={ex[field] || ""}
                          onChange={e => updateField(ex.id, field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ ...lbl, marginBottom: 4 }}>Instruction (sent to patient)</div>
                  <textarea
                    style={{ ...inp, resize: "none", height: 52 }}
                    value={ex.hepInstruction || ""}
                    onChange={e => updateField(ex.id, "hepInstruction", e.target.value)}
                    placeholder="How to do this exercise (sent in WhatsApp message)..."
                  />
                </div>
              )}
            </div>
          ))}

          {/* Unselected exercises from search */}
          {filtered.filter(e => !isSelected(e.id)).slice(0, 12).map(ex => (
            <div key={ex.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", borderRadius: 10,
              border: `1px solid ${bdr}`, marginBottom: 5,
              background: surf, cursor: "pointer",
            }} onClick={() => toggleExercise(ex)}>
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                border: `1.5px solid ${bdr}`, background: s3,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</div>
                <div style={{ fontSize: "0.72rem", color: mut }}>{ex.sets}×{ex.reps}{ex.hold ? ` · ${ex.hold}s` : ""}{ex.freq ? ` · ${ex.freq}` : ""}</div>
              </div>
              <span style={{ fontSize: "0.72rem", color: mut }}>+ Add</span>
            </div>
          ))}
        </div>

        {/* Precautions */}
        <div style={card()}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#B45309", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
            ⚠️ Precautions & warnings
          </div>
          <textarea
            style={{ ...inp, resize: "none", height: 56 }}
            placeholder="e.g. Stop if sharp pain, avoid full end range, no overhead loading..."
            value={precautions}
            onChange={e => { setPrecautions(e.target.value); set("hep_precautions", e.target.value); }}
          />
        </div>

        {/* Clinic details */}
        <div style={card()}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: acc, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
            🏥 Clinic details
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={lbl}>Clinic name</label>
              <input style={inp} value={clinicName} onChange={e => { setClinicName(e.target.value); set("soap_clinic", e.target.value); }} placeholder="Your clinic name" />
            </div>
            <div>
              <label style={lbl}>Therapist name</label>
              <input style={inp} value={therapistName} onChange={e => { setTherapistName(e.target.value); set("soap_clinician", e.target.value); }} placeholder="Dr. Name" />
            </div>
          </div>
          <div>
            <label style={lbl}>Contact number</label>
            <input style={inp} value={phone} onChange={e => { setPhone(e.target.value); set("soap_clinic_phone", e.target.value); }} placeholder="+91 98765 43210" />
          </div>
        </div>
      </div>

      {/* ── RIGHT: Preview + Send ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={card()}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#25d366", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
            💬 WhatsApp preview — live
          </div>

          {programme.length > 0 ? (
            /* ── Styled WhatsApp bubble preview ── */
            <div style={{
              background: "#e5ddd5",
              borderRadius: 12,
              padding: "12px 10px",
              marginBottom: 12,
              maxHeight: 460,
              overflowY: "auto",
            }}>
              <div style={{
                background: "#fff",
                borderRadius: "4px 12px 12px 12px",
                padding: "10px 13px",
                maxWidth: "92%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                fontSize: "0.8rem",
                lineHeight: 1.6,
                color: "#111",
                fontFamily: "inherit",
              }}>
                {/* Clinic header */}
                <div style={{ fontWeight: 800, color: "#075e54", marginBottom: 2, fontSize: "0.85rem" }}>
                  🏥 {clinicName || "Physio Clinic"}
                </div>
                {(therapistName || phone) && (
                  <div style={{ fontSize: "0.75rem", color: "#555", marginBottom: 8 }}>
                    {therapistName}{therapistName && phone ? " · " : ""}{phone}
                  </div>
                )}
                {/* Title */}
                <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#111", marginBottom: 2 }}>
                  🏠 Home Exercise Programme
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: 10 }}>
                  Patient: {patientName} · {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                {/* Exercise cards */}
                {programme.map((ex, i) => {
                  const sets = ex.customSets || ex.sets || "";
                  const reps = ex.customReps || ex.reps || "";
                  const hold = ex.customHold || ex.hold || "";
                  const freq = ex.customFreq || ex.freq || "";
                  const instr = ex.hepInstruction || ex.desc || "";
                  return (
                    <div key={ex.id} style={{
                      background: "#f0faf0",
                      borderLeft: "3px solid #25d366",
                      borderRadius: "0 8px 8px 0",
                      padding: "7px 10px",
                      marginBottom: 7,
                    }}>
                      <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#1a3a1a", marginBottom: 3 }}>
                        {i + 1}. {ex.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#444" }}>
                        {sets} sets × {reps} reps{hold ? ` · hold ${hold}s` : ""}{freq ? ` · ${freq}` : ""}
                      </div>
                      {instr && (
                        <div style={{ fontSize: "0.75rem", color: "#555", fontStyle: "italic", marginTop: 3 }}>
                          {instr}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Precautions */}
                {precautions && precautions.trim() && (
                  <div style={{
                    background: "#fff8e1",
                    borderLeft: "3px solid #f0a500",
                    borderRadius: "0 8px 8px 0",
                    padding: "7px 10px",
                    marginBottom: 7,
                    fontSize: "0.75rem",
                    color: "#5a3e00",
                  }}>
                    <span style={{ fontWeight: 800 }}>⚠️ Precautions: </span>{precautions.trim()}
                  </div>
                )}
                {/* Footer */}
                <div style={{ borderTop: "1px solid #eee", paddingTop: 7, marginTop: 4, fontSize: "0.75rem", color: "#555" }}>
                  📞 Questions? Call or WhatsApp anytime.
                  {phone && <div style={{ color: "#075e54", fontWeight: 700 }}>{phone}</div>}
                </div>
                {/* Timestamp */}
                <div style={{ fontSize: "0.68rem", color: "#999", textAlign: "right", marginTop: 6 }}>
                  {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} ✓✓
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: s2, border: `1px dashed ${bdr}`,
              borderRadius: 12, padding: "24px 16px",
              textAlign: "center", color: mut, fontSize: "0.82rem",
              marginBottom: 12,
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>💬</div>
              Select exercises on the left to preview the message
            </div>
          )}

          <button
            onClick={sendWhatsApp}
            style={{
              width: "100%", padding: "11px 16px",
              background: programme.length ? "#25d366" : s3,
              border: "none", borderRadius: 10,
              color: programme.length ? "#fff" : mut,
              fontWeight: 800, fontSize: "0.88rem",
              cursor: programme.length ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginBottom: 8,
            }}
          >
            📲 Send to {patientName} — WhatsApp
          </button>

          <button
            onClick={() => {
              if (!waText) { alert("Add exercises first."); return; }
              const blob = new Blob([waText], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `HEP_${patientName}_${Date.now()}.txt`;
              a.click(); URL.revokeObjectURL(url);
            }}
            style={{
              width: "100%", padding: "10px 16px",
              background: s2, border: `1px solid ${bdr}`,
              borderRadius: 10, color: txt,
              fontWeight: 700, fontSize: "0.82rem",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            📄 Copy / Download as text
          </button>

          {!patientPhone && (
            <div style={{
              marginTop: 10, padding: "8px 12px", borderRadius: 8,
              background: isDark ? "#2a1f05" : "#fffbeb",
              border: `1px solid ${isDark ? "#5a3e00" : "#fde68a"}`,
              fontSize: "0.75rem", color: isDark ? "#fbbf24" : "#92400e",
            }}>
              💡 Add patient phone number in Demographics to auto-fill the WhatsApp number.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
