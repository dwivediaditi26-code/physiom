// PatientProfile.jsx — Unified patient profile: sticky banner + auto-built session timeline
// Reads from patient.data — no manual "profile updates" needed ever.

import React, { useState, useMemo } from "react";

const A="#7c3aed", S2="#f5f0fb", BD="#d8cce8", TX="#1a1025", MU="#7e6a9a",
      GR="#16a34a", RD="#dc2626", AM="#d97706";

// ── tiny sparkline ──────────────────────────────────────────────────────────
function Spark({ values, color = A }) {
  if (!values || values.length < 2) return null;
  const W = 60, H = 22;
  const mn = Math.min(...values), mx = Math.max(...values);
  const range = mx - mn || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - mn) / range) * H;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={pts.split(" ").pop().split(",")[0]} cy={pts.split(" ").pop().split(",")[1]}
        r="3" fill={color} />
    </svg>
  );
}

// ── mini trend badge ────────────────────────────────────────────────────────
function TrendBadge({ first, last, reverse = false }) {
  if (first == null || last == null) return null;
  const diff = last - first;
  const better = reverse ? diff < 0 : diff > 0;
  const pct = first !== 0 ? Math.round(Math.abs(diff / first) * 100) : 0;
  if (diff === 0) return <span style={{ fontSize: "0.6rem", color: MU }}>→ no change</span>;
  return (
    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: better ? GR : RD }}>
      {better ? "↑" : "↓"} {pct}%
    </span>
  );
}

// ── session card ─────────────────────────────────────────────────────────────
function SessionCard({ session, index, isToday, allSessions }) {
  const [open, setOpen] = useState(isToday);
  const s = session;
  const date = s.date || s.savedAt?.slice(0, 10) || "Unknown date";
  const typeLabel = s.type || (index === 0 ? "Initial Assessment" : "Progress Note");
  const painStart = parseFloat(s.vasStart || s.pain_start || "");
  const painEnd = parseFloat(s.vasEnd || s.pain_end || "");

  return (
    <div style={{ background: "#fff", borderRadius: 12,
      border: `1.5px solid ${isToday ? A : BD}`, overflow: "hidden",
      boxShadow: isToday ? `0 0 0 2px ${A}20` : "none" }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{ padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%",
          background: isToday ? A : "#ede9fe",
          color: isToday ? "#fff" : A,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", fontWeight: 900, flexShrink: 0 }}>
          {s.sessionNo || allSessions.length - index}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.78rem", color: TX }}>
            {typeLabel} {isToday && <span style={{ fontSize: "0.58rem", background: GR,
              color: "#fff", padding: "1px 6px", borderRadius: 8, marginLeft: 4 }}>TODAY</span>}
          </div>
          <div style={{ fontSize: "0.6rem", color: MU, marginTop: 1 }}>{date}</div>
        </div>
        {/* Pain badge */}
        {!isNaN(painEnd) && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 900,
              color: painEnd <= 3 ? GR : painEnd <= 6 ? AM : RD }}>{painEnd}/10</div>
            <div style={{ fontSize: "0.5rem", color: MU }}>pain end</div>
          </div>
        )}
        <span style={{ fontSize: "0.75rem", color: MU,
          transform: open ? "rotate(90deg)" : "none", transition: "0.2s" }}>▶</span>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${BD}` }}>
          {/* Pain row */}
          {(!isNaN(painStart) || !isNaN(painEnd)) && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: "0.62rem", color: MU }}>Pain:</span>
              {!isNaN(painStart) && <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>{painStart}/10</span>}
              {!isNaN(painStart) && !isNaN(painEnd) && <span style={{ color: MU, fontSize: "0.65rem" }}>→</span>}
              {!isNaN(painEnd) && <span style={{ fontSize: "0.72rem", fontWeight: 700,
                color: !isNaN(painStart) && painEnd < painStart ? GR : TX }}>{painEnd}/10</span>}
              {!isNaN(painStart) && !isNaN(painEnd) && painStart !== painEnd && (
                <span style={{ fontSize: "0.6rem", color: painEnd < painStart ? GR : RD, fontWeight: 700 }}>
                  {painEnd < painStart ? `↓ ${painStart - painEnd} pts better` : `↑ ${painEnd - painStart} pts worse`}
                </span>
              )}
            </div>
          )}

          {/* SOAP sections */}
          {[
            { key: "subjective", label: "S — Subjective", color: A },
            { key: "objective",  label: "O — Objective",  color: "#2563eb" },
            { key: "assessment", label: "A — Assessment", color: AM },
            { key: "plan",       label: "P — Plan",       color: GR },
          ].map(sec => {
            const text = s[sec.key] || s[`soap_${sec.key}`] || s[sec.key[0]];
            if (!text) return null;
            return (
              <div key={sec.key} style={{ marginTop: 8, padding: "7px 10px",
                borderRadius: 7, background: S2, borderLeft: `3px solid ${sec.color}` }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 800, color: sec.color,
                  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{sec.label}</div>
                <div style={{ fontSize: "0.68rem", color: TX, lineHeight: 1.5 }}>{text}</div>
              </div>
            );
          })}

          {/* Treatment given */}
          {s.treatmentGiven && (
            <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 7,
              background: "#eff6ff", borderLeft: "3px solid #2563eb" }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 800, color: "#2563eb",
                textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Treatment Given</div>
              <div style={{ fontSize: "0.68rem", color: TX, lineHeight: 1.5 }}>{s.treatmentGiven}</div>
            </div>
          )}

          {/* Response */}
          {s.response && (
            <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 7,
              background: "#f0fdf4", borderLeft: `3px solid ${GR}` }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 800, color: GR,
                textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Patient Response</div>
              <div style={{ fontSize: "0.68rem", color: TX, lineHeight: 1.5 }}>{s.response}</div>
            </div>
          )}

          {/* HEP */}
          {s.hep && (
            <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 7,
              background: "#fef9c3", borderLeft: `3px solid ${AM}` }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 800, color: AM,
                textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Home Exercise Plan</div>
              <div style={{ fontSize: "0.68rem", color: TX, lineHeight: 1.5 }}>{s.hep}</div>
            </div>
          )}

          {/* Next plan */}
          {s.nextPlan && (
            <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 7, background: "#ede9fe" }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 800, color: A,
                textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Next Session Plan</div>
              <div style={{ fontSize: "0.68rem", color: TX, lineHeight: 1.5 }}>{s.nextPlan}</div>
            </div>
          )}

          {s.clinician && (
            <div style={{ marginTop: 8, fontSize: "0.6rem", color: MU }}>
              Clinician: <strong>{s.clinician}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── outcome trend row ─────────────────────────────────────────────────────────
function OutcomeTrend({ label, history, unit, mcid, interpret }) {
  if (!history || history.length === 0) return null;
  const scores = history.map(h => parseFloat(h.score)).filter(x => !isNaN(x));
  const first = scores[0], last = scores[scores.length - 1];
  const interp = interpret ? interpret(last) : null;
  const diff = last - first;
  const mcidMet = mcid && Math.abs(diff) >= mcid;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
      borderBottom: `1px solid ${BD}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: TX }}>{label}</div>
        {interp && <div style={{ fontSize: "0.58rem", color: interp.color, fontWeight: 600 }}>{interp.label}</div>}
      </div>
      <Spark values={scores} color={interp?.color || A} />
      <div style={{ textAlign: "right", minWidth: 50 }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 900, color: interp?.color || A }}>{last}{unit}</div>
        <div style={{ fontSize: "0.55rem", color: mcidMet ? GR : MU }}>
          {mcidMet ? "✓ MCID met" : `${history.length} sessions`}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PatientProfile({ patient, onSaveField, onNav, onClose }) {
  const [expandedSection, setExpandedSection] = useState({ progress: true, timeline: true });
  const toggle = (k) => setExpandedSection(p => ({ ...p, [k]: !p[k] }));

  const d = patient?.data || {};
  const name     = d.dem_name || patient?.name || "Patient";
  const age      = d.dem_age  || "";
  const sex      = d.dem_sex  || "";
  const phone    = d.dem_phone || "";
  const dx       = patient?.lastDx || d.soap_assessment?.split('\n')[0]?.slice(0, 60)
                   || d.cc_dx || d.cc_main || "Diagnosis not recorded";
  const painNow  = parseFloat(d.cc_vas_now || "0") || 0;
  const painWorst= parseFloat(d.cc_vas_worst || "0") || 0;
  const flags    = [];
  if (d.med_flags)               flags.push(...(Array.isArray(d.med_flags) ? d.med_flags : [d.med_flags]));
  if (d.red_flags)               flags.push(...(Array.isArray(d.red_flags) ? d.red_flags : [d.red_flags]));
  if (d.contra_flags)            flags.push(...(Array.isArray(d.contra_flags) ? d.contra_flags : [d.contra_flags]));
  if ((d.med_conditions||"").toLowerCase().includes("osteo")) flags.push("Osteoporosis");
  if ((d.med_medications||"").toLowerCase().includes("warfarin")||
      (d.med_medications||"").toLowerCase().includes("anticoag")) flags.push("Blood thinners");

  // Build unified session timeline
  const rawSessions = Array.isArray(d.tx_sessions) ? d.tx_sessions : [];
  const signedNotes = Array.isArray(d.soap_signed_notes) ? d.soap_signed_notes : [];
  
  // Merge tx_sessions with signed notes (match by date prefix)
  const allSessions = useMemo(() => {
    const map = {};
    rawSessions.forEach(s => {
      const key = (s.date || s.savedAt || "").slice(0, 10);
      map[key] = { ...s, _type: "session" };
    });
    signedNotes.forEach(n => {
      const key = (n.date || n.signedAt || "").slice(0, 10);
      if (map[key]) {
        map[key] = { ...map[key], ...n, subjective: n.subjective || map[key].subjective };
      } else {
        map[key] = { ...n, _type: "soap" };
      }
    });
    return Object.values(map).sort((a, b) => {
      const da = new Date(a.savedAt || a.date || 0);
      const db = new Date(b.savedAt || b.date || 0);
      return db - da;
    });
  }, [rawSessions, signedNotes]);

  // Outcome measure histories
  const omScales = [
    { id: "ndi",   label: "NDI",   unit: "%",   mcid: 8,   interp: s => s<=8?{label:"No disability",color:GR}:s<=28?{label:"Mild",color:"#0891b2"}:s<=48?{label:"Moderate",color:AM}:{label:"Severe",color:RD} },
    { id: "odi",   label: "ODI",   unit: "%",   mcid: 10,  interp: s => s<=20?{label:"Minimal",color:GR}:s<=40?{label:"Moderate",color:AM}:{label:"Severe",color:RD} },
    { id: "dash",  label: "DASH",  unit: "%",   mcid: 10.2,interp: s => s<=20?{label:"Mild",color:GR}:s<=40?{label:"Moderate",color:AM}:{label:"Severe",color:RD} },
    { id: "bbs",   label: "Berg",  unit: "/56", mcid: 4,   interp: s => s>=45?{label:"Low fall risk",color:GR}:s>=36?{label:"Medium risk",color:AM}:{label:"High risk",color:RD} },
    { id: "tug",   label: "TUG",   unit: "s",   mcid: 3.5, interp: s => s<=10?{label:"Mobile",color:GR}:s<=20?{label:"Variable",color:AM}:{label:"High risk",color:RD} },
    { id: "mwt10", label: "10MWT", unit: "m/s", mcid: 0.1, interp: s => s>=1.2?{label:"Community",color:GR}:s>=0.4?{label:"Household",color:AM}:{label:"Non-functional",color:RD} },
    { id: "vas",   label: "VAS",   unit: "/10", mcid: 2,   interp: s => s<=3?{label:"Mild",color:GR}:s<=6?{label:"Moderate",color:AM}:{label:"Severe",color:RD} },
    { id: "psfs",  label: "PSFS",  unit: "/10", mcid: 1,   interp: s => s>=7?{label:"Good",color:GR}:s>=4?{label:"Moderate",color:AM}:{label:"Poor",color:RD} },
  ];
  const omWithData = omScales.map(sc => {
    try {
      const hist = JSON.parse(d[`om_history_${sc.id}`] || "[]");
      return { ...sc, history: hist };
    } catch { return { ...sc, history: [] }; }
  }).filter(sc => sc.history.length > 0);

  // Pain trend from sessions
  const painTrend = allSessions
    .slice().reverse()
    .map(s => parseFloat(s.vasEnd || s.vasStart || s.pain_end || s.pain_start || ""))
    .filter(x => !isNaN(x));

  // Posture sessions saved to patient
  const postureSessions = useMemo(() => {
    try { return JSON.parse(d.posture_sessions || "[]"); } catch { return []; }
  }, [d.posture_sessions]);

  const lastVisit = allSessions[0]?.date || allSessions[0]?.savedAt?.slice(0, 10) || null;
  const isToday = (s) => {
    const today = new Date().toISOString().slice(0, 10);
    return (s.date || s.savedAt || "").slice(0, 10) === today;
  };

  // ── render ──
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: TX, minHeight: "100vh", background: S2 }}>

      {/* ── STICKY BANNER ─────────────────────────────────────────────────── */}
      <div style={{ background: TX, padding: "12px 14px", position: "sticky", top: 0, zIndex: 20 }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none",
            color: "#9ca3af", fontSize: "1.1rem", cursor: "pointer", padding: "0 4px" }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: A,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", flexShrink: 0 }}>👤</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div style={{ fontSize: "0.6rem", color: "#9ca3af", marginTop: 1 }}>
              {[age && `${age}y`, sex, phone].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 900,
              color: painNow <= 3 ? "#4ade80" : painNow <= 6 ? "#fbbf24" : "#f87171",
              lineHeight: 1 }}>{painNow || "—"}</div>
            <div style={{ fontSize: "0.48rem", color: "#9ca3af" }}>pain /10</div>
          </div>
        </div>

        {/* Diagnosis */}
        <div style={{ fontSize: "0.68rem", color: "#c4b5fd", fontWeight: 600,
          marginBottom: flags.length ? 6 : 8 }}>{dx}</div>

        {/* Flags — ALWAYS VISIBLE */}
        {flags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {flags.slice(0, 4).map((f, i) => (
              <span key={i} style={{ fontSize: "0.52rem", fontWeight: 700, padding: "2px 7px",
                borderRadius: 8, background: RD, color: "#fff" }}>⚠ {f}</span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[
            { label: "Sessions", value: allSessions.length },
            { label: "Last visit", value: lastVisit || "—" },
            { label: "Outcomes", value: omWithData.length },
            { label: "Posture", value: postureSessions.length },
          ].map((stat, i) => (
            <div key={i} style={{ flex: 1, background: "#374151", borderRadius: 7,
              padding: "5px 4px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#e5e7eb" }}>{stat.value}</div>
              <div style={{ fontSize: "0.48rem", color: "#9ca3af" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 5 }}>
          {[
            { label: "▶ New SOAP",     action: () => onNav && onNav("soap"),         bg: A },
            { label: "📊 Outcomes",    action: () => onNav && onNav("outcomes"),     bg: "#0891b2" },
            { label: "🧍 Posture",     action: () => onNav && onNav("posture"),      bg: "#059669" },
            { label: "📄 Export",      action: () => onNav && onNav("export"),       bg: "#374151" },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} style={{
              flex: 1, padding: "6px 2px", border: "none", borderRadius: 7,
              background: btn.bg, color: "#fff", fontSize: "0.55rem", fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit" }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────────── */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>

        {/* ── SECTION: Goals & Progress (pinned) ──────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, border: `1.5px solid ${BD}`, overflow: "hidden" }}>
          <div onClick={() => toggle("progress")} style={{ padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: "1rem" }}>📌</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>Goals & Progress</div>
              <div style={{ fontSize: "0.6rem", color: MU }}>
                {omWithData.length > 0
                  ? `${omWithData.length} outcome measure${omWithData.length > 1 ? "s" : ""} tracked`
                  : "No outcome measures run yet"}
              </div>
            </div>
            <span style={{ fontSize: "0.7rem", color: MU,
              transform: expandedSection.progress ? "rotate(90deg)" : "none", transition: "0.2s" }}>▶</span>
          </div>
          {expandedSection.progress && (
            <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${BD}` }}>
              {/* Pain trend */}
              {painTrend.length >= 2 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                  borderBottom: `1px solid ${BD}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700 }}>Pain (VAS/NPRS)</div>
                    <div style={{ fontSize: "0.58rem", color: MU }}>{painTrend.length} sessions</div>
                  </div>
                  <Spark values={painTrend} color={painTrend[painTrend.length-1] < painTrend[0] ? GR : RD} />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 900,
                      color: painTrend[painTrend.length-1] <= 3 ? GR : AM }}>
                      {painTrend[painTrend.length-1]}/10</div>
                    <TrendBadge first={painTrend[0]} last={painTrend[painTrend.length-1]} reverse={true} />
                  </div>
                </div>
              )}
              {omWithData.length === 0 && painTrend.length < 2 && (
                <div style={{ textAlign: "center", padding: "16px 0", color: MU, fontSize: "0.68rem" }}>
                  Run outcome measures each session to track progress here automatically.
                </div>
              )}
              {omWithData.map(sc => (
                <OutcomeTrend key={sc.id} label={sc.label} history={sc.history}
                  unit={sc.unit} mcid={sc.mcid} interpret={sc.interp} />
              ))}
              {/* Goals from session data */}
              {(() => {
                const goalText = rawSessions.find(s => s.goals)?.goals;
                if (!goalText) return null;
                return (
                  <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 8, background: S2 }}>
                    <div style={{ fontSize: "0.58rem", fontWeight: 800, color: A,
                      textTransform: "uppercase", marginBottom: 3 }}>Patient Goals</div>
                    <div style={{ fontSize: "0.65rem", color: TX, lineHeight: 1.5 }}>{goalText}</div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── SECTION: Session Timeline ────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, border: `1.5px solid ${BD}`, overflow: "hidden" }}>
          <div onClick={() => toggle("timeline")} style={{ padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: "1rem" }}>📋</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>Session Timeline</div>
              <div style={{ fontSize: "0.6rem", color: MU }}>
                {allSessions.length === 0
                  ? "No sessions yet — start with a SOAP note"
                  : `${allSessions.length} session${allSessions.length > 1 ? "s" : ""} · newest first`}
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); onNav && onNav("soap"); }}
              style={{ padding: "4px 10px", borderRadius: 8, border: "none",
                background: A, color: "#fff", fontSize: "0.6rem", fontWeight: 700,
                cursor: "pointer", flexShrink: 0 }}>+ New SOAP</button>
            <span style={{ fontSize: "0.7rem", color: MU,
              transform: expandedSection.timeline ? "rotate(90deg)" : "none", transition: "0.2s" }}>▶</span>
          </div>
          {expandedSection.timeline && (
            <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${BD}`,
              display: "flex", flexDirection: "column", gap: 6, paddingTop: 10 }}>
              {allSessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: MU }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📋</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, marginBottom: 4 }}>No sessions recorded yet</div>
                  <div style={{ fontSize: "0.62rem" }}>Tap "+ New SOAP" to start the first session.<br />Everything will appear here automatically.</div>
                  <button onClick={() => onNav && onNav("soap")} style={{ marginTop: 12,
                    padding: "8px 20px", background: A, color: "#fff", border: "none",
                    borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                    Start First Session →
                  </button>
                </div>
              ) : (
                allSessions.map((s, i) => (
                  <SessionCard key={s.id || s.savedAt || i} session={s} index={i}
                    isToday={isToday(s)} allSessions={allSessions} />
                ))
              )}
            </div>
          )}
        </div>

        {/* ── SECTION: Posture History ─────────────────────────────────────── */}
        {postureSessions.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: `1.5px solid ${BD}`, overflow: "hidden" }}>
            <div onClick={() => toggle("posture")} style={{ padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <span style={{ fontSize: "1rem" }}>🧍</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>Posture History</div>
                <div style={{ fontSize: "0.6rem", color: MU }}>{postureSessions.length} photo{postureSessions.length > 1 ? "s" : ""} saved</div>
              </div>
              <span style={{ fontSize: "0.7rem", color: MU,
                transform: expandedSection.posture ? "rotate(90deg)" : "none", transition: "0.2s" }}>▶</span>
            </div>
            {expandedSection.posture && (
              <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${BD}`, paddingTop: 10 }}>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                  {[...postureSessions].reverse().map((ps, i) => (
                    <div key={i} style={{ flexShrink: 0, width: 90, borderRadius: 8,
                      border: `1.5px solid ${BD}`, overflow: "hidden", background: S2 }}>
                      {ps.img ? (
                        <img src={ps.img} alt="posture" style={{ width: "100%", height: 70, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: 70, display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: "1.5rem" }}>🧍</div>
                      )}
                      <div style={{ padding: "4px 5px" }}>
                        <div style={{ fontSize: "0.55rem", fontWeight: 700, color: A }}>
                          {ps.band || ps.score || "Analysed"}</div>
                        <div style={{ fontSize: "0.5rem", color: MU }}>
                          {(ps.capturedAt || ps.time || "").slice(0, 10)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {postureSessions.length >= 2 && (
                  <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 8,
                    background: S2, fontSize: "0.62rem", color: MU }}>
                    Tap any photo to compare · {postureSessions.length} analyses saved
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION: Demographics (last, collapsed) ──────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, border: `1.5px solid ${BD}`, overflow: "hidden" }}>
          <div onClick={() => toggle("demo")} style={{ padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: "1rem" }}>🪪</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>Demographics & Admin</div>
              <div style={{ fontSize: "0.6rem", color: MU }}>Biodata · contact · medical history</div>
            </div>
            <span style={{ fontSize: "0.7rem", color: MU,
              transform: expandedSection.demo ? "rotate(90deg)" : "none", transition: "0.2s" }}>▶</span>
          </div>
          {expandedSection.demo && (
            <div style={{ padding: "0 14px 12px", borderTop: `1px solid ${BD}`, paddingTop: 10 }}>
              {[
                { label: "Full Name",    value: d.dem_name },
                { label: "Date of Birth",value: d.dem_dob },
                { label: "Age",          value: d.dem_age && `${d.dem_age} years` },
                { label: "Sex",          value: d.dem_sex },
                { label: "Occupation",   value: d.dem_occupation },
                { label: "Phone",        value: d.dem_phone },
                { label: "Email",        value: d.dem_email },
                { label: "Emergency",    value: d.dem_emergency },
                { label: "Diagnosis",    value: dx },
                { label: "Onset",        value: d.cc_onset_date },
                { label: "Medications",  value: d.med_medications },
                { label: "Conditions",   value: d.med_conditions },
                { label: "Allergies",    value: d.med_allergies },
                { label: "Consent",      value: d.consent_date && `Signed ${d.consent_date}` },
              ].filter(r => r.value).map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0",
                  borderBottom: `1px solid ${BD}` }}>
                  <div style={{ fontSize: "0.62rem", color: MU, width: 80, flexShrink: 0 }}>{row.label}</div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color: TX, flex: 1 }}>{row.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
