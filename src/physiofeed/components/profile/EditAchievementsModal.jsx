import { useState } from "react";
import { X, Trash2, Plus, AlertCircle } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import { Icon } from "../shared/icons.jsx";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const ICON_OPTIONS = ["Trophy", "Award", "Star", "Sparkles"];
const TONE_OPTIONS = [
  { value: "text-amber-500", swatch: "bg-amber-500" },
  { value: "text-violet-600", swatch: "bg-violet-600" },
  { value: "text-rose-500", swatch: "bg-rose-500" },
  { value: "text-emerald-600", swatch: "bg-emerald-600" },
  { value: "text-blue-500", swatch: "bg-blue-500" },
];

// Feature (2026-08-19): real editing for the Achievements card -- same
// per-row save/delete shape as EditEducationModal.jsx (see that file's
// header comment for the reasoning). The one addition here is a color
// ("tone") swatch picker, since achievements render their icon in a
// specific color (AchievementsCard.jsx's `a.tone` class).
function IconPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5 shrink-0">
      {ICON_OPTIONS.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          aria-label={`Use ${name} icon`}
          className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
            value === name ? "border-violet-500 bg-violet-50 text-violet-600" : "border-slate-200 text-slate-400 hover:bg-slate-50"
          }`}
        >
          <Icon name={name} size={14} />
        </button>
      ))}
    </div>
  );
}

function TonePicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {TONE_OPTIONS.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          aria-label={`Use ${t.value} color`}
          className={`w-5 h-5 rounded-full ${t.swatch} ${value === t.value ? "ring-2 ring-offset-1 ring-violet-500" : ""}`}
        />
      ))}
    </div>
  );
}

// One existing achievement. "demo-" ids (see mockData.js) only ever show
// up when no real list has loaded yet (signed out, or the migration
// hasn't run) -- Save/Delete on one of those surfaces the same "sign in
// to edit" error every other write in db.js throws in that situation.
function EntryRow({ entry }) {
  const { updateAchievement, deleteAchievement } = useAppData();
  const [title, setTitle] = useState(entry.title);
  const [subtitle, setSubtitle] = useState(entry.subtitle);
  const [iconName, setIconName] = useState(entry.iconName);
  const [tone, setTone] = useState(entry.tone);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const dirty = title !== entry.title || subtitle !== entry.subtitle || iconName !== entry.iconName || tone !== entry.tone;

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateAchievement(entry.id, { title, subtitle, iconName, tone });
      setTitle((t) => t.trim());
      setSubtitle((s) => s.trim());
    } catch (e) {
      setError(e.message || "Couldn't save that -- please try again.");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAchievement(entry.id);
      // Row unmounts once the parent's `achievements` list drops this id.
    } catch (e) {
      setError(e.message || "Couldn't remove that -- please try again.");
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        <IconPicker value={iconName} onChange={setIconName} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Top Contributor" className={FIELD} />
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. PhysioLink Community · 2026" className={FIELD} />
        </div>
      </div>
      <TonePicker value={tone} onChange={setTone} />
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-rose-50"
        >
          <Trash2 size={12} /> {confirmDelete ? "Tap again to confirm" : "Delete"}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={!title.trim() || busy}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 px-2 py-1"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

// A not-yet-saved row -- separate from EntryRow because there's nothing to
// update/delete on the server until the first successful Add.
function NewEntryRow({ onAdded, onCancel }) {
  const { addAchievement } = useAppData();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [iconName, setIconName] = useState("Trophy");
  const [tone, setTone] = useState("text-amber-500");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const add = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addAchievement({ title, subtitle, iconName, tone });
      onAdded();
    } catch (e) {
      setError(e.message || "Couldn't add that -- please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="border border-dashed border-violet-300 rounded-xl p-3 space-y-2 bg-violet-50/40">
      <div className="flex items-start gap-2">
        <IconPicker value={iconName} onChange={setIconName} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Top Contributor" className={FIELD} />
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. PhysioLink Community · 2026" className={FIELD} />
        </div>
      </div>
      <TonePicker value={tone} onChange={setTone} />
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1">
          Cancel
        </button>
        <button
          type="button"
          onClick={add}
          disabled={!title.trim() || busy}
          className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 rounded-lg"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

export default function EditAchievementsModal({ entries, onClose }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-base">Achievements</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {entries.length === 0 && !adding && <p className="text-sm text-slate-400 text-center py-4">No achievements yet — add your first below.</p>}
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
          {adding ? (
            <NewEntryRow onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-violet-600 border border-dashed border-violet-300 rounded-xl py-2.5 hover:bg-violet-50"
            >
              <Plus size={14} /> Add achievement
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
