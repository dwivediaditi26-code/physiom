import React from "react";
import { InfoButton, BRAND } from "./orthoFieldKit.jsx";

/* ============================================================
   Exercise card rendering -- extracted (2026-09-11) out of
   orthoExercisePrescription.jsx into a neutral file so both that
   file and the new evidence-protocol browser (orthoEvidenceProtocols.jsx)
   can import it without a circular dependency (the browser gets
   embedded inside orthoExercisePrescription.jsx too).
   ============================================================ */

export function exerciseInfoBody(ex) {
  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <b>Target:</b> {ex.target}
      </div>
      <div style={{ marginBottom: 10 }}>{ex.desc}</div>
      {ex.cues && (
        <div style={{ background: BRAND.amberBg, borderRadius: 10, padding: "8px 10px", marginBottom: 10, fontSize: 12.5 }}>
          💡 {ex.cues}
        </div>
      )}
      {ex.progression && (
        <div style={{ fontSize: 12.5, color: BRAND.green }}>📈 Progression: {ex.progression}</div>
      )}
    </>
  );
}

// richItem (not a plain `text` string) so the "How to Perform" sheet gets
// a reference-photo slot (SheetHero, orthoFieldKit.jsx) the same way ROM/
// MMT/Special Tests already do -- `image` is a Cloudinary asset id, looked
// up directly by the exercise's own id (e.g. "lb_glute_bridge").
export function exerciseRichItem(ex) {
  return {
    image: ex.id,
    title: ex.name,
    subtitle: ex.target,
    perform: exerciseInfoBody(ex),
  };
}

const EVIDENCE_COLORS = {
  Strong: { bg: "#ecfdf5", fg: "#047857" },
  Moderate: { bg: "#fef6e7", fg: "#b45309" },
  Limited: { bg: "#f3f4f6", fg: "#6b7280" },
};

// `tag` (2026-09-11) -- optional condition/operation label (e.g. "Total
// Knee Replacement (TKA)") shown alongside the exercise's own phase, for
// cards rendered inside the Evidence-Based Protocol browser where knowing
// which protocol an exercise came from matters; omitted (undefined) for
// every other host, which keeps their card meta line exactly as before.
export function ExerciseLibraryCard({ ex, inProgramme, onAdd, onRemove, tag }) {
  const ev = ex.evidence && EVIDENCE_COLORS[ex.evidence];
  return (
    <div className="tech-card">
      <div className="tech-card-head">
        <div className="tech-card-title">
          {ex.name}
          <div style={{ fontWeight: 400, fontSize: 11.5, color: BRAND.gray, marginTop: 2 }}>{ex.target}</div>
        </div>
        <div className="tech-card-actions">
          <InfoButton title={ex.name} richItem={exerciseRichItem(ex)} eyebrow="EXERCISE" />
          <button
            type="button"
            className={inProgramme ? "tech-card-del" : "tech-card-edit"}
            onClick={inProgramme ? onRemove : onAdd}
            aria-label={inProgramme ? "Remove from programme" : "Add to programme"}
          >
            {inProgramme ? "✕" : "+"}
          </button>
        </div>
      </div>
      {(ev || tag) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "2px 0 4px" }}>
          {ev && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: ev.bg, color: ev.fg }}>{ex.evidence}</span>}
          {tag && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: BRAND.purpleFaint, color: BRAND.purpleDark }}>{tag}{ex.phase ? ` · ${ex.phase}` : ""}</span>}
        </div>
      )}
      <div className="tech-card-meta">
        {ex.sets} × {ex.reps}{ex.hold ? ` · hold ${ex.hold}s` : ""} · {ex.freq} · {ex.phase}
      </div>
    </div>
  );
}
