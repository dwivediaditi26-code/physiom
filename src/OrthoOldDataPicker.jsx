import React, { useState } from "react";
import { Hint } from "./orthoFieldKit.jsx";
import { listOldPatientRecords, updatesFromOldRecord } from "./orthoAiIntake.js";

/* ============================================================
   OrthoOldDataPicker — the "select from old patient data" third
   option of the AI-assisted Subjective step, as an actual list
   (2026-09-03, Aditi: "when I click on select from old patient
   data, it is not giving me the list of old patient data to
   select from").

   Before this, tapping that option silently imported one hardcoded
   source (the old flow's flat cc_, pmh_ and goal_ fields) with no
   list, no preview, and no way to choose a different record --
   which, when that source happened to be empty, looked like a
   button that did nothing at all.

   Now it opens every prior record this patient actually has (see
   listOldPatientRecords in orthoAiIntake.js: each saved Ortho
   assessment snapshot, plus the old-flow Subjective Assessment),
   newest source first, each showing what it would bring in before
   anything is applied. onApply receives the same
   { subjective, pain } shape the AI intake produces, so the caller
   merges both paths through one code path.
   ============================================================ */
export default function OrthoOldDataPicker({ patientData, onApply, onClose, embedded }) {
  const records = listOldPatientRecords(patientData);
  const [openId, setOpenId] = useState(records.length === 1 ? records[0].id : null);

  if (!records.length) {
    return (
      <div className="ai-intake-panel">
        <div className="ai-intake-head">
          <span>📋 Old patient data</span>
          {onClose && (
            <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
        <Hint>
          Nothing on file for this patient yet — no saved Ortho assessment and no earlier Subjective Assessment to pull forward. Say it in your own words above, or write it in manually below.
        </Hint>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "ai-intake-panel"}>
      {!embedded && (
        <div className="ai-intake-head">
          <span>📋 Select from old patient data</span>
          {onClose && (
            <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
      )}
      <Hint>
        {records.length} record{records.length > 1 ? "s" : ""} on file for this patient. Tap one to see exactly what it would bring in — nothing is copied until you tap Use this record, and it only fills fields you've left blank.
      </Hint>
      {records.map((r) => {
        const open = openId === r.id;
        return (
          <div key={r.id} className={"obj-item" + (open ? " obj-item-selected" : "")}>
            <div className="obj-item-row" role="button" onClick={() => setOpenId(open ? null : r.id)}>
              <div className="obj-item-row-label">
                <span className="obj-item-row-name">
                  {r.icon} {r.label}
                </span>
                {r.sublabel && <span className="obj-item-row-sub">{r.sublabel}</span>}
              </div>
              <div className="obj-item-row-right">
                <span className="obj-item-row-summary">{r.rows.length} field{r.rows.length > 1 ? "s" : ""}</span>
                <span className={"obj-item-chevron" + (open ? " open" : "")}>⌄</span>
              </div>
            </div>
            {open && (
              <div className="obj-item-body">
                {r.rows.map((row) => (
                  <div className="obj-how-row" key={row.label}>
                    <div className="obj-how-label">{row.label}</div>
                    <div className="obj-how-val">{row.value}</div>
                  </div>
                ))}
                <button
                  type="button"
                  className="primary-btn"
                  style={{ width: "100%", marginTop: 10 }}
                  onClick={() => onApply(updatesFromOldRecord(r))}
                >
                  Use this record
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Read-only "as extracted" panel -- shows the AI's own extraction
   verbatim (2026-09-03, Aditi: "Subjective assessment from AI should
   [be] shown same as it is as extracted"). The structured mapping
   fills the form fields it has a home for; this shows every extracted
   value, including the ones this wizard has no dedicated field for,
   so nothing the clinician dictated silently disappears. */
export function AiExtractedPanel({ rows = [] }) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;
  return (
    <>
      <button type="button" className={"obj-findings-toggle" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)}>
        <span>✨ AI extracted from your narrative · {rows.length}</span>
        <span className="obj-findings-chev">⌄</span>
      </button>
      {open && (
        <div className="obj-item-body">
          {rows.map((row) => (
            <div className="obj-how-row" key={row.key}>
              <div className="obj-how-label">{row.label}</div>
              <div className="obj-how-val">{row.value}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
