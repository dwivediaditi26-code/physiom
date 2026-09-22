import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import {
  AREA_OF_PRACTICE, CLINICAL_SKILLS_ASSESSMENT, CLINICAL_SKILLS_TREATMENT, PATIENT_POPULATIONS,
} from "../shared/constants.js";

const FIELD = "w-full text-sm text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 rounded-lg px-2.5 py-2 focus:border-violet-300";
const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block";

// Edit Clinical Profile tab (2026-09-22 redesign) -- Areas of Practice,
// Clinical Skills (Assessment/Treatment) and Patient Populations are all
// picked from a fixed list (see shared/constants.js) rather than typed
// freeform, per the spec: "Allow therapists to select their skills rather
// than forcing every therapist to fill every field." Same read-fields-
// into-local-state/single-Save shape as EditClinicalProfileModal.jsx.
function ChipPicker({ options, value, onChange }) {
  const toggle = (opt) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          aria-pressed={value.includes(opt)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            value.includes(opt) ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function EditClinicalSkillsModal({ profile, onClose }) {
  const { updateProfile } = useAppData();
  const [areaOfPractice, setAreaOfPractice] = useState(profile.areaOfPractice || []);
  const [assessment, setAssessment] = useState(profile.clinicalSkillsAssessment || []);
  const [treatment, setTreatment] = useState(profile.clinicalSkillsTreatment || []);
  const [patientPopulations, setPatientPopulations] = useState(profile.patientPopulations || []);
  const [clinicalApproach, setClinicalApproach] = useState(profile.clinicalApproach || "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        areaOfPractice, clinicalSkillsAssessment: assessment, clinicalSkillsTreatment: treatment,
        patientPopulations, clinicalApproach: clinicalApproach.trim(),
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
          <h2 className="font-bold text-slate-900 text-base">Clinical profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
        </div>

        <label className={LABEL}>Areas of practice</label>
        <ChipPicker options={AREA_OF_PRACTICE} value={areaOfPractice} onChange={setAreaOfPractice} />

        <label className={LABEL}>Clinical skills — assessment</label>
        <ChipPicker options={CLINICAL_SKILLS_ASSESSMENT} value={assessment} onChange={setAssessment} />

        <label className={LABEL}>Clinical skills — treatment</label>
        <ChipPicker options={CLINICAL_SKILLS_TREATMENT} value={treatment} onChange={setTreatment} />

        <label className={LABEL}>Patient populations</label>
        <ChipPicker options={PATIENT_POPULATIONS} value={patientPopulations} onChange={setPatientPopulations} />

        <label className={LABEL}>My clinical approach</label>
        <textarea
          value={clinicalApproach}
          onChange={(e) => setClinicalApproach(e.target.value)}
          placeholder="e.g. I combine clinical reasoning, patient goals, functional assessment, and the best available evidence…"
          rows={3}
          className={`${FIELD} mb-1 resize-none`}
        />
        <p className="text-[11px] text-slate-400 mt-1 mb-4">A short summary of how you approach treatment — keep it concise.</p>

        {error && (
          <div className="flex items-start gap-1.5 mb-3 text-xs text-rose-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
