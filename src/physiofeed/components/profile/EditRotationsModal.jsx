import { useState } from "react";
import { X, Trash2, Plus, AlertCircle, Building2 } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import { splitDateRange, formatExperienceEntry } from "./experienceUtils.js";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
// Suggestions, not an enum -- a text input with a <datalist> nudges
// toward standard wording (Aditi's brief: "makes everyone's profile
// uniformly comparable for clinic owners") without a rigid dropdown that
// would reject a role that doesn't fit one of these.
const TITLES = ["Physiotherapist", "Senior Physiotherapist", "Junior Physiotherapist", "Consultant Physiotherapist", "Sports Physiotherapist", "Physiotherapy Intern", "Clinical Physiotherapist", "Head of Physiotherapy"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_HINTS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).flatMap((y) => MONTHS.map((m) => `${m} ${y}`));
const END_HINTS = ["Present", ...DATE_HINTS];

// 2026-09-22: this modal used to collect the ORIGINAL rotations-table
// shape -- a department ("Ortho & MSK OPD") and a duration ("4 Months").
// The profile redesign turned Experience into LinkedIn-style Title /
// Organization / date-range cards, and RotationsCard.jsx parses those
// same two text columns back apart via experienceUtils.js. The writer
// was never updated to match, so anything added here rendered with no
// title and a length-of-stay where a date range belongs. Four friendly
// fields now, recombined into department/duration by
// formatExperienceEntry() -- still no schema migration, see mockData.js's
// ROTATIONS comment for why those two columns carry richer text instead.
function fieldsFrom(entry) {
  const [titlePart, orgPart] = (entry?.department || "").split(" — ");
  const { start, end } = splitDateRange(entry?.duration);
  return {
    title: orgPart ? titlePart.trim() : "",
    organization: orgPart ? orgPart.trim() : (entry?.department || "").trim(),
    start,
    end,
  };
}

function Fields({ value, onChange, autoFocus }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="flex-1 min-w-0 space-y-1.5">
      <input autoFocus={autoFocus} value={value.title} onChange={set("title")} list="experience-titles" placeholder="Role — e.g. Senior Physiotherapist" className={FIELD} />
      <input value={value.organization} onChange={set("organization")} placeholder="Organization — e.g. Apollo Hospital, Mumbai" className={FIELD} />
      <div className="flex items-center gap-1.5">
        <input value={value.start} onChange={set("start")} list="experience-dates" placeholder="Jan 2024" className={FIELD} />
        <span className="text-xs text-slate-400 shrink-0">–</span>
        <input value={value.end} onChange={set("end")} list="experience-end-dates" placeholder="Present" className={FIELD} />
      </div>
    </div>
  );
}

// Same three-piece shape (EntryRow / NewEntryRow / the modal shell) as
// EditEducationModal.jsx -- each row saves/deletes itself individually,
// see that file's comments for the fuller reasoning.
function EntryRow({ entry }) {
  const { updateRotation, deleteRotation } = useAppData();
  const [fields, setFields] = useState(() => fieldsFrom(entry));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const { department, duration } = formatExperienceEntry(fields);
  const dirty = department !== entry.department || duration !== (entry.duration || "");

  const save = async () => {
    if (!department.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateRotation(entry.id, { department, duration });
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
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5"><Building2 size={14} className="text-slate-600" /></div>
        <Fields value={fields} onChange={setFields} />
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
  const [fields, setFields] = useState({ title: "", organization: "", start: "", end: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const { department, duration } = formatExperienceEntry(fields);

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
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5"><Building2 size={14} className="text-slate-600" /></div>
        <Fields value={fields} onChange={setFields} autoFocus />
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
      <datalist id="experience-titles">{TITLES.map((t) => <option key={t} value={t} />)}</datalist>
      <datalist id="experience-dates">{DATE_HINTS.map((d) => <option key={d} value={d} />)}</datalist>
      <datalist id="experience-end-dates">{END_HINTS.map((d) => <option key={d} value={d} />)}</datalist>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-900 text-base">Experience</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Roles you've held — clinical jobs, internships and training postings. Use “Present” as the end date for where you work now.</p>

        <div className="space-y-3">
          {entries.length === 0 && !adding && <p className="text-sm text-slate-400 text-center py-4">No experience yet — add your first role below.</p>}
          {entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)}
          {adding ? (
            <NewEntryRow onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-700 border border-dashed border-slate-300 rounded-xl py-2.5 hover:bg-slate-50">
              <Plus size={14} /> Add role
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
