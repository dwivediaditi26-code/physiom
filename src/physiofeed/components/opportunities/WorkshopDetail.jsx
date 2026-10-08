import { useEffect, useState } from "react";
import { ChevronLeft, Calendar, Clock, Video, Check, X, Maximize2 } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import * as db from "../../data/db.js";
import WithdrawButton from "./WithdrawButton.jsx";
import LifecycleBanner, { isRegistrationBlocked } from "./StatusBanner.jsx";
import { formatEventDate, normalizeLink, earlyBirdActive } from "./FormFields.jsx";
import { trackEvent } from "../../../analytics/trackEvent.js";

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
export default function WorkshopDetail({ opp, onBack, registered, onRegistered, onMessage, preview = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(false);
  const blocked = isRegistrationBlocked(opp);
  // How many seats are taken (everyone's registrations, via a database
  // function -- a student can't read other people's rows). null = unknown,
  // in which case nothing is ever shown as "full".
  const [seatsTaken, setSeatsTaken] = useState(null);
  useEffect(() => {
    if (preview || !opp.maxParticipants || opp.postedByMe) return;
    let cancelled = false;
    db.getSeatsTaken(opp.id).then((n) => { if (!cancelled) setSeatsTaken(n); });
    return () => { cancelled = true; };
  }, [opp.id, opp.maxParticipants, opp.postedByMe, preview, registered]);
  // Am I past the seat limit? Only asked once I've registered.
  const [onWaitingList, setOnWaitingList] = useState(false);
  useEffect(() => {
    if (preview || !registered || !opp.maxParticipants) { setOnWaitingList(false); return; }
    let cancelled = false;
    db.isOnWaitingList(opp.id).then((v) => { if (!cancelled) setOnWaitingList(v); });
    return () => { cancelled = true; };
  }, [opp.id, opp.maxParticipants, registered, preview]);
  const full = !!opp.maxParticipants && seatsTaken != null && seatsTaken >= opp.maxParticipants;
  const waitlistOpen = full && !!opp.allowWaitlist;

  useEffect(() => {
    trackEvent("opportunity_viewed", { entityType: "opportunity", entityId: opp.id, properties: { type: "workshop" } });
    trackEvent("workshop_viewed", { entityType: "opportunity", entityId: opp.id });
  }, [opp.id]);

  const register = async () => {
    if (busy || registered) return;
    setBusy(true);
    setError(null);
    trackEvent("workshop_registration_started", { entityType: "opportunity", entityId: opp.id });
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

      {opp.bannerUrl ? (
        // Full image, never cropped (a tall poster used to be cut to a
        // 144px strip by object-cover). Tap to open it full screen.
        <button type="button" onClick={() => setZoom(true)} aria-label="View full image" className="relative block w-full bg-slate-100">
          <img src={opp.bannerUrl} alt={opp.title || "Workshop cover"} className="w-full h-auto max-h-[70vh] object-contain mx-auto" />
          <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"><Maximize2 size={14} className="text-white" /></span>
        </button>
      ) : (
        <div className="relative h-36 bg-gradient-to-br from-[#FF5FA2] to-[#FFB020] flex items-center justify-center overflow-hidden">
          <Video size={30} className="text-white/70" />
          {opp.mode === "Online" && (
            <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/25 flex items-center justify-center"><Video size={15} className="text-white" /></span>
          )}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-3" onClick={() => setZoom(false)}>
          <button type="button" aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center" onClick={() => setZoom(false)}><X size={20} className="text-white" /></button>
          <img src={opp.bannerUrl} alt="" className="max-w-full max-h-full object-contain" style={{ touchAction: "pinch-zoom" }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="p-5 pb-28">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-3">{opp.title}</h1>
        <LifecycleBanner opp={opp} />

        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1"><Calendar size={11} /> Date</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatEventDate(opp.date)}</p>
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

        {(opp.platform || opp.maxParticipants || opp.venue || opp.city || opp.address) && (
          <div className="flex gap-2 flex-wrap mb-2">
            {opp.platform && opp.mode !== "In-person" && (
              <div className="flex-1 min-w-[140px] bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Platform</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{opp.platform}</p>
              </div>
            )}
            {opp.maxParticipants && (
              <div className="flex-1 min-w-[140px] bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Seats</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  Limited to {opp.maxParticipants}
                  {seatsTaken != null && (full ? (opp.allowWaitlist ? " · full, waiting list open" : " · full") : ` · ${opp.maxParticipants - seatsTaken} left`)}
                </p>
              </div>
            )}
            {(opp.venue || opp.city || opp.address) && opp.mode !== "Online" && (
              <div className="flex-1 min-w-[200px] bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Venue</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{[opp.venue, opp.city].filter(Boolean).join(", ")}</p>
                {opp.address && <p className="text-xs text-slate-500 mt-0.5">{opp.address}</p>}
              </div>
            )}
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

      <div className={`${preview ? "" : "sticky bottom-0"} bg-white border-t border-slate-100 px-4 py-3`}>
        {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-slate-400 leading-none">{earlyBirdActive(opp) ? "Early bird" : "Fee"}</p>
            <p className="text-lg font-bold text-slate-900">
              {earlyBirdActive(opp) ? opp.earlyBirdFee : opp.fee}
              {earlyBirdActive(opp) && <span className="text-xs font-semibold text-slate-400 line-through ml-1.5">{opp.fee}</span>}
            </p>
            {earlyBirdActive(opp) && opp.earlyBirdDeadline && (
              <p className="text-[10px] text-slate-400">
                until {new Date(`${opp.earlyBirdDeadline}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            )}
          </div>

          {/* blocked (Phase F) wins over registrationMethod -- once closed/
              expired/cancelled there's no link to open or organiser to
              contact any more. Someone who already registered before that
              happened still sees their green "Registered" state, not this. */}
          {opp.postedByMe ? (
            <span className="pf-font-head text-xs font-semibold text-slate-500 bg-slate-50 rounded-xl px-4 py-3">This is your workshop</span>
          ) : blocked && !registered ? (
            <span className="pf-font-head text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
              {opp.lifecycleStatus === "cancelled" ? "This workshop was cancelled." : "Registration closed"}
            </span>
          ) : opp.registrationMethod === "external" ? (
            <a
              href={normalizeLink(opp.registrationUrl) || undefined}
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
          ) : full && !registered && !waitlistOpen ? (
            <span className="pf-font-head text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl px-4 py-3">Seats are full</span>
          ) : (
            <button
              type="button"
              onClick={register}
              disabled={registered || busy}
              className={`pf-font-head flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl px-6 py-3 shadow-sm transition ${registered ? (onWaitingList ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700") : "text-white bg-[#FF5FA2] active:scale-[0.98] disabled:opacity-60"}`}
            >
              {registered ? <><Check size={16} /> {onWaitingList ? "On the waiting list" : "Registered"}</> : busy ? "Registering…" : waitlistOpen ? "Join Waiting List" : "Register Now"}
            </button>
          )}
        </div>
        {waitlistOpen && !registered && !blocked && (
          <p className="text-[11px] text-slate-400 mt-2">All seats are taken. You can still send a request — you'll be on the waiting list and the organiser will tell you if a place opens up.</p>
        )}
        {opp.deadline && !blocked && (
          <p className="text-[11px] text-slate-400 mt-2">Registration closes on {formatEventDate(opp.deadline)}.</p>
        )}
        {opp.registrationMethod === "external" && (
          <p className="text-[11px] text-slate-400 mt-2">You'll be redirected to the organiser's registration and payment page.</p>
        )}
        {registered && opp.registrationMethod !== "external" && opp.registrationMethod !== "contact" && (
          <p className="text-[11px] text-slate-400 mt-2">
            {onWaitingList
              ? "All seats are taken, so you're on the waiting list. If someone withdraws, you move up and we'll tell you."
              : "The organiser has your request and a chat thread is open — they'll confirm the details there."}
          </p>
        )}
        {registered && !preview && !opp.postedByMe && opp.registrationMethod !== "external" && opp.registrationMethod !== "contact" && (
          <div className="mt-3">
            <WithdrawButton
              oppId={opp.id}
              label="Withdraw my registration"
              confirmText={`Withdraw your registration for "${opp.title}"? The organiser will be told and your seat goes to the next person.`}
              onDone={onRegistered}
            />
          </div>
        )}
        {opp.fee && opp.fee !== "Free" && !blocked && (
          <p className="text-[11px] text-slate-400 mt-2">PhysioFeed doesn't take payment. The organiser will arrange the fee with you in the chat.</p>
        )}
      </div>
    </div>
  );
}
