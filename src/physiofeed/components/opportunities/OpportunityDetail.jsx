import { useEffect, useRef, useState } from "react";
import { ChevronLeft, MapPin, IndianRupee, Check, Bookmark } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import ApplyOpportunityModal from "./ApplyOpportunityModal.jsx";
import { TYPE_COLORS } from "../../data/opportunitiesMock.js";

// `applied` and `saved` are owned by ExplorePage now (P4/P5) -- they come
// from the real applications / saved_items tables, so they survive a
// reload instead of resetting to false every time this screen mounts.
export default function OpportunityDetail({ opp, onBack, onMessage, applied, onApplied, saved, onToggleSave }) {
  const [applyOpen, setApplyOpen] = useState(false);
  const c = TYPE_COLORS[opp.type] || TYPE_COLORS.job;

  // Message/Apply bar made truly fixed below the desktop breakpoint
  // (2026-09-23, "make this button constant") -- it was `sticky bottom-0`,
  // which only pins within its own scroll container. physiom's shared
  // .pm-main scroll container has no height cap (every tab stays mounted),
  // so this card wasn't the real scrolling box and the bar just sat in
  // normal flow -- reachable, but only after scrolling past it, same class
  // of bug as the MessagesPage/OpportunityChat scroll locks (8543cd0,
  // c363edd). Unlike those, this screen has no inner scroll region to
  // redirect scrolling into -- it's meant to scroll normally -- so `fixed`
  // (viewport-relative, immune to the oversized scroll container) is the
  // fix here instead. Kept to <1024px, the same breakpoint .pm-bnav itself
  // uses, because desktop's sidebar layout has no full-bleed edge to pin a
  // fixed bar to without also covering the sidebar; sticky is left as-is
  // there since it wasn't reported broken.
  //
  // Both the mobile bottom-nav's real height and this bar's own height are
  // measured rather than hardcoded -- .pm-bnav's padding-bottom varies with
  // env(safe-area-inset-bottom) per device, and hardcoding either would
  // silently drift the moment either bar's content changes.
  const actionBarRef = useRef(null);
  const [barOffsets, setBarOffsets] = useState({ bnav: 0, bar: 0 });
  useEffect(() => {
    const measure = () => {
      const bnav = document.querySelector(".pm-bnav");
      setBarOffsets({
        bnav: bnav ? bnav.getBoundingClientRect().height : 0,
        bar: actionBarRef.current ? actionBarRef.current.getBoundingClientRect().height : 0,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1 -ml-1 text-slate-500 hover:text-slate-700"><ChevronLeft size={19} /></button>
        <p className="text-sm font-semibold text-slate-900 truncate flex-1">{opp.title}</p>
        <button
          type="button"
          onClick={() => onToggleSave?.(opp)}
          aria-label={saved ? "Remove from saved" : "Save this opportunity"}
          aria-pressed={!!saved}
          className={`p-1.5 rounded-lg shrink-0 ${saved ? "text-[#6E5CC7]" : "text-slate-400 hover:text-slate-600"}`}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-5 pb-28" style={{ paddingBottom: `max(7rem, ${barOffsets.bnav + barOffsets.bar + 16}px)` }}>
        <div className="flex items-center gap-3 mb-4">
          <Avatar size={44} grad={opp.orgGradient} initials={opp.orgInitials} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{opp.org}</p>
            {opp.location && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {opp.location}</p>}
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-2">{opp.title}</h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">{opp.description}</p>

        <div className="grid grid-cols-1 gap-2 mb-5">
          {opp.detailHighlights?.map((h) => (
            <div key={h.label} className="flex items-start justify-between gap-3 bg-slate-50 rounded-xl px-3.5 py-2.5">
              <span className="text-xs font-semibold text-slate-500 shrink-0">{h.label}</span>
              <span className="text-xs text-slate-800 text-right">{h.value}</span>
            </div>
          ))}
          {(opp.salary || opp.stipend) && (
            <div className="flex items-start justify-between gap-3 bg-slate-50 rounded-xl px-3.5 py-2.5">
              <span className="text-xs font-semibold text-slate-500 shrink-0">{opp.type === "job" ? "Salary" : "Stipend"}</span>
              <span className="text-xs text-slate-800 flex items-center gap-1"><IndianRupee size={11} />{(opp.salary || opp.stipend).replace("₹", "")}</span>
            </div>
          )}
        </div>

        {opp.setup?.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Clinical setup</p>
            <div className="flex flex-wrap gap-1.5">
              {opp.setup.map((s) => <span key={s} className="pf-font-body text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: c.tint, color: c.text }}>{s}</span>)}
            </div>
          </div>
        )}

        {/* Same bulleted-list treatment as WorkshopDetail's syllabus, reused
            here for the Job/Internship/Collaboration create forms' "what
            you'll learn" and "requirements" fields (2026-09-24) -- without
            this those fields had nowhere to render at all. */}
        {opp.learningOutcomes?.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">What you'll learn</p>
            <div className="space-y-2">
              {opp.learningOutcomes.map((s) => (
                <div key={s} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0" style={{ borderColor: c.solid }} />
                  <span className="text-sm text-slate-700 leading-snug">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {opp.requirements?.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">Requirements</p>
            <div className="space-y-2">
              {opp.requirements.map((s) => (
                <div key={s} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0" style={{ borderColor: c.solid }} />
                  <span className="text-sm text-slate-700 leading-snug">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {opp.mentor && (
          <div className="border border-slate-200 rounded-2xl p-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">{opp.type === "collaboration" ? "Lead researcher" : "Mentor"}</p>
            <div className="flex items-center gap-3">
              <Avatar size={40} grad={opp.mentor.gradient} initials={opp.mentor.initials} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{opp.mentor.name}</p>
                <p className="text-xs text-slate-500 truncate">{opp.mentor.role}</p>
              </div>
            </div>
            {opp.mentor.bio && <p className="text-xs text-slate-500 leading-relaxed mt-2.5">{opp.mentor.bio}</p>}
          </div>
        )}
      </div>

      <div
        ref={actionBarRef}
        className="fixed inset-x-0 lg:sticky lg:inset-x-auto bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-2.5 z-[130]"
        style={{ bottom: barOffsets.bnav }}
      >
        {/* registrationMethod (2026-09-24, the Job/Internship/Collaboration
            forms): 'external' opens the poster's own link instead of the
            in-app apply flow; 'contact' drops the Apply button entirely --
            same reasoning as WorkshopDetail's own branching. Older/seeded
            listings have no registrationMethod at all, which falls through
            to the original PhysioFeed apply flow below (the default). */}
        {opp.registrationMethod === "external" ? (
          <a
            href={opp.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pf-font-head flex-1 flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl py-3 shadow-sm text-white active:scale-[0.98] transition"
            style={{ background: c.solid }}
          >
            Open Application Link
          </a>
        ) : opp.registrationMethod === "contact" ? (
          <button
            type="button"
            onClick={() => onMessage(opp)}
            className="pf-font-head flex-1 flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl py-3 shadow-sm text-white active:scale-[0.98] transition"
            style={{ background: c.solid }}
          >
            {opp.type === "collaboration" ? "Connect" : "Message Organiser"}
          </button>
        ) : (
          <>
            <button type="button" onClick={() => onMessage(opp)} className="flex-1 text-sm font-bold text-center text-slate-700 border border-slate-200 rounded-xl py-3 hover:bg-slate-50">
              Message {opp.mentor ? opp.mentor.name.split(",")[0].replace("Dr. ", "") : "Lead"}
            </button>
            <button
              type="button"
              onClick={() => setApplyOpen(true)}
              disabled={applied}
              className={`pf-font-head flex-1 flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl py-3 shadow-sm transition ${applied ? "bg-emerald-50 text-emerald-700" : "text-white active:scale-[0.98]"}`}
              style={applied ? undefined : { background: c.solid }}
            >
              {applied ? <><Check size={16} /> Applied (Review Pending)</> : "Apply with Profile"}
            </button>
          </>
        )}
      </div>

      {applyOpen && (
        <ApplyOpportunityModal
          opp={opp}
          onClose={() => setApplyOpen(false)}
          onApplied={() => { setApplyOpen(false); onApplied?.(); }}
        />
      )}
    </div>
  );
}
