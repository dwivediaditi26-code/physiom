import { Presentation } from "lucide-react";
import { CONTRIBUTIONS } from "../../data/mockData.js";

// Professional Contributions (2026-09-22 "LinkedIn for physiotherapists"
// redesign, Aditi's brief: workshops/conferences/guest lectures/awards,
// "only show this section if the person has relevant contributions").
// Reads CONTRIBUTIONS straight from mockData.js rather than through
// db.js/AppDataContext's usual real-first, demo-fallback pattern -- there
// is no backing Supabase table for this yet (see mockData.js's own
// comment on that array), so this is deliberately display-only for now.
// With no per-user real data to key off, rendering the same static list on
// a stranger's profile would misrepresent it as theirs, so this section is
// only ever mounted on ProfilePage.jsx (your own profile), not
// OtherProfilePage.jsx -- real per-user persistence is a later pass once
// there's an actual table to migrate to.
export default function ProfessionalContributionsSection() {
  if (!CONTRIBUTIONS.length) return null;
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
      <p className="pf-font-head text-sm font-extrabold text-slate-900 mb-4">Professional Contributions</p>
      <div className="space-y-4">
        {CONTRIBUTIONS.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Presentation size={15} className="text-violet-600" /></div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.type}</p>
              <p className="text-sm font-medium text-slate-800 leading-snug">{c.title}</p>
              <p className="text-xs text-slate-400">{[c.year, c.location].filter(Boolean).join(" • ")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
