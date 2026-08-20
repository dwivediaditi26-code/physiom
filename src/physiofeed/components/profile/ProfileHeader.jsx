import { useState } from "react";
import { BadgeCheck, MapPin, Pencil, MoreHorizontal, Link2, Share2, UserPlus, Check, MessageSquare } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { GRADIENTS, formatCount } from "../shared/constants.js";
import EditProfileModal from "./EditProfileModal.jsx";

// Own profile keeps the real "Edit Profile" button (EditProfileModal.jsx).
// Someone else's profile (see OtherProfilePage.jsx) passes isOwn={false}
// plus following/onFollow/onMessage -- real Follow/Message actions wired to
// the same followPerson()/DM system PersonCard.jsx already uses.
export default function ProfileHeader({ profile, postCount, isOwn = true, following = false, onFollow, onMessage }) {
  const [editing, setEditing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const quoteLines = profile.quote.replace(/\.$/, "").split(". ");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
      <div className={`relative h-40 sm:h-52 bg-gradient-to-br ${GRADIENTS.slate} flex items-center px-6 sm:px-10`}>
        <p className="text-white text-sm sm:text-base font-medium italic leading-relaxed max-w-xs">
          "{quoteLines.map((line, i) => (
            <span key={i}>
              {line}{i < quoteLines.length - 1 ? "." : ""}
              {i < quoteLines.length - 1 && <br />}
            </span>
          ))}"
        </p>
      </div>
      <div className="px-5 sm:px-8 pb-6">
        <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3">
          <div className="relative">
            <div className="rounded-full ring-4 ring-white"><Avatar size={88} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} /></div>
            <span className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-slate-900">{profile.name}</h1>
              {profile.verified && <BadgeCheck size={17} className="text-violet-600" />}
            </div>
            {/* Bug fix (2026-08-19): this used to hardcode " · Sports
                Rehabilitation" after everyone's role, regardless of their
                real specialty -- profile.role is a single free-text field
                (see EditProfileModal.jsx's "Role / title" input, e.g.
                "Neuro Physiotherapist · Bengaluru") that already contains
                whatever the clinician actually typed, so it just renders
                as-is now. */}
            {profile.role && <p className="text-sm text-slate-500">{profile.role}</p>}
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><MapPin size={12} /> {profile.location}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOwn ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                <Pencil size={14} /> Edit Profile
              </button>
            ) : (
              <>
                <button onClick={onMessage} aria-label={`Message ${profile.name}`}
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <MessageSquare size={14} /> Message
                </button>
                <button onClick={onFollow}
                  className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${following ? "bg-slate-50 text-slate-500 border border-slate-200" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
                  {following ? <><Check size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
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
