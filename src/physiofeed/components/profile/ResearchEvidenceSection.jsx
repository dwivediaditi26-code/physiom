import { useState } from "react";
import { Pencil, ExternalLink, FileText } from "lucide-react";
import EditEvidenceModal from "./EditEvidenceModal.jsx";

// Research & Evidence section (2026-09-22 "LinkedIn for physiotherapists"
// redesign, Aditi's brief) -- was EvidenceContributionsTab.jsx. Renamed to
// match the brief's "Research & Evidence" section (replacing the Posts/
// Evidence tab's old "Evidence & Contributions" framing) and restyled
// publications as the brief's own card example (icon + title, type badge +
// year underneath) instead of a plain title/meta/authors line. `journal`
// doubles as the shown TYPE badge ("Evidence Summary"/"Research Project"/
// "Dissertation" or a real journal name) -- see mockData.js's PUBLICATIONS
// comment for why there's no separate type column to read instead.
//
// The 3 stats stay derived from the therapist's own real posts/
// publications, not fabricated -- same principle as ProfileHeader's
// followers/posts counts. "Research" counts posts tagged Research;
// "Publications" is the publications list itself; "Evidence Contributions"
// is every authored post across Research/Case Studies/Education, i.e. the
// brief's combined "research + case discussions + evidence summaries"
// total.
export default function ResearchEvidenceSection({ profile, posts, publications = [], isOwn = false }) {
  const [editing, setEditing] = useState(false);
  const authored = posts.filter((p) => p.authorId === profile.id);
  const researchCount = authored.filter((p) => p.category === "Research").length;
  const contributionCount = authored.filter((p) => ["Research", "Case Studies", "Education"].includes(p.category)).length;

  const hasInterests = (profile.researchInterests || []).length > 0;
  const hasPubs = publications.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="pf-font-head text-sm font-extrabold text-slate-900">Research & Evidence</p>
        {isOwn && (
          <button onClick={() => setEditing(true)} aria-label="Edit research & evidence" className="text-slate-400 hover:text-slate-700 p-1 -m-1 rounded-md hover:bg-slate-50">
            <Pencil size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-around text-center border border-slate-100 rounded-2xl py-3">
        <div><p className="text-lg font-extrabold text-slate-900">{researchCount}</p><p className="text-[11px] text-slate-400">Research</p></div>
        <div className="w-px h-8 bg-slate-100" />
        <div><p className="text-lg font-extrabold text-slate-900">{publications.length}</p><p className="text-[11px] text-slate-400">Publications</p></div>
        <div className="w-px h-8 bg-slate-100" />
        <div><p className="text-lg font-extrabold text-slate-900">{contributionCount}</p><p className="text-[11px] text-slate-400">Evidence Contributions</p></div>
      </div>

      {hasPubs && (
        <div className="space-y-3">
          {publications.map((pub) => (
            <div key={pub.id} className="flex items-start gap-2.5">
              <FileText size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 leading-snug">{pub.title}</p>
                <p className="text-xs text-slate-400">{[pub.journal, pub.year].filter(Boolean).join(" • ")}{pub.authors ? ` · ${pub.authors}` : ""}</p>
                {pub.doiUrl && (
                  <a href={pub.doiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 mt-0.5">
                    View publication <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasInterests && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Research Interests</p>
          <div className="flex flex-wrap gap-2">
            {profile.researchInterests.map((s) => (
              <span key={s} className="text-xs font-medium px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700">{s}</span>
            ))}
          </div>
        </div>
      )}

      {!hasInterests && !hasPubs && isOwn && (
        <p className="text-sm text-slate-400">Add your research interests and publications — recruiters and peers can see your real contributions here.</p>
      )}
      {!hasInterests && !hasPubs && !isOwn && (
        <p className="text-sm text-slate-400">No research or publications added yet.</p>
      )}

      {isOwn && editing && <EditEvidenceModal profile={profile} publications={publications} onClose={() => setEditing(false)} />}
    </div>
  );
}
