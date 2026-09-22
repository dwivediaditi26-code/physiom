import { createPortal } from "react-dom";
import { ChevronLeft, X, BadgeCheck, Phone, Mail, MapPin, MessageCircle, Star, XCircle } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";

// The "Applicant Clinical Dossier" sheet (2026-09-22, Aditi's brief + real
// mockup references) -- a poster's full structured view of one applicant,
// opened from ApplicantPipeline.jsx. Read-only demo data from
// applicantsMock.js; actions just update local status in ExplorePage.
//
// Portaled to document.body (2026-09-22) so this always mounts as a direct
// body child, same pattern as InfoCard.jsx's modal. z-[200] (2026-09-22,
// Aditi's report: opening a profile showed only Pass/Shortlist/Message,
// no close button) -- the app's own real chrome sits above z-50:
// `.pm-mobile-hdr` is z-101, `.pm-bnav` is z-140, so this sheet's own
// header (with the close button) was painting *underneath* them on long
// content, not actually missing.
export default function ApplicantProfileSheet({ applicant: a, opp, onBack, onClose, onPass, onShortlist, onMessage }) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4 pb-[88px] sm:pb-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[calc(100vh-104px)] sm:max-h-[85vh]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          {onBack && <button type="button" onClick={onBack} aria-label="Back" className="p-1 -ml-1 text-slate-500 hover:text-slate-700"><ChevronLeft size={19} /></button>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Applicant Profile</p>
            <p className="text-[11px] text-slate-400 truncate">{opp.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 pb-28">
          <div className="flex items-start gap-3 mb-3">
            <div className="relative shrink-0">
              <Avatar size={46} grad={a.gradient} initials={a.initials} />
              {a.verified && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full">
                  <BadgeCheck size={16} className="text-indigo-600 fill-indigo-100" />
                </span>
              )}
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-bold text-slate-900 truncate">{a.name}</p>
              <p className="text-xs text-slate-500 truncate">{a.headline}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600"><MapPin size={10} />{a.location}</span>
                {a.relocation && <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">{a.relocation}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 mb-4 pl-0.5">
            <span className="inline-flex items-center gap-1.5"><Phone size={12} className="text-slate-400" />{a.phone}</span>
            <span className="inline-flex items-center gap-1.5"><Mail size={12} className="text-slate-400" />{a.email}</span>
          </div>

          {a.note && (
            <div className="border-l-4 border-indigo-300 bg-slate-50 rounded-r-xl px-3.5 py-2.5 mb-5">
              <p className="text-xs text-slate-600 italic leading-relaxed">&ldquo;{a.note}&rdquo;</p>
            </div>
          )}

          {a.rotations?.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Verified Clinical Rotations</p>
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-200/70">
                {a.rotations.map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-2 text-xs text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />{r.label}</span>
                    <span className="text-xs font-semibold text-slate-500">{r.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.skills?.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Clinical Skill Badges</p>
              <div className="flex flex-wrap gap-1.5">
                {a.skills.map((s) => <span key={s} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">{s}</span>)}
              </div>
            </div>
          )}

          {a.footprint && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">PhysioFeed Clinical Footprint</p>
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600"><MessageCircle size={12} className="text-slate-400" />{a.footprint.caseDiscussions} Case Discussions</span>
                {a.footprint.topContributor && <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">🏆 Top Contributor</span>}
              </div>
            </div>
          )}

        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-2">
          <button type="button" onClick={() => onPass(a.id)} className="flex items-center justify-center gap-1 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl px-3.5 py-3 hover:bg-slate-50">
            <XCircle size={14} /> Pass
          </button>
          <button type="button" onClick={() => onShortlist(a.id)} className={`flex items-center justify-center gap-1 text-xs font-bold rounded-xl px-3.5 py-3 border transition ${a.status === "shortlisted" ? "bg-amber-50 border-amber-200 text-amber-700" : "text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            <Star size={14} /> Shortlist
          </button>
          <button type="button" onClick={() => onMessage(a)} className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white rounded-xl py-3 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm active:scale-[0.98] transition">
            <MessageCircle size={15} /> Message / Interview
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
