// HowToPerformDrawer.jsx — shared "ⓘ How to Perform" overlay for the
// Clinical Assessment tab. Bottom sheet on mobile, right-side drawer on
// desktop (see .pm-howto-overlay / .pm-howto-sheet in utils.jsx). Renders
// on top of the still-visible Patient Profile page — never a navigation
// away from it. The therapist closes it and returns to the exact
// assessment section they were filling.
import React from "react";

export default function HowToPerformDrawer({ open, onClose, title, subtitle, sections }) {
  if (!open) return null;
  return (
    <div className="pm-howto-overlay" onClick={onClose}>
      <div className="pm-howto-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>ⓘ {title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, color: "#6B7280", padding: "5px 10px", cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(sections || []).map((s, i) => (
            <div key={i} style={{ padding: "9px 11px", borderRadius: 10, background: s.tint || "#F8FAFC", border: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: s.labelColor || "#6D28D9", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                {s.icon} {s.label}
              </div>
              {(s.lines || []).map((line, li) => (
                <div key={li} style={{ fontSize: 12.5, color: "#111827", lineHeight: 1.5, marginTop: li > 0 ? 3 : 0 }}>{line}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Builds drawer sections from a real ROM_DATA movement object — the exact
// same fields/order as ROMModule's non-compact reference block in
// PhysioNeuro.jsx, just re-rendered here so the info can appear as an
// overlay instead of an always-visible block. No invented content.
export function romInfoSections(m) {
  if (!m) return [];
  return [
    { icon: "📐", label: "Goniometer Placement", tint: "#F5F3FF", labelColor: "#7C3AED",
      lines: [m.gonio, m.start ? `Starting position: ${m.start}` : null].filter(Boolean) },
    m.muscles && { icon: "💪", label: "Muscles", tint: "#FAF5FF", labelColor: "#9333EA", lines: [m.muscles] },
    m.endfeel && (m.endfeel.normal || m.endfeel.abnormal) && { icon: "🖐", label: "End Feel", tint: "#FFFBEB", labelColor: "#D97706",
      lines: [m.endfeel.normal ? `Normal: ${m.endfeel.normal}` : null, m.endfeel.abnormal ? `Abnormal: ${m.endfeel.abnormal}` : null].filter(Boolean) },
    m.compensation && { icon: "⚠️", label: "Compensation", tint: "#FFFBEB", labelColor: "#B45309", lines: [m.compensation] },
    m.capsular && { icon: "🔵", label: "Capsular Pattern", tint: "#EFF6FF", labelColor: "#2563EB", lines: [m.capsular] },
    (m.pathology || m.adl) && { icon: "📋", label: "Pathology Correlation", tint: "#F8FAFC", labelColor: "#475569",
      lines: [m.pathology, m.adl ? `ADL Relevance: ${m.adl}` : null].filter(Boolean) },
    m.pediatric && { icon: "👶", label: "Pediatric", tint: "#F8FAFC", labelColor: "#7C3AED", lines: [m.pediatric] },
    m.geriatric && { icon: "👴", label: "Geriatric", tint: "#F8FAFC", labelColor: "#2563EB", lines: [m.geriatric] },
    m.redflag && { icon: "🚨", label: "Red Flags", tint: "#FEF2F2", labelColor: "#DC2626", lines: [m.redflag] },
  ].filter(Boolean);
}

// Builds drawer sections from a real MMT_DATA muscle-test object -- the same
// fields/order as MMTModule's non-compact reference block in
// PhysioNeuro.jsx (Anatomy, Testing Protocol, Compensation/Substitution,
// Clinical Interpretation). `rehab` is the same data-dependent suggestion
// MMTModule already derives from the recorded grade (rehabSuggestions(m)),
// passed through rather than recomputed here.
export function mmtInfoSections(m, rehab) {
  if (!m) return [];
  return [
    { icon: "🦴", label: "Anatomy", tint: "#F5F3FF", labelColor: "#7C3AED",
      lines: [
        m.action ? `Action: ${m.action}` : null,
        m.nerve ? `Nerve: ${m.nerve}` : null,
        m.root ? `Root: ${m.root}` : null,
        m.origin ? `Origin: ${m.origin}` : null,
        m.insertion ? `Insertion: ${m.insertion}` : null,
      ].filter(Boolean) },
    { icon: "📋", label: "Testing Protocol", tint: "#FAF5FF", labelColor: "#9333EA",
      lines: [
        m.patient ? `Patient position: ${m.patient}` : null,
        m.therapist ? `Therapist: ${m.therapist}` : null,
        m.resistance ? `Resistance: ${m.resistance}` : null,
        m.gravElim ? `Gravity eliminated: ${m.gravElim}` : null,
        m.palpation ? `Palpation: ${m.palpation}` : null,
      ].filter(Boolean) },
    (m.compensation || m.substitution) && { icon: "⚠️", label: "Compensation / Substitution", tint: "#FFFBEB", labelColor: "#B45309",
      lines: [
        m.compensation ? `Compensation: ${m.compensation}` : null,
        m.substitution ? `Substitution: ${m.substitution}` : null,
      ].filter(Boolean) },
    (m.functional || m.chain) && { icon: "⛓️", label: "Clinical Interpretation", tint: "#F5F3FF", labelColor: "#6D28D9",
      lines: [m.functional, m.chain].filter(Boolean) },
    rehab && { icon: "🏋️", label: "Rehab Recommendation", tint: "#ECFDF5", labelColor: "#059669", lines: [rehab] },
  ].filter(Boolean);
}
