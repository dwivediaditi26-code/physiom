import { useState } from "react";
import { BadgeCheck, MapPin, Pencil, MoreHorizontal, Link2, Share2 } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { GRADIENTS } from "../shared/constants.js";
import EditProfileModal from "./EditProfileModal.jsx";

// Bug fix (2026-08-18): this page only ever shows YOUR OWN profile (there's
// no "view someone else's profile" route yet), so showing "Follow"/
// "Message" buttons here never made sense -- they didn't do anything real
// (local-only useState, never wired to the actual follow system) and there
// was no way to edit your own profile at all. Replaced with a real "Edit
// Profile" button that opens EditProfileModal.jsx.
export default function ProfileHeader({ profile, postCount }) {
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
            <p className="text-sm text-slate-500">{profile.role.split(" · ")[0]} · Sports Rehabilitation</p>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><MapPin size={12} /> {profile.location}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
              <Pencil size={14} /> Edit Profile
            </button>
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

        <div className="flex items-center gap-5 mt-4 text-sm">
          <span><span className="font-bold text-slate-900">{(profile.followers / 1000).toFixed(1)}K</span> <span className="text-slate-400">Followers</span></span>
          <span><span className="font-bold text-slate-900">{profile.following}</span> <span className="text-slate-400">Following</span></span>
          <span><span className="font-bold text-slate-900">{postCount + 123}</span> <span className="text-slate-400">Posts</span></span>
        </div>
        <p className="text-sm text-slate-600 mt-3 max-w-xl">{profile.bio}</p>
      </div>
      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}
