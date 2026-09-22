import { Check, FileText, Download } from "lucide-react";
import { Icon } from "../shared/icons.jsx";

// The "About" tab content for someone else's profile (OtherProfilePage.jsx),
// redesigned (2026-09-22, Aditi's reference spec) into one consolidated
// card -- Clinical Focus / Verified Skill Badges / Certifications / Resume
// -- instead of stacking AboutCard + ClinicalCard + AchievementsCard
// separately. All four sections read real fields that already existed
// (profile.bio, profile.skills, the achievements list, profile.resumeUrl);
// nothing here is fabricated. A section with no data is simply skipped, same
// convention every other profile card already follows. RotationsCard and
// EducationCard keep their own separate cards below this one on
// OtherProfilePage -- their content (clinical placements, degrees) isn't
// covered by this spec and isn't safe to fold in without relabeling real
// data. No invented registration/license numbers here either -- the spec's
// exact "MP-Reg. 12345" text was reference-mockup placeholder copy, not a
// real field this app has for any clinician.
export default function ProfileAboutSummary({ profile, achievements = [] }) {
  const hasFocus = !!profile.bio;
  const hasSkills = (profile.skills || []).length > 0;
  const hasCerts = achievements.length > 0;
  const hasResume = !!profile.resumeUrl;

  if (!hasFocus && !hasSkills && !hasCerts && !hasResume) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <p className="text-sm text-slate-400">No details added yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5">
      {hasFocus && (
        <div>
          <p className="text-sm font-bold text-slate-900 mb-1.5">Clinical Focus</p>
          <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {hasSkills && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Verified Skill Badges</p>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
                {s} <Check size={12} className="text-emerald-600 shrink-0" />
              </span>
            ))}
          </div>
        </div>
      )}

      {hasCerts && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Certifications</p>
          <div className="space-y-3">
            {achievements.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <Icon name={a.iconName} size={17} className={`shrink-0 mt-0.5 ${a.tone}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  {a.subtitle && <p className="text-xs text-slate-400">{a.subtitle}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasResume && (
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
      )}
    </div>
  );
}
