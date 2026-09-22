import { useState } from "react";
import { X, Trash2, Plus, AlertCircle } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block";

// Edit Evidence & Contributions tab (2026-09-22 redesign) -- Research
// Interests (freeform chips, same UX as EditClinicalProfileModal.jsx's
// skills/clinical-interests editors) plus the Publications list, same
// per-row save/delete shape as EditAchievementsModal.jsx. The stats row
// (Articles/Case Discussions/Evidence Posts) isn't editable here -- it's
// computed live from the therapist's own posts (see
// EvidenceContributionsTab.jsx), not a field anyone sets directly.
function PublicationRow({ pub }) {
  const { updatePublication, deletePublication } = useAppData();
  const [title, setTitle] = useState(pub.title);
  const [journal, setJournal] = useState(pub.journal || "");
  const [year, setYear] = useState(pub.year || "");
  const [authors, setAuthors] = useState(pub.authors || "");
  const [doiUrl, setDoiUrl] = useState(pub.doiUrl || "");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const dirty = title !== pub.title || journal !== (pub.journal || "") || year !== (pub.year || "")
    || authors !== (pub.authors || "") || doiUrl !== (pub.doiUrl || "");

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updatePublication(pub.id, { title, journal, year, authors, doiUrl });
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
      await deletePublication(pub.id);
    } catch (e) {
      setError(e.message || "Couldn't remove that -- please try again.");
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Publication title" className={FIELD} />
      <input value={journal} onChange={(e) => setJournal(e.target.value)} placeholder="Journal" className={FIELD} />
      <div className="flex gap-1.5">
        <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className={`${FIELD} w-20`} />
        <input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="Authors" className={FIELD} />
      </div>
      <input value={doiUrl} onChange={(e) => setDoiUrl(e.target.value)} placeholder="DOI / link (optional)" className={FIELD} />
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button type="button" onClick={del} disabled={busy} className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-rose-50">
          <Trash2 size={12} /> {confirmDelete ? "Tap again to confirm" : "Delete"}
        </button>
        {dirty && (
          <button type="button" onClick={save} disabled={!title.trim() || busy} className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 px-2 py-1">
            {busy ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

function NewPublicationRow({ onAdded, onCancel }) {
  const { addPublication } = useAppData();
  const [title, setTitle] = useState("");
  const [journal, setJournal] = useState("");
  const [year, setYear] = useState("");
  const [authors, setAuthors] = useState("");
  const [doiUrl, setDoiUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const add = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addPublication({ title, journal, year, authors, doiUrl });
      onAdded();
    } catch (e) {
      setError(e.message || "Couldn't add that -- please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="border border-dashed border-violet-300 rounded-xl p-3 space-y-1.5 bg-violet-50/40">
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Publication title" className={FIELD} />
      <input value={journal} onChange={(e) => setJournal(e.target.value)} placeholder="Journal" className={FIELD} />
      <div className="flex gap-1.5">
        <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className={`${FIELD} w-20`} />
        <input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="Authors" className={FIELD} />
      </div>
      <input value={doiUrl} onChange={(e) => setDoiUrl(e.target.value)} placeholder="DOI / link (optional)" className={FIELD} />
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button type="button" onClick={onCancel} disabled={busy} className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1">Cancel</button>
        <button type="button" onClick={add} disabled={!title.trim() || busy} className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 rounded-lg">
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

export default function EditEvidenceModal({ profile, publications, onClose }) {
  const { updateProfile } = useAppData();
  const [researchInterests, setResearchInterests] = useState(profile.researchInterests || []);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const addInterest = () => {
    const s = draft.trim();
    if (!s || researchInterests.includes(s)) { setDraft(""); return; }
    setResearchInterests((prev) => [...prev, s]);
    setDraft("");
  };
  const removeInterest = (s) => setResearchInterests((prev) => prev.filter((x) => x !== s));

  const saveInterests = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ researchInterests });
    } catch (e) {
      setError(e.message || "Couldn't save your research interests -- please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-base">Evidence & contributions</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
        </div>

        <label className={LABEL}>Research interests</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {researchInterests.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium pl-2.5 pr-1.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
              {s}
              <button type="button" onClick={() => removeInterest(s)} aria-label={`Remove ${s}`} className="hover:text-violet-900"><X size={11} /></button>
            </span>
          ))}
        </div>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addInterest(); } }}
          onBlur={() => { addInterest(); saveInterests(); }}
          placeholder="Type an interest and press Enter (e.g. Exercise therapy)"
          className={`${FIELD} mb-1`}
        />
        {error && (
          <div className="flex items-start gap-1.5 mt-1 mb-2 text-xs text-rose-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="mb-4" />
        <label className={LABEL}>Publications</label>
        <div className="space-y-3 mb-1">
          {publications.length === 0 && !adding && <p className="text-sm text-slate-400 text-center py-3">No publications yet — add your first below.</p>}
          {publications.map((pub) => <PublicationRow key={pub.id} pub={pub} />)}
          {adding ? (
            <NewPublicationRow onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-violet-600 border border-dashed border-violet-300 rounded-xl py-2.5 hover:bg-violet-50"
            >
              <Plus size={14} /> Add publication
            </button>
          )}
        </div>

        <div className="flex items-center justify-end pt-4 mt-3 border-t border-slate-100">
          <button onClick={() => { saveInterests(); onClose(); }} disabled={saving} className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
            {saving ? "Saving…" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
