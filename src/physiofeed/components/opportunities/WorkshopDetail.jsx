import { useState } from "react";
import { ChevronLeft, Calendar, Clock, Video, Check } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import * as db from "../../data/db.js";

// `registered` is owned by ExplorePage (2026-09-23), read from the real
// `applications` table -- this used to be local useState, so "Registered"
// was a label the button wore until the next reload and the poster never
// heard about it. See db.registerForWorkshop().
//
// `opp.registrationMethod` (2026-09-24, the Create Workshop wizard) picks
// which of three CTAs renders: PhysioFeed (the original register() flow
// below, also the default for older/seeded workshops that predate this
// field), an external registration/payment link, or "message the
// organiser" via onMessage -- reusing OpportunityDetail's existing chat
// entry point rather than building a second one.
export default function WorkshopDetail({ opp, onBack, registered, onRegistered, onMessage }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const register = async () => {
    if (busy || registered) return;
    setBusy(true);
    setError(null);
    try {
      await db.registerForWorkshop(opp.id, { creatorId: opp.creatorId, title: opp.title });
      await onRegistered?.();
    } catch (e) {
      setError(e.message || "Couldn't register you -- please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1 -ml-1 text-slate-500 hover:text-slate-700"><ChevronLeft size={19} /></button>
        <p className="text-sm font-semibold text-slate-900 truncate">Event Details</p>
      </div>

      <div className="relative h-36 bg-gradient-to-br from-[#FF5FA2] to-[#FFB020] flex items-center justify-center overflow-hidden">
        {opp.bannerUrl ? (
          <img src={opp.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <Video size={30} className="text-white/70" />
        )}
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
          <div className="mb-5">
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

        {(opp.audience || opp.experienceLevel) && (
          <div className="flex gap-2 flex-wrap">
            {opp.audience && (
              <div className="flex-1 min-w-[140px] bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Who can attend</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{opp.audience}</p>
              </div>
            )}
            {opp.experienceLevel && (
              <div className="flex-1 min-w-[140px] bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Experience</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{opp.experienceLevel}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3">
        {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-slate-400 leading-none">{opp.earlyBirdFee ? "Early bird" : (opp.feeNote || "Fee")}</p>
            <p className="text-lg font-bold text-slate-900">
              {opp.earlyBirdFee || opp.fee}
              {opp.earlyBirdFee && <span className="text-xs font-semibold text-slate-400 line-through ml-1.5">{opp.fee}</span>}
            </p>
            {opp.earlyBirdFee && opp.earlyBirdDeadline && (
              <p className="text-[10px] text-slate-400">
                until {new Date(`${opp.earlyBirdDeadline}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            )}
          </div>

          {opp.registrationMethod === "external" ? (
            <a
              href={opp.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pf-font-head flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl px-6 py-3 shadow-sm text-white bg-[#FF5FA2] active:scale-[0.98] transition"
            >
              Open Registration Link
            </a>
          ) : opp.registrationMethod === "contact" ? (
            <button
              type="button"
              onClick={() => onMessage?.(opp)}
              className="pf-font-head flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl px-6 py-3 shadow-sm text-white bg-[#FF5FA2] active:scale-[0.98] transition"
            >
              Contact Organiser
            </button>
          ) : (
            <button
              type="button"
              onClick={register}
              disabled={registered || busy}
              className={`pf-font-head flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl px-6 py-3 shadow-sm transition ${registered ? "bg-emerald-50 text-emerald-700" : "text-white bg-[#FF5FA2] active:scale-[0.98] disabled:opacity-60"}`}
            >
              {registered ? <><Check size={16} /> Registered</> : busy ? "Registering…" : "Register Now"}
            </button>
          )}
        </div>
        {opp.registrationMethod === "external" && (
          <p className="text-[11px] text-slate-400 mt-2">You'll be redirected to the organiser's registration and payment page.</p>
        )}
        {registered && opp.registrationMethod !== "external" && opp.registrationMethod !== "contact" && (
          <p className="text-[11px] text-slate-400 mt-2">
            The organiser has your request and a chat thread is open — they'll confirm the details there.
          </p>
        )}
      </div>
    </div>
  );
}
