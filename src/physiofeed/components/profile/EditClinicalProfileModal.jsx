import { useRef, useState } from "react";
import { X, AlertCircle, FileText, Upload } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import { validateResumeFile } from "../../lib/media.js";
import { OPPORTUNITY_TYPES } from "../shared/constants.js";

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
  const [clinicalInterests, setClinicalInterests] = useState(profile.clinicalInterests || []);
  const [interestDraft, setInterestDraft] = useState("");
  const [openToTypes, setOpenToTypes] = useState(profile.openToTypes || []);
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

  const addInterest = () => {
    const s = interestDraft.trim();
    if (!s || clinicalInterests.includes(s)) { setInterestDraft(""); return; }
    setClinicalInterests((prev) => [...prev, s]);
    setInterestDraft("");
  };
  const removeInterest = (s) => setClinicalInterests((prev) => prev.filter((x) => x !== s));

  const toggleOpenToType = (t) => {
    setOpenToTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

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
        skills, clinicalInterests, openToTypes, willingToRelocate, resumeUrl, resumeName,
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
      {/* Same fix as EditProfileModal.jsx (2026-09-22, Aditi: "save option
          not coming... its hiding"): Save/Cancel used to sit at the bottom
          of the SAME scrolling block as every field above -- with this many
          fields (title/college/phone/résumé/skills/interests/open-to/
          relocate) they could easily end up below the fold on a mobile
          viewport with no obvious way to reach them. Split into a fixed-
          height flex column -- header, a `flex-1 overflow-y-auto` middle
          that scrolls its own fields, and a footer that's a normal flex
          sibling after it -- pinned in view no matter how tall the field
          list gets, this modal just never got that same fix applied when
          it was split out of EditProfileModal.jsx. */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="font-bold text-slate-900 text-base">Clinical profile & CV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
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
            <FileText size={16} className="text-slate-500 shrink-0" />
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
            <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium pl-2.5 pr-1.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
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

        <label className={LABEL}>Clinical interests</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {clinicalInterests.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium pl-2.5 pr-1.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
              {s}
              <button type="button" onClick={() => removeInterest(s)} aria-label={`Remove ${s}`} className="hover:text-violet-900"><X size={11} /></button>
            </span>
          ))}
        </div>
        <input
          value={interestDraft}
          onChange={(e) => setInterestDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addInterest(); }
          }}
          onBlur={addInterest}
          placeholder="Type an interest and press Enter (e.g. Low Back Pain)"
          className={`${FIELD} mb-4`}
        />

        <label className={LABEL}>Open to opportunities</label>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {OPPORTUNITY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleOpenToType(t)}
              aria-pressed={openToTypes.includes(t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                openToTypes.includes(t) ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none mb-4">
          <input type="checkbox" checked={willingToRelocate} onChange={(e) => setWillingToRelocate(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-300" />
          <span className="text-sm text-slate-700">Willing to relocate to other cities</span>
        </label>

        {error && (
          <div className="flex items-start gap-1.5 mb-3 text-xs text-rose-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        <div className="pb-4" />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving || uploadingResume} className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
