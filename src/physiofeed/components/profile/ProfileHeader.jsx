import { useState } from "react";
import { BadgeCheck, MapPin, MoreHorizontal, Link2, Share2, Download, UserPlus, UserMinus, Check, X as XIcon, Clock, Send, Pencil, Briefcase, Users, UserCheck, LayoutGrid, Star } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { formatCount, PROFILE_ACCENTS } from "../shared/constants.js";
import { getCurrentWorkplace } from "./experienceUtils.js";
import EditProfileModal from "./EditProfileModal.jsx";
import OpenToOpportunitiesModal from "./OpenToOpportunitiesModal.jsx";
import OpenToOpportunitiesPopover from "./OpenToOpportunitiesPopover.jsx";

// "LinkedIn for physiotherapists" header, v3 (2026-09-22) -- Aditi sent a
// reference screenshot for the general layout (photo + handwritten-style
// tagline beside it, name/role/location, a 3-stat bordered row, a gradient
// "Message" pill + circular action icons), but then had two corrections on
// top of it: (1) "remove this ACL, kinesiotaping, dryneedling, etc" -- the
// reference's specialty-chip row is gone, back in line with the original
// brief's own "do not put a large list of clinical specialties underneath
// the name"; (2) Open to Opportunities moved up into the hero band right
// under the name (was down by location), right-aligned and compact (Aditi:
// "put open for opportunity green and right side smaller"), and recolored
// a fixed green -- the one deliberate exception to "dnt make it green at
// all" elsewhere in this header, called out explicitly for this pill --
// rather than the per-profile accent, so it reads as a distinct status
// signal instead of blending into the rest of the accent-colored chrome.
// The tagline
// pulls profile.quote (EditProfileModal.jsx saves it, nothing rendered it
// before this). Follow/Connect/Message are three separate actions here
// (Aditi: "there should be follow connect and message option") --
// Follow (AppDataContext's followPerson(), a plain one-way follows-table
// row, previously wired up with no button anywhere) sits beside Connect
// (the mutual connections request flow) rather than replacing it.
export default function ProfileHeader({
  profile, postCount = 0, experience = [], isOwn = true,
  connectionState = "none", onConnect, onAccept, onIgnore, onCancel, onDisconnect, onMessage,
  following = false, onFollow,
}) {
  const [editing, setEditing] = useState(false);
  const [editingOpenTo, setEditingOpenTo] = useState(false);
  const [openToPopoverOpen, setOpenToPopoverOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Every connection action goes through here so the button can't be
  // double-fired and a real error (RLS, offline, already-connected race)
  // surfaces in the UI instead of being swallowed.
  const run = async (fn) => {
    if (!fn || busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message || "Couldn't do that -- please try again.");
    } finally {
      setBusy(false);
    }
  };

  const currentWorkplace = getCurrentWorkplace(experience);
  const hasOpenTo = (profile.openToTypes || []).length > 0;
  const accent = PROFILE_ACCENTS[profile.gradient] || PROFILE_ACCENTS.violet;

  return (
    <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm mb-5 bg-white">
      <div className={`relative bg-gradient-to-b ${accent.hero} px-4 pt-4 pb-3.5`}>
        <div className="absolute top-2.5 right-2.5">
          <button onClick={() => setMoreOpen((v) => !v)} className="p-2 rounded-full bg-white/70 backdrop-blur text-slate-500 hover:bg-white" aria-label="More"><MoreHorizontal size={16} /></button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30 text-left">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"><Link2 size={13} /> Copy profile link</button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"><Share2 size={13} /> Share profile</button>
              {isOwn ? (
                <button onClick={() => { setMoreOpen(false); setEditing(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                  <Pencil size={13} /> Edit résumé & professional details
                </button>
              ) : profile.resumeUrl ? (
                <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                  <Download size={13} /> Download résumé
                </a>
              ) : null}
              {!isOwn && connectionState === "connected" && (
                <button
                  onClick={() => { setMoreOpen(false); run(onDisconnect); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 border-t border-slate-100"
                >
                  <UserMinus size={13} /> Remove connection
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start gap-3">
          <Avatar size={132} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} className="shadow-[0_0_18px_8px_rgba(255,255,255,0.85)] shrink-0" />
          {profile.quote && (
            <div className="text-right pt-9 pr-1 min-w-0 flex-1">
              <p className={`pf-font-quote ${accent.text} text-xl leading-[1.2]`}>{profile.quote}</p>
              <span className={`inline-block w-14 h-[2px] ${accent.underline} mt-1 rounded-full`} />
            </div>
          )}
        </div>

        <div className="text-left mt-3.5">
          <div className="flex items-center gap-2">
            <h1 className="pf-font-head text-xl font-extrabold text-[#2B2140]">{profile.name}</h1>
            {profile.verified && <BadgeCheck size={19} className={`${accent.text} shrink-0`} />}
          </div>
          <p className="text-sm text-[#2B2140] font-semibold mt-1">{profile.role}</p>
          {profile.location && (
            <p className="text-xs text-[#2B2140] flex items-center gap-1 mt-1"><MapPin size={12} /> {profile.location}</p>
          )}
          {currentWorkplace && <p className="text-xs text-[#2B2140]/70 mt-0.5">{currentWorkplace}</p>}
        </div>

        {(hasOpenTo || isOwn) && (
          <div className="flex justify-end mt-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => (isOwn ? setEditingOpenTo(true) : setOpenToPopoverOpen((v) => !v))}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 whitespace-nowrap"
              >
                <Briefcase size={10} /> Open to Opportunities
              </button>
              {!isOwn && openToPopoverOpen && <OpenToOpportunitiesPopover types={profile.openToTypes} onClose={() => setOpenToPopoverOpen(false)} />}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-white">
        <div className="flex flex-col items-center gap-0.5 py-2.5"><Users size={14} className={`${accent.icon} mb-0.5`} /><span className="text-sm font-extrabold text-[#2B2140]">{formatCount(profile.followers)}</span><span className="text-[11px] text-[#2B2140]/60">Followers</span></div>
        <div className="flex flex-col items-center gap-0.5 py-2.5"><UserCheck size={14} className={`${accent.icon} mb-0.5`} /><span className="text-sm font-extrabold text-[#2B2140]">{formatCount(profile.following)}</span><span className="text-[11px] text-[#2B2140]/60">Following</span></div>
        <div className="flex flex-col items-center gap-0.5 py-2.5"><LayoutGrid size={14} className={`${accent.icon} mb-0.5`} /><span className="text-sm font-extrabold text-[#2B2140]">{formatCount(postCount)}</span><span className="text-[11px] text-[#2B2140]/60">Posts</span></div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        {isOwn ? (
          <button onClick={() => setEditing(true)}
            className={`pf-font-head flex-1 flex items-center justify-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-full text-white bg-gradient-to-r ${accent.button} hover:opacity-90 transition active:scale-[0.98]`}>
            <Pencil size={14} /> Edit Profile
          </button>
        ) : (
          <>
            {connectionState === "pending_received" ? (
              <>
                <button onClick={() => run(onAccept)} disabled={busy}
                  className={`pf-font-head flex-1 flex items-center justify-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-full text-white bg-gradient-to-r ${accent.button} disabled:opacity-60 transition active:scale-[0.98]`}>
                  <Check size={14} /> Accept
                </button>
                <button onClick={() => run(onIgnore)} disabled={busy} aria-label="Ignore request"
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-60">
                  <XIcon size={16} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => run(onFollow)} disabled={busy}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold px-2 py-2.5 rounded-full border disabled:opacity-60 ${following ? accent.filled : accent.outline}`}>
                  <Star size={14} fill={following ? "currentColor" : "none"} /> {following ? "Following" : "Follow"}
                </button>
                <button onClick={onMessage}
                  className={`pf-font-head flex-1 flex items-center justify-center gap-1 text-xs font-bold px-2 py-2.5 rounded-full text-white bg-gradient-to-r ${accent.button} hover:opacity-90 transition active:scale-[0.98]`}>
                  <Send size={14} /> Message
                </button>
                {connectionState === "connected" ? (
                  <span title="Connected" className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold px-2 py-2.5 rounded-full border ${accent.filled}`}>
                    <Check size={14} /> Connected
                  </span>
                ) : connectionState === "pending_sent" ? (
                  <button onClick={() => run(onCancel)} disabled={busy} title="Tap to withdraw your request"
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-bold px-2 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-60">
                    <Clock size={14} /> Pending
                  </button>
                ) : (
                  <button onClick={() => run(onConnect)} disabled={busy}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold px-2 py-2.5 rounded-full border disabled:opacity-60 ${accent.outline}`}>
                    <UserPlus size={14} /> Connect
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {error && <p className="text-xs text-rose-600 px-5 pb-3 -mt-2">{error}</p>}

      {isOwn && editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} />}
      {isOwn && editingOpenTo && <OpenToOpportunitiesModal profile={profile} onClose={() => setEditingOpenTo(false)} />}
    </div>
  );
}
