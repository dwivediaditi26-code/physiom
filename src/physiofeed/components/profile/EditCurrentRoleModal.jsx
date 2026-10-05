import { useState } from "react";
import { X, AlertCircle, Briefcase } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import { splitDateRange, formatExperienceEntry, parseExperienceEntry, CURRENT_ROLE_MARK } from "./experienceUtils.js";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const TITLES = ["Physiotherapist", "Senior Physiotherapist", "Junior Physiotherapist", "Consultant Physiotherapist", "Sports Physiotherapist", "Physiotherapy Intern", "Clinical Physiotherapist", "Head of Physiotherapy"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const START_HINTS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).flatMap((y) => MONTHS.map((m) => `${m} ${y}`));

// The Current Role card's own editor. It edits ONE entry that belongs to Current Role only -- the
// Experience timeline (EditRotationsModal) never shows it and this never touches Experience.
// Stored as a rotations row whose `department` carries CURRENT_ROLE_MARK (no schema change).
export default function EditCurrentRoleModal({ entry, onClose }) {
  const { addRotation, updateRotation, deleteRotation } = useAppData();
  const parsed = entry ? parseExperienceEntry(entry) : { title: "", organization: "", dateRange: "" };
  const range = splitDateRange(parsed.dateRange);
  const [title, setTitle] = useState(parsed.title);
  const [organization, setOrganization] = useState(parsed.organization);
  const [start, setStart] = useState(range.start);
  const [stillHere, setStillHere] = useState(entry ? /present/i.test(range.end) || !range.end : true);
  const [end, setEnd] = useState(/present/i.test(range.end) ? "" : range.end);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (busy) return;
    if (!title.trim() && !organization.trim()) { setError("Add your role or where you work."); return; }
    const { department, duration } = formatExperienceEntry({ title, organization, start, end: stillHere ? "Present" : end });
    setBusy(true); setError(null);
    try {
      const fields = { department: CURRENT_ROLE_MARK + department, duration };
      if (entry) await updateRotation(entry.id, fields); else await addRotation(fields);
      onClose();
    } catch (e) {
      setError(e.message || "Couldn't save that -- please try again.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true); setError(null);
    try { await deleteRotation(entry.id); onClose(); }
    catch (e) { setError(e.message || "Couldn't remove that -- please try again."); setBusy(false); setConfirmDelete(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <datalist id="current-role-titles">{TITLES.map((t) => <option key={t} value={t} />)}</datalist>
      <datalist id="current-role-dates">{START_HINTS.map((d) => <option key={d} value={d} />)}</datalist>
      <div role="dialog" aria-label="Current role" className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2"><Briefcase size={16} className="text-violet-600" /> Current role</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">What you do now and where. This is separate from your Experience list.</p>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600">Role
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} list="current-role-titles" placeholder="e.g. Physiotherapy Intern" className={`${FIELD} mt-1 font-normal`} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Where
            <input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. M.Y. Hospital, Indore" className={`${FIELD} mt-1 font-normal`} />
          </label>
          <div className="flex items-end gap-2">
            <label className="block text-xs font-semibold text-slate-600 flex-1 min-w-0">Since
              <input value={start} onChange={(e) => setStart(e.target.value)} list="current-role-dates" placeholder="Apr 2026" className={`${FIELD} mt-1 font-normal`} />
            </label>
            {!stillHere && (
              <label className="block text-xs font-semibold text-slate-600 flex-1 min-w-0">Until
                <input value={end} onChange={(e) => setEnd(e.target.value)} list="current-role-dates" placeholder="Oct 2026" className={`${FIELD} mt-1 font-normal`} />
              </label>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none pt-1">
            <input type="checkbox" checked={stillHere} onChange={(e) => setStillHere(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-violet-600" />
            I currently work here
          </label>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-1.5 text-xs text-rose-600 mt-3">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
          {entry ? (
            <button type="button" onClick={remove} disabled={busy} className="text-xs font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-rose-50">
              {confirmDelete ? "Tap again to remove" : "Remove"}
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={save} disabled={busy} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
