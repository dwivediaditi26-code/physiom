import { useRef, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import { GRADIENTS } from "../shared/constants.js";
import Avatar from "../shared/Avatar.jsx";
import { validateImageFile, compressImage } from "../../lib/media.js";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";

// Bug fix (2026-08-18): there was no way to edit your PhysioFeed profile at
// all -- ProfileHeader.jsx now opens this instead of showing a nonsensical
// "Follow"/"Message" pair on your OWN profile. Saves via
// AppDataContext's updateProfile(), which writes straight to the real
// `profiles` row RLS already scopes to auth.uid() = id (see
// add_profiles_table.sql) -- nobody else can ever edit your profile this way.
//
// Feature (2026-08-18): real profile photo upload. Picking a file
// validates + compresses it client-side (same lib/media.js helpers the
// post composer uses) and uploads it immediately to the profile-images
// Storage bucket via uploadProfileImage() -- the resulting URL is only
// written to your profile row when you hit Save (see add_profile_avatar.sql
// for the migration this needs). The gradient color picker stays as the
// fallback avatar for whenever there's no photo (or it fails to load).
export default function EditProfileModal({ profile, onClose }) {
  const { updateProfile, uploadProfileImage } = useAppData();
  const [name, setName] = useState(profile.name || "");
  const [role, setRole] = useState(profile.role || "");
  const [location, setLocation] = useState(profile.location || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [quote, setQuote] = useState(profile.quote || "");
  const [gradient, setGradient] = useState(profile.gradient || "violet");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoPicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    const err = validateImageFile(file);
    if (err) { setPhotoError(err); return; }
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      const url = await uploadProfileImage(compressed);
      setAvatarUrl(url);
    } catch (uploadErr) {
      setPhotoError(uploadErr.message || "Couldn't upload that photo -- please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async () => {
    if (!name.trim() || saving || uploadingPhoto) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim(), role: role.trim(), location: location.trim(), bio: bio.trim(), quote: quote.trim(), gradient, avatarUrl });
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

        <div className="flex items-center gap-3 mb-2">
          <div className="relative shrink-0">
            <Avatar size={56} grad={gradient} initials={profile.initials} photoUrl={avatarUrl} />
            {uploadingPhoto && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <span className="text-[8px] text-white font-semibold">…</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50"
              >
                {uploadingPhoto ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
              </button>
              {avatarUrl && !uploadingPhoto && (
                <button type="button" onClick={() => setAvatarUrl(null)} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                  Remove
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPicked} />
            <p className="text-[10px] text-slate-400">Or pick a color, used when there's no photo:</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(GRADIENTS).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGradient(g)}
                  aria-label={`Use ${g} avatar color`}
                  className={`w-6 h-6 rounded-full bg-gradient-to-br ${GRADIENTS[g]} ${gradient === g ? "ring-2 ring-offset-2 ring-violet-500" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>

        {photoError && (
          <div className="flex items-start gap-1.5 mb-3 text-xs text-rose-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{photoError}</span>
          </div>
        )}

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
          <button onClick={submit} disabled={!name.trim() || saving || uploadingPhoto} className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
