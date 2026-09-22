import { useRef, useState } from "react";
import { X, AlertCircle, FileText, Upload } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import { validateResumeFile } from "../../lib/media.js";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";

// Edit Clinical Profile & CV (2026-09-21, Aditi's brief). Same
// read-fields-into-local-state / one-Save-button shape as
// EditProfileModal.jsx right next to this (skills/title/college/phone/
// résumé/preferences are all plain columns on the same `profiles` row,
// same reasoning as why that modal saves bio/quote/experience together
// rather than one field at a time like Education/Achievements' own rows
// do). See ClinicalCard.jsx for why this is a separate small modal
// rather than Aditi's one combined wireframe -- rotations and
// achievements/CME already have their own cards + modals.
export default function EditClinicalProfileModal({ profile, onClose }) {
  const { updateProfile, uploadResume } = useAppData();
  const [clinicalTitle, setClinicalTitle] = useState(profile.clinicalTitle || "");
  const [college, setCollege] = useState(profile.college || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [skills, setSkills] = useState(profile.skills || []);
  const [skillDraft, setSkillDraft] = useState("");
  const [openToWork, setOpenToWork] = useState(profile.openToWork !== false);
  const [willingToRelocate, setWillingToRelocate] = useState(!!profile.willingToRelocate);
  const [resumeUrl, setResumeUrl] = useState(profile.resumeUrl || null);
  const [resumeName, setResumeName] = useState(profile.resumeName || null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const addSkill = () => {
    const s = skillDraft.trim();
    if (!s || skills.includes(s)) { setSkillDraft(""); return; }
    setSkills((prev) => [...prev, s]);
    setSkillDraft("");
  };
  const removeSkill = (s) => setSkills((prev) => prev.filter((x) => x !== s));

  const handleResumePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResumeError(null);
    const err = validateResumeFile(file);
    if (err) { setResumeError(err); return; }
    setUploadingResume(true);
    try {
      const url = await uploadResume(file);
      setResumeUrl(url);
      setResumeName(file.name);
    } catch (uploadErr) {
      setResumeError(uploadErr.message || "Couldn't upload that file -- please try again.");
    } finally {
      setUploadingResume(false);
    }
  };

  const submit = async () => {
    if (saving || uploadingResume) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        clinicalTitle: clinicalTitle.trim(), college: college.trim(), phone: phone.trim(),
        skills, openToWork, willingToRelocate, resumeUrl, resumeName,
      });
      onClose();
    } catch (e) {
      setError(e.message || "Couldn't save your clinical profile -- please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-base">Clinical profile & CV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
        </div>

        <label className={LABEL}>Professional title / degree</label>
        <input value={clinicalTitle} onChange={(e) => setClinicalTitle(e.target.value)} placeholder="e.g. BPT Intern (Final Year)" className={`${FIELD} mb-3`} />

        <label className={LABEL}>College / affiliation</label>
        <input value={college} onChange={(e) => setCollege(e.target.value)} placeholder="e.g. BMHRC, Bhopal" className={`${FIELD} mb-3`} />

        <label className={LABEL}>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" className={FIELD} />
        <p className="text-[11px] text-slate-400 mt-1 mb-3">Never shown on your profile — only sent when you message a clinic about a listing.</p>

        <label className={LABEL}>Résumé (PDF)</label>
        {resumeUrl ? (
          <div className="flex items-center gap-2.5 border border-slate-200 rounded-lg px-2.5 py-2 mb-1">
            <FileText size={16} className="text-violet-500 shrink-0" />
            <span className="text-sm text-slate-700 truncate flex-1 min-w-0">{resumeName || "Résumé.pdf"}</span>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingResume} className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50 shrink-0">
              {uploadingResume ? "Uploading…" : "Replace"}
            </button>
            <button type="button" onClick={() => { setResumeUrl(null); setResumeName(null); }} disabled={uploadingResume} className="text-xs font-medium text-slate-400 hover:text-slate-600 shrink-0">
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingResume}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-violet-600 border border-dashed border-violet-300 rounded-lg py-2.5 mb-1 hover:bg-violet-50 disabled:opacity-50"
          >
            <Upload size={14} /> {uploadingResume ? "Uploading…" : "Upload résumé"}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleResumePicked} />
        {resumeError && (
          <div className="flex items-start gap-1.5 mb-2 text-xs text-rose-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{resumeError}</span>
          </div>
        )}
        <div className="mb-3" />

        <label className={LABEL}>Clinical skills & workshops</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {skills.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium pl-2.5 pr-1.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
              {s}
              <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`} className="hover:text-violet-900"><X size={11} /></button>
            </span>
          ))}
        </div>
        <input
          value={skillDraft}
          onChange={(e) => setSkillDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(); }
          }}
          onBlur={addSkill}
          placeholder="Type a skill and press Enter (e.g. Kinesio Taping)"
          className={`${FIELD} mb-4`}
        />

        <label className={LABEL}>Opportunity preferences</label>
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="radio" name="openToWork" checked={openToWork} onChange={() => setOpenToWork(true)} className="w-4 h-4 text-violet-600 focus:ring-violet-300" />
            <span className="text-sm text-slate-700">Open to internships & jobs</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="radio" name="openToWork" checked={!openToWork} onChange={() => setOpenToWork(false)} className="w-4 h-4 text-violet-600 focus:ring-violet-300" />
            <span className="text-sm text-slate-700">Not looking right now</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input type="checkbox" checked={willingToRelocate} onChange={(e) => setWillingToRelocate(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-300" />
            <span className="text-sm text-slate-700">Willing to relocate to other cities</span>
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-1.5 mb-3 text-xs text-rose-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving || uploadingResume} className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
