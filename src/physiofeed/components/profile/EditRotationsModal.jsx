import { useState } from "react";
import { X, Trash2, Plus, AlertCircle, Stethoscope } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
// Suggestions, not an enum -- a text input with a <datalist> nudges
// toward standard department names (Aditi's brief: "makes everyone's
// profile uniformly comparable for clinic owners") without a rigid
// dropdown that would reject a rotation that doesn't fit one of these.
const DEPARTMENTS = ["Ortho & MSK OPD", "Neuro Rehabilitation", "ICU & Cardiopulmonary", "Paediatrics", "Sports Injury Clinic", "Geriatrics", "Women's Health", "Community / Home Health"];
const DURATIONS = ["2 Weeks", "1 Month", "2 Months", "3 Months", "4 Months", "6 Months", "1 Year", "2+ Years"];

// Same three-piece shape (EntryRow / NewEntryRow / the modal shell) as
// EditEducationModal.jsx -- each row saves/deletes itself individually,
// see that file's comments for the fuller reasoning.
function EntryRow({ entry }) {
  const { updateRotation, deleteRotation } = useAppData();
  const [department, setDepartment] = useState(entry.department);
  const [duration, setDuration] = useState(entry.duration);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const dirty = department !== entry.department || duration !== entry.duration;

  const save = async () => {
    if (!department.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateRotation(entry.id, { department, duration });
      setDepartment((d) => d.trim());
      setDuration((d) => d.trim());
    } catch (e) {
      setError(e.message || "Couldn't save that -- please try again.");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    setError(null);
    try {
      await deleteRotation(entry.id);
    } catch (e) {
      setError(e.message || "Couldn't remove that -- please try again.");
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 mt-0.5"><Stethoscope size={14} className="text-violet-600" /></div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <input value={department} onChange={(e) => setDepartment(e.target.value)} list="rotation-departments" placeholder="e.g. Ortho & MSK OPD" className={FIELD} />
          <input value={duration} onChange={(e) => setDuration(e.target.value)} list="rotation-durations" placeholder="e.g. 4 Months" className={FIELD} />
        </div>
      </div>
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={del} disabled={busy} className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-rose-50">
          <Trash2 size={12} /> {confirmDelete ? "Tap again to confirm" : "Delete"}
        </button>
        {dirty && (
          <button type="button" onClick={save} disabled={!department.trim() || busy} className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 px-2 py-1">
            {busy ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

function NewEntryRow({ onAdded, onCancel }) {
  const { addRotation } = useAppData();
  const [department, setDepartment] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const add = async () => {
    if (!department.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addRotation({ department, duration });
      onAdded();
    } catch (e) {
      setError(e.message || "Couldn't add that -- please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="border border-dashed border-violet-300 rounded-xl p-3 space-y-2 bg-violet-50/40">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 mt-0.5"><Stethoscope size={14} className="text-violet-600" /></div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <input autoFocus value={department} onChange={(e) => setDepartment(e.target.value)} list="rotation-departments" placeholder="e.g. Ortho & MSK OPD" className={FIELD} />
          <input value={duration} onChange={(e) => setDuration(e.target.value)} list="rotation-durations" placeholder="e.g. 4 Months" className={FIELD} />
        </div>
      </div>
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1">Cancel</button>
        <button type="button" onClick={add} disabled={!department.trim() || busy} className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 rounded-lg">
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

export default function EditRotationsModal({ entries, onClose }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <datalist id="rotation-departments">{DEPARTMENTS.map((d) => <option key={d} value={d} />)}</datalist>
      <datalist id="rotation-durations">{DURATIONS.map((d) => <option key={d} value={d} />)}</datalist>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-base">Clinical rotations & postings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          {entries.length === 0 && !adding && <p className="text-sm text-slate-400 text-center py-4">No rotations yet — add your first below.</p>}
          {entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)}
          {adding ? (
            <NewEntryRow onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-violet-600 border border-dashed border-violet-300 rounded-xl py-2.5 hover:bg-violet-50">
              <Plus size={14} /> Add rotation
            </button>
          )}
        </div>

        <div className="flex items-center justify-end pt-4 mt-1 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50">Done</button>
        </div>
      </div>
    </div>
  );
}
