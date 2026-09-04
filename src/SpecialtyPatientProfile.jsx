import React, { useState, useRef, useEffect, useMemo } from "react";
import { NeuroCarePlanSection, CarePlanSection } from "./NeuroCarePlan.jsx";
import { goalProgress } from "./neuroClinicalKnowledge.js";
import { buildOrthoKnowledge } from "./orthoClinicalKnowledge.js";
import { SummarySection as CardioSummarySection, SummaryStyles as CardioSummaryStyles, buildCardioAssessSteps } from "./CardiopulmonaryAssessment.jsx";
import { SummarySection as NeuroSummarySection, SummaryStyles as NeuroSummaryStyles, buildNeuroAssessSteps, neuroSummaryFormatters } from "./NeurologicalAssessment.jsx";
import { AssessmentSummary as OrthoAssessmentSummary } from "./orthoSummary.jsx";
import { orthoStyles } from "./orthoStyles.js";
import { orthoSummaryFormatters, buildOrthoAssessSteps } from "./OrthoOutpatientAssessment.jsx";
import { orthoIPDSummaryFormatters, buildOrthoIPDAssessSteps } from "./OrthoIPDAssessment.jsx";
import { orthoPostOpSummaryFormatters, buildOrthoPostOpAssessSteps } from "./OrthoPostOpAssessment.jsx";
import { sendHepWhatsApp, downloadHepPdf } from "./AppModules.jsx";
import { PostureSessionsView } from "./PatientDatabase.jsx";
import { injectViewerControls } from "./sharedClinicalData.js";

// The one patient profile screen in the app (2026-08-20, Aditi's request,
// originally Cardio/Neuro-only; the legacy Ortho-specific PatientProfileModal
// it lived alongside -- full of ROM/MMT/Special Tests/Kinetic Chain/Fascia
// sections -- was removed entirely on 2026-09-02, Aditi: "remove old ortho
// patient profile totally"). Lives only in Clinical, opened by the same
// "👤 Profile" button every patient already has.
//
// 2026-08-22: redesigned to a 5-tab Overview/Assessment/Progress/Treatment/
// Home structure (Aditi, "make it basic, clean, fast ... understand within
// 5-10 seconds"). Progress/Treatment/Home read the same generic,
// specialty-agnostic patient fields the Ortho profile already reads
// (tx_sessions, hep_programme, om_*) -- these aren't Ortho-namespaced, so a
// Cardio/Neuro patient with real sessions/exercises logged shows real data
// here too, honest empty states otherwise. Assessment tab also surfaces the
// new standalone Ortho Assessment tool (OrthoAssessmentNew.jsx) as a third
// card -- it doesn't persist to the patient record yet, so it's always
// offered as "start/continue", never claims saved data that doesn't exist.

const C = {
  bg: "#F8FAFC", white: "#FFFFFF", primary: "#6D28D9", primaryBg: "#EDE9FE",
  text: "#1e293b", muted: "#64748b", faint: "#94a3b8", border: "#e2e8f0",
  green: "#16a34a", greenBg: "#dcfce7", red: "#dc2626", orange: "#d97706",
};

// Elevated white "3D" section — soft layered shadow gives depth on a white
// page (2026-09-03, Aditi: "white 3d section", "good font"). Hairline border
// keeps edges crisp; the shadow does the lifting.
const CARD_SHADOW = "0 1px 2px rgba(16,24,40,0.04), 0 6px 16px rgba(16,24,40,0.06)";
function Card({ children, style }) {
  return (
    <div style={{ background: C.white, border: "1px solid #eef1f6", borderRadius: 18, padding: "18px 20px", marginBottom: 14, boxShadow: CARD_SHADOW, ...style }}>
      {children}
    </div>
  );
}

function CardTitle({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: C.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>{children}</div>
      {action}
    </div>
  );
}

function LinkBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ marginTop: 10, width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: "none", color: C.primary, fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "center" }}>
      {children}
    </button>
  );
}

function PrimaryBtn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", ...style }}>
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", ...style }}>
      {children}
    </button>
  );
}

function EmptyRow({ children }) {
  return <div style={{ textAlign: "center", padding: "18px 4px", color: C.faint, fontSize: 12.5 }}>{children}</div>;
}

// Compact inline pain-trend line chart -- mirrors the shape of the mockup
// (dots + value labels above each point), built directly from real
// tx_sessions rather than a shared chart component (none exists that takes
// this simple a shape).
function PainTrend({ sessions }) {
  const pts = sessions.slice(-6).map((s) => {
    const v = parseFloat(s.vasEnd ?? s.vasStart);
    return { v: isNaN(v) ? null : v, date: s.date || "" };
  }).filter((p) => p.v !== null);
  if (pts.length < 2) return null;
  const w = 320, h = 110, pad = 18;
  const max = 10;
  const stepX = (w - pad * 2) / (pts.length - 1);
  const coords = pts.map((p, i) => [pad + i * stepX, h - pad - (p.v / max) * (h - pad * 2)]);
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 110 }}>
      <path d={path} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="#fff" stroke={C.primary} strokeWidth="2.5" />
          <text x={x} y={y - 10} fontSize="11" fontWeight="800" fill={C.text} textAnchor="middle">{pts[i].v}</text>
          <text x={x} y={h - 2} fontSize="8.5" fill={C.faint} textAnchor="middle">{pts[i].date}</text>
        </g>
      ))}
    </svg>
  );
}

// Documents tab -- same storage shape (data.uploaded_docs, saved through
// onSaveField) as the Ortho PatientProfileModal's Docs tab in
// PatientDatabase.jsx, so a document uploaded from either profile shows up
// in both.
function DocumentsPanel({ patient, onSaveField }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const uploadedDocs = patient?.data?.uploaded_docs || [];
  const setUploadedDocs = (docs) => {
    if (typeof onSaveField === "function" && patient?.id) onSaveField(patient.id, { uploaded_docs: docs });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File too large. Maximum size is 5MB."); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newDoc = {
        id: Date.now().toString(),
        name: file.name,
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        size: file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(1) + " MB" : Math.round(file.size / 1024) + " KB",
        type: file.type,
        icon: file.type.includes("pdf") ? "📋" : file.type.includes("image") ? "🖼" : file.type.includes("video") ? "🎥" : "📄",
        dataUrl: ev.target.result,
        uploadedAt: new Date().toISOString(),
      };
      setUploadedDocs([newDoc, ...uploadedDocs]);
      setUploading(false);
    };
    reader.onerror = () => { setUploading(false); alert("Failed to read file."); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeleteDoc = (id) => setUploadedDocs(uploadedDocs.filter((d) => d.id !== id));
  const handleDownloadDoc = (doc) => { const a = document.createElement("a"); a.href = doc.dataUrl; a.download = doc.name; a.click(); };
  const handlePreviewDoc = (doc) => {
    const w = window.open();
    if (!w) return;
    const inner = doc.type.includes("image") ? `<img src="${doc.dataUrl}" style="max-width:100%;"/>` : `<iframe src="${doc.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`;
    w.document.write(injectViewerControls(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${doc.name || "Document"}</title><style>body{margin:0}</style></head><body>${inner}</body></html>`));
    w.document.close();
  };

  return (
    <>
      <input ref={fileInputRef} type="file" style={{ display: "none" }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.mp4" onChange={handleFileUpload} />
      <div onClick={() => fileInputRef.current?.click()} style={{ background: "#F5F3FF", border: `2px dashed ${C.primary}`, borderRadius: 16, padding: "28px 20px", textAlign: "center", marginBottom: 16, cursor: "pointer", opacity: uploading ? 0.6 : 1 }}>
        {uploading ? (
          <><div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div><div style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>Uploading…</div></>
        ) : (
          <><div style={{ fontSize: 36, marginBottom: 8 }}>📤</div><div style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>Upload Document</div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>PDF, Image, MRI, X-Ray — max 5MB</div></>
        )}
      </div>
      <Card>
        <CardTitle action={<div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{uploadedDocs.length} file{uploadedDocs.length !== 1 ? "s" : ""}</div>}>Documents</CardTitle>
        {uploadedDocs.length === 0 ? (
          <EmptyRow>No documents yet. Tap the upload zone above to add files.</EmptyRow>
        ) : (
          uploadedDocs.map((doc, i) => (
            <div key={doc.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: i > 0 ? `1px solid #f1f5f9` : "none" }}>
              <div onClick={() => handlePreviewDoc(doc)} style={{ width: 40, height: 40, borderRadius: 10, background: C.primaryBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, cursor: "pointer", overflow: "hidden" }}>
                {doc.type?.includes("image") ? <img src={doc.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{doc.icon}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => handlePreviewDoc(doc)}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{doc.date} · {doc.size}</div>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <button onClick={() => handleDownloadDoc(doc)} title="Download" style={{ width: 30, height: 30, borderRadius: 8, background: C.primaryBg, border: "none", cursor: "pointer", fontSize: 13 }}>⬇</button>
                <button onClick={() => handleDeleteDoc(doc.id)} title="Delete" style={{ width: 30, height: 30, borderRadius: 8, background: "#FEF2F2", border: "none", cursor: "pointer", fontSize: 13 }}>🗑</button>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

const hepDose = (e) => {
  const st = e.customSets || e.sets, rp = e.customReps || e.reps, hd = e.customHold || e.hold, fq = e.customFreq || e.freq;
  return `${st}×${rp}${hd ? ` · hold ${hd}s` : ""}${fq ? ` · ${fq}` : ""}`;
};

// The Neuro Care Plan (Problems/Goals/Treatment/Plan/Sessions/Progress) is
// the exact same editable component used inside the assessment wizard, mounted
// here in the profile so it can be viewed and edited with room to breathe
// (2026-09-03, Aditi: "it should also show in the treatment section of the
// patient profile ... we can edit also"). One data store: edits here and in
// the assessment both write patient.data.neuro.neuroCarePlan, so they stay in
// sync. `setData` computes the next neuro object from a ref (no side-effect in
// a setState updater) and persists via the profile's onSaveField.
function NeuroCarePlanPanel({ patient, onSaveField, initialPhase }) {
  const [neuro, setNeuro] = useState(patient?.data?.neuro || {});
  const neuroRef = useRef(neuro);
  neuroRef.current = neuro;
  const pid = patient?.id;
  useEffect(() => {
    const next = patient?.data?.neuro || {};
    neuroRef.current = next;
    setNeuro(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);
  const setData = (updater) => {
    const next = typeof updater === "function" ? updater(neuroRef.current) : updater;
    neuroRef.current = next;
    setNeuro(next);
    onSaveField?.(patient.id, { neuro: next });
  };
  return (
    <>
      <style>{orthoStyles()}</style>
      <NeuroCarePlanSection data={neuro} setData={setData} initialPhase={initialPhase} floatingCTA />
    </>
  );
}

// Compact snapshot for the Overview tab: counts + average goal progress.
function carePlanCounts(cp) {
  cp = cp || {};
  const problems = Array.isArray(cp.problems) ? cp.problems : [];
  const goals = Array.isArray(cp.goals) ? cp.goals : [];
  const treatments = Array.isArray(cp.treatments) ? cp.treatments : [];
  const sessions = Array.isArray(cp.sessions) ? cp.sessions : [];
  const pcts = goals
    .map((gl) => {
      const entries = sessions.map((s) => ({ value: parseFloat(s.measures?.[gl.id]) })).filter((e) => Number.isFinite(e.value));
      return goalProgress(gl, entries).pct;
    })
    .filter((p) => p != null);
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  return {
    problems: problems.length, goals: goals.length, treatments: treatments.length,
    sessions: sessions.length, avgProgress: avg,
    any: problems.length || goals.length || treatments.length || sessions.length,
  };
}
const neuroCarePlanSnapshot = (neuro) => carePlanCounts(neuro?.neuroCarePlan);
const orthoCarePlanSnapshot = (pd) => carePlanCounts(pd?.ortho_care_plan);

// Ortho Care Plan — same shared CarePlanSection, fed the ortho knowledge
// built from the assessment context (setting/condition/regions) parsed from
// the ortho snapshot. Stored at patient.data.ortho_care_plan (ortho has no
// live nested object like neuro), persisted via onSaveField. One store:
// editable here and, once wired, in the ortho assessment.
const orthoRegionLabel = (r) => [r.side, r.label || r.name || String(r.id || "").replace(/[_/-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())].filter(Boolean).join(" ");
function OrthoCarePlanPanel({ patient, onSaveField, orthoPathway, orthoParsed, initialPhase }) {
  const pid = patient?.id;
  const pd = patient?.data || {};
  const setting = orthoPathway || null;
  const condition = orthoParsed?.rawCondition || null;
  const regions = (orthoParsed?.selectedRegions || []).map((r) => ({ id: r.id, side: r.side, label: orthoRegionLabel(r) }));
  const pain = { now: pd.cc_vas_now, worst: pd.cc_vas_worst };
  const ctxKey = JSON.stringify({ setting, condition, regions, pain });
  const knowledge = useMemo(() => buildOrthoKnowledge({ setting, condition, regions, pain }), [ctxKey]);
  const meta = { setting, condition, regions };

  const [cp, setCp] = useState(pd.ortho_care_plan || {});
  const cpRef = useRef(cp);
  cpRef.current = cp;
  useEffect(() => { const next = patient?.data?.ortho_care_plan || {}; cpRef.current = next; setCp(next); /* eslint-disable-next-line */ }, [pid]);

  const data = { meta, pain, orthoCarePlan: cp };
  const setData = (updater) => {
    const prev = { meta, pain, orthoCarePlan: cpRef.current };
    const next = typeof updater === "function" ? updater(prev) : updater;
    cpRef.current = next.orthoCarePlan;
    setCp(next.orthoCarePlan);
    onSaveField?.(pid, { ortho_care_plan: next.orthoCarePlan });
  };
  return (
    <>
      <style>{orthoStyles()}</style>
      <CarePlanSection data={data} setData={setData} knowledge={knowledge} sectionKey="orthoCarePlan" initialPhase={initialPhase} floatingCTA />
    </>
  );
}

export default function SpecialtyPatientProfile({ patient, onNav, onBack, onSaveField, onOpenPosture, initialTab }) {
  // initialTab (2026-09-02): lets a caller open straight onto a specific
  // tab (e.g. the Treatment caseload list's own "Profile" button used to
  // jump straight to Treatment via the now-removed legacy
  // PatientProfileModal's initialTab) instead of always landing on
  // Overview.
  const [tab, setTab] = useState(initialTab || "overview");
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [expandedSession, setExpandedSession] = useState(0);
  const [editingDiagnosis, setEditingDiagnosis] = useState(false);
  const [diagnosisDraft, setDiagnosisDraft] = useState("");
  const d = patient?.data || {};
  const hasCardio = d.cardio && Object.keys(d.cardio).length > 0;
  const hasNeuro = d.neuro && Object.keys(d.neuro).length > 0;
  const cardioDem = d.cardio?.demographics || {};
  const neuroDem = d.neuro?.demographics || {};
  const activeDem = cardioDem.diagnosis ? cardioDem : neuroDem;
  // cc_dx is the same specialty-agnostic diagnosis field the Ortho
  // PatientProfileModal already falls back to (PatientDatabase.jsx) --
  // editing it here (rather than each specialty's own nested demographics
  // field) means one edit works regardless of which specialty's assessment
  // this patient has, or none yet.
  const primaryDiagnosis = d.cc_dx || cardioDem.diagnosis || neuroDem.diagnosis || "No diagnosis recorded yet";

  // Ortho (2026-09-01, Aditi: "ortho patient profile should be same as
  // cardio/neuro, don't build a separate one") -- IPD/Post-op/Outpatient
  // each save their own JSON-stringified snapshot (see saveAssessment in
  // OrthoIPDAssessment.jsx / OrthoPostOpAssessment.jsx /
  // OrthoOutpatientAssessment.jsx), unlike Cardio/Neuro's real nested
  // object, so this parses whichever one exists. Body chart data lives
  // inside the parsed snapshot's own Pain section (data.pain.body_chart_pro)
  // and is folded into that section's rows automatically by each pathway's
  // formatPainSection -- no separate widget needed, same as it already
  // works inside each wizard's own Final Review screen.
  const orthoPathway = d.ortho_ipd_assessment ? "ipd" : d.ortho_postop_assessment ? "postop" : d.ortho_outpatient_assessment ? "outpatient" : null;
  const orthoParsed = (() => {
    try {
      const raw = orthoPathway === "ipd" ? d.ortho_ipd_assessment : orthoPathway === "postop" ? d.ortho_postop_assessment : orthoPathway === "outpatient" ? d.ortho_outpatient_assessment : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  // 2026-09-02, Aditi: "edit assessment... should take us to last page of
  // assessment summary and review, not to pathway selection or region
  // selection" -- orthoParsed.selectedRegions/rawCondition/customConditionLabel
  // are the raw (non-display-formatted) fields the wizard's own save now
  // persists (see OrthoOutpatient/IPD/PostOpAssessment.jsx's saveAssessment);
  // an assessment saved before that fix won't have them, so this falls back
  // to condition:"general"/no regions rather than refusing to resume at
  // all -- Review still opens with every real saved answer intact, just
  // without region-specific promotion for that one older record.
  const orthoResume = orthoPathway && orthoParsed ? {
    pathway: orthoPathway,
    selectedRegions: orthoParsed.selectedRegions || [],
    condition: orthoParsed.rawCondition || "general",
    customConditionLabel: orthoParsed.customConditionLabel,
    data: orthoParsed.data || {},
  } : null;
  const orthoSteps = orthoPathway === "ipd" ? buildOrthoIPDAssessSteps() : orthoPathway === "postop" ? buildOrthoPostOpAssessSteps() : orthoPathway === "outpatient" ? buildOrthoAssessSteps() : null;
  const orthoFormatters = orthoPathway === "ipd" ? orthoIPDSummaryFormatters : orthoPathway === "postop" ? orthoPostOpSummaryFormatters : orthoPathway === "outpatient" ? orthoSummaryFormatters : null;
  const orthoTitle = orthoPathway === "ipd" ? "IPD Orthopedic Assessment" : orthoPathway === "postop" ? "Post-operative Rehab Assessment" : "Outpatient Musculoskeletal Assessment";
  const hasOrtho = !!(orthoParsed && orthoSteps);
  const name = d.dem_name || patient?.name || "";
  const initials = (name || "?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  // Same generic, specialty-agnostic fields the Ortho PatientProfileModal
  // reads -- not Ortho-namespaced, so real when present regardless of specialty.
  const sessions = Array.isArray(d.tx_sessions) ? d.tx_sessions : [];
  const sessionsDesc = sessions.slice().reverse(); // newest first, matches tx_sessions convention used elsewhere
  const plannedSessions = parseInt(d.tx_plan_sessions || d.plan_sessions || "0") || 0;
  const sessPct = plannedSessions > 0 ? Math.min(100, Math.round((sessions.length / plannedSessions) * 100)) : 0;
  const lastSession = sessionsDesc[0];
  const hep = Array.isArray(d.hep_programme) ? d.hep_programme : [];
  const nrsNow = parseFloat(d.cc_vas_now || "0");
  const nrsWorst = parseFloat(d.cc_vas_worst || "0");
  const goalsText = d.goal_main || d.sub_goals || d.soap_goals || "";
  const goalsList = Array.isArray(goalsText) ? goalsText : String(goalsText).split(/\n|;/).map((g) => g.trim()).filter(Boolean);

  const TABS = [
    { k: "overview", label: "Overview" },
    { k: "assessment", label: "Assessment" },
    { k: "progress", label: "Progress" },
    { k: "treatment", label: "Treatment" },
    { k: "home", label: "Home" },
    { k: "documents", label: "Docs" },
    { k: "posture", label: "Posture" },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 40px", background: C.white, minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", WebkitFontSmoothing: "antialiased", color: C.text, letterSpacing: "-0.01em" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "1px solid #eef1f6", background: "#fff", borderRadius: 12, width: 38, height: 38, fontSize: 16, cursor: "pointer", flexShrink: 0, boxShadow: CARD_SHADOW }}>←</button>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0, boxShadow: "0 4px 12px rgba(109,40,217,0.28)" }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>{name || "Patient"}</div>
          <div style={{ fontSize: 12, color: C.faint }}>
            {[(d.dem_age || cardioDem.age) && `${d.dem_age || cardioDem.age} yrs`, (d.dem_sex || d.dem_gender)].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      {/* Tabs — elevated white pill for the active tab, clean on white */}
      <style>{`.cp-scroll-x::-webkit-scrollbar{display:none}`}</style>
      <div className="cp-scroll-x" style={{ display: "flex", gap: 8, padding: "2px 2px 12px", marginBottom: 12, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", borderBottom: "1px solid #f1f5f9" }}>
        {TABS.map((t) => {
          const on = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              flex: "1 0 auto", padding: "9px 14px", borderRadius: 11, cursor: "pointer",
              border: on ? "1px solid #ece7fb" : "1px solid transparent",
              background: on ? C.white : "transparent", color: on ? C.primary : C.muted,
              fontWeight: on ? 800 : 600, fontSize: 12.5, whiteSpace: "nowrap",
              boxShadow: on ? "0 1px 2px rgba(16,24,40,0.05), 0 4px 10px rgba(109,40,217,0.10)" : "none",
              transition: "all .15s ease",
            }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === "overview" && (
        <>
          <Card>
            <CardTitle>Patient Information</CardTitle>
            {[
              ["Age", d.dem_age || cardioDem.age || neuroDem.age],
              ["Gender", d.dem_sex || d.dem_gender],
              ["Phone", d.dem_phone],
              ["Date of birth", d.dem_dob],
            ].filter(([, v]) => v).slice(0, showFullProfile ? 4 : 3).map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: `1px solid #f1f5f9`, fontSize: 13.5 }}>
                <span style={{ color: C.muted }}>{label}</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            <LinkBtn onClick={() => setShowFullProfile((v) => !v)}>{showFullProfile ? "▲ Show less" : "View full profile →"}</LinkBtn>
          </Card>

          <Card>
            <CardTitle>Current Clinical Status</CardTitle>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: `1px solid #f1f5f9`, fontSize: 13.5, gap: 8 }}>
              <span style={{ color: C.muted, flexShrink: 0 }}>Condition</span>
              {editingDiagnosis ? (
                <div style={{ display: "flex", gap: 6, flex: 1, justifyContent: "flex-end" }}>
                  <input
                    autoFocus
                    value={diagnosisDraft}
                    onChange={(e) => setDiagnosisDraft(e.target.value)}
                    placeholder="e.g. Post-op TKR, right knee"
                    style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: 8, border: `1px solid ${C.primary}`, fontSize: 13, color: C.text }}
                  />
                  <button
                    onClick={() => { onSaveField?.(patient.id, { cc_dx: diagnosisDraft.trim() }); setEditingDiagnosis(false); }}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span style={{ color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{primaryDiagnosis}</span>
                  <button
                    onClick={() => { setDiagnosisDraft(d.cc_dx || ""); setEditingDiagnosis(true); }}
                    aria-label="Edit condition"
                    style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    ✏️
                  </button>
                </span>
              )}
            </div>
            {[
              ["Status", sessions.length > 0 ? "Ongoing treatment" : (hasCardio || hasNeuro) ? "Assessment recorded" : "New patient"],
              ["First visit", activeDem.onsetDate || sessionsDesc[sessionsDesc.length - 1]?.date],
              ["Current session", plannedSessions > 0 ? `${sessions.length} / ${plannedSessions}` : sessions.length > 0 ? `${sessions.length}` : null],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: `1px solid #f1f5f9`, fontSize: 13.5 }}>
                <span style={{ color: C.muted }}>{label}</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </Card>

          <Card>
            <CardTitle>Latest Assessment</CardTitle>
            {!hasCardio && !hasNeuro ? (
              <EmptyRow>No assessment recorded yet.</EmptyRow>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {hasCardio && <span style={{ padding: "4px 12px", borderRadius: 20, background: "#fee2e2", color: "#dc2626", fontSize: 12, fontWeight: 700 }}>🫀 Cardiopulmonary</span>}
                {hasNeuro && <span style={{ padding: "4px 12px", borderRadius: 20, background: "#ede9fe", color: "#7c3aed", fontSize: 12, fontWeight: 700 }}>🧠 Neurological</span>}
              </div>
            )}
            {(hasCardio || hasNeuro) && <LinkBtn onClick={() => setTab("assessment")}>View assessment →</LinkBtn>}
          </Card>

          {/* Care Plan snapshot (neuro or ortho) — glanceable status, links
              into the Treatment tab where it's fully editable. */}
          {(hasNeuro || hasOrtho) && (() => {
            const snap = hasNeuro ? neuroCarePlanSnapshot(d.neuro) : orthoCarePlanSnapshot(d);
            return (
              <Card>
                <CardTitle>Care Plan</CardTitle>
                {!snap.any ? (
                  <EmptyRow>No problems or goals set yet.</EmptyRow>
                ) : (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                      {[["Problems", snap.problems], ["Goals", snap.goals], ["Treatments", snap.treatments], ["Sessions", snap.sessions]].map(([l, v]) => (
                        <div key={l} style={{ flex: "1 0 auto", minWidth: 64, textAlign: "center", background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 6px" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "#7c3aed" }}>{v}</div>
                          <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {snap.avgProgress != null && (
                      <div style={{ fontSize: 13, color: C.text, marginTop: 6 }}>
                        Average goal progress: <b style={{ color: "#7c3aed" }}>{snap.avgProgress}%</b>
                      </div>
                    )}
                  </>
                )}
                <LinkBtn onClick={() => setTab("treatment")}>Open Care Plan →</LinkBtn>
              </Card>
            );
          })()}

          {!hasNeuro && !hasOrtho && (
            <Card>
              <CardTitle>Current Treatment</CardTitle>
              {sessions.length === 0 ? (
                <EmptyRow>No sessions logged yet.</EmptyRow>
              ) : (
                <>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>Session {sessions.length}{plannedSessions > 0 ? ` / ${plannedSessions}` : ""}</div>
                  {lastSession?.treatmentGiven && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>{lastSession.treatmentGiven}</div>}
                </>
              )}
              <LinkBtn onClick={() => setTab("treatment")}>Continue treatment →</LinkBtn>
            </Card>
          )}

          <Card>
            <CardTitle>Home Program</CardTitle>
            {hep.length === 0 ? <EmptyRow>No exercises assigned yet.</EmptyRow> : (
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{hep.length} exercise{hep.length !== 1 ? "s" : ""} assigned</div>
            )}
            <LinkBtn onClick={() => setTab("home")}>View home program →</LinkBtn>
          </Card>
        </>
      )}

      {/* ═══ ASSESSMENT ═══
          Show the patient's OWN recorded assessment(s) first; the "add
          another specialty" buttons live in one compact card at the
          bottom, so a Neuro patient no longer sees an empty Cardio "Open"
          button above their real assessment (2026-09-03, Aditi: "why
          cardio assessment adding button is above?"). */}
      {tab === "assessment" && (
        <>
          {hasCardio && <CardioSummaryStyles />}
          {hasNeuro && <NeuroSummaryStyles />}
          {hasOrtho && <style>{orthoStyles()}</style>}

          {!hasCardio && !hasNeuro && !hasOrtho && (
            <Card><EmptyRow>No assessment recorded yet — add one below.</EmptyRow></Card>
          )}

          {hasNeuro && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>🧠</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: "#7c3aed", flex: 1 }}>Neurological Assessment</span>
                <GhostBtn onClick={() => onNav?.("neuro_assessment")} style={{ padding: "6px 12px", fontSize: 12 }}>✏️ Edit</GhostBtn>
              </div>
              <NeuroSummarySection setting={d.neuro.meta?.setting} data={d.neuro} assessSteps={buildNeuroAssessSteps(d.neuro.meta?.stepOrder, d.neuro.meta?.customStepsMeta)} formatters={neuroSummaryFormatters} />
            </Card>
          )}

          {hasCardio && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>🫀</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: "#dc2626", flex: 1 }}>Cardiopulmonary Assessment</span>
                <GhostBtn onClick={() => onNav?.("cardio_assessment")} style={{ padding: "6px 12px", fontSize: 12 }}>✏️ Edit</GhostBtn>
              </div>
              <CardioSummarySection setting={d.cardio.meta?.setting} system={d.cardio.meta?.system} data={d.cardio} assessSteps={buildCardioAssessSteps(d.cardio.meta?.stepOrder, d.cardio.meta?.customStepsMeta)} />
            </Card>
          )}

          {hasOrtho && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 24 }}>🦴</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: "#0369a1", flex: 1 }}>{orthoTitle}</span>
                <GhostBtn onClick={() => onNav?.("ortho_new_assessment", { resume: orthoResume })} style={{ padding: "6px 12px", fontSize: 12 }}>✏️ Edit</GhostBtn>
              </div>
              <OrthoAssessmentSummary
                icon="🦴"
                title={orthoTitle}
                sub={[orthoParsed.regions, orthoParsed.condition].filter(Boolean).join(" · ")}
                steps={orthoSteps}
                data={orthoParsed.data || {}}
                onEdit={() => onNav?.("ortho_new_assessment", { resume: orthoResume })}
                exportHeaderLines={[orthoTitle.toUpperCase()]}
                formatters={orthoFormatters}
              />
            </Card>
          )}

          {(!hasCardio || !hasNeuro || !hasOrtho) && (
            <Card>
              <CardTitle>{hasCardio || hasNeuro || hasOrtho ? "Add another assessment" : "Start an assessment"}</CardTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {!hasNeuro && <GhostBtn onClick={() => onNav?.("neuro_assessment")} style={{ width: "100%", textAlign: "left" }}>🧠 &nbsp;Neurological Assessment</GhostBtn>}
                {!hasCardio && <GhostBtn onClick={() => onNav?.("cardio_assessment")} style={{ width: "100%", textAlign: "left" }}>🫀 &nbsp;Cardiopulmonary Assessment</GhostBtn>}
                {!hasOrtho && <GhostBtn onClick={() => onNav?.("ortho_new_assessment")} style={{ width: "100%", textAlign: "left" }}>🦴 &nbsp;Ortho Assessment</GhostBtn>}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ═══ PROGRESS ═══ */}
      {tab === "progress" && hasNeuro && (
        <NeuroCarePlanPanel key="cp-progress" patient={patient} onSaveField={onSaveField} initialPhase="progress" />
      )}
      {tab === "progress" && !hasNeuro && hasOrtho && (
        <OrthoCarePlanPanel key="ocp-progress" patient={patient} onSaveField={onSaveField} orthoPathway={orthoPathway} orthoParsed={orthoParsed} initialPhase="progress" />
      )}
      {tab === "progress" && !hasNeuro && !hasOrtho && (
        <>
          <Card>
            <CardTitle>Pain Progress (NPRS)</CardTitle>
            {sessions.length < 2 ? (
              <EmptyRow>Not enough sessions yet to show a trend.</EmptyRow>
            ) : <PainTrend sessions={sessions} />}
          </Card>

          {(nrsWorst > 0 || d.om_odi_score || d.om_dash_score || d.om_psfs1_now) && (
            <Card>
              <CardTitle>Other Progress</CardTitle>
              {[
                nrsWorst > 0 && ["Pain (NRS)", `${nrsWorst}/10 → ${nrsNow}/10`],
                (d.om_odi_score || d.om_odi_initial) && ["ODI Score", `${d.om_odi_initial || "—"} → ${d.om_odi_score || "—"}`],
                (d.om_dash_score || d.om_dash_initial) && ["DASH Score", `${d.om_dash_initial || "—"} → ${d.om_dash_score || "—"}`],
                (d.om_psfs1_now && d.om_psfs1_initial) && ["PSFS", `${d.om_psfs1_initial}/10 → ${d.om_psfs1_now}/10`],
              ].filter(Boolean).map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: `1px solid #f1f5f9`, fontSize: 13.5 }}>
                  <span style={{ color: C.muted }}>{label}</span>
                  <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </Card>
          )}

          {goalsList.length > 0 && (
            <Card>
              <CardTitle>Goals</CardTitle>
              {goalsList.map((g, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, color: C.text }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.primary, flexShrink: 0 }} />
                  {g}
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {/* ═══ TREATMENT ═══ */}
      {tab === "treatment" && hasNeuro && (
        <NeuroCarePlanPanel key="cp-treatment" patient={patient} onSaveField={onSaveField} />
      )}
      {tab === "treatment" && !hasNeuro && hasOrtho && (
        <OrthoCarePlanPanel key="ocp-treatment" patient={patient} onSaveField={onSaveField} orthoPathway={orthoPathway} orthoParsed={orthoParsed} />
      )}
      {tab === "treatment" && !hasNeuro && !hasOrtho && (
        <>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Session Progress</div>
              {plannedSessions > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>{sessions.length} / {plannedSessions} completed</div>}
            </div>
            {plannedSessions > 0 && (
              <div style={{ height: 8, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${sessPct}%`, background: C.primary, borderRadius: 99 }} />
              </div>
            )}
          </Card>

          {sessions.length === 0 && <Card><EmptyRow>No sessions logged yet.</EmptyRow></Card>}

          {sessionsDesc.map((s, i) => {
            const isOpen = expandedSession === i;
            const techniques = String(s.treatmentGiven || "").split(/,|·/).map((t) => t.trim()).filter(Boolean);
            return (
              <Card key={s.id || i}>
                <div onClick={() => setExpandedSession(isOpen ? -1 : i)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>Session {s.sessionNo || sessions.length - i} · {s.date || ""}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {s.vasStart && <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{s.vasStart} → {s.vasEnd || s.vasStart} /10</span>}
                    <span style={{ color: C.faint, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    {techniques.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 800, color: C.faint, marginBottom: 4 }}>TECHNIQUES</div>
                        <div style={{ fontSize: 13, color: C.text, marginBottom: 10 }}>{techniques.join(", ")}</div>
                      </>
                    )}
                    {s.response && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 800, color: C.faint, marginBottom: 4 }}>RESPONSE</div>
                        <div style={{ fontSize: 13, color: C.text }}>{s.response}</div>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          <GhostBtn onClick={() => onNav?.("tx_sessions")} style={{ width: "100%", marginTop: 4 }}>+ Add New Session</GhostBtn>
        </>
      )}

      {/* ═══ HOME ═══ */}
      {tab === "home" && (
        <>
          <Card>
            <CardTitle>Current Home Program</CardTitle>
            {hep.length === 0 ? <EmptyRow>No exercises assigned yet.</EmptyRow> : hep.map((e, i) => (
              <div key={e.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i > 0 ? `1px solid #f1f5f9` : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{i + 1}. {e.name}</div>
                <div style={{ fontSize: 12, color: C.muted, flexShrink: 0, marginLeft: 8 }}>{hepDose(e)}</div>
              </div>
            ))}
          </Card>

          {hep.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <GhostBtn onClick={() => onNav?.("treatment")} style={{ flex: 1 }}>Edit Program</GhostBtn>
              <PrimaryBtn onClick={() => sendHepWhatsApp(d)} style={{ flex: 1 }}>Send to Patient</PrimaryBtn>
            </div>
          )}
          {hep.length > 0 && (
            <LinkBtn onClick={() => downloadHepPdf(d)}>📄 Download as PDF</LinkBtn>
          )}
        </>
      )}

      {/* ═══ DOCUMENTS ═══ (2026-09-01, Aditi: upload patient files here,
          same storage as the Ortho profile's Docs tab so records line up
          across specialties) */}
      {tab === "documents" && <DocumentsPanel patient={patient} onSaveField={onSaveField} />}

      {/* ═══ POSTURE ═══ (2026-09-01, Aditi: posture analysis results should
          land in the patient profile like they already do for Ortho) */}
      {tab === "posture" && (
        <PostureSessionsView d={d} C={C} onNav={() => onOpenPosture?.(patient)} />
      )}
    </div>
  );
}
