import React, { useState } from "react";

/* ============================================================
   ASSESSMENT FRAME — pieces every assessment wizard shares.

   Used by Ortho (Outpatient / IPD / Post-op), Neuro and Cardio. The step
   bar and form fields live in orthoFieldKit.jsx; the summary rows in
   orthoSummary.jsx (rowsForStep).
   ============================================================ */

/* "+ Add" popup: a searchable checklist of assessments to add to (or remove
   from) the current assessment.

   groups: [{ key, title, items: [{ id, label, icon? }] }]
     Ortho passes one group ("AVAILABLE ASSESSMENTS") whose items carry an
     icon; Neuro and Cardio pass one group per category.
   onToggle(item, group) is called with the tapped item.
   hideEmptyGroups: hide a group whose items all fail the search (Neuro/Cardio).
   autoFocusSearch: put the cursor in the search box on open (Ortho). */
export function AddAssessmentModal({ title, groups, isChecked, onToggle, onClose, hideEmptyGroups = false, autoFocusSearch = false }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">{title}</div>
        <button type="button" className="ct-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="ct-search-wrap">
        <input className="ct-search" placeholder="🔍 Search assessment..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocusSearch} />
      </div>
      <div className="ct-modal-body">
        {groups.map((group) => {
          const items = query ? group.items.filter((it) => it.label.toLowerCase().includes(query)) : group.items;
          if (hideEmptyGroups && !items.length) return null;
          return (
            <div className="ct-group" key={group.key}>
              <div className="ct-group-title">{group.title}</div>
              {items.map((it) => {
                const checked = isChecked(it.id);
                return (
                  <button type="button" key={it.id} className={"ct-item" + (checked ? " ct-item-checked" : "")} onClick={() => onToggle(it, group)}>
                    <span className="ct-checkbox">{checked ? "☑" : "☐"}</span>
                    <span>{it.icon != null ? <>{it.icon} {it.label}</> : it.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="ct-modal-footer">
        <button type="button" className="primary-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
