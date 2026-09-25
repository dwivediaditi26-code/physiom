import { useState } from "react";
import { X, Trash2, Plus, AlertCircle } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const SELECT = "text-sm text-slate-700 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300 bg-white";

// Same fixed type vocabulary as CONTRIBUTIONS in mockData.js; also what
// gets rendered as the small uppercase category label on the profile
// card (ProfessionalContributionsSection.jsx). Free-text "Other" is a
// deliberate escape hatch for anything unusual, saved to the same text
// column with no separate flag.
const TYPE_OPTIONS = [
  "Workshop",
  "Conference Presentation",
  "Guest Lecture",
  "Award",
  "Teaching",
  "Poster",
  "Case Report",
  "Other",
];

// One existing contribution. Same per-row save/delete shape as
// EditAchievementsModal.jsx -- see that file for the wider conventions
// (dirty-only Save button, confirm-then-delete, in-row error line).
function EntryRow({ entry }) {
  const { updateContribution, deleteContribution } = useAppData();
  const [type, setType] = useState(entry.type || "Workshop");
  const [title, setTitle] = useState(entry.title);
  const [year, setYear] = useState(entry.year || "");
  const [location, setLocation] = useState(entry.location || "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const dirty = type !== (entry.type || "Workshop") || title !== entry.title
    || year !== (entry.year || "") || location !== (entry.location || "");

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateContribution(entry.id, { type, title, year, location });
      setTitle((t) => t.trim());
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
      await deleteContribution(entry.id);
    } catch (e) {
      setError(e.message || "Couldn't remove that -- please try again.");
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-2">
      <select value={type} onChange={(e) => setType(e.target.value)} className={`${SELECT} w-full`}>
        {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Movement Assessment in Sports Injuries" className={FIELD} />
      <div className="flex gap-1.5">
        <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className={`${FIELD} w-24`} />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className={FIELD} />
      </div>
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={del} disabled={busy}
          className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-rose-50">
          <Trash2 size={12} /> {confirmDelete ? "Tap again to confirm" : "Delete"}
        </button>
        {dirty && (
          <button type="button" onClick={save} disabled={!title.trim() || busy}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 px-2 py-1">
            {busy ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

function NewEntryRow({ onAdded, onCancel }) {
  const { addContribution } = useAppData();
  const [type, setType] = useState("Workshop");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const add = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addContribution({ type, title, year, location });
      onAdded();
    } catch (e) {
      setError(e.message || "Couldn't add that -- please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="border border-dashed border-violet-300 rounded-xl p-3 space-y-2 bg-violet-50/40">
      <select value={type} onChange={(e) => setType(e.target.value)} className={`${SELECT} w-full`}>
        {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Movement Assessment in Sports Injuries" className={FIELD} />
      <div className="flex gap-1.5">
        <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className={`${FIELD} w-24`} />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className={FIELD} />
      </div>
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1">
          Cancel
        </button>
        <button type="button" onClick={add} disabled={!title.trim() || busy}
          className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 rounded-lg">
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

export default function EditContributionsModal({ entries, onClose }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-base">Professional evidence</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {entries.length === 0 && !adding && (
            <p className="text-sm text-slate-400 text-center py-4">No contributions yet — add your first below.</p>
          )}
          {entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)}
          {adding ? (
            <NewEntryRow onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <button type="button" onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-700 border border-dashed border-slate-300 rounded-xl py-2.5 hover:bg-slate-50">
              <Plus size={14} /> Add contribution
            </button>
          )}
        </div>

        <div className="flex items-center justify-end pt-4 mt-1 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
