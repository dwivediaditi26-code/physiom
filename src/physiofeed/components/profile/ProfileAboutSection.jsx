import { useState } from "react";
import { FileText, Download, Pencil } from "lucide-react";
import EditProfileModal from "./EditProfileModal.jsx";
import EditClinicalProfileModal from "./EditClinicalProfileModal.jsx";

// The About tab (2026-09-22 "LinkedIn for physiotherapists" redesign,
// Aditi's brief) -- kept deliberately short: a professional intro and a
// résumé link, nothing else. The brief is explicit that About should NOT
// carry Clinical Expertise / Clinical Interests / Skill Badges chip lists
// ("do not create separate sections... avoid long lists of techniques");
// those three blocks (plus the Certifications block, now its own
// CertificationsCard.jsx next to Education) used to live here and are
// gone this pass. The underlying fields (profile.skills/clinicalInterests)
// aren't deleted -- they're still real data, still editable from this same
// EditClinicalProfileModal, and still used elsewhere (OpportunityChat's
// Instant Apply pulls profile.skills into the application message) -- this
// card just stops rendering them as a chip wall. profile.bio is the one
// thing this card shows about clinical focus, same "keep it to a short
// paragraph, not a list" principle as the brief's own About example.
export default function ProfileAboutSection({ profile, isOwn = false }) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingClinical, setEditingClinical] = useState(false);

  const hasFocus = !!profile.bio;
  const hasResume = !!profile.resumeUrl;

  if (!hasFocus && !hasResume && !isOwn) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <p className="text-sm text-slate-400">No details added yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="pf-font-head text-sm font-extrabold text-slate-900">About</p>
          {isOwn && (
            <button onClick={() => setEditingProfile(true)} aria-label="Edit about" className="text-slate-400 hover:text-slate-700 p-1 -m-1 rounded-md hover:bg-slate-50">
              <Pencil size={13} />
            </button>
          )}
        </div>
        {hasFocus ? (
          <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
        ) : isOwn ? (
          <p className="text-sm text-slate-400">Add a short professional introduction -- your role, workplace and main area of practice.</p>
        ) : null}
      </div>

      {hasResume ? (
        <a
          href={profile.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 border border-slate-200 bg-slate-50/70 p-3.5 rounded-2xl hover:bg-slate-100 transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText size={20} className="text-slate-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">Download Professional CV</p>
              <p className="text-xs text-slate-400 truncate">{profile.resumeName || "Résumé.pdf"}</p>
            </div>
          </div>
          <span className="shrink-0 p-2 rounded-xl text-white bg-violet-600 shadow-sm">
            <Download size={15} />
          </span>
        </a>
      ) : isOwn ? (
        // Bug fix (2026-09-22, Aditi: "where is cv?"): with no résumé
        // uploaded yet, this whole section used to just disappear --
        // there was nothing here pointing at where to add one (it's
        // actually the "Upload résumé" control inside the same Clinical
        // profile & CV modal the pencil above opens).
        <button
          type="button"
          onClick={() => setEditingClinical(true)}
          className="w-full flex items-center gap-2.5 border border-dashed border-slate-300 bg-slate-50/40 p-3.5 rounded-2xl hover:bg-slate-100 transition text-left"
        >
          <FileText size={20} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">Add your résumé</p>
            <p className="text-xs text-slate-400">Recruiters and peers can download it straight from your profile.</p>
          </div>
        </button>
      ) : null}

      {isOwn && editingProfile && <EditProfileModal profile={profile} onClose={() => setEditingProfile(false)} />}
      {isOwn && editingClinical && <EditClinicalProfileModal profile={profile} onClose={() => setEditingClinical(false)} />}
    </div>
  );
}
