import { useState } from "react";
import { Pencil, ExternalLink, FileText } from "lucide-react";
import EditEvidenceModal from "./EditEvidenceModal.jsx";

// Evidence & Contributions tab (2026-09-22 redesign) -- one of the three
// sections Aditi called out as PhysioFeed's real differentiator from
// LinkedIn. The stats row is computed from the therapist's own posts
// (authorId + category), not a stored count -- same "derive it, don't
// fabricate a number" principle as ProfileHeader's followers/posts counts.
// Case Discussions uses the same category === "Case Studies" filter
// OtherProfilePage.jsx's own Cases tab already uses; Evidence Posts /
// Articles split the remaining "Research"/"Education" categories rather
// than double-counting one bucket under two labels.
export default function EvidenceContributionsTab({ profile, posts, publications = [], isOwn = false }) {
  const [editing, setEditing] = useState(false);
  const authored = posts.filter((p) => p.authorId === profile.id);
  const articleCount = authored.filter((p) => p.category === "Education").length;
  const caseCount = authored.filter((p) => p.category === "Case Studies").length;
  const evidenceCount = authored.filter((p) => p.category === "Research").length;

  const hasInterests = (profile.researchInterests || []).length > 0;
  const hasPubs = publications.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Evidence & Contributions</p>
        {isOwn && (
          <button onClick={() => setEditing(true)} aria-label="Edit evidence & contributions" className="text-slate-400 hover:text-[#7C3AED] p-1 -m-1 rounded-md hover:bg-[#F3EEFF]">
            <Pencil size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-around text-center border border-slate-100 rounded-2xl py-3">
        <div><p className="text-lg font-extrabold text-slate-900">{articleCount}</p><p className="text-[11px] text-slate-400">Articles</p></div>
        <div className="w-px h-8 bg-slate-100" />
        <div><p className="text-lg font-extrabold text-slate-900">{caseCount}</p><p className="text-[11px] text-slate-400">Case Discussions</p></div>
        <div className="w-px h-8 bg-slate-100" />
        <div><p className="text-lg font-extrabold text-slate-900">{evidenceCount}</p><p className="text-[11px] text-slate-400">Evidence Posts</p></div>
      </div>

      {hasInterests && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Research Interests</p>
          <div className="flex flex-wrap gap-2">
            {profile.researchInterests.map((s) => (
              <span key={s} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#F3EEFF] text-[#5B21B6] border border-[#E4D9FC]">{s}</span>
            ))}
          </div>
        </div>
      )}

      {hasPubs && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Publications</p>
          <div className="space-y-3">
            {publications.map((pub) => (
              <div key={pub.id} className="flex items-start gap-2.5">
                <FileText size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 leading-snug">{pub.title}</p>
                  <p className="text-xs text-slate-400">{[pub.journal, pub.year, pub.authors].filter(Boolean).join(" · ")}</p>
                  {pub.doiUrl && (
                    <a href={pub.doiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] mt-0.5">
                      View publication <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasInterests && !hasPubs && isOwn && (
        <p className="text-sm text-slate-400">Add your research interests and publications — recruiters and peers can see your real clinical contributions here.</p>
      )}

      {isOwn && editing && <EditEvidenceModal profile={profile} publications={publications} onClose={() => setEditing(false)} />}
    </div>
  );
}
