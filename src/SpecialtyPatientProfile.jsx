import React, { useState } from "react";
import { SummarySection as CardioSummarySection, SummaryStyles as CardioSummaryStyles, buildCardioAssessSteps } from "./CardiopulmonaryAssessment.jsx";
import { SummarySection as NeuroSummarySection, SummaryStyles as NeuroSummaryStyles, buildNeuroAssessSteps } from "./NeurologicalAssessment.jsx";

// Simple, separate profile for Cardio/Neuro patients (2026-08-20, Aditi's
// request) -- deliberately NOT the existing Ortho PatientProfileModal
// (PatientDatabase.jsx), which is full of Ortho-specific sections (ROM/MMT/
// Special Tests/Kinetic Chain/Fascia/...) that don't apply here. Lives only
// in Clinical, opened by the same "👤 Profile" button every patient already
// has -- PatientDatabase.jsx's onProfile routes here for Cardio/Neuro
// patients and to the Ortho modal for everyone else, rather than a second,
// confusing "Specialty Profile" button (which this replaces).
//
// Overview = identity + clinical snapshot only, no action buttons -- the
// earlier version had "Start/Continue Cardio/Neuro" buttons here, which
// Aditi asked to remove; starting/continuing an assessment already has a
// real entry point (Clinical's own "New Assessment" / "Edit Assessment").
//
// Assessments tab embeds the actual documented sheet (SpecialtyDocument,
// shared with AssessmentReportView.jsx) directly -- not a summary card
// linking out to it -- so this tab already looks like the printed
// assessment sheet.
//
// Still deliberately simple ("cardio neuro simple"): no Progress/
// Treatment/Documents tabs. Those need a real dated-session history model
// (multiple saved assessments per patient over time) that doesn't exist
// yet -- today there's exactly one current Cardio object and one current
// Neuro object per patient, not a timeline.

export default function SpecialtyPatientProfile({ patient, onNav, onBack }) {
  const [tab, setTab] = useState("overview");
  const d = patient?.data || {};
  const hasCardio = d.cardio && Object.keys(d.cardio).length > 0;
  const hasNeuro = d.neuro && Object.keys(d.neuro).length > 0;
  const cardioDem = d.cardio?.demographics || {};
  const neuroDem = d.neuro?.demographics || {};
  // Whichever specialty has a diagnosis wins for the header snapshot --
  // both write to the shared dem_* fields (see CardiopulmonaryAssessment.jsx/
  // NeurologicalAssessment.jsx), but "diagnosis" itself stays specialty-local.
  // Deliberately NOT falling back to d.cc_main (Ortho's own "chief
  // complaint" field) when neither specialty has a diagnosis yet -- that
  // was the exact Ortho/Cardio-Neuro mixing this whole separate profile
  // exists to avoid. An honest empty state instead.
  const activeDem = cardioDem.diagnosis ? cardioDem : neuroDem;
  const primaryDiagnosis = cardioDem.diagnosis || neuroDem.diagnosis || "No diagnosis recorded yet";
  const pid = patient?.id ? "PT-" + patient.id.slice(0, 6).toUpperCase() : "";
  const initials = (patient?.name || "?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={onBack} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, width: 36, height: 36, fontSize: 16, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>Patients</div>
      </div>

      <div style={{ display: "flex", gap: 6, background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {["overview", "assessments"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px", borderRadius: 9, border: "none", cursor: "pointer",
            background: tab === t ? "#fff" : "transparent", color: tab === t ? "#1e293b" : "#64748b",
            fontWeight: 700, fontSize: 13, boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>
            {t === "overview" ? "Overview" : "Assessments"}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          {/* Patient identity */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 20px", marginBottom: 14, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ede9fe", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, margin: "0 auto 12px" }}>
              {initials}
            </div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#1e293b", letterSpacing: 0.2 }}>{(patient?.name || "PATIENT").toUpperCase()}</div>
            <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 4 }}>
              {[d.dem_age && `${d.dem_age} years`, d.dem_sex || d.dem_gender].filter(Boolean).join(" • ")}
            </div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>Patient ID: {pid}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "4px 12px", borderRadius: 20, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} /> Active
            </div>
          </div>

          {/* Clinical snapshot */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.5, marginBottom: 4 }}>PRIMARY CONDITION</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>{primaryDiagnosis}</div>
            {[
              ["Onset", activeDem.onsetDate],
              ["Referral", activeDem.referrer],
              ["Dominance", activeDem.dominance],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid #f1f5f9", fontSize: 13.5 }}>
                <span style={{ color: "#64748b" }}>{label}</span>
                <span style={{ color: "#1e293b", fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {!hasCardio && !hasNeuro ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
              No assessments recorded yet.
            </div>
          ) : (
            <>
              {/* Renders the EXACT same Summary & Review the wizard's own
                  last step shows (2026-08-20, Aditi: "put summary and
                  review same to same not change at all in assessment
                  section") -- not a separately-built generic renderer. */}
              {hasCardio && <CardioSummaryStyles />}
              {hasCardio && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "22px 20px", marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 24 }}>🫀</span>
                    <span style={{ fontSize: 17, fontWeight: 900, color: "#dc2626", flex: 1 }}>Cardiopulmonary Assessment</span>
                    <button onClick={() => onNav?.("cardio_assessment")} style={{ padding: "6px 12px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✏️ Edit</button>
                  </div>
                  <CardioSummarySection setting={d.cardio.meta?.setting} system={d.cardio.meta?.system} data={d.cardio} assessSteps={buildCardioAssessSteps(d.cardio.meta?.stepOrder, d.cardio.meta?.customStepsMeta)} />
                </div>
              )}
              {hasNeuro && <NeuroSummaryStyles />}
              {hasNeuro && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "22px 20px", marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 24 }}>🧠</span>
                    <span style={{ fontSize: 17, fontWeight: 900, color: "#7c3aed", flex: 1 }}>Neurological Assessment</span>
                    <button onClick={() => onNav?.("neuro_assessment")} style={{ padding: "6px 12px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✏️ Edit</button>
                  </div>
                  <NeuroSummarySection setting={d.neuro.meta?.setting} data={d.neuro} assessSteps={buildNeuroAssessSteps(d.neuro.meta?.stepOrder, d.neuro.meta?.customStepsMeta)} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
