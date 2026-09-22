import { useState } from "react";
import { ChevronLeft, MapPin, XCircle, Star, MessageCircle, BadgeCheck } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";

const TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "passed", label: "Passed" },
];

// The applicant review pipeline for one posting (2026-09-22, Aditi's brief +
// mockups) -- opened from "View Applicants" on MyPostingsPage.jsx. Status
// changes (Pass/Shortlist) and opening the full dossier are both wired to
// real state in ExplorePage.jsx, not decorative.
export default function ApplicantPipeline({ opp, applicants, onBack, onOpenApplicant, onPass, onShortlist, onChat }) {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? applicants : applicants.filter((a) => a.status === tab);
  const countFor = (key) => (key === "all" ? applicants.length : applicants.filter((a) => a.status === key).length);

  return (
    <main className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={20} /></button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">{opp.title}</h1>
          <p className="text-xs text-slate-400">{applicants.length} applicant{applicants.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar my-4 pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${tab === t.key ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
          >
            {t.label} <span className={tab === t.key ? "opacity-80" : "text-slate-400"}>{countFor(t.key)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-slate-400 text-sm">No applicants in this filter yet.</div>
      ) : (
        <div className="space-y-3 pb-6">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <button type="button" onClick={() => onOpenApplicant(a)} className="w-full text-left flex items-start gap-3 mb-2.5">
                <div className="relative shrink-0">
                  <Avatar size={38} grad={a.gradient} initials={a.initials} />
                  {a.verified && <span className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full"><BadgeCheck size={13} className="text-indigo-600 fill-indigo-100" /></span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{a.name}</p>
                    <span className="text-[11px] text-slate-400 shrink-0">Applied {a.appliedAgo}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{a.headline}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {a.skills?.slice(0, 2).map((s) => <span key={s} className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{s}</span>)}
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1.5"><MapPin size={10} />{a.location}{a.relocation ? ` · ${a.relocation}` : ""}</p>
                  {a.note && <p className="text-xs text-slate-500 leading-snug mt-1.5 line-clamp-2">&ldquo;{a.note}&rdquo;</p>}
                </div>
              </button>

              <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                <button type="button" onClick={() => onPass(a.id)} disabled={a.status === "passed"} className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg px-2.5 py-2 hover:bg-slate-50 disabled:opacity-40">
                  <XCircle size={12} /> Pass
                </button>
                <button
                  type="button"
                  onClick={() => onShortlist(a.id)}
                  className={`flex items-center justify-center gap-1 text-[11px] font-bold rounded-lg px-2.5 py-2 border transition ${a.status === "shortlisted" ? "bg-amber-50 border-amber-200 text-amber-700" : "text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                >
                  <Star size={12} /> Shortlist
                </button>
                <button type="button" onClick={() => onChat(a)} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold text-white rounded-lg px-2.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600">
                  <MessageCircle size={12} /> Chat / Invite
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
