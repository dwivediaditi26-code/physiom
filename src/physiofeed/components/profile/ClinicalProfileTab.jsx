import { useState } from "react";
import { Pencil } from "lucide-react";
import EditClinicalSkillsModal from "./EditClinicalSkillsModal.jsx";

// Clinical Profile tab (2026-09-22 redesign) -- one of the three sections
// Aditi called out as PhysioFeed's real differentiator from LinkedIn
// ("Clinical Profile + Evidence & Contributions + Opportunities"). Areas
// of Practice / Clinical Skills / Patient Populations are all picked from
// a fixed taxonomy (shared/constants.js) via EditClinicalSkillsModal, not
// typed freeform -- same "select, don't force every field" principle the
// spec asks for. A section with nothing selected is simply skipped in
// read-only mode, same convention every other profile card follows.
function ChipGroup({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <span key={s} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#F3EEFF] text-[#5B21B6] border border-[#E4D9FC]">{s}</span>
        ))}
      </div>
    </div>
  );
}

export default function ClinicalProfileTab({ profile, isOwn = false }) {
  const [editing, setEditing] = useState(false);
  const hasAnything = (profile.areaOfPractice || []).length > 0
    || (profile.clinicalSkillsAssessment || []).length > 0
    || (profile.clinicalSkillsTreatment || []).length > 0
    || (profile.patientPopulations || []).length > 0
    || !!profile.clinicalApproach;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Clinical Profile</p>
        {isOwn && (
          <button onClick={() => setEditing(true)} aria-label="Edit clinical profile" className="text-slate-400 hover:text-[#7C3AED] p-1 -m-1 rounded-md hover:bg-[#F3EEFF]">
            <Pencil size={13} />
          </button>
        )}
      </div>

      {!hasAnything ? (
        <p className="text-sm text-slate-400">{isOwn ? "Add your areas of practice, clinical skills and the patients you work with." : "No clinical profile added yet."}</p>
      ) : (
        <>
          <ChipGroup title="Areas of Practice" items={profile.areaOfPractice} />
          <ChipGroup title="Clinical Skills — Assessment" items={profile.clinicalSkillsAssessment} />
          <ChipGroup title="Clinical Skills — Treatment" items={profile.clinicalSkillsTreatment} />
          <ChipGroup title="Patient Populations" items={profile.patientPopulations} />
          {profile.clinicalApproach && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">My Clinical Approach</p>
              <p className="text-sm text-slate-600 leading-relaxed">{profile.clinicalApproach}</p>
            </div>
          )}
        </>
      )}

      {isOwn && editing && <EditClinicalSkillsModal profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}
