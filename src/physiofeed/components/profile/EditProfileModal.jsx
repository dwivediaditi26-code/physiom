import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import { GRADIENTS } from "../shared/constants.js";
import Avatar from "../shared/Avatar.jsx";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";

// Bug fix (2026-08-18): there was no way to edit your PhysioFeed profile at
// all -- ProfileHeader.jsx now opens this instead of showing a nonsensical
// "Follow"/"Message" pair on your OWN profile. Saves via
// AppDataContext's updateProfile(), which writes straight to the real
// `profiles` row RLS already scopes to auth.uid() = id (see
// add_profiles_table.sql) -- nobody else can ever edit your profile this way.
export default function EditProfileModal({ profile, onClose }) {
  const { updateProfile } = useAppData();
  const [name, setName] = useState(profile.name || "");
  const [role, setRole] = useState(profile.role || "");
  const [location, setLocation] = useState(profile.location || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [quote, setQuote] = useState(profile.quote || "");
  const [gradient, setGradient] = useState(profile.gradient || "violet");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim(), role: role.trim(), location: location.trim(), bio: bio.trim(), quote: quote.trim(), gradient });
      onClose();
    } catch (e) {
      setError(e.message || "Couldn't save your profile -- please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-base">Edit profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Avatar size={56} grad={gradient} initials={profile.initials} />
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(GRADIENTS).map((g) => (
              <button
                key={g}
                onClick={() => setGradient(g)}
                aria-label={`Use ${g} avatar color`}
                className={`w-6 h-6 rounded-full bg-gradient-to-br ${GRADIENTS[g]} ${gradient === g ? "ring-2 ring-offset-2 ring-violet-500" : ""}`}
              />
            ))}
          </div>
        </div>

        <label className={LABEL}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${FIELD} mb-3`} />

        <label className={LABEL}>Role / title</label>
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Sports Physiotherapist · Mumbai" className={`${FIELD} mb-3`} />

        <label className={LABEL}>Location</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mumbai, Maharashtra, India" className={`${FIELD} mb-3`} />

        <label className={LABEL}>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={`${FIELD} mb-3 resize-none`} />

        <label className={LABEL}>Quote</label>
        <input value={quote} onChange={(e) => setQuote(e.target.value)} className={`${FIELD} mb-3`} />

        {error && (
          <div className="flex items-start gap-1.5 mb-3 text-xs text-rose-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={!name.trim() || saving} className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
