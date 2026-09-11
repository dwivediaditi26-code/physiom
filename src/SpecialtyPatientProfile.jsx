import React, { useState, useRef, useEffect, useMemo } from "react";
import { NeuroCarePlanSection, CarePlanSection, doseLine } from "./NeuroCarePlan.jsx";
import { goalProgress } from "./neuroClinicalKnowledge.js";
import { buildOrthoKnowledge } from "./orthoClinicalKnowledge.js";
import { SummarySection as CardioSummarySection, SummaryStyles as CardioSummaryStyles, buildCardioAssessSteps, cardioAssessmentSubtitle } from "./CardiopulmonaryAssessment.jsx";
import { SummarySection as NeuroSummarySection, SummaryStyles as NeuroSummaryStyles, buildNeuroAssessSteps, neuroSummaryFormatters, neuroAssessmentSubtitle } from "./NeurologicalAssessment.jsx";
import { AssessmentSummary as OrthoAssessmentSummary } from "./orthoSummary.jsx";
import { orthoStyles } from "./orthoStyles.js";
import { orthoSummaryFormatters, buildOrthoAssessSteps } from "./OrthoOutpatientAssessment.jsx";
import { orthoIPDSummaryFormatters, buildOrthoIPDAssessSteps } from "./OrthoIPDAssessment.jsx";
import { orthoPostOpSummaryFormatters, buildOrthoPostOpAssessSteps } from "./OrthoPostOpAssessment.jsx";
import { sendHepWhatsApp, downloadHepPdf } from "./AppModules.jsx";
import { formatExercisePrescriptionSection } from "./orthoExercisePrescription.jsx";
import { formatNeuroExercisePrescriptionSection } from "./neuroExercisePrescription.jsx";
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
// NeuroCarePlanSection persists via useSectionData(data, setData,
// "neuroCarePlan") -- and the assessment wizard saves its whole local data
// object as patient.data.neuro (onSave("neuro", data)), same object
// NeuroCarePlanPanel above reads/writes -- so the real path is
// patient.data.neuro.neuroCarePlan, not a top-level key.
const neuroCarePlanSnapshot = (pd) => carePlanCounts(pd?.neuro?.neuroCarePlan);
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

const planUid = () => Math.random().toString(36).slice(2, 9);
const fmtPlanDate = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

// Read-only Problem List / Goals / Treatment Plan cards -- the "documented
// page" itself. Shared by the current (active) plan and by any closed plan
// pulled out of Care History, so both look identical.
// Small round number badge for Problem List rows -- replaces plain "1."
// text with something that reads as a list at a glance.
function NumBadge({ n, style }) {
  return (
    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: C.primaryBg, color: C.primary, fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", ...style }}>{n}</span>
  );
}

// Thin progress bar for a goal's baseline->target measure, reusing the same
// goalProgress() pct the Overview snapshot's "Average goal progress" is
// built from -- so a goal with real session measures shows real progress
// here instead of just a static checkbox.
function GoalProgressBar({ pct }) {
  if (pct == null) return null;
  return (
    <div style={{ height: 5, borderRadius: 99, background: C.border, marginTop: 6, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: pct >= 100 ? C.green : C.primary, transition: "width 0.3s" }} />
    </div>
  );
}

// Treatment Plan is the "what are we actually doing for this patient"
// section -- the one a clinician glancing at the profile cares about most
// (2026-09-10, Aditi: "treatment plan is the main thing it should show
// very attractively and what we are doing"). Given its own visually
// distinct card (tinted header band, icon chips per treatment, real dose
// info via doseLine) instead of the same plain bullet-list styling as
// Problem List/Goals.
function TreatmentPlanCard({ treatments, goals }) {
  const goalLabel = (id) => goals.find((g) => g.id === id)?.measure;
  return (
    <Card style={{ padding: 0, overflow: "hidden", border: `1.5px solid ${C.primary}22` }}>
      <div style={{ background: `linear-gradient(135deg, ${C.primary}, #8b5cf6)`, padding: "16px 20px", color: "#fff" }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.85 }}>Treatment Plan</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>What we're doing now</div>
      </div>
      <div style={{ padding: "14px 20px 18px" }}>
        {treatments.map((t, i) => {
          const dose = doseLine(t);
          const linkedGoals = (t.goalIds || []).map(goalLabel).filter(Boolean);
          return (
            <div key={t.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
              <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: C.primaryBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{t.type ? "🩹" : "💪"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.name}</div>
                {dose && <div style={{ fontSize: 12, color: C.primary, fontWeight: 600, marginTop: 2 }}>{dose}</div>}
                {linkedGoals.length > 0 && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>For: {linkedGoals.join(", ")}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PlanDocument({ problems, goals, treatments, sessions, exerciseRows }) {
  return (
    <>
      {problems.length > 0 && (
        <Card>
          <CardTitle>Problem List</CardTitle>
          {problems.map((p, i) => (
            <div key={p.id} style={{ display: "flex", gap: 10, padding: "9px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
              <NumBadge n={i + 1} style={{ marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{p.name}</div>
                {Array.isArray(p.findings) && p.findings.length > 0 && (
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                    {p.findings.map((f) => `${f.label}: ${f.value}`).join(" · ")}
                  </div>
                )}
                {p.outcome && (
                  <div style={{ display: "inline-block", marginTop: 4, fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 99, color: p.outcome === "Resolved" ? "#047857" : p.outcome === "Worse" ? C.red : C.primary, background: p.outcome === "Resolved" ? C.greenBg : p.outcome === "Worse" ? "#fee2e2" : C.primaryBg }}>{p.outcome}</div>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {goals.length > 0 && (
        <Card>
          <CardTitle>Goals</CardTitle>
          {["short", "long"].map((term) => {
            const list = goals.filter((g) => g.term === term);
            if (!list.length) return null;
            return (
              <div key={term} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.faint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{term === "short" ? "Short term" : "Long term"}</div>
                {list.map((g) => {
                  const entries = sessions.map((s) => ({ value: parseFloat(s.measures?.[g.id]) })).filter((e) => Number.isFinite(e.value));
                  const prog = goalProgress(g, entries);
                  const achieved = g.outcome === "Achieved" || (!g.outcome && prog.achieved);
                  return (
                    <div key={g.id} style={{ padding: "8px 0" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13.5, color: C.text }}>
                        <span style={{ color: achieved ? C.green : C.faint, fontSize: 15 }}>{achieved ? "✓" : "○"}</span>
                        <span style={{ fontWeight: 700 }}>{g.measure}</span>
                        <span style={{ color: C.muted }}>{g.baseline} → {g.target}</span>
                        <span style={{ color: C.faint, fontSize: 11.5, marginLeft: "auto" }}>{g.weeks}w</span>
                      </div>
                      {g.outcome ? (
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, marginLeft: 21 }}>{g.outcome}</div>
                      ) : (
                        <div style={{ marginLeft: 21 }}><GoalProgressBar pct={prog.pct} /></div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Card>
      )}

      {treatments.length > 0 && <TreatmentPlanCard treatments={treatments} goals={goals} />}

      {/* Exercises prescribed via the assessment's own Exercise Prescription
          step (a separate, region-browsable library picker with its own
          sets/reps/hold/frequency dosing) never showed up here -- only the
          Care Plan's own goal-linked "treatments" did (2026-09-09, Aditi:
          "add exercise of ortho in treatment tab as there is [a] separate
          exercise section"). Read-only listing, same {label,value} rows the
          assessment's own Review screen already uses. */}
      {exerciseRows && exerciseRows.length > 0 && (
        <Card>
          <CardTitle>Prescribed Exercises</CardTitle>
          {exerciseRows.map((r, i) => (
            <div key={i} style={{ padding: "5px 0", fontSize: 13, color: C.text }}>
              🏋 {r.label} <span style={{ color: C.muted, fontSize: 11.5 }}>— {r.value}</span>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

// Close the current plan & reassess (2026-09-09, Aditi's spec: never edit
// the old plan into the new one -- close it, snapshot it into history
// forever, and start a fresh plan pre-filled with whatever's carried
// forward). One screen: mark what happened to each problem/goal, choose
// what carries forward, name the new plan, confirm.
function ReassessModal({ cp, planLabel, onClose, onConfirm }) {
  const problems = Array.isArray(cp.problems) ? cp.problems : [];
  const goals = Array.isArray(cp.goals) ? cp.goals : [];
  const treatments = Array.isArray(cp.treatments) ? cp.treatments : [];
  const [problemStatus, setProblemStatus] = useState(() => Object.fromEntries(problems.map((p) => [p.id, "Improved"])));
  const [carryProblem, setCarryProblem] = useState(() => Object.fromEntries(problems.map((p) => [p.id, true])));
  const [goalStatus, setGoalStatus] = useState(() => Object.fromEntries(goals.map((g) => [g.id, "Partially achieved"])));
  const [carryGoal, setCarryGoal] = useState(() => Object.fromEntries(goals.map((g) => [g.id, true])));
  const [carryTx, setCarryTx] = useState(() => Object.fromEntries(treatments.map((t) => [t.id, true])));
  const [newLabel, setNewLabel] = useState("");

  const PROBLEM_STATUSES = ["Resolved", "Improved", "Ongoing", "Worse"];
  const GOAL_STATUSES = ["Achieved", "Partially achieved", "Not achieved"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 4000, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.bg, width: "100%", maxHeight: "92vh", overflowY: "auto", borderRadius: "18px 18px 0 0", padding: "18px 16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Close Plan & Reassess</div>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}>{planLabel} will be closed and kept in Care History exactly as it stands. Choose what carries into the next plan.</div>

        {problems.length > 0 && (
          <Card>
            <CardTitle>What happened to each problem?</CardTitle>
            {problems.map((p, i) => (
              <div key={p.id} style={{ padding: "10px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>{p.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {PROBLEM_STATUSES.map((s) => (
                    <button key={s} type="button" onClick={() => {
                      setProblemStatus((m) => ({ ...m, [p.id]: s }));
                      if (s === "Resolved") setCarryProblem((m) => ({ ...m, [p.id]: false }));
                    }}
                      style={{ padding: "5px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${problemStatus[p.id] === s ? C.primary : C.border}`, background: problemStatus[p.id] === s ? C.primaryBg : "#fff", color: problemStatus[p.id] === s ? C.primary : C.text }}>
                      {s}
                    </button>
                  ))}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.text, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!carryProblem[p.id]} onChange={(e) => setCarryProblem((m) => ({ ...m, [p.id]: e.target.checked }))} />
                  Carry forward into the new plan
                </label>
              </div>
            ))}
          </Card>
        )}

        {goals.length > 0 && (
          <Card>
            <CardTitle>Goals</CardTitle>
            {goals.map((g, i) => (
              <div key={g.id} style={{ padding: "10px 0", borderTop: i ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>{g.measure}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {GOAL_STATUSES.map((s) => (
                    <button key={s} type="button" onClick={() => {
                      setGoalStatus((m) => ({ ...m, [g.id]: s }));
                      if (s === "Achieved") setCarryGoal((m) => ({ ...m, [g.id]: false }));
                    }}
                      style={{ padding: "5px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${goalStatus[g.id] === s ? C.primary : C.border}`, background: goalStatus[g.id] === s ? C.primaryBg : "#fff", color: goalStatus[g.id] === s ? C.primary : C.text }}>
                      {s}
                    </button>
                  ))}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.text, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!carryGoal[g.id]} onChange={(e) => setCarryGoal((m) => ({ ...m, [g.id]: e.target.checked }))} />
                  Carry forward
                </label>
              </div>
            ))}
          </Card>
        )}

        {treatments.length > 0 && (
          <Card>
            <CardTitle>Treatment</CardTitle>
            {treatments.map((t, i) => (
              <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: i ? `1px solid ${C.border}` : "none", fontSize: 13, color: C.text, cursor: "pointer" }}>
                <input type="checkbox" checked={!!carryTx[t.id]} onChange={(e) => setCarryTx((m) => ({ ...m, [t.id]: e.target.checked }))} />
                {t.name} <span style={{ color: C.faint, fontSize: 11.5 }}>— continue</span>
              </label>
            ))}
          </Card>
        )}

        <Card>
          <CardTitle>New plan name</CardTitle>
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Functional Progression" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13.5, fontFamily: "inherit" }} />
        </Card>

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <GhostBtn onClick={onClose} style={{ flex: 1 }}>Cancel</GhostBtn>
          <PrimaryBtn style={{ flex: 2 }} onClick={() => onConfirm({ problemStatus, carryProblem, goalStatus, carryGoal, carryTx, newLabel: newLabel.trim() })}>Create New Plan →</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// Vertical Clinical Journey timeline: current plan -> its sessions (newest
// first) -> each closed plan -> its sessions, all the way back to the
// first plan. Read-only; tapping a plan or session jumps to its detail via
// the same viewers ClinicalPlanPage already has (onViewPlan/onViewSession).
function ClinicalJourney({ cp, history, planLabel, onViewPlan, onViewSession }) {
  const blocks = [
    { kind: "plan", id: null, label: planLabel, active: true, sessions: Array.isArray(cp.sessions) ? cp.sessions : [] },
    ...[...history].reverse().map((h) => ({ kind: "plan", id: h.id, label: h.label, active: false, sessions: Array.isArray(h.sessions) ? h.sessions : [] })),
  ];
  const anySessions = blocks.some((b) => b.sessions.length);
  if (!blocks.some((b) => b.active === false) && !anySessions) return null; // nothing to show beyond the plain Current Plan card yet

  return (
    <Card>
      <CardTitle>Clinical Journey</CardTitle>
      <div style={{ position: "relative", paddingLeft: 18 }}>
        <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 2, background: C.border }} />
        {blocks.map((b) => (
          <div key={b.id || "current"}>
            <div style={{ position: "relative", padding: "6px 0" }}>
              <div style={{ position: "absolute", left: -18, top: 9, width: 10, height: 10, borderRadius: "50%", background: b.active ? C.primary : C.faint, border: "2px solid #fff", boxShadow: `0 0 0 1px ${b.active ? C.primary : C.faint}` }} />
              <button onClick={() => b.id && onViewPlan(b.id)} disabled={!b.id} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: b.id ? "pointer" : "default", fontSize: 13.5, fontWeight: 800, color: b.active ? C.primary : C.text }}>
                {b.label}{b.active ? " — Active" : ""}
              </button>
            </div>
            {[...b.sessions].reverse().map((s) => (
              <div key={s.id} style={{ position: "relative", padding: "3px 0 3px 4px" }}>
                <div style={{ position: "absolute", left: -15, top: 8, width: 6, height: 6, borderRadius: "50%", background: C.border }} />
                <button onClick={() => onViewSession(b.id, s)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: C.muted }}>
                  Session {s.no} · {s.date}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

// Read-only detail for one session, opened from the Clinical Journey
// timeline. Deliberately simple (no KBContext/goalProgress dependency,
// unlike the in-editor SessionReviewCard) since it's just a history view.
function SessionDetailCard({ session, goals, treatments }) {
  const doneItems = (session.items || []).filter((it) => it.done);
  return (
    <>
      <Card>
        <CardTitle>Session {session.no}</CardTitle>
        <div style={{ fontSize: 12.5, color: C.muted }}>{session.date}</div>
      </Card>
      {goals.length > 0 && (
        <Card>
          <CardTitle>Measures recorded</CardTitle>
          {goals.map((g) => {
            const v = session.measures?.[g.id];
            if (v == null || v === "") return null;
            return <div key={g.id} style={{ fontSize: 13, padding: "4px 0", color: C.text }}>{g.measure}: <b>{v}</b></div>;
          })}
        </Card>
      )}
      <Card>
        <CardTitle>Treatment performed ({doneItems.length}/{(session.items || []).length})</CardTitle>
        {doneItems.length === 0 && <EmptyRow>Nothing marked done.</EmptyRow>}
        {doneItems.map((it) => {
          const t = treatments.find((x) => x.id === it.treatmentId);
          return <div key={it.treatmentId} style={{ fontSize: 13, padding: "4px 0", color: C.text }}>✓ {t?.name || it.treatmentId} {it.actual && <span style={{ color: C.muted }}>— {it.actual}</span>}</div>;
        })}
      </Card>
      {session.note && (
        <Card>
          <CardTitle>Session note</CardTitle>
          <div style={{ fontSize: 13, color: C.text }}>{session.note}</div>
        </Card>
      )}
    </>
  );
}

/* ============================================================
   PLAN & PROGRESS (2026-09-09, Aditi: "all the things we have added
   in the problem list, goals, treatment ... should show in a page
   like format ... and have a button to edit it" + the Care Plan
   Versions spec: "never edit the old plan into the new plan -- close
   the old plan and create a new plan").

   Phase 1: a documented, read-only "page" of the CURRENT care plan
   (Problem List -> Goals -> Treatment Plan), with an Edit toggle into
   the existing live NeuroCarePlanPanel/OrthoCarePlanPanel editor
   (unchanged).

   Phase 2: "Close Plan & Reassess" actually closes the current plan --
   frozen forever into carePlanHistory (patient.data.neuro.carePlanHistory
   for Neuro, patient.data.ortho_care_plan_history for Ortho) -- and opens
   a new one pre-filled with whatever the therapist chose to carry
   forward. Care History now lists real closed plans, each viewable in
   the same read-only PlanDocument layout. */
function ClinicalPlanPage({ patient, onSaveField, isNeuro, orthoPathway, orthoParsed }) {
  const [editing, setEditing] = useState(false);
  const [reassessing, setReassessing] = useState(false);
  const [viewingPlanId, setViewingPlanId] = useState(null);
  const [viewingSession, setViewingSession] = useState(null); // { planId, session }
  const cp = isNeuro ? (patient?.data?.neuro?.neuroCarePlan || {}) : (patient?.data?.ortho_care_plan || {});
  const history = (isNeuro ? patient?.data?.neuro?.carePlanHistory : patient?.data?.ortho_care_plan_history) || [];
  const problems = Array.isArray(cp.problems) ? cp.problems : [];
  const goals = Array.isArray(cp.goals) ? cp.goals : [];
  const treatments = Array.isArray(cp.treatments) ? cp.treatments : [];
  const sessions = Array.isArray(cp.sessions) ? cp.sessions : [];
  const counts = carePlanCounts(cp);
  const planNumber = history.length + 1;
  const planLabel = `Plan ${planNumber}${cp.planLabel ? ` — ${cp.planLabel}` : ""}`;
  // Exercise Prescription lives alongside the assessment's own data --
  // patient.data.neuro.neuroExercisePrescription for Neuro (the wizard
  // saves its whole local `data` object flat under patient.data.neuro),
  // orthoParsed.data.exercisePrescription for Ortho (parsed out of the
  // ortho_*_assessment JSON snapshot) -- not the Care Plan's carePlan
  // object, so there's no per-plan-version history for it; this only
  // applies to the current (active) plan view.
  const exerciseRows = isNeuro
    ? formatNeuroExercisePrescriptionSection(patient?.data?.neuro?.neuroExercisePrescription || {})
    : formatExercisePrescriptionSection(orthoParsed?.data?.exercisePrescription || {});

  const saveCp = (nextCp, nextHistory) => {
    if (isNeuro) onSaveField?.(patient.id, { neuro: { ...(patient.data.neuro || {}), neuroCarePlan: nextCp, carePlanHistory: nextHistory } });
    else onSaveField?.(patient.id, { ortho_care_plan: nextCp, ortho_care_plan_history: nextHistory });
  };

  const confirmReassess = ({ problemStatus, carryProblem, goalStatus, carryGoal, carryTx, newLabel }) => {
    const closedPlan = {
      id: planUid(), label: planLabel,
      startedAt: cp.startedAt || patient.createdAt || null,
      closedAt: new Date().toISOString(),
      problems: problems.map((p) => ({ ...p, outcome: problemStatus[p.id] })),
      goals: goals.map((g) => ({ ...g, outcome: goalStatus[g.id] })),
      treatments,
      sessions,
    };
    const keptProblemIds = new Set(problems.filter((p) => carryProblem[p.id]).map((p) => p.id));
    const keptGoalIds = new Set(goals.filter((g) => carryGoal[g.id] && keptProblemIds.has(g.problemId)).map((g) => g.id));
    const nextCp = {
      planLabel: newLabel || "",
      startedAt: new Date().toISOString(),
      problems: problems.filter((p) => keptProblemIds.has(p.id)),
      goals: goals.filter((g) => keptGoalIds.has(g.id)),
      treatments: treatments.filter((t) => carryTx[t.id] && (t.goalIds || []).some((gid) => keptGoalIds.has(gid))),
      sessions: [],
    };
    saveCp(nextCp, [...history, closedPlan]);
    setReassessing(false);
  };

  if (editing) {
    return (
      <>
        <GhostBtn onClick={() => setEditing(false)} style={{ marginBottom: 12 }}>← Back to Plan</GhostBtn>
        {isNeuro
          ? <NeuroCarePlanPanel patient={patient} onSaveField={onSaveField} />
          : <OrthoCarePlanPanel patient={patient} onSaveField={onSaveField} orthoPathway={orthoPathway} orthoParsed={orthoParsed} />}
      </>
    );
  }

  const viewedPlan = viewingPlanId ? history.find((h) => h.id === viewingPlanId) : null;
  if (viewedPlan) {
    return (
      <>
        <GhostBtn onClick={() => setViewingPlanId(null)} style={{ marginBottom: 12 }}>← Back to Care History</GhostBtn>
        <Card>
          <CardTitle>{viewedPlan.label}</CardTitle>
          <div style={{ fontSize: 12.5, color: C.muted }}>{fmtPlanDate(viewedPlan.startedAt)} – {fmtPlanDate(viewedPlan.closedAt)}</div>
        </Card>
        <PlanDocument problems={viewedPlan.problems || []} goals={viewedPlan.goals || []} treatments={viewedPlan.treatments || []} sessions={viewedPlan.sessions || []} />
      </>
    );
  }

  if (viewingSession) {
    const owningPlan = viewingSession.planId ? history.find((h) => h.id === viewingSession.planId) : null;
    const ownerGoals = owningPlan ? (owningPlan.goals || []) : goals;
    const ownerTreatments = owningPlan ? (owningPlan.treatments || []) : treatments;
    return (
      <>
        <GhostBtn onClick={() => setViewingSession(null)} style={{ marginBottom: 12 }}>← Back to Journey</GhostBtn>
        <SessionDetailCard session={viewingSession.session} goals={ownerGoals} treatments={ownerTreatments} />
      </>
    );
  }

  return (
    <>
      {reassessing && (
        <ReassessModal cp={cp} planLabel={planLabel} onClose={() => setReassessing(false)} onConfirm={confirmReassess} />
      )}

      <Card>
        <CardTitle action={<PrimaryBtn onClick={() => setEditing(true)}>✏️ Edit Plan</PrimaryBtn>}>Current Plan</CardTitle>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6 }}>{planLabel} — Active</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12.5, color: C.muted, marginBottom: counts.any ? 12 : 0 }}>
          <span>{counts.problems} Problem{counts.problems === 1 ? "" : "s"}</span>
          <span>{counts.goals} Goal{counts.goals === 1 ? "" : "s"}</span>
          <span>{counts.treatments} Treatment{counts.treatments === 1 ? "" : "s"}</span>
          <span>{counts.sessions} Session{counts.sessions === 1 ? "" : "s"}</span>
          {counts.avgProgress != null && <span style={{ color: C.primary, fontWeight: 700 }}>{counts.avgProgress}% avg progress</span>}
        </div>
        {counts.any && <GhostBtn onClick={() => setReassessing(true)} style={{ width: "100%" }}>Close Plan & Reassess</GhostBtn>}
      </Card>

      {!counts.any && <Card><EmptyRow>No problems, goals or treatment added yet. Tap Edit Plan to get started.</EmptyRow></Card>}

      <PlanDocument problems={problems} goals={goals} treatments={treatments} sessions={sessions} exerciseRows={exerciseRows} />

      <Card>
        <CardTitle>Care History</CardTitle>
        {history.length === 0 && <EmptyRow>No previous plans yet — this is the patient's first care plan.</EmptyRow>}
        {[...history].reverse().map((h) => {
          const hc = carePlanCounts(h);
          return (
            <button key={h.id} onClick={() => setViewingPlanId(h.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", padding: "10px 0", borderTop: `1px solid ${C.border}`, background: "none", border: "none", borderTopWidth: 1, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{h.label}</div>
                <div style={{ fontSize: 11.5, color: C.muted }}>{fmtPlanDate(h.startedAt)} – {fmtPlanDate(h.closedAt)} · {hc.problems} Problems · {hc.goals} Goals</div>
              </div>
              <span style={{ color: C.primary, fontWeight: 700, fontSize: 12 }}>View →</span>
            </button>
          );
        })}
      </Card>

      <ClinicalJourney
        cp={cp} history={history} planLabel={planLabel}
        onViewPlan={(id) => setViewingPlanId(id)}
        onViewSession={(planId, session) => setViewingSession({ planId, session })}
      />
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

  // Which specialty/specialties this patient has an assessment under, plus
  // each one's type (IPD/Post-op/Outpatient for Ortho, Inpatient/Rehab/etc
  // for Cardio, Neuro's own settings) and region/condition -- shown right
  // under the name so it's clear at a glance without opening Assessment.
  const specialtyChips = [
    hasOrtho && {
      key: "ortho", icon: "🦴", label: "Ortho",
      sub: [orthoPathway === "ipd" ? "IPD" : orthoPathway === "postop" ? "Post-op" : "Outpatient", orthoParsed.regions, orthoParsed.condition].filter(Boolean).join(" · "),
    },
    hasNeuro && { key: "neuro", icon: "🧠", label: "Neuro", sub: neuroAssessmentSubtitle(d.neuro.meta) },
    hasCardio && { key: "cardio", icon: "🫀", label: "Cardio", sub: cardioAssessmentSubtitle(d.cardio.meta) },
  ].filter(Boolean);

  const TABS = [
    { k: "overview", label: "Overview" },
    { k: "assessment", label: "Assessment" },
    { k: "progress", label: "Progress" },
    { k: "treatment", label: "Plan & Progress" },
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
          {specialtyChips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {specialtyChips.map((c) => (
                <span key={c.key} style={{ fontSize: 11, fontWeight: 700, color: C.primary, background: C.primaryBg, border: "1px solid #ece7fb", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                  {c.icon} {c.label}{c.sub ? ` · ${c.sub}` : ""}
                </span>
              ))}
            </div>
          )}
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

          {/* Care Plan snapshot (neuro and/or ortho) — glanceable status,
              links into the Treatment tab where it's fully editable. Shows
              both specialties' snapshots when a patient has both, instead
              of silently dropping one. */}
          {(hasNeuro || hasOrtho) && (() => {
            const snaps = [
              hasNeuro && { label: "Neuro", ...neuroCarePlanSnapshot(d) },
              hasOrtho && { label: "Ortho", ...orthoCarePlanSnapshot(d) },
            ].filter(Boolean);
            return (
              <Card>
                <CardTitle>Care Plan</CardTitle>
                {snaps.every((snap) => !snap.any) ? (
                  <EmptyRow>No problems or goals set yet.</EmptyRow>
                ) : (
                  snaps.map((snap) => (
                    <div key={snap.label} style={{ marginBottom: 10 }}>
                      {snaps.length > 1 && (
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>{snap.label}</div>
                      )}
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
                    </div>
                  ))
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                <span style={{ fontSize: 24 }}>🧠</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: "#7c3aed", flex: 1 }}>Neurological Assessment</span>
                <GhostBtn onClick={() => onNav?.("neuro_assessment")} style={{ padding: "6px 12px", fontSize: 12 }}>✏️ Edit</GhostBtn>
              </div>
              {neuroAssessmentSubtitle(d.neuro.meta) && <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>{neuroAssessmentSubtitle(d.neuro.meta)}</div>}
              <NeuroSummarySection setting={d.neuro.meta?.setting} data={d.neuro} assessSteps={buildNeuroAssessSteps(d.neuro.meta?.stepOrder, d.neuro.meta?.customStepsMeta)} formatters={neuroSummaryFormatters} />
            </Card>
          )}

          {hasCardio && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                <span style={{ fontSize: 24 }}>🫀</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: "#dc2626", flex: 1 }}>Cardiopulmonary Assessment</span>
                <GhostBtn onClick={() => onNav?.("cardio_assessment")} style={{ padding: "6px 12px", fontSize: 12 }}>✏️ Edit</GhostBtn>
              </div>
              {cardioAssessmentSubtitle(d.cardio.meta) && <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>{cardioAssessmentSubtitle(d.cardio.meta)}</div>}
              <CardioSummarySection setting={d.cardio.meta?.setting} system={d.cardio.meta?.system} data={d.cardio} assessSteps={buildCardioAssessSteps(d.cardio.meta?.stepOrder, d.cardio.meta?.customStepsMeta)} />
            </Card>
          )}

          {hasOrtho && (
            <Card>
              {/* flexWrap (2026-09-10, Aditi screenshot: "red circle area
                  why it is outside of the edit button") -- unlike Neuro/
                  Cardio's header row above (one button, always fits), this
                  row has two action buttons alongside the title with no
                  shrink/wrap handling, so on narrow phone widths they got
                  pushed past the card's right edge instead of wrapping
                  onto their own line below the title. */}
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 24 }}>🦴</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: "#0369a1", flex: 1, minWidth: 120 }}>{orthoTitle}</span>
                {/* Follow-up/repeat visit for this same patient (2026-09-09,
                    Aditi: "select from old patient data ... should extract
                    the subjective assessment from ortho list of old
                    patient"). The AI Subjective screen's "Select from old
                    patient data" option reads whatever patient is currently
                    active -- reachable only from Home/Dashboard's generic
                    "Start with AI" before now, which always blanks the
                    active patient first, so that option could never find
                    anything. This button starts the same AI flow without
                    touching the patient already selected by viewing this
                    profile, so listOldPatientRecords() sees their real
                    saved assessment(s). */}
                <GhostBtn onClick={() => onNav?.("ortho_new_assessment", { entryMode: "ai" })} style={{ padding: "6px 12px", fontSize: 12 }}>🔄 New Assessment</GhostBtn>
                <GhostBtn onClick={() => onNav?.("ortho_new_assessment", { resume: orthoResume })} style={{ padding: "6px 12px", fontSize: 12 }}>✏️ Edit</GhostBtn>
              </div>
              {[orthoParsed.regions, orthoParsed.condition].filter(Boolean).join(" · ") && (
                <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>{[orthoParsed.regions, orthoParsed.condition].filter(Boolean).join(" · ")}</div>
              )}
              <OrthoAssessmentSummary
                icon="🦴"
                title={orthoTitle}
                hideTitle
                steps={orthoSteps}
                data={{ ...(orthoParsed.data || {}), carePlanPlan: d.ortho_care_plan || orthoParsed.data?.carePlanPlan }}
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
      {tab === "progress" && hasOrtho && (
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

      {/* ═══ PLAN & PROGRESS ═══ */}
      {tab === "treatment" && hasNeuro && (
        <ClinicalPlanPage key="plan-treatment-neuro" patient={patient} onSaveField={onSaveField} isNeuro />
      )}
      {tab === "treatment" && hasOrtho && (
        <ClinicalPlanPage key="plan-treatment-ortho" patient={patient} onSaveField={onSaveField} isNeuro={false} orthoPathway={orthoPathway} orthoParsed={orthoParsed} />
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
