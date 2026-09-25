import { useState } from "react";
import { createPortal } from "react-dom";

// Shared building blocks for every opportunity create/edit form (originally
// lived only in PostOpportunityModal.jsx; pulled out 2026-09-24 so the
// Create Workshop wizard doesn't duplicate the exact same input styling).

export function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "h-11 w-full text-sm bg-white border border-slate-200 rounded-lg px-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 placeholder:text-sm";
export const textareaCls = "w-full text-sm bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 placeholder:text-sm resize-none";

// Shared by both wizards' edit mode -- reversing a saved opportunity's
// display-formatted fields back into editable form-field values.
export function parseAmount(amount) {
  return amount ? amount.replace(/[^\d.]/g, "") : "";
}
export function splitAudience(str) {
  return str ? str.split(",").map((s) => s.trim()).filter(Boolean) : [];
}
export function highlightValue(opp, label) {
  return opp?.detailHighlights?.find((h) => h.label === label)?.value || "";
}

let comboboxSeq = 0;

// A bare <select> only allows a preset value. Aditi asked for the freedom
// to type a custom one too (2026-09-22) -- e.g. a specialty or setting we
// didn't anticipate. Native input+datalist keeps tap-to-pick suggestions
// while never blocking free text.
export function Combobox({ value, onChange, options, placeholder }) {
  const [listId] = useState(() => `combo-opts-${comboboxSeq++}`);
  return (
    <>
      <input list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      <datalist id={listId}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </>
  );
}

// Single-select pill row -- used for format/experience-level/registration
// method wherever a combobox's free-text escape hatch isn't wanted (these
// are real branches in the form, not just a suggested vocabulary).
export function PillSelect({ value, onChange, options, getLabel = (o) => o, getKey = (o) => o }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const key = getKey(o);
        const active = key === value;
        return (
          <button
            key={String(key)}
            type="button"
            onClick={() => onChange(key)}
            className={`text-xs font-semibold rounded-full px-3.5 py-2 border transition ${active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {getLabel(o)}
          </button>
        );
      })}
    </div>
  );
}

// Multi-select checkbox row -- audience ("BPT Students", "MPT Students", ...).
export function CheckboxGroup({ value, onChange, options }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          {o}
        </label>
      ))}
    </div>
  );
}

// Shared by WorkshopWizard/ApplicationOpportunityForm's edit mode: warns
// before saving a change to a field people already registered/applied
// against (date, venue, registration link, fee/stipend/salary). Notifying
// them is automatic for the DB-column fields it fires on
// (trg_notify_opportunity_details_changed, add_opportunity_change_
// notifications.sql) -- this dialog is the organiser's confirmation step,
// not a separate "also notify" toggle, since price changes live in
// `details` jsonb and that trigger can't see them anyway.
export function CriticalChangeConfirm({ count, noun, changes, onCancel, onConfirm, busy }) {
  const list = changes.length > 1
    ? `${changes.slice(0, -1).join(", ")} and ${changes[changes.length - 1]}`
    : changes[0];
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl">
        <p className="text-sm font-bold text-slate-900 mb-1.5">
          {count} {noun}{count === 1 ? "" : "s"} {count === 1 ? "has" : "have"} already {noun === "applicant" ? "applied" : "registered"}
        </p>
        <p className="text-sm text-slate-600 mb-4">
          Changing {list} may affect them. They'll be notified once you save.
        </p>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={onCancel} disabled={busy} className="flex-1 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl py-3 hover:bg-slate-50 disabled:opacity-40">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="flex-1 text-sm font-bold text-white rounded-xl py-3 bg-gradient-to-r from-indigo-600 to-blue-600 disabled:opacity-40">
            {busy ? "Saving…" : "Save Changes & Notify"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
