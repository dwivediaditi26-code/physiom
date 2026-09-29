import { useState } from "react";
import { BadgeCheck, MapPin, MoreHorizontal, Link2, Share2, Download, UserPlus, UserMinus, Check, X as XIcon, Clock, Send, Pencil, Users, UserCheck, LayoutGrid, Star, ShieldOff, Flag, ShieldCheck, Handshake } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { formatCount, PROFILE_ACCENTS } from "../shared/constants.js";
import { getCurrentWorkplace } from "./experienceUtils.js";
import EditProfileModal from "./EditProfileModal.jsx";
import FollowListModal from "./FollowListModal.jsx";

// "LinkedIn for physiotherapists" header, v4 (2026-09-22) -- Aditi sent a
// reference screenshot for the general layout (photo + handwritten-style
// tagline beside it, name/role/location, a 3-stat bordered row, a gradient
// "Message" pill + circular action icons), then several rounds of
// corrections: "remove this ACL, kinesiotaping, dryneedling, etc" -- the
// reference's specialty-chip row is gone, back in line with the original
// brief's own "do not put a large list of clinical specialties underneath
// the name"; an Open to Opportunities pill was tried in several spots
// (inline with the name, right-aligned below it) before Aditi asked to
// just "remove the open for opportunity" entirely -- OpenToOpportunitiesModal.jsx
// and OpenToOpportunitiesPopover.jsx were deleted along with it, since
// nothing else referenced them. The tagline pulls profile.quote
// (EditProfileModal.jsx saves it, nothing rendered it before this).
// Follow/Connect/Message are three separate actions here (Aditi: "there
// should be follow connect and message option") -- Follow (AppDataContext's
// followPerson(), a plain one-way follows-table row, previously wired up
// with no button anywhere) sits beside Connect (the mutual connections
// request flow) rather than replacing it.
export default function ProfileHeader({
  profile, postCount = 0, experience = [], isOwn = true,
  connectionState = "none", onConnect, onAccept, onIgnore, onCancel, onDisconnect, onMessage,
  following = false, onFollow,
  blockedByMe = false, blockedByThem = false, onBlock, onUnblock, onReport,
}) {
  const [editing, setEditing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Two-step confirm for both "remove connection" and "block" -- neither
  // fires on the first tap. Whichever menu item was tapped shows its own
  // inline Confirm/Cancel row instead of a native confirm() popup, same
  // "ask again inline" shape the app already uses elsewhere.
  const [confirming, setConfirming] = useState(null); // null | 'disconnect' | 'block'
  const [followList, setFollowList] = useState(null); // null | 'followers' | 'following' | 'connections'

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
  const accent = PROFILE_ACCENTS[profile.gradient] || PROFILE_ACCENTS.violet;

  return (
    <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm mb-5 bg-white">
      <div className={`relative bg-gradient-to-b ${accent.hero} px-4 pt-4 pb-3.5`}>
        <div className="absolute top-2.5 right-2.5">
          <button onClick={() => { setMoreOpen((v) => !v); setConfirming(null); }} className="p-2 rounded-full bg-white/70 backdrop-blur text-slate-500 hover:bg-white" aria-label="More"><MoreHorizontal size={16} /></button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30 text-left">
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
                confirming === "disconnect" ? (
                  <div className="border-t border-slate-100 px-3 py-2">
                    <p className="text-[11px] text-slate-500 mb-1.5">Remove this connection?</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setConfirming(null); setMoreOpen(false); run(onDisconnect); }} disabled={busy}
                        className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60">Remove</button>
                      <button onClick={() => setConfirming(null)} className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirming("disconnect")} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 border-t border-slate-100">
                    <UserMinus size={13} /> Remove connection
                  </button>
                )
              )}

              {/* Block/report (see supabase/add_conversations_and_blocks.sql):
                  blocking also drops a pending connection and both follow
                  directions server-side -- see block_user() -- so no extra
                  confirmation of those side effects is needed here beyond
                  the block confirm itself. */}
              {!isOwn && !blockedByMe && (
                confirming === "block" ? (
                  <div className="border-t border-slate-100 px-3 py-2">
                    <p className="text-[11px] text-slate-500 mb-1.5">Block {profile.name}? They won't be able to message, follow, or connect with you.</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setConfirming(null); setMoreOpen(false); run(onBlock); }} disabled={busy}
                        className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60">Block</button>
                      <button onClick={() => setConfirming(null)} className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirming("block")} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 border-t border-slate-100">
                    <ShieldOff size={13} /> Block
                  </button>
                )
              )}
              {!isOwn && blockedByMe && (
                <button onClick={() => { setMoreOpen(false); run(onUnblock); }} disabled={busy} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 border-t border-slate-100">
                  <ShieldCheck size={13} /> Unblock
                </button>
              )}
              {!isOwn && (
                <button onClick={() => { setMoreOpen(false); onReport?.(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                  <Flag size={13} /> Report
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
      </div>

      <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 bg-white">
        <button onClick={() => setFollowList("followers")} className="flex flex-col items-center gap-0.5 py-2.5 hover:bg-slate-50">
          <Users size={14} className={`${accent.icon} mb-0.5`} /><span className="text-sm font-extrabold text-[#2B2140]">{formatCount(profile.followers)}</span><span className="text-[11px] text-[#2B2140]/60">Followers</span>
        </button>
        <button onClick={() => setFollowList("following")} className="flex flex-col items-center gap-0.5 py-2.5 hover:bg-slate-50">
          <UserCheck size={14} className={`${accent.icon} mb-0.5`} /><span className="text-sm font-extrabold text-[#2B2140]">{formatCount(profile.following)}</span><span className="text-[11px] text-[#2B2140]/60">Following</span>
        </button>
        {/* Connections -- a distinct number from followers/following (see
            the design doc: Connect ≠ Follow ≠ Message). Was a plain
            unclickable div (2026-09-29, Aditi: "connection button doesnot
            work") -- now opens the same FollowListModal as Followers/
            Following, backed by db.getConnectionsList(). */}
        <button onClick={() => setFollowList("connections")} className="flex flex-col items-center gap-0.5 py-2.5 hover:bg-slate-50">
          <Handshake size={14} className={`${accent.icon} mb-0.5`} /><span className="text-sm font-extrabold text-[#2B2140]">{formatCount(profile.connections)}</span><span className="text-[11px] text-[#2B2140]/60">Connections</span>
        </button>
        <div className="flex flex-col items-center gap-0.5 py-2.5"><LayoutGrid size={14} className={`${accent.icon} mb-0.5`} /><span className="text-sm font-extrabold text-[#2B2140]">{formatCount(postCount)}</span><span className="text-[11px] text-[#2B2140]/60">Posts</span></div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        {isOwn ? (
          <button onClick={() => setEditing(true)}
            className={`pf-font-head flex-1 flex items-center justify-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-full text-white bg-gradient-to-r ${accent.button} hover:opacity-90 transition active:scale-[0.98]`}>
            <Pencil size={14} /> Edit Profile
          </button>
        ) : blockedByMe || blockedByThem ? (
          <span className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-5 py-2.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200">
            <ShieldOff size={14} /> {blockedByMe ? "You've blocked this person" : "Unavailable"}
          </span>
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
      {followList && <FollowListModal profileId={profile.id} kind={followList} onClose={() => setFollowList(null)} />}
    </div>
  );
}
