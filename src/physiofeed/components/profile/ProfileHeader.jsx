import { useState } from "react";
import { BadgeCheck, MapPin, Pencil, MoreHorizontal, Link2, Share2, UserPlus, Check, MessageSquare, Briefcase } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { formatCount } from "../shared/constants.js";
import EditProfileModal from "./EditProfileModal.jsx";

// Own profile keeps the real "Edit Profile" button (EditProfileModal.jsx).
// Someone else's profile (see OtherProfilePage.jsx) passes isOwn={false}
// plus following/onFollow/onMessage -- real Connect/Message actions wired to
// the same followPerson()/DM system PersonCard.jsx already uses. "Connect"
// (2026-09-22, Aditi's reference spec for the other-profile hero card) is
// just new copy/color over that same following boolean -- onFollow still
// flips the one real following flag; `requesting` here is a purely local,
// few-hundred-ms "Requested" transition so the click reads as a real
// connection request instead of an instant toggle, with nothing to persist.
export default function ProfileHeader({ profile, postCount, isOwn = true, following = false, onFollow, onMessage }) {
  const [editing, setEditing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const handleConnect = () => {
    if (following || requesting) return;
    setRequesting(true);
    onFollow?.();
    setTimeout(() => setRequesting(false), 900);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm mb-5">
      {/* rounded-3xl here too (2026-09-22 bug fix), not overflow-hidden on
          the card above -- the "more" dropdown just below is absolutely
          positioned inside this div, and overflow-hidden on the outer
          card clipped it (cut off "Share profile") whenever there wasn't
          much content underneath to push the card tall enough, e.g. a
          profile with no bio/skills like a fresh demo person's. The
          gradient fades to white by its own bottom edge anyway, so
          matching the rounding here does the same corner-clipping job
          without also clipping this div's own overflowing children. */}
      <div className="rounded-3xl px-5 sm:px-8 pt-6 pb-6 bg-gradient-to-b from-[#F3EEFF]/60 via-[#FBF9FF]/40 to-white">
        <div className="flex items-start gap-4 mb-3">
          <div className="relative shrink-0">
            <Avatar size={80} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} className="border-2 border-white shadow-md" />
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" />
            {!isOwn && !following && (
              <span className="pf-font-head absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Available to Connect
              </span>
            )}
          </div>
          <div className="min-w-0 pt-1">
            <div className="flex items-center gap-1.5">
              <h1 className="pf-font-head text-lg font-extrabold text-[#2B2140]">{profile.name}</h1>
              {profile.verified && <BadgeCheck size={17} className="text-[#DB2777]" />}
            </div>
            {/* Bug fix (2026-08-19): this used to hardcode " · Sports
                Rehabilitation" after everyone's role, regardless of their
                real specialty -- profile.role is a single free-text field
                (see EditProfileModal.jsx's "Role / title" input, e.g.
                "Neuro Physiotherapist · Bengaluru") that already contains
                whatever the clinician actually typed, so it just renders
                as-is now. */}
            <p className="text-sm text-slate-500">
              {profile.role}{profile.verified && " · Verified"}
            </p>
            {profile.headline && <p className="text-sm text-slate-700 mt-1 max-w-md">{profile.headline}</p>}
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><MapPin size={12} /> {profile.location}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-end gap-3">
          <div className="flex items-center gap-2">
            {isOwn ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                <Pencil size={14} /> Edit Profile
              </button>
            ) : (
              <>
                <button onClick={onMessage} aria-label={`Message ${profile.name}`}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <MessageSquare size={14} /> Message
                </button>
                <button onClick={handleConnect} disabled={requesting}
                  className={`pf-font-head flex items-center gap-1.5 text-sm font-bold px-5 py-2 rounded-xl transition active:scale-95 ${
                    following
                      ? "bg-slate-50 text-slate-500 border border-slate-200"
                      : "text-white bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] shadow-md shadow-purple-200 hover:opacity-90 disabled:opacity-80"
                  }`}>
                  {following ? <><Check size={14} /> Connected</> : requesting ? "Requested" : <><UserPlus size={14} /> Connect</>}
                </button>
              </>
            )}
            <div className="relative">
              <button onClick={() => setMoreOpen((v) => !v)} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><MoreHorizontal size={16} /></button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"><Link2 size={13} /> Copy profile link</button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"><Share2 size={13} /> Share profile</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {(profile.openToTypes || []).length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">
              <Briefcase size={12} /> Open to
            </span>
            {profile.openToTypes.map((t) => (
              <span key={t} className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">{t}</span>
            ))}
          </div>
        )}

        {/* Bug fix (2026-08-19): Followers used the old hardcoded "always
            format as K" math (showed "0.0K" for a genuine 0), and Posts
            added a flat +123 fake padding to every real post count --
            both replaced with the real numbers db.js now computes (see
            getFollowCounts() there) and formatCount()'s 0/small-number
            handling. */}
        <div className="flex items-center gap-5 mt-4 text-sm">
          <span><span className="font-bold text-slate-900">{formatCount(profile.followers)}</span> <span className="text-slate-400">Followers</span></span>
          <span><span className="font-bold text-slate-900">{formatCount(profile.following)}</span> <span className="text-slate-400">Following</span></span>
          <span><span className="font-bold text-slate-900">{formatCount(postCount)}</span> <span className="text-slate-400">Posts</span></span>
        </div>
        <p className="text-sm text-slate-600 mt-3 max-w-xl">{profile.bio}</p>
      </div>
      {isOwn && editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}
