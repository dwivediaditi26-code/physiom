import { useState } from "react";
import { ChevronLeft, Calendar, Clock, Video, Check } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";

export default function WorkshopDetail({ opp, onBack }) {
  const [registered, setRegistered] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1 -ml-1 text-slate-500 hover:text-slate-700"><ChevronLeft size={19} /></button>
        <p className="text-sm font-semibold text-slate-900 truncate">Event Details</p>
      </div>

      <div className="relative h-36 bg-gradient-to-br from-[#FF5FA2] to-[#FFB020] flex items-center justify-center">
        <Video size={30} className="text-white/70" />
        {opp.mode === "Online" && (
          <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/25 flex items-center justify-center"><Video size={15} className="text-white" /></span>
        )}
      </div>

      <div className="p-5 pb-28">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-3">{opp.title}</h1>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Calendar size={11} /> Date</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">{opp.date}</p>
          </div>
          <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Clock size={11} /> Time</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">{opp.time}</p>
          </div>
        </div>

        <span className="pf-font-head inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FFE9F3] text-[#D93E80] mb-4">{opp.mode?.toUpperCase()}</span>

        <p className="text-sm text-slate-600 leading-relaxed mb-5">{opp.description}</p>

        {opp.instructor && (
          <div className="flex items-center gap-3 border border-slate-200 rounded-2xl p-3.5 mb-5">
            <Avatar size={40} grad={opp.instructor.gradient} initials={opp.instructor.initials} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{opp.instructor.name}</p>
              <p className="text-xs text-slate-500 truncate">{opp.instructor.role}</p>
            </div>
          </div>
        )}

        {opp.syllabus?.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">Clinical syllabus highlights</p>
            <div className="space-y-2">
              {opp.syllabus.map((s) => (
                <div key={s} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full border-2 border-[#FF5FA2] mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 leading-snug">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] text-slate-400 leading-none">{opp.feeNote || "Fee"}</p>
          <p className="text-lg font-bold text-slate-900">{opp.fee}</p>
        </div>
        <button
          type="button"
          onClick={() => setRegistered(true)}
          disabled={registered}
          className={`pf-font-head flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl px-6 py-3 shadow-sm transition ${registered ? "bg-emerald-50 text-emerald-700" : "text-white bg-[#FF5FA2] active:scale-[0.98]"}`}
        >
          {registered ? <><Check size={16} /> Registered</> : "Register Now"}
        </button>
      </div>
    </div>
  );
}
