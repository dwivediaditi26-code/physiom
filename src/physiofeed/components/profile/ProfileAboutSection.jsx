import { useState } from "react";
import { Check, FileText, Download, Pencil } from "lucide-react";
import { Icon } from "../shared/icons.jsx";
import EditProfileModal from "./EditProfileModal.jsx";
import EditClinicalProfileModal from "./EditClinicalProfileModal.jsx";
import EditAchievementsModal from "./EditAchievementsModal.jsx";

// The About tab (2026-09-22 redesign) -- was ProfileAboutSummary.jsx,
// other-profile-only. Generalized here for BOTH ProfilePage.jsx (own) and
// OtherProfilePage.jsx (someone else's): Clinical Focus / Clinical
// Expertise / Clinical Interests / Verified Skill Badges / Certifications
// / Resume, one consolidated card instead of stacking AboutCard +
// ClinicalCard + AchievementsCard separately (now removed -- their fields
// live here, their edit modals (EditProfileModal/EditClinicalProfileModal/
// EditAchievementsModal) are wired in directly, same "each section owns
// its own pencil + focused modal" convention every other part of this
// profile already follows). All fields read real data that already
// existed (profile.bio/skills/areaOfPractice/clinicalInterests, the
// achievements list, profile.resumeUrl); nothing here is fabricated. A
// section with no data is simply skipped. No invented registration/
// license numbers either -- see git history for why.
export default function ProfileAboutSection({ profile, achievements = [], isOwn = false }) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingClinical, setEditingClinical] = useState(false);
  const [editingCerts, setEditingCerts] = useState(false);

  const hasFocus = !!profile.bio;
  const areaTeaser = (profile.areaOfPractice || []).slice(0, 4);
  const hasExpertise = areaTeaser.length > 0;
  const hasInterests = (profile.clinicalInterests || []).length > 0;
  const hasSkills = (profile.skills || []).length > 0;
  const hasCerts = achievements.length > 0;
  const hasResume = !!profile.resumeUrl;

  if (!hasFocus && !hasExpertise && !hasInterests && !hasSkills && !hasCerts && !hasResume && !isOwn) {
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
          <p className="text-sm font-bold text-slate-900">Clinical Focus</p>
          {isOwn && (
            <button onClick={() => setEditingProfile(true)} aria-label="Edit clinical focus" className="text-slate-400 hover:text-[#7C3AED] p-1 -m-1 rounded-md hover:bg-[#F3EEFF]">
              <Pencil size={13} />
            </button>
          )}
        </div>
        {hasFocus ? (
          <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
        ) : isOwn ? (
          <p className="text-sm text-slate-400">Add a short summary of your role, main area of practice and clinical philosophy.</p>
        ) : null}
      </div>

      {hasExpertise && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Clinical Expertise</p>
          <div className="flex flex-wrap gap-2">
            {areaTeaser.map((s) => (
              <span key={s} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#F3EEFF] text-[#5B21B6] border border-[#E4D9FC]">{s}</span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">See the full breakdown in the Clinical tab.</p>
        </div>
      )}

      {hasInterests && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Clinical Interests</p>
          <div className="flex flex-wrap gap-2">
            {profile.clinicalInterests.map((s) => (
              <span key={s} className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700">{s}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Verified Skill Badges</p>
          {isOwn && (
            <button onClick={() => setEditingClinical(true)} aria-label="Edit skills, interests and résumé" className="text-slate-400 hover:text-[#7C3AED] p-1 -m-1 rounded-md hover:bg-[#F3EEFF]">
              <Pencil size={13} />
            </button>
          )}
        </div>
        {hasSkills ? (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
                {s} <Check size={12} className="text-emerald-600 shrink-0" />
              </span>
            ))}
          </div>
        ) : isOwn ? (
          <p className="text-sm text-slate-400">Add the skills and techniques you practise.</p>
        ) : null}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Certifications</p>
          {isOwn && (
            <button onClick={() => setEditingCerts(true)} aria-label="Edit certifications" className="text-slate-400 hover:text-[#7C3AED] p-1 -m-1 rounded-md hover:bg-[#F3EEFF]">
              <Pencil size={13} />
            </button>
          )}
        </div>
        {hasCerts ? (
          <div className="space-y-3">
            {achievements.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <Icon name={a.iconName} size={17} className={`shrink-0 mt-0.5 ${a.tone}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-800">{a.title}</p>
                    {a.verified && <Check size={12} className="text-emerald-600 shrink-0" aria-label="Verified by PhysioFeed" />}
                  </div>
                  {a.subtitle && <p className="text-xs text-slate-400">{a.subtitle}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : isOwn ? (
          <p className="text-sm text-slate-400">Add your licenses and certifications.</p>
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
            <FileText size={20} className="text-red-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">Download Professional CV</p>
              <p className="text-xs text-slate-400 truncate">{profile.resumeName || "Résumé.pdf"}</p>
            </div>
          </div>
          <span className="shrink-0 p-2 rounded-xl text-white bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] shadow-sm">
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
      {isOwn && editingCerts && <EditAchievementsModal entries={achievements} onClose={() => setEditingCerts(false)} />}
    </div>
  );
}
