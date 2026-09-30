import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Star } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { PROFILE_ACCENTS } from "../shared/constants.js";
import * as db from "../../data/db.js";
import { useAppData } from "../../context/AppDataContext.jsx";

// Opened from ProfileHeader's Followers/Following/Connections stat, which
// used to be a plain number with nothing behind it (Connections had no
// button at all -- 2026-09-29, Aditi: "connection button doesnot work").
// `kind` is 'followers' | 'following' | 'connections'; the list itself
// always shows a Follow/Following toggle (following is independent of
// connections -- see the design doc) except on your own row, which can't
// be followed.
export default function FollowListModal({ profileId, kind, onClose }) {
  const { profile: myProfile, followPerson } = useAppData();
  const [people, setPeople] = useState(null); // null = loading
  const [followingIds, setFollowingIds] = useState(new Set());
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fetchList = kind === "connections" ? db.getConnectionsList(profileId) : db.getFollowList(profileId, kind);
      const [list, mine] = await Promise.all([fetchList, db.getFollowingIds()]);
      if (cancelled) return;
      setPeople(list);
      setFollowingIds(new Set(mine));
    })();
    return () => { cancelled = true; };
  }, [profileId, kind]);

  const toggle = async (id) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await followPerson(id);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[75dvh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-base font-bold text-slate-900 capitalize">{kind}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-2 pb-5">
          {people === null ? (
            <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
          ) : people.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 px-5">
              {kind === "followers" ? "No followers yet." : kind === "connections" ? "No connections yet." : "Not following anyone yet."}
            </p>
          ) : (
            people.map((p) => {
              const accent = PROFILE_ACCENTS[p.grad] || PROFILE_ACCENTS.violet;
              const isMe = myProfile && String(p.id) === String(myProfile.id);
              const following = followingIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50">
                  <Link to={`/profile/${p.id}`} onClick={onClose} className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar size={38} grad={p.grad} initials={p.initials} photoUrl={p.avatarUrl} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                      {p.role && <p className="text-xs text-slate-400 truncate">{p.role}</p>}
                    </div>
                  </Link>
                  {!isMe && (
                    <button
                      onClick={() => toggle(p.id)}
                      disabled={busyId === p.id}
                      className={`shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full border disabled:opacity-60 ${following ? accent.filled : accent.outline}`}
                    >
                      <Star size={12} fill={following ? "currentColor" : "none"} /> {following ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
