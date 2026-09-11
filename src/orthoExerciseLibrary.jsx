import React, { useState, useEffect } from "react";
import { Segmented, BRAND } from "./orthoFieldKit.jsx";
import { EXERCISE_DB, EVIDENCE_PROTOCOLS } from "./sharedClinicalData.js";
import { EvidenceProtocolBrowser } from "./orthoEvidenceProtocols.jsx";
import { ExerciseLibraryCard } from "./exerciseCardKit.jsx";
import { listClinicProtocols } from "./clinicProtocols.js";

/* ============================================================
   EXERCISE LIBRARY (2026-09-11) -- reached from a new button on the
   Exercise Prescription step. Three tabs: Featured Protocols (the
   EvidenceProtocolBrowser, entered per-operation), Browse by Region
   (deep-links back to the Exercise Prescription step's own already-
   working Region/Phase/Search browse instead of re-implementing
   search a third time), and My Clinic Protocols (the therapist's own
   saved sets).
   ============================================================ */
const TABS = ["Featured Protocols", "Browse by Region", "My Clinic Protocols"];

function ProtocolTile({ op, onClick }) {
  const region = EXERCISE_DB[op.regionKey];
  return (
    <button
      type="button"
      disabled={!op.live}
      onClick={op.live ? onClick : undefined}
      style={{
        position: "relative", textAlign: "left", padding: "14px 12px", borderRadius: 16,
        border: `1.5px solid ${BRAND.border}`, background: "#fff", fontFamily: "inherit",
        opacity: op.live ? 1 : 0.6, cursor: op.live ? "pointer" : "not-allowed",
      }}
    >
      {!op.live && (
        <span style={{ position: "absolute", top: 10, right: 10, fontSize: "0.58rem", fontWeight: 800, padding: "2px 6px", borderRadius: 8, background: "#E5E7EB", color: "#9CA3AF" }}>
          SOON
        </span>
      )}
      <div style={{ width: 38, height: 38, borderRadius: 12, background: BRAND.purpleFaint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8 }}>
        {region?.icon || "🏋"}
      </div>
      <div style={{ fontWeight: 700, fontSize: "0.86rem", color: BRAND.ink, lineHeight: 1.3 }}>{op.label}</div>
    </button>
  );
}

function RegionTile({ regionKey, region, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left", padding: "14px 12px", borderRadius: 16, border: `1.5px solid ${BRAND.border}`,
        background: "#fff", fontFamily: "inherit", cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{region.icon}</div>
      <div style={{ fontWeight: 700, fontSize: "0.84rem", color: BRAND.ink }}>{region.label}</div>
    </button>
  );
}

export function ExerciseLibrarySheet({ onClose, onAddExercise, isAdded, onSelectRegion, requireAuth }) {
  const [tab, setTab] = useState("Featured Protocols");
  const [activeOperationId, setActiveOperationId] = useState(null);
  const [savedProtocols, setSavedProtocols] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    if (tab !== "My Clinic Protocols") return;
    if (requireAuth && !requireAuth("Clinic Protocols")) { setTab("Featured Protocols"); return; }
    setLoadingSaved(true);
    listClinicProtocols().then((rows) => { setSavedProtocols(rows); setLoadingSaved(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="ct-modal" style={{ position: "fixed", inset: 0, zIndex: 3000 }}>
      <div className="ct-modal-header">
        <div className="ct-modal-title">📚 Exercise Library</div>
        <button type="button" className="ct-modal-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div style={{ padding: "10px 14px 0" }}>
        <Segmented wrap options={TABS} value={tab} onChange={(v) => { setTab(v || "Featured Protocols"); setActiveOperationId(null); }} />
      </div>
      <div className="ct-modal-body">
        {tab === "Featured Protocols" && (
          activeOperationId ? (
            <>
              <button type="button" onClick={() => setActiveOperationId(null)} style={{ background: "none", border: "none", color: BRAND.purple, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: "4px 0 10px" }}>
                ← All protocols
              </button>
              <EvidenceProtocolBrowser initialOperationId={activeOperationId} onAddExercise={onAddExercise} isAdded={isAdded} />
            </>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
              {EVIDENCE_PROTOCOLS.map((op) => (
                <ProtocolTile key={op.id} op={op} onClick={() => setActiveOperationId(op.id)} />
              ))}
            </div>
          )
        )}

        {tab === "Browse by Region" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
            {Object.entries(EXERCISE_DB).map(([key, region]) => (
              <RegionTile key={key} regionKey={key} region={region} onClick={() => { onSelectRegion(key); onClose(); }} />
            ))}
          </div>
        )}

        {tab === "My Clinic Protocols" && (
          <>
            {loadingSaved && <div className="summary-empty">Loading…</div>}
            {!loadingSaved && savedProtocols.length === 0 && (
              <div className="summary-empty">No saved protocols yet — build a programme below and save it as a Clinic Protocol.</div>
            )}
            {savedProtocols.map((p) => (
              <div key={p.id} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.ink, marginBottom: 6 }}>{p.name}</div>
                {(p.exercises || []).map((ex) => (
                  <ExerciseLibraryCard key={ex.id} ex={ex} inProgramme={!!isAdded?.(ex)} onAdd={() => onAddExercise(ex)} onRemove={() => {}} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
