import { useState } from "react";
import { ChevronLeft, MapPin, IndianRupee, Check } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import ApplyOpportunityModal from "./ApplyOpportunityModal.jsx";
import { TYPE_COLORS } from "../../data/opportunitiesMock.js";

export default function OpportunityDetail({ opp, onBack, onMessage }) {
  const [applied, setApplied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const c = TYPE_COLORS[opp.type] || TYPE_COLORS.job;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1 -ml-1 text-slate-500 hover:text-slate-700"><ChevronLeft size={19} /></button>
        <p className="text-sm font-semibold text-slate-900 truncate">{opp.title}</p>
      </div>

      <div className="p-5 pb-28">
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

      <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-2.5">
        <button type="button" onClick={() => onMessage(opp)} className="flex-1 text-sm font-bold text-slate-700 border border-slate-200 rounded-xl py-3 hover:bg-slate-50">
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
      </div>

      {applyOpen && (
        <ApplyOpportunityModal
          opp={opp}
          onClose={() => setApplyOpen(false)}
          onApplied={() => { setApplied(true); setApplyOpen(false); }}
        />
      )}
    </div>
  );
}
