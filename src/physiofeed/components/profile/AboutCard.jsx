import { useState } from "react";
import { ClipboardList, Clock, Languages, ShieldCheck, Pencil } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import EditProfileModal from "./EditProfileModal.jsx";

// Feature (2026-08-19): real editing. This card was 100% hardcoded text
// before this -- same profession/experience/languages/memberships for
// every clinician, no way to change it. Now reads from the real profile
// (profile.role already existed and is already editable via "Edit
// Profile" -> Role/title; experience/languages/memberships/
// availableForConsults are new profile columns, see
// supabase/add_profile_about_fields.sql). Opens the SAME EditProfileModal
// ProfileHeader.jsx's "Edit Profile" button does -- these are all just
// columns on one profiles row, no reason for a second modal.
//
// Any row with no value set (real user hasn't filled it in yet) is simply
// not shown, rather than rendering blank/empty text.
export default function AboutCard() {
  const { profile } = useAppData();
  const [editing, setEditing] = useState(false);
  if (!profile) return null;

  const profession = (profile.role || "").split(" · ")[0];
  const rows = [
    profession && { icon: ClipboardList, text: profession },
    profile.experience && { icon: Clock, text: profile.experience },
    profile.languages && { icon: Languages, text: `Speaks: ${profile.languages}` },
    profile.memberships && { icon: ShieldCheck, text: `Member: ${profile.memberships}` },
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">About</p>
        <button onClick={() => setEditing(true)} aria-label="Edit About" className="text-slate-400 hover:text-violet-600 p-1 -m-1 rounded-md hover:bg-violet-50">
          <Pencil size={13} />
        </button>
      </div>
      {rows.length === 0 && !profile.availableForConsults ? (
        <p className="text-sm text-slate-400">Add your experience, languages & more.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const Icon = r.icon;
            return <div key={r.text} className="flex items-center gap-2.5 text-sm text-slate-600"><Icon size={15} className="text-slate-400 shrink-0" /> {r.text}</div>;
          })}
          {profile.availableForConsults && (
            <div className="flex items-center gap-2.5 text-sm text-emerald-600 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available for online consults</div>
          )}
        </div>
      )}
      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}
