import { Stethoscope } from "lucide-react";

const Section = ({ label, value }) =>
  !value ? null : (
    <div className="mb-2.5">
      <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-600 whitespace-pre-line">{value}</p>
    </div>
  );

// Renders a post created via CaseComposer.jsx -- structured sections
// instead of a plain caption, so a Clinical Case reads like an actual case
// writeup rather than another feed caption. `post.case` is the
// case-fields object mapped in db.js's getPosts().
export default function CaseBody({ post }) {
  const c = post.case || {};
  const demographics = [c.patientAge && `${c.patientAge}y`, c.patientSex, c.patientOccupation, c.patientActivity].filter(Boolean).join(" · ");

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Stethoscope size={13} className="text-violet-600" />
        <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Clinical Case</span>
      </div>
      <h3 className="font-bold text-slate-900 text-base mb-1">{post.heading}</h3>
      {demographics && <p className="text-xs text-slate-400 mb-3">{demographics}</p>}

      <Section label="Presentation" value={c.presentation} />
      <Section label="Assessment" value={c.assessment} />
      <Section label="Management" value={c.management} />
      <Section label="Outcome" value={c.outcome} />

      {c.question && (
        <div className="mt-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-violet-700">{c.question}</p>
        </div>
      )}
    </div>
  );
}
