import React from "react";

// Full documented assessment view (2026-08-20, Aditi's request) -- NOT a
// tabbed/expandable summary (that's what Patient Profile's Assessment tab
// already does, deliberately left untouched -- "donot dilute in patient
// profile"). This is a single, continuous, read-only document: everything
// a therapist recorded in Cardiopulmonary/Neurological Assessment, laid
// out top to bottom like a printed chart/PDF, one scroll, no per-section
// clicking. Lives only in the Clinical tab (see AppFull.jsx's
// active==="assessment_report" mount and PatientDatabase.jsx's "View
// Report" button) -- not added to the sidebar, per the same request.

const SECTION_ICONS = {
  safety: "🚨", subjective: "🗣️", chart: "🗂️", cognition: "🧠", cranial: "👁️",
  sensory: "🖐️", motor: "💪", tone: "⚡", coordination: "🎯", balance: "⚖️",
  gait: "🚶", functional: "🛏️", outcomes: "📊", interpretation: "🧠",
  precautions: "⚠️", vitals: "❤️", cardiovascular: "🫀", respiratory: "🫁",
  exercise: "🚶", exerciseTolerance: "🚶",
};

function humanize(k) {
  return String(k).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// LRGrid-shaped values look like {"Row__Col": "value", ...} -- rebuild
// them into a real table instead of dumping "Row__Col: value" text rows.
function asGrid(fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0 || !keys.every((k) => k.includes("__"))) return null;
  const rows = [], cols = [];
  const cellMap = {};
  keys.forEach((k) => {
    const [row, col] = k.split("__");
    if (!rows.includes(row)) rows.push(row);
    if (!cols.includes(col)) cols.push(col);
    cellMap[`${row}__${col}`] = fields[k];
  });
  if (!rows.some((r) => cols.some((c) => cellMap[`${r}__${c}`]))) return null;
  return { rows, cols, cellMap };
}

function valueText(v) {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  if (typeof v === "object") return null; // handled as a grid or skipped
  return String(v);
}

function Divider() {
  return <div style={{ borderTop: "2px solid #1e293b", margin: "18px 0" }} />;
}

function GridTable({ grid }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 8, marginBottom: 4 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1.5px solid #e2e8f0", color: "#64748b", fontWeight: 700 }}></th>
            {grid.cols.map((c) => (
              <th key={c} style={{ textAlign: "center", padding: "5px 8px", borderBottom: "1.5px solid #e2e8f0", color: "#64748b", fontWeight: 700 }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((r) => (
            <tr key={r}>
              <td style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, color: "#334155" }}>{r}</td>
              {grid.cols.map((c) => (
                <td key={c} style={{ padding: "5px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "center", color: "#1e293b" }}>{grid.cellMap[`${r}__${c}`] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Bug fix: a section is a MIX of grid fields and scalar fields (e.g.
// Motor Examination = { mmt: {grid}, bulk: "Normal", notes: "..." }), not
// EITHER entirely-a-grid OR entirely-scalars as the first version assumed.
// That meant any section whose only filled field happened to be a grid
// (like MMT) silently vanished from the report entirely -- valueText()
// correctly returns null for an object so it wouldn't print as
// "[object Object]", but nothing ever recognised that object AS a grid at
// the per-field level and rendered it as one instead of dropping it.
function SectionBlock({ sectionId, fields }) {
  const items = Object.entries(fields).map(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const grid = asGrid(v);
      return grid ? { key: k, grid } : null; // object but not grid-shaped (shouldn't happen here) -- skip rather than guess
    }
    const text = valueText(v);
    return text ? { key: k, text } : null;
  }).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{SECTION_ICONS[sectionId] || "📝"}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", letterSpacing: 0.3, textTransform: "uppercase" }}>{humanize(sectionId)}</span>
      </div>
      {items.map((item) => item.grid ? (
        <div key={item.key} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 2 }}>{humanize(item.key)}</div>
          <GridTable grid={item.grid} />
        </div>
      ) : (
        <div key={item.key} style={{ padding: "4px 0", fontSize: 14 }}>
          <span style={{ color: "#64748b" }}>{humanize(item.key)}: </span>
          <span style={{ color: "#0f172a", fontWeight: 600 }}>{item.text}</span>
        </div>
      ))}
      <Divider />
    </div>
  );
}

// Exported (2026-08-20) so SpecialtyPatientProfile.jsx's Assessments tab
// can embed the same documented rendering directly instead of a "card +
// View assessment button" indirection -- Aditi: the Assessments tab
// itself should look like the documented sheet, not link out to it.
export function SpecialtyDocument({ title, icon, color, specialtyData, patient, onEdit }) {
  const dem = specialtyData.demographics || {};
  const sections = Object.entries(specialtyData).filter(([k, v]) => k !== "demographics" && v && typeof v === "object" && Object.keys(v).length > 0);
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "22px 20px", marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span style={{ fontSize: 17, fontWeight: 900, color, flex: 1 }}>{title}</span>
        {onEdit && (
          <button onClick={onEdit} style={{ padding: "6px 12px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✏️ Edit</button>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 14 }}>Date: {today}</div>
      <Divider />
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", letterSpacing: 0.3 }}>PATIENT INFORMATION</span>
        </div>
        {Object.entries(dem).filter(([, v]) => v).map(([k, v]) => (
          <div key={k} style={{ padding: "4px 0", fontSize: 14 }}>
            <span style={{ color: "#64748b" }}>{humanize(k)}: </span>
            <span style={{ color: "#0f172a", fontWeight: 600 }}>{valueText(v)}</span>
          </div>
        ))}
        <Divider />
      </div>
      {sections.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0", color: "#94a3b8", fontSize: 13 }}>No further findings recorded yet.</div>
      ) : sections.map(([sectionId, fields]) => <SectionBlock key={sectionId} sectionId={sectionId} fields={fields} />)}
    </div>
  );
}

// `patient` is the active patient record ({ name, data, ... }); `onNav`
// drives the same navTo() every other screen uses; `onBack` returns to the
// Clinical patient list.
export default function AssessmentReportView({ patient, onNav, onBack }) {
  const d = patient?.data || {};
  const hasCardio = d.cardio && Object.keys(d.cardio).length > 0;
  const hasNeuro = d.neuro && Object.keys(d.neuro).length > 0;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, width: 36, height: 36, fontSize: 16, cursor: "pointer" }}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#1e293b" }}>📄 Full Assessment Report</div>
          <div style={{ fontSize: 12.5, color: "#64748b" }}>{patient?.name || "Patient"}</div>
        </div>
      </div>

      {!hasCardio && !hasNeuro ? (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
          No Cardiopulmonary or Neurological assessment recorded for this patient yet.
        </div>
      ) : (
        <>
          {hasCardio && <SpecialtyDocument title="Cardiopulmonary Assessment" icon="🫀" color="#dc2626" specialtyData={d.cardio} patient={patient} />}
          {hasNeuro && <SpecialtyDocument title="Neurological Assessment" icon="🧠" color="#7c3aed" specialtyData={d.neuro} patient={patient} />}
        </>
      )}

      {(hasCardio || hasNeuro) && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 60, width: "100%", maxWidth: 720, padding: "0 14px", display: "flex", gap: 8, zIndex: 25 }}>
          {hasCardio && (
            <button onClick={() => onNav?.("cardio_assessment")} style={{ flex: 1, padding: "11px", background: "#dc2626", border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 14px rgba(220,38,38,0.3)" }}>
              ✏️ Edit Cardio
            </button>
          )}
          {hasNeuro && (
            <button onClick={() => onNav?.("neuro_assessment")} style={{ flex: 1, padding: "11px", background: "#7c3aed", border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
              ✏️ Edit Neuro
            </button>
          )}
        </div>
      )}
    </div>
  );
}
