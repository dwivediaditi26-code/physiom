import { useState } from "react";

// Non-clinical / scaffolding step ids that must never appear as a share
// checkbox in ANY specialty -- most importantly `demographics` ("Patient
// Information" in Cardio/Neuro's own STEP_META), which holds patient
// identity fields. This is a hardcoded exclusion, not an allowlist a future
// step could accidentally widen without noticing: it's the actual privacy
// guarantee behind "your original assessment remains private", since
// nothing server-side validates a post's text/media content (posts_select_all
// is public-read, posts_insert_own only checks author_id -- see
// add_social_tables.sql / add_clinical_discussions.sql).
export const SHARE_EXCLUDED_STEP_IDS = new Set([
  "demographics", "setting", "system", "review", "summary", "setup",
]);

// "Share as Clinical Discussion" picker (2026-09-23, PhysioMind assessment
// share-in -- deferred at Clinical Discussion's original launch, built now).
// Reached from Ortho/Cardio/Neuro's own end-of-wizard Summary & Review
// screen, next to "Copy assessment as text". Purely presentational: the
// caller has already filtered `sections` down to clinical-content steps
// (via SHARE_EXCLUDED_STEP_IDS) and owns building the assembled share text
// once the user confirms a selection -- this component only reports back
// which ids were checked. Same ct-modal/ct-item checkbox-row convention
// AddAssessmentModal already uses in all three assessment wizards, so it
// inherits whichever wizard's own injected orthoStyles()-equivalent <style>
// block is already in scope wherever it's mounted.
export default function ShareAssessmentModal({ sections, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => new Set());
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">Share to PhysioFeed</div>
        <button type="button" className="ct-modal-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="ct-modal-body">
        <div style={{ display: "flex", gap: 10, background: "#F3F0FF", border: "1px solid #ECE9F7", borderRadius: 12, padding: 12, marginBottom: 18 }}>
          <span style={{ fontSize: 20 }}>💬</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Share as Clinical Discussion</div>
            <div style={{ fontSize: 12.5, color: "#6b6b80", marginTop: 2 }}>
              Start a discussion using information from this assessment. Your original assessment remains private.
            </div>
          </div>
        </div>
        <div className="ct-group">
          <div className="ct-group-title">CHOOSE INFORMATION TO INCLUDE</div>
          {sections.map((s) => {
            const checked = selected.has(s.id);
            return (
              <button type="button" key={s.id} className={"ct-item" + (checked ? " ct-item-checked" : "")} onClick={() => toggle(s.id)}>
                <span className="ct-checkbox">{checked ? "☑" : "☐"}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
          {!sections.length && (
            <div style={{ fontSize: 13, color: "#8a8a9a", padding: "8px 4px" }}>
              Nothing recorded yet to share — fill in a few sections first.
            </div>
          )}
        </div>
      </div>
      <div className="ct-modal-footer">
        <button type="button" className="primary-btn" disabled={!selected.size} onClick={() => onConfirm([...selected])}>
          Next: Edit and Post
        </button>
      </div>
    </div>
  );
}
