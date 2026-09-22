import { useState } from "react";
import { BadgeCheck, MapPin, Building2, Pencil, MoreHorizontal, Link2, Share2, Download, UserPlus, Check, MessageSquare, Briefcase } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { formatCount } from "../shared/constants.js";
import { getCurrentWorkplace } from "./experienceUtils.js";
import EditProfileModal from "./EditProfileModal.jsx";
import OpenToOpportunitiesModal from "./OpenToOpportunitiesModal.jsx";
import OpenToOpportunitiesPopover from "./OpenToOpportunitiesPopover.jsx";

// Compact "LinkedIn for physiotherapists" header (2026-09-22 redesign,
// Aditi's brief) -- replaces the old tall violet-gradient hero. The brief
// is explicit this should read as a professional-identity card (photo,
// name, designation, workplace, location, connect/message), not a
// clinical-skills teaser, so the old "Open to / Mentorship / Research /
// Workshops" pill ROW is gone -- just one small "Open to Opportunities"
// pill now (OpenToOpportunitiesModal.jsx / *Popover.jsx), matching the
// brief's "keep this very small, only expand on tap" instruction.
//
// `experience` (the rotations/Experience list, same data RotationsCard.jsx
// renders) is a new prop so "Current Workplace" can be derived from
// whichever entry says "Present" rather than inventing a new
// profile.currentWorkplace column with no matching Supabase migration --
// see experienceUtils.js and mockData.js's ROTATIONS comment.
export default function ProfileHeader({ profile, postCount, experience = [], isOwn = true, following = false, onFollow, onMessage }) {
  const [editing, setEditing] = useState(false);
  const [editingOpenTo, setEditingOpenTo] = useState(false);
  const [openToPopoverOpen, setOpenToPopoverOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const handleConnect = () => {
    if (following || requesting) return;
    setRequesting(true);
    onFollow?.();
    setTimeout(() => setRequesting(false), 900);
  };

  const currentWorkplace = getCurrentWorkplace(experience);
  const hasOpenTo = (profile.openToTypes || []).length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
      <div className="flex items-start gap-3.5">
        <Avatar size={64} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} className="border-2 border-white shadow-sm shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="pf-font-head text-base font-extrabold text-slate-900 truncate">{profile.name}</h1>
            {profile.verified && <BadgeCheck size={16} className="text-slate-700 shrink-0" />}
          </div>
          <p className="text-sm text-slate-500 truncate">{profile.role}</p>
          {profile.headline && <p className="text-sm text-slate-700 mt-1 leading-snug">{profile.headline}</p>}
          <div className="flex flex-col gap-0.5 mt-1.5">
            {currentWorkplace && (
              <p className="text-xs text-slate-500 flex items-center gap-1"><Building2 size={12} className="shrink-0" /> {currentWorkplace}</p>
            )}
            {profile.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {profile.location}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3.5">
        <span className="text-xs text-slate-500"><span className="font-bold text-slate-900">{formatCount(profile.followers)}</span> Followers</span>
        <span className="w-1 h-1 rounded-full bg-slate-300" />
        <span className="text-xs text-slate-500"><span className="font-bold text-slate-900">{formatCount(profile.following)}</span> Connections</span>
        {(hasOpenTo || isOwn) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => (isOwn ? setEditingOpenTo(true) : setOpenToPopoverOpen((v) => !v))}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            >
              <Briefcase size={11} /> Open to Opportunities
            </button>
            {!isOwn && openToPopoverOpen && <OpenToOpportunitiesPopover types={profile.openToTypes} onClose={() => setOpenToPopoverOpen(false)} />}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        {isOwn ? (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            <Pencil size={14} /> Edit Profile
          </button>
        ) : (
          <>
            <button onClick={handleConnect} disabled={requesting}
              className={`pf-font-head flex items-center gap-1.5 text-sm font-bold px-5 py-2 rounded-xl transition active:scale-95 ${
                following ? "bg-slate-50 text-slate-500 border border-slate-200" : "text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-80"
              }`}>
              {following ? <><Check size={14} /> Connected</> : requesting ? "Requested" : <><UserPlus size={14} /> Connect</>}
            </button>
            <button onClick={onMessage} aria-label={`Message ${profile.name}`}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <MessageSquare size={14} /> Message
            </button>
          </>
        )}
        <div className="relative">
          <button onClick={() => setMoreOpen((v) => !v)} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><MoreHorizontal size={16} /></button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30">
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
            </div>
          )}
        </div>
      </div>

      {isOwn && editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} />}
      {isOwn && editingOpenTo && <OpenToOpportunitiesModal profile={profile} onClose={() => setEditingOpenTo(false)} />}
    </div>
  );
}
