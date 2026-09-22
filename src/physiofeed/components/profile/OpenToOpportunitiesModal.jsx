import { useState } from "react";
import { X, Briefcase } from "lucide-react";
import { OPPORTUNITY_TYPES } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

// Own-profile editor for the header's small "Open to Opportunities" pill
// (2026-09-22 redesign). Used to be a row of always-visible pills right in
// the header; the brief wants that collapsed down to one small pill that
// only expands into this toggle-chip picker on tap. Violet accent, matching
// ProfileHeader.jsx -- never green (Aditi: "dnt make it green at all"),
// but the app's own existing violet brand is fine.
export default function OpenToOpportunitiesModal({ profile, onClose }) {
  const { updateProfile } = useAppData();
  const [selected, setSelected] = useState(profile.openToTypes || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (type) => {
    setSelected((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await updateProfile({ openToTypes: selected });
      onClose();
    } catch (e) {
      setError(e.message || "Couldn't save. Sign in to edit your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="pf-font-head flex items-center gap-2 text-sm font-extrabold text-slate-900"><Briefcase size={16} /> Open to Opportunities</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500 mb-3">Choose what you're currently open to. This shows as a small pill on your profile.</p>
          <div className="flex flex-wrap gap-2">
            {OPPORTUNITY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggle(type)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  selected.includes(type) ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
