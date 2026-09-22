import { useState } from "react";
import { Pencil, Building2, FileText, ExternalLink } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import EditClinicalProfileModal from "./EditClinicalProfileModal.jsx";

// Clinical identity, skills, CV and opportunity preferences (2026-09-21,
// Aditi's brief: "Edit Clinical Profile & CV" -- one form, two outputs).
// The other two outputs from that brief -- Clinical rotations & postings
// and Achievements & CME -- already have their own cards right next to
// this one on the About tab (RotationsCard.jsx is new; AchievementsCard.jsx
// already existed and needed nothing new for "CME"). Kept as three small
// cards rather than Aditi's one long wireframe form because that's how
// every other section of this profile already works (About/Education/
// Achievements are each their own card + focused modal) -- one giant form
// would be the odd one out. Same own-list-from-context-or-`profile`-prop
// shape as AboutCard.jsx right above it; see that file for the fuller
// reasoning.
//
// "Instant Apply" (the form's second output) is components/opportunities/
// OpportunityChat.jsx pulling skills/resumeUrl straight from this same
// profile when you message a clinic about a listing -- no separate
// per-application form. phone is deliberately never shown here (own or
// read-only) -- see supabase/add_profile_clinical_cv.sql.
export default function ClinicalCard({ profile: profileProp, readOnly = false }) {
  const { profile: ownProfile } = useAppData();
  const profile = profileProp || ownProfile;
  const [editing, setEditing] = useState(false);
  if (!profile) return null;

  const hasIdentity = profile.clinicalTitle || profile.college;
  const hasAnything = hasIdentity || profile.openToWork || (profile.skills || []).length > 0 || profile.resumeUrl;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">Clinical profile & CV</p>
        {!readOnly && (
          <button onClick={() => setEditing(true)} aria-label="Edit clinical profile & CV" className="text-slate-400 hover:text-[#DB2777] p-1 -m-1 rounded-md hover:bg-[#FDF0F6]">
            <Pencil size={13} />
          </button>
        )}
      </div>

      {!hasAnything ? (
        <p className="text-sm text-slate-400">{readOnly ? "No details added yet." : "Add your title, skills and résumé — this also pre-fills Explore's Instant Apply."}</p>
      ) : (
        <div className="space-y-3">
          {hasIdentity && (
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Building2 size={15} className="text-slate-400 shrink-0" />
              <span>{[profile.clinicalTitle, profile.college].filter(Boolean).join(" · ")}</span>
            </div>
          )}

          {profile.openToWork && (
            <div className="flex items-center gap-2.5 text-sm text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Open to opportunities
              {profile.willingToRelocate && <span className="text-slate-400 font-normal">· willing to relocate</span>}
            </div>
          )}

          {profile.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span key={s} className="text-[11px] font-bold px-2 py-1 rounded-full bg-[#FFF4E0] text-[#B0790A] border border-[#FFE1A8]">{s}</span>
              ))}
            </div>
          )}

          {profile.resumeUrl ? (
            <a
              href={profile.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-[#DB2777] group"
            >
              <FileText size={15} className="text-slate-400 group-hover:text-[#DB2777] shrink-0" />
              <span className="truncate flex-1 min-w-0">{profile.resumeName || "Résumé.pdf"}</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#DB2777] shrink-0">View CV <ExternalLink size={11} /></span>
            </a>
          ) : !readOnly ? (
            <div className="flex items-center gap-2.5 text-sm text-slate-400">
              <FileText size={15} className="shrink-0" /> No résumé uploaded yet
            </div>
          ) : null}
        </div>
      )}

      {!readOnly && editing && <EditClinicalProfileModal profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}
